package main

import (
	"context"
	"time"
)

// capacityQuery returns one page of people with allocated hours per week.
// Assignments are clipped to the range before being expanded into days, and
// only weekdays count. Weeks with no allocation produce no row.
//
// The scope CTE decides whose assignments are read. Normally that is one page
// of people, paged before any assignment is touched. With $7 (over capacity
// only) it is everyone matching the search, because who is over is only known
// after summing, and paging happens afterwards.
const capacityQuery = `
WITH matched AS (
  SELECT id, name, weekly_hours
  FROM people
  WHERE $5::text = '' OR position(lower($5::text) IN lower(name)) > 0
),
ranked AS (
  SELECT id, name, weekly_hours,
         row_number() OVER (
           ORDER BY CASE WHEN $6::bool THEN name END DESC,
                    CASE WHEN NOT $6::bool THEN name END ASC,
                    id
         ) AS pos
  FROM matched
),
scope AS (
  SELECT * FROM ranked WHERE $7::bool
  UNION ALL
  (SELECT * FROM ranked WHERE NOT $7::bool ORDER BY pos LIMIT $3::bigint OFFSET $4::bigint)
),
alloc AS (
  SELECT a.person_id,
         date_trunc('week', day)::date AS week_start,
         sum(a.hours_per_day)          AS hours
  FROM assignments a
  JOIN scope ON scope.id = a.person_id
  CROSS JOIN LATERAL generate_series(
    greatest(a.start_date, $1::date)::timestamp,
    least(a.end_date, $2::date)::timestamp,
    interval '1 day'
  ) AS day
  WHERE a.start_date <= $2::date
    AND a.end_date >= $1::date
    AND extract(isodow FROM day) < 6
  GROUP BY a.person_id, week_start
),
eligible AS (
  SELECT *
  FROM scope
  WHERE NOT $7::bool
     OR EXISTS (
       SELECT 1 FROM alloc
       WHERE alloc.person_id = scope.id AND alloc.hours > scope.weekly_hours
     )
),
page AS (
  SELECT *
  FROM eligible
  ORDER BY pos
  LIMIT $3::bigint OFFSET CASE WHEN $7::bool THEN $4::bigint ELSE 0 END
)
SELECT page.id,
       page.name,
       page.weekly_hours::float8,
       alloc.week_start,
       alloc.hours::float8,
       CASE WHEN $7::bool
            THEN (SELECT count(*) FROM eligible)
            ELSE (SELECT count(*) FROM matched)
       END AS total
FROM page
LEFT JOIN alloc ON alloc.person_id = page.id
ORDER BY page.pos, alloc.week_start`

func (s *server) queryCapacity(ctx context.Context, p capacityParams) (capacityResponse, error) {
	weeks := p.weeks()
	resp := capacityResponse{
		Weeks:  make([]string, len(weeks)),
		People: []personCapacity{},
	}
	weekIndex := make(map[string]int, len(weeks))
	for i, w := range weeks {
		resp.Weeks[i] = w.Format(dateLayout)
		weekIndex[resp.Weeks[i]] = i
	}

	rows, err := s.db.Query(ctx, capacityQuery,
		p.from, p.to, p.limit, p.offset, p.search, p.nameDesc, p.overOnly)
	if err != nil {
		return capacityResponse{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			person personCapacity
			week   *time.Time
			hours  *float64
		)
		if err := rows.Scan(&person.ID, &person.Name, &person.WeeklyHours, &week, &hours, &resp.Total); err != nil {
			return capacityResponse{}, err
		}
		if n := len(resp.People); n == 0 || resp.People[n-1].ID != person.ID {
			person.Allocated = make([]float64, len(weeks))
			resp.People = append(resp.People, person)
		}
		if week != nil && hours != nil {
			if i, ok := weekIndex[week.Format(dateLayout)]; ok {
				resp.People[len(resp.People)-1].Allocated[i] = *hours
			}
		}
	}
	if err := rows.Err(); err != nil {
		return capacityResponse{}, err
	}

	if next := p.offset + len(resp.People); next < resp.Total {
		resp.NextOffset = &next
	}
	return resp, nil
}

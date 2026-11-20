package main

import (
	"context"
	"net/http"
	"strconv"
	"time"
)

type projectAllocation struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Allocated []float64 `json:"allocated"`
}

// allocationsResponse breaks one person's hours down by project. Each
// project's Allocated is index-aligned with Weeks, like capacityResponse.
type allocationsResponse struct {
	Weeks    []string            `json:"weeks"`
	Projects []projectAllocation `json:"projects"`
}

// personAllocationsQuery counts hours the same way capacityQuery does
// (clipped to the range, weekdays only), grouped by project.
const personAllocationsQuery = `
SELECT pr.id,
       pr.name,
       date_trunc('week', day)::date AS week_start,
       sum(a.hours_per_day)::float8  AS hours
FROM assignments a
JOIN projects pr ON pr.id = a.project_id
CROSS JOIN LATERAL generate_series(
  greatest(a.start_date, $2::date)::timestamp,
  least(a.end_date, $3::date)::timestamp,
  interval '1 day'
) AS day
WHERE a.person_id = $1
  AND a.start_date <= $3::date
  AND a.end_date >= $2::date
  AND extract(isodow FROM day) < 6
GROUP BY pr.id, pr.name, week_start
ORDER BY pr.name, pr.id, week_start`

func (s *server) handlePersonAllocations(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "person not found")
		return
	}
	params, err := parseCapacityParams(r.URL.Query())
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	resp, err := s.queryPersonAllocations(r.Context(), id, params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load allocations")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *server) queryPersonAllocations(ctx context.Context, personID int, p capacityParams) (allocationsResponse, error) {
	weeks := p.weeks()
	resp := allocationsResponse{
		Weeks:    make([]string, len(weeks)),
		Projects: []projectAllocation{},
	}
	weekIndex := make(map[string]int, len(weeks))
	for i, w := range weeks {
		resp.Weeks[i] = w.Format(dateLayout)
		weekIndex[resp.Weeks[i]] = i
	}

	rows, err := s.db.Query(ctx, personAllocationsQuery, personID, p.from, p.to)
	if err != nil {
		return allocationsResponse{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			project projectAllocation
			week    time.Time
			hours   float64
		)
		if err := rows.Scan(&project.ID, &project.Name, &week, &hours); err != nil {
			return allocationsResponse{}, err
		}
		if n := len(resp.Projects); n == 0 || resp.Projects[n-1].ID != project.ID {
			project.Allocated = make([]float64, len(weeks))
			resp.Projects = append(resp.Projects, project)
		}
		if i, ok := weekIndex[week.Format(dateLayout)]; ok {
			resp.Projects[len(resp.Projects)-1].Allocated[i] = hours
		}
	}
	return resp, rows.Err()
}

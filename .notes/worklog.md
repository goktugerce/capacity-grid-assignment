# Worklog

Running notes on how this got built — decisions, assumptions, dead ends, and anything
left unfinished. Append as you go; a line or two per entry is right.

---

## Reading the data (before writing code)

- 500 people, 12 projects, 126,195 assignment rows, 2025-06-02 to 2027-01-03.
- Every logical assignment is stored as 15 rows with identical person/project/dates
  (8,413 groups, all exactly 15). The rows sum to 2-8 h/day. So rows must be summed,
  never de-duplicated. `DISTINCT` would silently give wrong totals.
- `hours_per_day` is 0.125-1.0 per row. Looked like a fraction of a day at first; it is
  hours, the per-day total only makes sense after summing the 15 rows.
- 46,665 rows end on a Saturday or Sunday and assignments run up to 14 days, so they
  cross weekends and week boundaries. Schema does not say whether weekends count.
- People 1-5 look hand-written to test the default range (2025-12-29 to 2026-01-16):
  - Ana (40h): 8 h/day Mon 29 Dec to Sun 4 Jan. 40h if weekdays only, 56h if all 7 days.
    Also crosses the year boundary.
  - Bo (40h): one assignment Fri 9 Jan to Mon 12 Jan, spans a weekend and two weeks.
  - Dee (40h): two overlapping assignments, 6h Mon-Fri plus 5h Wed-Fri = 45h. Next week
    exactly 40h, so "over" needs to be `>` not `>=`.
  - Eli: `weekly_hours = 0` with 20h allocated. Any allocated/capacity ratio divides by zero.
- `weekly_hours` is one current value per person. No history, no team or manager table,
  no holidays, no version column.

## API

- Weekdays only. Allocation is `hours_per_day` for each Mon-Fri an assignment covers.
  Toggl's own capacity view does not count weekends either. No holidays in the data.
- Ranges snap outwards to whole Mon-Sun weeks. A partial week shown against a full week of
  capacity would understate load. Weeks are keyed by their Monday date, not a week number,
  so the year boundary is not a special case.
- Response is `{ weeks, people: [{ id, name, weeklyHours, allocated[] }], total, nextOffset }`.
  `allocated` lines up with `weeks` by index. No "over" flag from the server: allocation does
  not depend on capacity, so a capacity edit cannot make `allocated` stale.
- People are paged (50 default, 200 max, name order, limit/offset). Range capped at 106 weeks.
- Checked people 1-5 by hand against the API and against the rows in the database for the
  default range: Ana 40/0/30, Bo 0/32/8, Cem 0/4/12, Dee 0/45/40, Eli 0/20/0. All match.
- Query plan for 50 people over 2 years: seq scan on assignments, hash join to the page.
  Fine on this seed. At a few thousand people I'd expect the `person_id` index to win, not
  measured.
- `PATCH /api/people/{id}` takes `{ "weeklyHours": n }`, 0-168, returns the saved person.
  422 for a bad value, 400 for a bad body, 404 for an unknown id. Unknown fields rejected.
- Editing `weekly_hours` changes capacity for every week, past ones too. The schema has one
  value per person and is frozen. Last write wins, no version column to detect a clash.
- Go tests run with `docker run --rm -v "$PWD/api":/src -w /src golang:1.26-alpine go test ./...`.
  The api image only ships the binary, so there is no compose command for them.
- First draft had handler, parsing and SQL in one `capacity.go`. Split into `capacity.go`
  (HTTP), `capacity_params.go` (range parsing) and `capacity_query.go` (SQL) so each can
  change on its own.

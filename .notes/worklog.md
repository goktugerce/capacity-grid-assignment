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

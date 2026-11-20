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

## Grid

- Cells show allocated hours. Over is `allocated > weeklyHours`, strict, worked out in the
  browser from the two numbers. Over cells get colour plus a "+5 over" label so it does not
  rely on colour alone. No percentages, so zero capacity (Eli) needs no special case.
- First version used plain `useState`/`useEffect` with a hand-written abort, load-more merge
  and rollback. Replaced it with TanStack Query: `useInfiniteQuery` for the paged range and
  `useMutation` for the save. Less state to get wrong, and going back to a range you already
  loaded is instant.
- After an edit: optimistic. `onMutate` writes the new capacity into the cache, the PATCH
  response confirms it, and nothing is refetched because allocation does not depend on
  capacity. The patch goes to every cached range, not only the one on screen. On failure the
  capacity goes back to the old value, the input keeps what was typed, and the row shows
  "Not saved (reason). Still 40h." with Retry and Discard.
- Hours inputs are disabled while any capacity fetch is running. That is how I avoid a fetch
  that started before a save landing after it with the old capacity. Simpler than cancelling
  queries in `onMutate`, at the cost of a short disabled moment during "Load more".
- Refetch on window focus is off and data is fresh for 30s. Another manager's edit will not
  show up until the range is reloaded.
- Layout: `App.tsx` and `CapacityGrid.tsx` stay where the scaffold put them. Around them:
  `api/` (fetch calls), `hooks/` (queries and the mutation), `components/` (row, range
  controls), `utils/` (over rule, hours parsing, date maths), `types.ts`.
- While a new range loads the old grid stays on screen, dimmed, instead of flashing empty.
- Looked at it in the browser. People 1-5 show the same numbers as the API check above.
  Set Ana to 30: her 29 Dec week turned over (+10), her 12 Jan week (30 of 30) did not, and
  the count line went from 4 to 5. Stopped the api container and saved 40: error shown,
  capacity stayed 30. Started it, pressed Retry: saved. Load more went 50 to 100. Database is
  back to seed values.
- Tests: `docker compose exec web npm test`. Covers the over rule, hours parsing, week
  shifting, and the two edit paths (saved value recomputes over without a refetch, failed
  save restores the old capacity and keeps the typed value).
- Rough edges in this first working version:
  - A range you have not visited starts again at the first 50 people.
  - "N of 50 people shown are over capacity" only counts loaded people, not the whole team.
  - A failed save says "request failed (502)" when the API is down. Honest but not friendly.
  - The inline error makes the hours column wider while it shows.
  - No holidays or time off, so 1 Jan counts as a normal working day.
- Next, in this order while time allows: better error display, better styling, sort and
  filter (server side, because people are paged), row virtualisation.

## Second pass: search, sort, errors, virtualisation

- Search and sort are server side (`q`, `sort=name|-name`) because people are paged. Doing
  them in the browser would only cover the rows already loaded. Both run before any
  assignment is read, so the cheap path stays cheap. Search is a case-insensitive substring
  on the name, no index. At a few thousand people that needs `pg_trgm` or a prefix match.
- Left out on purpose: "only people over capacity" and "sort by most over". Those need
  allocation worked out for everyone before paging, which is the expensive direction. I
  would do it from a weekly rollup table, not from raw assignments on every request.
- Rows are virtualised with TanStack Virtual: 500 people loaded, about 40 rows in the DOM.
  Columns are not virtualised, so a 2 year range still renders about 100 cells per visible row.
- Trade-off of virtualising: a row's draft and its "Not saved" message live in the row. If
  you scroll far enough for the row to unmount, they are gone. The saved value is safe.
- Errors: a network failure or a 502-504 now reads "the server is not responding". Other
  errors show the message the API sent.
- Caught in the browser with the api container stopped: a failed load of a range or search
  that was not cached removed the whole grid, search box included, so the only way out was
  "Try again". The search box and error now stay on screen.
- Caught in the browser: with a sticky header and collapsed borders, rows showed through the
  header's edge. Switched the grid to separate borders.
- Checked: search "lindq" gives 9 people, sort flips the order, "zzzz" gives an empty state,
  Load more to 500 then scrolling keeps about 40 rows mounted.
- Still to do: styling.

## Styling

- Plain CSS with tokens, no Tailwind or component library. shadcn would have meant Tailwind,
  a path alias and about eight packages for one table, an input and a few buttons.
- Light theme only. Colours borrowed from Toggl's site (cream page, plum text, violet and pink
  for actions). Over-allocation stays red: pink is their action colour and would read as
  "click me".
- Each week cell has a thin bar for the share of weekly hours in use. It is drawing only and
  is 0 when capacity is 0. Whether a week is over is still `allocated > weeklyHours`.
- A failed save used to add a second line to the row, which made rows jump and broke the fixed
  row height the virtualiser relies on. Now it is one line in the hours cell: "Not saved",
  Retry, Discard. The reason and the value it rolled back to are in the tooltip and are what
  a screen reader reads out.
- "Load more" is gone. The next page loads when you scroll within 10 rows of the end. If that
  fetch fails, a "Load more" link comes back so it is not retried in a loop.
- Hours inputs are no longer disabled while the next page loads. That fetch only brings
  people who are not on screen yet, so it cannot overwrite an edit. Any other fetch still
  locks editing.
- Caught while scrolling: the name column resized to the longest visible name as rows came
  and went. Name and week columns are fixed width now, long names get an ellipsis and a
  tooltip.
- Checked: 44px rows throughout, pages load on scroll (50 to 350), failed save and an
  out-of-range value both stay on one line. Not checked: a phone-width screen.
- Open items if there is time: per-project breakdown for a person (a
  `GET /api/people/{id}/allocations?from=&to=` loaded when a row is expanded, so the main
  payload does not grow by the number of projects), and a filter for people over capacity.

## Third pass: over-capacity filter and project breakdown

- `over=true` on `GET /api/capacity` returns only people who are over in at least one week of
  the range. It is in the same query: a `scope` CTE picks whose assignments are read. Normally
  that is one page of people. With the filter it is everyone matching the search, because who
  is over is only known after summing, and paging happens after. It works with search and sort.
- This path is the expensive one and I measured it: default 3 week range 0.3s against 0.006s,
  2 year range 0.94s against 0.075s, on 500 people. It will not hold at a few thousand. The
  fix is a weekly rollup table kept up to date on assignment writes, which would also make
  "sort by most over" cheap.
- Cross-checked the filter: it returns 41 people for the default range, and a separate query
  written from scratch in psql also gives 41.
- With the filter on, the badge is the team-wide count from the server. With it off, the badge
  only counts loaded rows and says so.
- `GET /api/people/{id}/allocations?from=&to=` gives hours per project per week for one person,
  counted the same way (clipped to the range, weekdays only). Fetched when a row is opened, so
  the main payload does not grow by the number of projects.
- The weekday expansion is now written in two queries. I left the duplication: the frozen
  schema rules out a view or SQL function, and building SQL from Go strings is worse.
- An unknown person id returns an empty project list, not a 404. The id always comes from a
  row that was just rendered.
- Each person is now a `<tbody>` so the virtualiser can measure a group that grows when its
  project rows open. Which rows are open is kept in the grid, so it survives scrolling away,
  changing the range, and switching the filter.
- Checked in the browser: Dee's projects are Atlas 30 + Corvus 15 = 45 in the 5 Jan week and
  Beacon 40 the week after, matching her totals. Cem's add up too.
- Not done: tests for the two new SQL paths (they need a database), editing assignments, and
  a phone-width check.

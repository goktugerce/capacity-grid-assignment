# Decisions

Yours to write, not your AI's. Short is good — bullets are fine, and half a page is
plenty. We read this first.

## What did the spec not tell you?

There were several things which I worked out myself, with the help of AI.

- Weekends: Assignments also included Saturday and Sunday. I counted Monday to Friday only, after checking Toggl Community forums and seeing that Toggl's capacity view does the same.
- Partial Weeks: A range can start mid-week. I expanded the weeks to full weeks, in that case.
- Editing Weekly Hours: Weekly hours is one value, so an edit changes every week, past ones included. Schema was frozen so I accepted it as is.
- Grid freshness: I did optimistic patch and no refetch. A failed save restores the old value. Allocated hours don't depend on capacity.
- Scale: I used pagination on the server side, and used virtualised rows.
- "Over capacity only": I added this as an enhancement. It runs on the server and it covers people who are also not loaded yet.

## What did you notice that looked wrong?

Anything in the output that didn't match what you expected. Whether you fixed it or left
it, we want to know you saw it.

- Identical rows: Every assignment is 15 identical rows. I used SUM for them instead of using DISTINCT.
- Eli has zero capacity and 20h allocated. It is shown as over, but did not use percentages because of this.
- Dee is exactly 40 of 40 in one week. I did not count that as over.
- January 1 counts as working day, I left it as-is.
- My over-capacity filter is slow. It can definitely be improved, but I did not optimize it. 0.3s against 0.006 on the default range, and 0.94s against 0.075s on two years, with 500 people.

## What did the AI get wrong that you caught?

One concrete example. Every real session has one.

- It used useState/useEffect with manual abort. I forced it to use TanStack Query, considering it was a "nice to have" in the job listing. It helps with less hand-written loading, caching.
- It was resizing the columns while scrolling down, I had it fixed.
- It was using one Go file with heavy comments. I had it split and trimmed.

## What would you do differently with a week?

- Weekly allocation rollup table would fix the slow filter and lets us sort by "most over".
- API tests against a seeded database.
- Changing weekly hours should not change the past, so I would try to find a solution for that.
- A failed save's form state is currently lost if I scroll down the table. I would fix that.
- There are no holidays and time off.
- Concurrent edits enhancement. Last write wins currently.
- The columns are not virtualised and the range is capped at 106 weeks.

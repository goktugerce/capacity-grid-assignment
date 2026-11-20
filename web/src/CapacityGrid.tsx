import { isOver } from './utils/capacity'
import { PersonRow } from './components/PersonRow'
import { useCapacity } from './hooks/useCapacity'

type Props = {
  from: string
  to: string
}

const weekLabel = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

export function CapacityGrid({ from, to }: Props) {
  const capacity = useCapacity(from, to)

  const loadError = capacity.isError && (
    <p role="alert" className="error">
      Could not load capacity ({capacity.error.message}).{' '}
      <button type="button" onClick={() => capacity.refetch()}>
        Try again
      </button>
    </p>
  )

  if (!capacity.data) {
    return loadError || <p role="status">Loading capacity…</p>
  }

  const pages = capacity.data.pages
  const weeks = pages[0].weeks
  const total = pages[pages.length - 1].total
  const people = pages.flatMap((page) => page.people)
  const overCount = people.filter((p) =>
    p.allocated.some((hours) => isOver(hours, p.weeklyHours)),
  ).length
  const changingRange = capacity.isPlaceholderData

  return (
    <section aria-busy={capacity.isFetching}>
      {loadError}
      <p className="summary" role="status">
        {changingRange
          ? 'Loading…'
          : `${overCount} of ${people.length} people shown are over capacity in this range.`}
      </p>
      <div className={changingRange ? 'grid-scroll stale' : 'grid-scroll'}>
        <table className="grid">
          <thead>
            <tr>
              <th scope="col" className="sticky-col">
                Person
              </th>
              <th scope="col">Hours / week</th>
              {weeks.map((week) => (
                <th scope="col" key={week} className="num">
                  {weekLabel.format(new Date(`${week}T00:00:00Z`))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                weeks={weeks}
                disabled={capacity.isFetching}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="paging">
        Showing {people.length} of {total} people.{' '}
        {capacity.hasNextPage && (
          <button
            type="button"
            onClick={() => capacity.fetchNextPage()}
            disabled={capacity.isFetching}
          >
            {capacity.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </p>
    </section>
  )
}

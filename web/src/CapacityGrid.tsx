import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState } from 'react'
import { PersonRow } from './components/PersonRow'
import { useCapacity } from './hooks/useCapacity'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { isOver } from './utils/capacity'

type Props = {
  from: string
  to: string
}

const ROW_HEIGHT = 41
const SEARCH_DELAY_MS = 250

const weekLabel = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

export function CapacityGrid({ from, to }: Props) {
  const [searchInput, setSearchInput] = useState('')
  const [nameDescending, setNameDescending] = useState(false)
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DELAY_MS)
  const capacity = useCapacity({ from, to }, { search, nameDescending })

  const pages = capacity.data?.pages ?? []
  const weeks = pages[0]?.weeks ?? []
  const total = pages[pages.length - 1]?.total ?? 0
  const people = pages.flatMap((page) => page.people)

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: people.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => people[index].id,
    overscan: 10,
  })
  const rows = virtualizer.getVirtualItems()
  const spaceAbove = rows[0]?.start ?? 0
  const spaceBelow = virtualizer.getTotalSize() - (rows[rows.length - 1]?.end ?? 0)

  const overCount = people.filter((p) =>
    p.allocated.some((hours) => isOver(hours, p.weeklyHours)),
  ).length
  const stale = capacity.isPlaceholderData
  const columnCount = weeks.length + 2

  let summary = `${overCount} of ${people.length} people shown are over capacity in this range.`
  if (!capacity.data) summary = capacity.isError ? '' : 'Loading capacity…'
  else if (stale) summary = 'Loading…'
  else if (people.length === 0) summary = search ? `No one matches “${search}”.` : 'No people yet.'

  return (
    <section aria-busy={capacity.isFetching}>
      <div className="grid-toolbar">
        <label>
          Search people{' '}
          <input
            type="search"
            value={searchInput}
            maxLength={100}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <p className="summary" role="status">
          {summary}
        </p>
      </div>
      {capacity.isError && (
        <p role="alert" className="error">
          Could not load capacity: {capacity.error.message}.{' '}
          <button type="button" onClick={() => capacity.refetch()}>
            Try again
          </button>
        </p>
      )}
      <div
        ref={scrollRef}
        hidden={!capacity.data}
        className={stale ? 'grid-scroll stale' : 'grid-scroll'}
      >
        <table className="grid">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky-col"
                aria-sort={nameDescending ? 'descending' : 'ascending'}
              >
                <button
                  type="button"
                  className="sort"
                  onClick={() => setNameDescending((descending) => !descending)}
                >
                  Person {nameDescending ? '↓' : '↑'}
                </button>
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
            {spaceAbove > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columnCount} style={{ height: spaceAbove, padding: 0, border: 0 }} />
              </tr>
            )}
            {rows.map((row) => (
              <PersonRow
                key={row.key}
                index={row.index}
                measureRef={virtualizer.measureElement}
                person={people[row.index]}
                weeks={weeks}
                disabled={capacity.isFetching}
              />
            ))}
            {spaceBelow > 0 && (
              <tr aria-hidden="true">
                <td colSpan={columnCount} style={{ height: spaceBelow, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="paging" hidden={!capacity.data}>
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

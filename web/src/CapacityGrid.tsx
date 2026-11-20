import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'
import { Icon } from './components/Icon'
import { PersonRow } from './components/PersonRow'
import { useCapacity } from './hooks/useCapacity'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { isOver } from './utils/capacity'

type Props = {
  from: string
  to: string
}

const ROW_HEIGHT = 44
const SEARCH_DELAY_MS = 250
const LOAD_AHEAD_ROWS = 10

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

  const lastVisibleIndex = rows[rows.length - 1]?.index ?? -1
  const nearEnd = lastVisibleIndex >= people.length - LOAD_AHEAD_ROWS
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } = capacity
  useEffect(() => {
    if (nearEnd && hasNextPage && !isFetching && !isFetchNextPageError) void fetchNextPage()
  }, [nearEnd, hasNextPage, isFetching, isFetchNextPageError, fetchNextPage])

  const overCount = people.filter((p) =>
    p.allocated.some((hours) => isOver(hours, p.weeklyHours)),
  ).length
  const stale = capacity.isPlaceholderData
  const columnCount = weeks.length + 2
  // A next-page fetch only brings people who are not on screen yet, so it
  // cannot overwrite an edit. Every other fetch can, so editing waits for it.
  const editingLocked = isFetching && !capacity.isFetchingNextPage

  let summary = `of ${people.length} shown`
  if (!capacity.data) summary = capacity.isError ? '' : 'Loading capacity…'
  else if (stale) summary = 'Loading…'
  else if (people.length === 0) summary = search ? `No one matches “${search}”.` : 'No people yet.'
  const showOverCount = capacity.data && !stale && people.length > 0

  return (
    <section aria-busy={isFetching}>
      <div className="grid-toolbar">
        <input
          type="search"
          className="search"
          aria-label="Search people"
          placeholder="Search people"
          value={searchInput}
          maxLength={100}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <p className="summary" role="status">
          {showOverCount && (
            <strong className={overCount > 0 ? 'badge over' : 'badge'}>
              {overCount} over capacity
            </strong>
          )}{' '}
          {summary}
        </p>
      </div>
      {capacity.isError && (
        <p role="alert" className="banner">
          Could not load capacity: {capacity.error.message}.
          <button type="button" className="button" onClick={() => capacity.refetch()}>
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
                  Person
                  <Icon name={nameDescending ? 'arrow-down' : 'arrow-up'} />
                </button>
              </th>
              <th scope="col">Hours / week</th>
              {weeks.map((week) => (
                <th scope="col" key={week} className="num" title={`Week starting ${week}`}>
                  {weekLabel.format(new Date(`${week}T00:00:00Z`))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spaceAbove > 0 && (
              <tr aria-hidden="true" className="spacer">
                <td colSpan={columnCount} style={{ height: spaceAbove }} />
              </tr>
            )}
            {rows.map((row) => (
              <PersonRow
                key={row.key}
                index={row.index}
                measureRef={virtualizer.measureElement}
                person={people[row.index]}
                weeks={weeks}
                disabled={editingLocked}
              />
            ))}
            {spaceBelow > 0 && (
              <tr aria-hidden="true" className="spacer">
                <td colSpan={columnCount} style={{ height: spaceBelow }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="paging" hidden={!capacity.data}>
        Showing {people.length} of {total} people.
        {capacity.isFetchingNextPage && ' Loading more…'}
        {isFetchNextPageError && (
          <button type="button" className="link" onClick={() => fetchNextPage()}>
            Load more
          </button>
        )}
      </p>
    </section>
  )
}

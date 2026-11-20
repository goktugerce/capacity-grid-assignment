import { useState } from 'react'
import type { PersonCapacity } from '../types'
import { MAX_WEEKLY_HOURS, formatHours, isOver, parseWeeklyHours } from '../utils/capacity'
import { useSaveWeeklyHours } from '../hooks/useCapacity'

type Props = {
  person: PersonCapacity
  weeks: string[]
  disabled: boolean
  index: number
  measureRef: (row: HTMLTableRowElement | null) => void
}

export function PersonRow({ person, weeks, disabled, index, measureRef }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const save = useSaveWeeklyHours()

  function discard() {
    setDraft(null)
    setInvalid(false)
    save.reset()
  }

  function commit() {
    if (draft === null || save.isPending) return
    const weeklyHours = parseWeeklyHours(draft)
    if (weeklyHours === null) {
      setInvalid(true)
      return
    }
    if (weeklyHours === person.weeklyHours) {
      discard()
      return
    }
    setInvalid(false)
    save.mutate({ person, weeklyHours }, { onSuccess: () => setDraft(null) })
  }

  const error = invalid
    ? `Enter a number from 0 to ${MAX_WEEKLY_HOURS}.`
    : save.isError
      ? `Not saved: ${save.error.message}. Still ${formatHours(person.weeklyHours)}h.`
      : ''
  const errorId = `hours-error-${person.id}`

  return (
    <tr ref={measureRef} data-index={index}>
      <th scope="row" className="sticky-col">
        {person.name}
      </th>
      <td className="hours">
        <input
          type="number"
          min={0}
          max={MAX_WEEKLY_HOURS}
          step="any"
          aria-label={`Weekly hours for ${person.name}`}
          aria-invalid={error !== ''}
          aria-describedby={error ? errorId : undefined}
          value={draft ?? formatHours(person.weeklyHours)}
          disabled={disabled || save.isPending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') discard()
          }}
        />
        {save.isPending && <span className="hint">Saving…</span>}
        {error && (
          <span id={errorId} role="alert" className="error">
            {error}{' '}
            <button type="button" onClick={commit}>
              Retry
            </button>{' '}
            <button type="button" onClick={discard}>
              Discard
            </button>
          </span>
        )}
      </td>
      {weeks.map((week, i) => {
        const allocated = person.allocated[i] ?? 0
        const over = isOver(allocated, person.weeklyHours)
        return (
          <td
            key={week}
            className={over ? 'num over' : allocated === 0 ? 'num empty' : 'num'}
            title={`${formatHours(allocated)}h allocated of ${formatHours(person.weeklyHours)}h`}
          >
            {formatHours(allocated)}
            {over && (
              <span className="over-by"> +{formatHours(allocated - person.weeklyHours)} over</span>
            )}
          </td>
        )
      })}
    </tr>
  )
}

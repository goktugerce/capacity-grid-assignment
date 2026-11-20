import { type CSSProperties, useState } from 'react'
import { useSaveWeeklyHours } from '../hooks/useCapacity'
import type { PersonCapacity } from '../types'
import {
  MAX_WEEKLY_HOURS,
  formatHours,
  isOver,
  loadPercent,
  parseWeeklyHours,
} from '../utils/capacity'

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

  const errorId = `hours-error-${person.id}`
  const hasError = invalid || save.isError

  return (
    <tr ref={measureRef} data-index={index}>
      <th scope="row" className="sticky-col" title={person.name}>
        {person.name}
      </th>
      <td className="hours">
        <span className="hours-field">
          <input
            type="number"
            min={0}
            max={MAX_WEEKLY_HOURS}
            step="any"
            aria-label={`Weekly hours for ${person.name}`}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
            value={draft ?? formatHours(person.weeklyHours)}
            disabled={disabled || save.isPending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') discard()
            }}
          />
          {save.isPending && <span className="hours-status">Saving…</span>}
          {invalid && (
            <span id={errorId} role="alert" className="hours-status error">
              0 to {MAX_WEEKLY_HOURS} only
              <button type="button" className="link" onClick={discard}>
                Discard
              </button>
            </span>
          )}
          {save.isError && !invalid && (
            <SaveError
              id={errorId}
              message={`Not saved: ${save.error.message}. Still ${formatHours(person.weeklyHours)}h.`}
              onRetry={commit}
              onDiscard={discard}
            />
          )}
        </span>
      </td>
      {weeks.map((week, i) => {
        const allocated = person.allocated[i] ?? 0
        const over = isOver(allocated, person.weeklyHours)
        return (
          <td
            key={week}
            className={over ? 'num over' : allocated === 0 ? 'num empty' : 'num'}
            style={{ '--load': loadPercent(allocated, person.weeklyHours) } as CSSProperties}
            title={`${formatHours(allocated)}h allocated of ${formatHours(person.weeklyHours)}h`}
          >
            {formatHours(allocated)}
            {over && (
              <span className="over-by">+{formatHours(allocated - person.weeklyHours)} over</span>
            )}
          </td>
        )
      })}
    </tr>
  )
}

type SaveErrorProps = {
  id: string
  message: string
  onRetry: () => void
  onDiscard: () => void
}

// The row has a fixed height, so the visible part stays on one line. The full
// reason is in the tooltip and is what a screen reader announces.
function SaveError({ id, message, onRetry, onDiscard }: SaveErrorProps) {
  return (
    <span id={id} role="alert" className="hours-status error" title={message}>
      <span aria-hidden="true">Not saved</span>
      <span className="sr-only">{message}</span>
      <button type="button" className="link" onClick={onRetry}>
        Retry
      </button>
      <button type="button" className="link" onClick={onDiscard}>
        Discard
      </button>
    </span>
  )
}

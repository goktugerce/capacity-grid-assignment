import type { DateRange } from '../types'
import { isValidRange, shiftWeeks } from '../utils/dates'

type Props = {
  range: DateRange
  onChange: (range: DateRange) => void
}

export function RangeControls({ range, onChange }: Props) {
  const valid = isValidRange(range)

  return (
    <form className="range" onSubmit={(e) => e.preventDefault()}>
      <button type="button" onClick={() => onChange(shiftWeeks(range, -1))} disabled={!valid}>
        ← Previous week
      </button>
      <label>
        From{' '}
        <input
          type="date"
          value={range.from}
          onChange={(e) => onChange({ ...range, from: e.target.value })}
        />
      </label>
      <label>
        To{' '}
        <input
          type="date"
          value={range.to}
          min={range.from}
          onChange={(e) => onChange({ ...range, to: e.target.value })}
        />
      </label>
      <button type="button" onClick={() => onChange(shiftWeeks(range, 1))} disabled={!valid}>
        Next week →
      </button>
      <span className="hint">
        Shown as whole weeks, Monday to Sunday. Hours count weekdays only.
      </span>
    </form>
  )
}

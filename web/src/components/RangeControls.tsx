import type { DateRange } from '../types'
import { isValidRange, shiftWeeks } from '../utils/dates'
import { Icon } from './Icon'

type Props = {
  range: DateRange
  onChange: (range: DateRange) => void
}

export function RangeControls({ range, onChange }: Props) {
  const valid = isValidRange(range)

  return (
    <form className="range" onSubmit={(e) => e.preventDefault()}>
      <div className="range-fields">
        <button
          type="button"
          className="button"
          onClick={() => onChange(shiftWeeks(range, -1))}
          disabled={!valid}
        >
          <Icon name="chevron-left" />
          Previous week
        </button>
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={range.from}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="button"
          onClick={() => onChange(shiftWeeks(range, 1))}
          disabled={!valid}
        >
          Next week
          <Icon name="chevron-right" />
        </button>
      </div>
      <p className="hint">Weeks run Monday to Sunday. Weekends don't count towards hours.</p>
    </form>
  )
}

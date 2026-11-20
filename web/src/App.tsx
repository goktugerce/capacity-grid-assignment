import { useState } from 'react'
import { CapacityGrid } from './CapacityGrid'
import { RangeControls } from './components/RangeControls'
import type { DateRange } from './types'
import { isValidRange } from './utils/dates'

const INITIAL_RANGE: DateRange = { from: '2025-12-29', to: '2026-01-16' }

export function App() {
  const [range, setRange] = useState(INITIAL_RANGE)

  return (
    <main>
      <h1>Team capacity</h1>
      <RangeControls range={range} onChange={setRange} />
      {isValidRange(range) ? (
        <CapacityGrid from={range.from} to={range.to} />
      ) : (
        <p role="alert" className="error">
          Pick a start date that is on or before the end date.
        </p>
      )}
    </main>
  )
}

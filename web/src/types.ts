export type PersonCapacity = {
  id: number
  name: string
  weeklyHours: number
  allocated: number[]
}

export type CapacityPage = {
  weeks: string[]
  people: PersonCapacity[]
  total: number
  nextOffset: number | null
}

export type DateRange = {
  from: string
  to: string
}

export type CapacityFilters = {
  search: string
  nameDescending: boolean
}

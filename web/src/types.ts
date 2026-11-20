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
  overOnly: boolean
}

export type ProjectAllocation = {
  id: number
  name: string
  allocated: number[]
}

export type PersonAllocations = {
  weeks: string[]
  projects: ProjectAllocation[]
}

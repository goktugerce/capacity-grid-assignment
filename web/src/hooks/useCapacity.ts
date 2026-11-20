import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { fetchCapacity, saveWeeklyHours } from '../api/capacity'
import type { CapacityFilters, CapacityPage, DateRange, PersonCapacity } from '../types'

const CAPACITY_KEY = ['capacity'] as const

export function useCapacity(range: DateRange, filters: CapacityFilters) {
  return useInfiniteQuery({
    queryKey: [...CAPACITY_KEY, range, filters],
    queryFn: ({ pageParam, signal }) => fetchCapacity(range, filters, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    placeholderData: keepPreviousData,
  })
}

type SaveVariables = {
  person: PersonCapacity
  weeklyHours: number
}

// Allocated hours do not depend on capacity, so a save only patches the
// person's weeklyHours, in every cached range, and never refetches.
export function useSaveWeeklyHours() {
  const queryClient = useQueryClient()

  function setWeeklyHours(id: number, weeklyHours: number) {
    queryClient.setQueriesData<InfiniteData<CapacityPage>>(
      { queryKey: CAPACITY_KEY },
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            people: page.people.map((p) => (p.id === id ? { ...p, weeklyHours } : p)),
          })),
        },
    )
  }

  return useMutation({
    mutationFn: ({ person, weeklyHours }: SaveVariables) =>
      saveWeeklyHours(person.id, weeklyHours),
    onMutate: ({ person, weeklyHours }) => setWeeklyHours(person.id, weeklyHours),
    onSuccess: (saved) => setWeeklyHours(saved.id, saved.weeklyHours),
    onError: (_error, { person }) => setWeeklyHours(person.id, person.weeklyHours),
  })
}

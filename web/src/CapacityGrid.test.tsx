import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { CapacityGrid } from './CapacityGrid'

describe('editing weekly hours', () => {
  // jsdom has no layout, so the row virtualiser would see a 0px viewport and render nothing.
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 800 })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  const page = {
    weeks: ['2026-01-05'],
    people: [{ id: 4, name: 'Dee Okafor', weeklyHours: 40, allocated: [45] }],
    total: 1,
    nextOffset: null,
  }

  function stubFetch(patch: () => Response) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'PATCH' ? patch() : Response.json(page),
      ),
    )
  }

  function renderGrid() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <CapacityGrid from="2026-01-05" to="2026-01-09" />
      </QueryClientProvider>,
    )
  }

  async function editHours(value: string) {
    const input = await screen.findByLabelText('Weekly hours for Dee Okafor')
    fireEvent.change(input, { target: { value } })
    fireEvent.blur(input)
  }

  it('recomputes over-allocation from the saved value without refetching', async () => {
    stubFetch(() => Response.json({ id: 4, name: 'Dee Okafor', weeklyHours: 48 }))
    renderGrid()

    expect(await screen.findByText('+5 over')).toBeTruthy()
    await editHours('48')

    await waitFor(() => expect(screen.queryByText('+5 over')).toBeNull())
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => !init?.method)).toHaveLength(1)
  })

  it('restores the previous capacity and keeps the typed value when a save fails', async () => {
    stubFetch(() => Response.json({ error: 'could not save weekly hours' }, { status: 500 }))
    renderGrid()

    await editHours('48')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Not saved: could not save weekly hours. Still 40h.')
    expect(screen.getByText('+5 over')).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>('Weekly hours for Dee Okafor').value).toBe('48')
  })
})

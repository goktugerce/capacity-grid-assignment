import { usePersonAllocations } from '../hooks/useCapacity'
import type { DateRange } from '../types'
import { formatHours } from '../utils/capacity'

type Props = {
  personId: number
  range: DateRange
  columnCount: number
}

export function ProjectRows({ personId, range, columnCount }: Props) {
  const allocations = usePersonAllocations(personId, range, true)

  if (allocations.isPending || allocations.isError || allocations.data.projects.length === 0) {
    return (
      <tr className="project-row">
        <td colSpan={columnCount} className="project-note">
          {allocations.isPending && 'Loading projects…'}
          {allocations.isError && (
            <span role="alert" className="error">
              Could not load projects: {allocations.error.message}.{' '}
              <button type="button" className="link" onClick={() => allocations.refetch()}>
                Try again
              </button>
            </span>
          )}
          {allocations.isSuccess && 'No assignments in these weeks.'}
        </td>
      </tr>
    )
  }

  return allocations.data.projects.map((project) => (
    <tr key={project.id} className="project-row">
      <th scope="row" className="sticky-col" title={project.name}>
        {project.name}
      </th>
      <td className="hours" />
      {project.allocated.map((hours, i) => (
        <td key={allocations.data.weeks[i]} className={hours === 0 ? 'num empty' : 'num'}>
          {formatHours(hours)}
        </td>
      ))}
    </tr>
  ))
}

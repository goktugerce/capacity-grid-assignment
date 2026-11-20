const PATHS = {
  'chevron-left': 'M10 3.5 5.5 8l4.5 4.5',
  'chevron-right': 'M6 3.5 10.5 8 6 12.5',
  'chevron-down': 'M3.5 6 8 10.5 12.5 6',
  'arrow-up': 'M8 13V3.5M4 7l4-3.5L12 7',
  'arrow-down': 'M8 3v9.5M4 9l4 3.5L12 9',
} as const

type Props = {
  name: keyof typeof PATHS
}

export function Icon({ name }: Props) {
  return (
    <svg
      className="icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

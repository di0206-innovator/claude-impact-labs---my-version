/** Tab icons for the site nav. Decorative: each sits beside its text label. */
type Props = { className?: string };

function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function ReportTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </Svg>
  );
}

export function MapTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </Svg>
  );
}

export function AskTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5L5 18.5Z" />
      <path d="M9 9.5h6M9 12.5h4" />
    </Svg>
  );
}

export function RoadsTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 19L8 5M20 19L16 5M12 7v3M12 14v3" />
    </Svg>
  );
}

export function OverviewTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
    </Svg>
  );
}

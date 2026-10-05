type IconProps = { className?: string };

export function PlusIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className={className}
    >
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

export function MoreIcon({ className }: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 20 4" fill="currentColor" className={className}>
      <circle cx="2" cy="2" r="1.6" />
      <circle cx="10" cy="2" r="1.6" />
      <circle cx="18" cy="2" r="1.6" />
    </svg>
  );
}

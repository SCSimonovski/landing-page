interface ArchMotifProps {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export function ArchMotif({
  size = 260,
  color = "#6B8A7A",
  opacity = 1,
  className,
}: ArchMotifProps) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      style={{ opacity }}
      aria-hidden="true"
      className={className}
    >
      <path
        d="M 0,130 L 0,40 A 50,40 0 0 1 100,40 L 100,130 Z M 14,130 L 14,52 A 36,32 0 0 1 86,52 L 86,130 Z"
        fill={color}
        fillRule="evenodd"
      />
    </svg>
  );
}

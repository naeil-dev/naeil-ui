export function Logo({
  size = 20,
  mono = false,
  className,
}: {
  size?: number;
  mono?: boolean;
  className?: string;
}) {
  const id = `naeil-logo-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="naeil"
      className={className}
    >
      <path
        d="M6 4 L6 16 L20 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {mono ? (
        <circle cx="15" cy="16" r="3.5" fill="currentColor" mask={`url(#${id})`} />
      ) : (
        <circle cx="15" cy="16" r="3.5" fill={`url(#${id}-grad)`} mask={`url(#${id})`} />
      )}
      <defs>
        {!mono && (
          <linearGradient
            id={`${id}-grad`}
            x1="15"
            y1="12.5"
            x2="15"
            y2="16"
          >
            <stop stopColor="#eab308" />
            <stop offset="1" stopColor="#dc2626" />
          </linearGradient>
        )}
        <mask id={id}>
          <rect x="0" y="0" width="24" height="16" fill="white" />
        </mask>
      </defs>
    </svg>
  );
}

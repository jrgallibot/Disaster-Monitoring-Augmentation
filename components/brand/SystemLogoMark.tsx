import { cn } from "@/lib/utils";

interface SystemLogoMarkProps {
  size?: number;
  className?: string;
}

/** QRT shield mark — radar pulse + quick response emblem */
export function SystemLogoMark({ size = 48, className }: SystemLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="QRT Monitoring System"
    >
      <defs>
        <linearGradient id="qrtShieldGrad" x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#004080" />
          <stop offset="1" stopColor="#003366" />
        </linearGradient>
        <linearGradient id="qrtGoldGrad" x1="20" y1="14" x2="44" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8C547" />
          <stop offset="1" stopColor="#C9A227" />
        </linearGradient>
      </defs>

      {/* Outer shield */}
      <path
        d="M32 3.5 54.5 14.5V34.5C54.5 48.2 32 59.5 32 59.5 32 59.5 9.5 48.2 9.5 34.5V14.5L32 3.5Z"
        fill="url(#qrtShieldGrad)"
        stroke="url(#qrtGoldGrad)"
        strokeWidth="2.2"
      />

      {/* Radar arcs */}
      <path
        d="M32 22a10 10 0 0 1 7.07 2.93"
        stroke="#66B3FF"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M32 18a14 14 0 0 1 9.9 4.1"
        stroke="#66B3FF"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M32 14a18 18 0 0 1 12.73 5.27"
        stroke="#66B3FF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Crosshair center */}
      <circle cx="32" cy="34" r="2.2" fill="#C9A227" />
      <path d="M32 28v4.5M32 35.5V40M28 34h4.5M35.5 34H40" stroke="#C9A227" strokeWidth="1.4" strokeLinecap="round" />

      {/* QRT monogram bar */}
      <rect x="17" y="43" width="30" height="11" rx="2.5" fill="#C9A227" />
      <text
        x="32"
        y="51.5"
        textAnchor="middle"
        fill="#003366"
        fontSize="8.5"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="1.2"
      >
        QRT
      </text>
    </svg>
  );
}

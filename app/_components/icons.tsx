const base = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  className: "size-5",
} as const;

export function TeacherIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <circle cx="12" cy="9" r="2.4" />
      <path
        d="M7.8 17.5c.6-2.1 2.1-3.2 4.2-3.2s3.6 1.1 4.2 3.2M8 5.8h2M14 5.8h2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StudentIcon() {
  return (
    <svg {...base}>
      <path d="m2.5 8.5 9.5-5 9.5 5-9.5 5-9.5-5Z" strokeLinejoin="round" />
      <path
        d="M6.5 11v5.1c3.4 2.8 7.6 2.8 11 0V11M21.5 9v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardIcon({
  className = "size-[18px]",
}: {
  className?: string;
}) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function ReportIcon({
  className = "size-[18px]",
}: {
  className?: string;
}) {
  return (
    <svg {...base} className={className}>
      <path
        d="M7 3.5h7.5L19 8v12.5H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5Z"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V8h5M9 12.5h6.5M9 16h6.5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckCircleIcon({
  className = "size-[18px]",
}: {
  className?: string;
}) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path
        d="m8.5 12.2 2.4 2.4 4.6-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoutIcon({
  className = "size-[18px]",
}: {
  className?: string;
}) {
  return (
    <svg {...base} className={className}>
      <path
        d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14"
        strokeLinecap="round"
      />
      <path
        d="M10.5 12H20m0 0-3.5-3.5M20 12l-3.5 3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type IconProps = { className?: string };

export function QrIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <path
        d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 18.5v2M18.5 14h2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M12 3.5 5 6.2v5.3c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6.2l-7-2.7Z"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2.2 2.2L15.5 10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function EyeOffIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M10 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.4 7.4C3.9 9.1 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1M9.9 9.9a2.8 2.8 0 0 0 4.2 4.2M3.5 3.5l17 17"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M4.5 12h15m0 0-5-5m5 5-5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

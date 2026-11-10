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

export function SunIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path
        d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"
        strokeLinecap="round"
      />
      <path
        d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.6.6 2.6 2 3 4.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function UploadIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M12 15V4m0 0-4 4m4-4 4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 14.5v3A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5v-3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PencilIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="m4.5 19.5 1-4L15.8 5.2a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.5 18.5l-4 1Z"
        strokeLinejoin="round"
      />
      <path d="m14 7 3 3" />
    </svg>
  );
}

export function KeyIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="15" r="4" />
      <path
        d="m11 12 8.5-8.5M16 7l2.5 2.5M18.5 4.5 20 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PhoneIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10 10.5v6M14 10.5v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </svg>
  );
}

export function CloseIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

export function BookIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M4.5 5.5A2 2 0 0 1 6.5 3.5h12v14h-12a2 2 0 0 0-2 2v-14Z"
        strokeLinejoin="round"
      />
      <path d="M4.5 19.5a2 2 0 0 0 2 2h12v-4M9 7.5h6" strokeLinecap="round" />
    </svg>
  );
}

export function MapPinIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function FingerprintIcon({ className = "size-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M6.5 18.5c1-2 1.5-4 1.5-6.5a4 4 0 0 1 8 0c0 1.5-.1 3-.4 4.4M12 12c0 3-.6 5.8-2 8.5M16 19.5c.3-.8.6-1.7.8-2.6M4.5 15c.3-1 .5-2 .5-3a7 7 0 0 1 12.6-4.2M19 12c0 .7 0 1.3-.1 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Schlichte geometrische 16px-Icons im Fluent-Stil (Strichstärke 1.5)

type P = { size?: number };
const S = (props: P) => ({
  width: props.size ?? 16,
  height: props.size ?? 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconDashboard = (p: P) => (
  <svg {...S(p)}>
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
    <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" />
    <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" />
    <rect x="9" y="9" width="5.5" height="5.5" rx="1" />
  </svg>
);

export const IconBuilding = (p: P) => (
  <svg {...S(p)}>
    <path d="M3 14.5V3l5-1.5L13 3v11.5" />
    <path d="M1.5 14.5h13" />
    <path d="M6 5.5h1M9 5.5h1M6 8h1M9 8h1M6.5 14.5v-3h3v3" />
  </svg>
);

export const IconPeople = (p: P) => (
  <svg {...S(p)}>
    <circle cx="5.5" cy="5" r="2.5" />
    <path d="M1.5 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4" />
    <circle cx="11.5" cy="5.5" r="2" />
    <path d="M11 9.5c1.9 0 3.5 1.6 3.5 3.5" />
  </svg>
);

export const IconReceipt = (p: P) => (
  <svg {...S(p)}>
    <path d="M3.5 1.5h9v13l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1z" />
    <path d="M6 5h4M6 7.5h4M6 10h2.5" />
  </svg>
);

export const IconCalculator = (p: P) => (
  <svg {...S(p)}>
    <rect x="3" y="1.5" width="10" height="13" rx="1.5" />
    <path d="M5.5 4.5h5" />
    <path d="M5.5 8h.01M8 8h.01M10.5 8h.01M5.5 10.5h.01M8 10.5h.01M10.5 10.5h.01M5.5 12.5h.01M8 12.5h.01M10.5 12.5h.01" />
  </svg>
);

export const IconWrench = (p: P) => (
  <svg {...S(p)}>
    <path d="M9.5 4a3 3 0 0 1 4-2.8L11.6 3.1l1.3 1.3 1.9-1.9A3 3 0 0 1 11 6.5L5 12.6a1.6 1.6 0 0 1-2.3-2.3L8.8 4.2c.3.1.5.1.7-.2z" />
  </svg>
);

export const IconTruck = (p: P) => (
  <svg {...S(p)}>
    <path d="M1.5 3.5h8v8h-8z" />
    <path d="M9.5 6h3l2 2.5v3h-5" />
    <circle cx="4.5" cy="12.5" r="1.5" />
    <circle cx="11.5" cy="12.5" r="1.5" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...S(p)}>
    <path d="M8 1.5v8.5M4.5 7 8 10.5 11.5 7" />
    <path d="M2 12v2.5h12V12" />
  </svg>
);

export const IconGear = (p: P) => (
  <svg {...S(p)}>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
  </svg>
);

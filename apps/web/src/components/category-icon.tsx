// Icônes de catégorie — trait fin, viewBox 24, hérite de currentColor.
// Style repris du canvas de référence (CategoryIcon.dc.html).

interface Props {
  type: string;
  size?: number;
  className?: string;
}

export default function CategoryIcon({ type, size = 18, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    className,
    style: { display: 'block', flex: 'none' as const },
  };
  const s = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' as const };

  switch (type) {
    case 'OFFICE':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="11" rx="1" {...s} />
          <line x1="9" y1="19" x2="15" y2="19" {...s} />
          <line x1="12" y1="15" x2="12" y2="19" {...s} />
        </svg>
      );
    case 'MEETING_ROOM':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.5" {...s} />
          <circle cx="12" cy="4" r="1.4" fill="currentColor" />
          <circle cx="12" cy="20" r="1.4" fill="currentColor" />
          <circle cx="4" cy="12" r="1.4" fill="currentColor" />
          <circle cx="20" cy="12" r="1.4" fill="currentColor" />
        </svg>
      );
    case 'WORKSHOP':
      return (
        <svg {...common}>
          <rect x="4" y="9" width="16" height="10" rx="1" {...s} />
          <polygon points="12,3 15.5,9 8.5,9" {...s} />
        </svg>
      );
    case 'WAREHOUSE':
      return (
        <svg {...common}>
          <rect x="3" y="10" width="18" height="9" {...s} />
          <polygon points="12,4 21,10 3,10" {...s} />
          <rect x="9.5" y="13" width="5" height="6" stroke="currentColor" strokeWidth={1.4} />
        </svg>
      );
    case 'EVENT_SPACE':
      return (
        <svg {...common}>
          <polygon points="12,3 20,12 12,21 4,12" {...s} />
        </svg>
      );
    case 'PARKING':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="1" {...s} />
          <text
            x="12"
            y="16.5"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="currentColor"
            fontFamily="Arial, sans-serif"
          >
            P
          </text>
        </svg>
      );
    case 'HOUSE':
      return (
        <svg {...common}>
          <polygon points="12,3 21,10 3,10" {...s} />
          <rect x="5" y="10" width="14" height="10" {...s} />
          <rect x="10" y="14" width="4" height="6" stroke="currentColor" strokeWidth={1.4} />
        </svg>
      );
    case 'ROOM':
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="12" rx="1" {...s} />
          <path d="M4 12h10v7" {...s} />
        </svg>
      );
    case 'APARTMENT':
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="1" {...s} />
          <line x1="9" y1="7" x2="9" y2="7.5" {...s} />
          <line x1="15" y1="7" x2="15" y2="7.5" {...s} />
          <line x1="9" y1="11" x2="9" y2="11.5" {...s} />
          <line x1="15" y1="11" x2="15" y2="11.5" {...s} />
          <line x1="10.5" y1="21" x2="13.5" y2="21" {...s} />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" {...s} />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      );
  }
}

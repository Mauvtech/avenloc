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
    case 'EVENT_SPACE':
      return (
        <svg {...common}>
          <polygon points="12,3 20,12 12,21 4,12" {...s} />
        </svg>
      );
    case 'TRAINING_ROOM':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="10" rx="1" {...s} />
          <line x1="8" y1="14" x2="8" y2="19" {...s} />
          <line x1="16" y1="14" x2="16" y2="19" {...s} />
          <line x1="4" y1="19" x2="20" y2="19" {...s} />
        </svg>
      );
    case 'BOUTIQUE':
      return (
        <svg {...common}>
          <path d="M4 9l1-5h14l1 5" {...s} />
          <path d="M4 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" {...s} />
          <rect x="5" y="9" width="14" height="10" {...s} />
        </svg>
      );
    case 'CABINET':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="1" {...s} />
          <line x1="4" y1="11" x2="20" y2="11" {...s} />
          <path d="M9 15a3 3 0 0 1 6 0" {...s} />
        </svg>
      );
    case 'RESTAURANT':
      return (
        <svg {...common}>
          <line x1="7" y1="3" x2="7" y2="12" {...s} />
          <line x1="5" y1="3" x2="5" y2="8" {...s} />
          <line x1="9" y1="3" x2="9" y2="8" {...s} />
          <line x1="7" y1="12" x2="7" y2="21" {...s} />
          <path d="M17 3c-1.5 0-2.5 1.5-2.5 4s1 4 2.5 4v10" {...s} />
        </svg>
      );
    case 'DESK':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" {...s} />
          <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" {...s} />
        </svg>
      );
    case 'CREATIVE_STUDIO':
      return (
        <svg {...common}>
          <path d="M4 20l1.5-4L16 5.5a1.5 1.5 0 0 1 2 0l.5.5a1.5 1.5 0 0 1 0 2L8 18.5 4 20z" {...s} />
          <line x1="14.5" y1="7" x2="17" y2="9.5" {...s} />
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

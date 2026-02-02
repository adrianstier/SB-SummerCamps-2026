/**
 * BrandIcon — unified SVG icon system replacing raw emoji throughout the app.
 * Stroke-based, 24×24 viewBox, inherits currentColor.
 */

const PATHS = {
  // ── Camp Categories ──────────────────────────────────────
  'beach-surf': (
    <>
      <path d="M3 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
      <path d="M15 4v10" />
      <path d="M15 4c-3 1-5 4-5 7" />
    </>
  ),
  'sports': (
    <circle cx="12" cy="12" r="9" />
  ),
  'art': (
    <>
      <path d="M12 2a9 9 0 0 0-9 9c0 3.9 7.5 10.5 9 11 1.5-.5 9-7.1 9-11a9 9 0 0 0-9-9Z" />
      <circle cx="8" cy="9" r="1.5" fill="currentColor" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="16" cy="9" r="1.5" fill="currentColor" />
    </>
  ),
  'science-stem': (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v7.4L6 18a2 2 0 0 0 1.7 3h8.6a2 2 0 0 0 1.7-3l-4-7.6V3" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
      <circle cx="10" cy="14" r=".75" fill="currentColor" />
    </>
  ),
  'nature-outdoor': (
    <>
      <path d="M7 20l5-14 5 14" />
      <path d="M12 20V6" />
      <path d="M4.5 20l3.5-9 3.5 9" />
      <path d="M8 20V11" />
    </>
  ),
  'music': (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  'theater': (
    <>
      <path d="M4 4c0 8 4 12 8 12s8-4 8-12" />
      <path d="M8 9v1" />
      <path d="M16 9v1" />
      <path d="M9 14c1.5 1.5 4.5 1.5 6 0" />
    </>
  ),
  'dance': (
    <>
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v5" />
      <path d="M12 8l4-2" />
      <path d="M12 8l-4-2" />
      <path d="M12 11l-3 7" />
      <path d="M12 11l3 5 2 2" />
    </>
  ),
  'cooking': (
    <>
      <path d="M6 12h12" />
      <path d="M8 12V7a1 1 0 0 1 2 0v5" />
      <path d="M12 12V7" />
      <path d="M14 12V7a1 1 0 0 1 2 0v5" />
      <path d="M6 12a6 6 0 0 0 12 0" />
      <path d="M12 18v3" />
    </>
  ),
  'multi-activity': (
    <>
      <circle cx="8" cy="8" r="3" />
      <rect x="13" y="5" width="6" height="6" rx="1" />
      <polygon points="8,14 11,20 5,20" />
      <polygon points="16,13 19.5,18 12.5,18" />
    </>
  ),
  'animals-zoo': (
    <>
      <circle cx="12" cy="14" r="5" />
      <circle cx="8" cy="7" r="2.5" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="12" cy="14" r="2" fill="currentColor" />
    </>
  ),
  'education': (
    <>
      <path d="M4 19V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
      <path d="M20 19V8a2 2 0 0 0-2-2h-2" />
      <path d="M4 19h16" />
      <path d="M8 7h4" />
      <path d="M8 11h4" />
    </>
  ),
  'faith-based': (
    <>
      <path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
    </>
  ),
  'overnight': (
    <>
      <path d="M3 20l9-16 9 16H3z" />
      <path d="M12 20v-7" />
      <path d="M9 20v-4l3-3 3 3v4" />
      <circle cx="19" cy="5" r="2" />
    </>
  ),

  // ── Status / UI Indicators ───────────────────────────────
  'check': (
    <polyline points="4,12 9,17 20,6" />
  ),
  'hourglass': (
    <>
      <path d="M5 3h14" />
      <path d="M5 21h14" />
      <path d="M7 3v4l5 5-5 5v4" />
      <path d="M17 3v4l-5 5 5 5v4" />
    </>
  ),
  'bell': (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </>
  ),
  'calendar': (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
    </>
  ),
  'check-square': (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <polyline points="8,12 11,15 16,9" />
    </>
  ),
  'clock-plus': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
      <path d="M19 14v4" />
      <path d="M17 16h4" />
    </>
  ),
  'utensils': (
    <>
      <path d="M7 2v8a3 3 0 0 0 6 0V2" />
      <path d="M10 2v20" />
      <path d="M17 2c-1 0-3 1.5-3 5s2 4 3 4v11" />
    </>
  ),
  'van': (
    <>
      <rect x="2" y="7" width="16" height="10" rx="2" />
      <path d="M18 7h2.5l1.5 5v5h-4" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
    </>
  ),
  'card-check': (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <polyline points="14,15 16,17 20,13" />
    </>
  ),
  'people-percent': (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
      <circle cx="19" cy="9" r="1.5" />
      <circle cx="21" cy="15" r="1.5" />
      <path d="M22 8l-6 9" />
    </>
  ),

  // ── Achievements & Tips shared ───────────────────────────
  'sun': (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M5.6 5.6l1.4 1.4" />
      <path d="M17 17l1.4 1.4" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M5.6 18.4l1.4-1.4" />
      <path d="M17 7l1.4-1.4" />
    </>
  ),
  'trophy': (
    <>
      <path d="M6 4h12v4a6 6 0 0 1-12 0V4z" />
      <path d="M6 6H3a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4" />
      <path d="M18 6h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
      <path d="M12 14v3" />
      <path d="M8 21h8" />
      <path d="M10 17h4" />
    </>
  ),
  'people': (
    <>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M2 21v-2a5 5 0 0 1 10 0v2" />
      <path d="M16 21v-2a3.5 3.5 0 0 1 6 0v2" />
    </>
  ),
  'family': (
    <>
      <circle cx="8" cy="5" r="2.5" />
      <circle cx="16" cy="5" r="2.5" />
      <circle cx="12" cy="11" r="2" />
      <path d="M3 21v-2a5 5 0 0 1 5-5" />
      <path d="M21 21v-2a5 5 0 0 0-5-5" />
      <path d="M12 13v8" />
    </>
  ),
  'bird': (
    <>
      <path d="M4 14c0-4 3-9 8-9 3 0 6 1 8 4" />
      <path d="M12 5c1-2 3-3 5-3" />
      <path d="M4 14l-2 3h6" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </>
  ),
  'coin': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M9 9.5c0-1 1.3-1.5 3-1.5s3 .5 3 1.5-1.3 1.5-3 2-3 1-3 2 1.3 1.5 3 1.5 3-.5 3-1.5" />
    </>
  ),
  'heart': (
    <path d="M12 21C12 21 3 13.5 3 8.5 3 5.4 5.4 3 8.5 3c1.7 0 3.4 1 3.5 1 .1 0 1.8-1 3.5-1C18.6 3 21 5.4 21 8.5 21 13.5 12 21 12 21z" />
  ),
  'scale': (
    <>
      <path d="M12 3v18" />
      <path d="M4 7h16" />
      <path d="M4 7l-2 8h8L8 7" />
      <path d="M20 7l-2 8h-4l2-8" />
      <circle cx="12" cy="3" r="1.5" fill="currentColor" />
    </>
  ),
  'flame': (
    <path d="M12 2c-2 4-6 6-6 11a6 6 0 0 0 12 0c0-5-4-7-6-11z" />
  ),
  'lightning': (
    <polygon points="13,2 4,14 12,14 11,22 20,10 12,10" />
  ),
  'search': (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  'lightbulb': (
    <>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </>
  ),
  'clipboard': (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3h6v2H9z" fill="currentColor" />
      <path d="M9 10h6" />
      <path d="M9 14h4" />
    </>
  ),
  'target': (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  'dollar-alert': (
    <>
      <circle cx="10" cy="12" r="8" />
      <path d="M10 8v8" />
      <path d="M8 10c0-.7.9-1 2-1s2 .3 2 1-.9 1-2 1.5-2 .8-2 1.5.9 1 2 1 2-.3 2-1" />
      <path d="M20 5l-1.5 4" />
      <circle cx="20" cy="3" r="1" fill="currentColor" />
    </>
  ),
  'rocket': (
    <>
      <path d="M12 2c-3 4-4 8-4 12h8c0-4-1-8-4-12z" />
      <path d="M8 14l-2 4h12l-2-4" />
      <path d="M10 20l2 2 2-2" />
    </>
  ),
  'confetti': (
    <>
      <path d="M4 5l7 13" />
      <path d="M13 18L4 5l10 2z" />
      <circle cx="16" cy="6" r="1" fill="currentColor" />
      <circle cx="19" cy="10" r="1" fill="currentColor" />
      <circle cx="14" cy="3" r=".75" fill="currentColor" />
      <path d="M17 4l1-2" />
      <path d="M20 7l2-1" />
    </>
  ),

  // ── Additional UI Icons ─────────────────────────────────
  'lock': (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  'refresh': (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  'email': (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6l-10 7L2 6" />
    </>
  ),
  'download': (
    <>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 19h16" />
    </>
  ),
  'flag': (
    <>
      <path d="M4 3v18" />
      <path d="M4 3h12l-3 4 3 4H4" />
    </>
  ),
  'gear': (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  'tag': (
    <>
      <path d="M2 7.5V2h5.5l12 12-5.5 5.5z" />
      <circle cx="6.5" cy="6.5" r="1" fill="currentColor" />
    </>
  ),
  'child': (
    <>
      <circle cx="12" cy="5" r="3" />
      <path d="M8 21v-6a4 4 0 0 1 8 0v6" />
    </>
  ),
  'clock': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  'home': (
    <>
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  'pin': (
    <>
      <path d="M12 21c-4-4-7-7.5-7-11a7 7 0 0 1 14 0c0 3.5-3 7-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  'phone': (
    <>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2z" />
    </>
  ),
  'globe': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M2 12h20" />
      <path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9z" />
    </>
  ),
  'tree': (
    <>
      <path d="M12 22v-6" />
      <path d="M7 16l5-5 5 5" />
      <path d="M6 12l6-6 6 6" />
      <path d="M8 8l4-5 4 5" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </>
  ),
  'crystal-ball': (
    <>
      <circle cx="12" cy="10" r="7" />
      <path d="M7 19h10" />
      <path d="M8 21h8" />
      <path d="M9 7c1 1 3 1 4 0" />
    </>
  ),
  'writing': (
    <>
      <path d="M17 3l4 4-12 12H5v-4L17 3z" />
      <path d="M13 7l4 4" />
    </>
  ),

  // ── Section / UI ─────────────────────────────────────────
  'chart': (
    <>
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="3" width="4" height="17" rx="1" />
    </>
  ),
  'pencil': (
    <>
      <path d="M17 3l4 4-12 12H5v-4L17 3z" />
      <path d="M13 7l4 4" />
    </>
  ),
  'star': (
    <path d="M12 2l3 6.5H22l-5.5 4.5L18.5 20 12 16l-6.5 4 2-7L2 8.5h7z" />
  ),
  'eye': (
    <>
      <path d="M2 12c2.7-5 6.5-7.5 10-7.5S19.3 7 22 12c-2.7 5-6.5 7.5-10 7.5S4.7 17 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'thumbs-up': (
    <>
      <path d="M7 22H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h4" />
      <path d="M7 12l3-8a2 2 0 0 1 2-2h.5a1.5 1.5 0 0 1 1.5 1.5V8h5a2 2 0 0 1 2 2.2l-1.2 7A2 2 0 0 1 17.8 19H7" />
    </>
  ),
};

// Canonical name aliases — many contexts reuse the same icon shape
const ALIASES = {
  // Category aliases
  'beach': 'beach-surf',
  'surf': 'beach-surf',
  'stem': 'science-stem',
  'nature': 'nature-outdoor',
  'outdoor': 'nature-outdoor',
  'zoo': 'animals-zoo',
  'animals': 'animals-zoo',
  'camping': 'overnight',

  // Status aliases
  'status-open': 'check',
  'status-confirmed': 'check',
  'status-waitlist': 'hourglass',
  'status-opens-soon': 'bell',
  'status-upcoming': 'calendar',
  'status-calendar': 'calendar',
  'status-available': 'check-square',
  'extended-care': 'clock-plus',
  'food-meals': 'utensils',
  'transport': 'van',
  'fsa-eligible': 'card-check',
  'sibling-discount': 'people-percent',

  // Achievement aliases (same shapes, different names)
  'achievement-first-camp': 'overnight',
  'achievement-week-covered': 'calendar',
  'achievement-half-summer': 'sun',
  'achievement-full-summer': 'trophy',
  'achievement-multi-child': 'family',
  'achievement-variety': 'art',
  'achievement-early-bird': 'bird',
  'achievement-budget-pro': 'coin',
  'achievement-favorite-five': 'heart',
  'achievement-compare-master': 'scale',
  'achievement-streak-3': 'flame',
  'achievement-streak-7': 'lightning',
  'achievement-squad-joiner': 'people',
  'achievement-explorer': 'search',

  // Tip aliases
  'tip-lightbulb': 'lightbulb',
  'tip-clipboard': 'clipboard',
  'tip-target': 'target',
  'tip-dollar': 'dollar-alert',
  'tip-clock-plus': 'clock-plus',
  'tip-rocket': 'rocket',
  'tip-confetti': 'confetti',
  'tip-heart': 'heart',
  'tip-scale': 'scale',
  'tip-people': 'people',

  // Additional aliases
  'location': 'pin',
  'map-pin': 'pin',
  'mail': 'email',
  'envelope': 'email',
  'settings': 'gear',
  'cog': 'gear',
  'baby': 'child',
  'ages': 'child',
  'cancel': 'x-circle',
  'cancelled': 'x-circle',
  'preview': 'crystal-ball',
  'indoor': 'home',
  'website': 'globe',

  // UI aliases
  'ui-chart': 'chart',
  'ui-pencil': 'pencil',
  'ui-star': 'star',
  'ui-eye': 'eye',
  'ui-flame': 'flame',
  'ui-trophy': 'trophy',
  'ui-people': 'people',
  'ui-rocket': 'rocket',
  'ui-confetti': 'confetti',
  'ui-coin': 'coin',
  'overview': 'chart',
  'notes': 'pencil',
  'reviews': 'star',
};

export default function BrandIcon({
  name,
  size = 20,
  className = '',
  style,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  ...rest
}) {
  const resolvedName = ALIASES[name] || name;
  const paths = PATHS[resolvedName];

  if (!paths) {
    if (import.meta.env.DEV) {
      console.warn(`BrandIcon: unknown icon "${name}"`);
    }
    return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`brand-icon${className ? ` ${className}` : ''}`}
      style={style}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? !ariaLabel}
      {...rest}
    >
      {paths}
    </svg>
  );
}

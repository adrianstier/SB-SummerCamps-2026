import { getSummerWeeks2026 } from '../../lib/supabase';

export const summerWeeks = getSummerWeeks2026();

// Calculate total summer weeks for coverage
export const TOTAL_SUMMER_WEEKS = summerWeeks.length;

// Generate unique group ID for multi-week blocks
export function generateGroupId() {
  return 'grp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const CATEGORY_COLORS = {
  'Sports': '#3b82f6',
  'Arts': '#8b5cf6',
  'STEM': '#10b981',
  'Nature': '#059669',
  'Academic': '#f59e0b',
  'Music': '#ec4899',
  'Adventure': '#f97316',
  'Water Sports': '#0ea5e9',
};

// Block types for non-camp weeks
export const BLOCK_TYPES = [
  { id: 'vacation', label: 'Vacation', icon: 'beach-surf', color: '#60a5fa' },
  { id: 'family', label: 'Family Time', icon: 'family', color: '#a78bfa' },
  { id: 'travel', label: 'Travel', icon: 'van', color: '#34d399' },
  { id: 'staycation', label: 'Staycation', icon: 'home', color: '#fb923c' },
  { id: 'visiting', label: 'Visitors Coming', icon: 'party', color: '#c084fc' },
  { id: 'custom', label: 'Custom...', icon: 'pencil', color: '#94a3b8', isCustom: true },
];

// Color options for custom blocks
export const BLOCK_COLORS = [
  { id: 'blue', color: '#60a5fa', label: 'Ocean Blue' },
  { id: 'purple', color: '#a78bfa', label: 'Lavender' },
  { id: 'green', color: '#34d399', label: 'Mint' },
  { id: 'orange', color: '#fb923c', label: 'Sunset' },
  { id: 'pink', color: '#f472b6', label: 'Rose' },
  { id: 'teal', color: '#2dd4bf', label: 'Teal' },
  { id: 'amber', color: '#fbbf24', label: 'Amber' },
  { id: 'gray', color: '#94a3b8', label: 'Stone' },
];

// Icon options for custom blocks
export const BLOCK_ICONS = [
  { id: 'beach-surf', label: 'Beach' },
  { id: 'family', label: 'Family' },
  { id: 'van', label: 'Travel' },
  { id: 'home', label: 'Home' },
  { id: 'party', label: 'Party' },
  { id: 'calendar', label: 'Event' },
  { id: 'star', label: 'Special' },
  { id: 'heart', label: 'Love' },
];

// Conflict types
export const CONFLICT_TYPES = {
  OVERLAP: 'overlap',
  SAME_WEEK: 'same_week',
  TIME_CONFLICT: 'time_conflict'
};

// Format 24h time (e.g., "08:00") to 12h display (e.g., "8am")
export function formatWorkTime(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return minutes === 0 ? `${hour12}${ampm}` : `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`;
}

// Icons
export function ArrowLeftIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

export function CalendarExportIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function GripIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
    </svg>
  );
}

export function DragIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

export function WarningIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

export function PrintIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  );
}

export function EmailIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export function MessageIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

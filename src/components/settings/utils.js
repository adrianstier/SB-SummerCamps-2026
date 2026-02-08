/**
 * Shared constants and helpers for Settings sub-components.
 */

export const CAMP_CATEGORIES = [
  { id: 'Beach/Surf', label: 'Beach & Surf', icon: 'beach-surf' },
  { id: 'Sports', label: 'Sports', icon: 'sports' },
  { id: 'Art', label: 'Art & Creativity', icon: 'art' },
  { id: 'Science/STEM', label: 'Science & STEM', icon: 'science-stem' },
  { id: 'Nature/Outdoor', label: 'Nature & Outdoors', icon: 'nature-outdoor' },
  { id: 'Music', label: 'Music', icon: 'music' },
  { id: 'Theater', label: 'Theater & Drama', icon: 'theater' },
  { id: 'Dance', label: 'Dance', icon: 'dance' },
  { id: 'Animals/Zoo', label: 'Animals', icon: 'animals-zoo' },
  { id: 'Cooking', label: 'Cooking', icon: 'cooking' },
  { id: 'Multi-Activity', label: 'Multi-Activity', icon: 'multi-activity' },
  { id: 'Faith-Based', label: 'Faith-Based', icon: 'faith-based' }
];

export const SANTA_BARBARA_SCHOOLS = [
  { name: 'SB Unified (Default)', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Hope Elementary', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Goleta Union', endDate: '2026-06-04', startDate: '2026-08-18' },
  { name: 'Montecito Union', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Cold Spring', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Custom Dates', endDate: null, startDate: null }
];

/**
 * Format a date string (YYYY-MM-DD) for display.
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date like "Thu, Jun 5"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Calculate the number of summer weeks between school end and school start.
 * @param {string} schoolEndDate - Last day of school (YYYY-MM-DD)
 * @param {string} schoolStartDate - First day of school (YYYY-MM-DD)
 * @returns {number} Number of weeks (0 if invalid)
 */
export function getSummerWeeksCount(schoolEndDate, schoolStartDate) {
  const start = new Date(schoolEndDate);
  const end = new Date(schoolStartDate);
  const weeks = Math.floor((end - start) / (1000 * 60 * 60 * 24 * 7));
  return weeks > 0 ? weeks : 0;
}

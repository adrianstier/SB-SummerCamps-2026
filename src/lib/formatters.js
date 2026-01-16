/**
 * Shared formatting utilities
 * Used across multiple components for consistent data display
 */

/**
 * Format camp price for display
 * @param {Object} camp - Camp object with price fields
 * @returns {string} Formatted price string
 */
export function formatPrice(camp) {
  const minPrice = camp.price_min || camp.min_price;
  const maxPrice = camp.price_max || camp.max_price;

  if (!minPrice || minPrice === '0' || minPrice === 0) {
    if (camp.price_week && /free/i.test(camp.price_week)) return 'Free';
    if (camp.price_week && camp.price_week !== '$TBD') return camp.price_week;
    return 'TBD';
  }

  const min = parseInt(minPrice);
  const max = parseInt(maxPrice);

  if (isNaN(min)) return camp.price_week || 'TBD';
  if (min === max || isNaN(max)) return `$${min}/wk`;
  return `$${min}–${max}/wk`;
}

/**
 * Format price without "/wk" suffix (for comparison views)
 * @param {Object} camp - Camp object with price fields
 * @returns {string} Formatted price string
 */
export function formatPriceShort(camp) {
  const minPrice = camp.price_min || camp.min_price;
  const maxPrice = camp.price_max || camp.max_price;

  if (!minPrice || minPrice === '0' || minPrice === 0) {
    if (camp.price_week && /free/i.test(camp.price_week)) return 'Free';
    if (camp.price_week && camp.price_week !== '$TBD') return camp.price_week;
    return 'TBD';
  }

  const min = parseInt(minPrice);
  const max = parseInt(maxPrice);

  if (isNaN(min)) return camp.price_week || 'TBD';
  if (min === max || isNaN(max)) return `$${min}`;
  return `$${min}–${max}`;
}

/**
 * Format age range for display
 * @param {Object} camp - Camp object with age fields
 * @returns {string} Formatted age range
 */
export function formatAgeRange(camp) {
  const minAge = camp.min_age;
  const maxAge = camp.max_age;

  if (!minAge && !maxAge) return 'All ages';
  if (!maxAge) return `${minAge}+`;
  if (!minAge) return `Up to ${maxAge}`;
  if (minAge === maxAge) return `Age ${minAge}`;
  return `${minAge}-${maxAge}`;
}

/**
 * Format currency amount
 * @param {number} amount - Amount in dollars
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'TBD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(dateStr, options = { month: 'short', day: 'numeric' }) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', options);
}

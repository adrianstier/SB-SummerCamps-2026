import React, { memo, useRef } from 'react';
import { useHaptic } from '../hooks/usePWA';

/**
 * FilterBar - Redesigned for clarity and efficiency
 *
 * Design principles:
 * - Progressive disclosure: Start simple, reveal complexity on demand
 * - Scannable: Visual hierarchy through typography and spacing
 * - Direct: No fluff, get to the point
 * - Mobile-first: Touch-friendly targets, thumb-zone optimization
 */

// Quick filter chips - the most common filters
const QUICK_FILTERS = [
  { id: 'extended-care', label: 'Extended Care', icon: '\u23F0' },
  { id: 'under-350', label: 'Under $350', icon: '\uD83D\uDCB0' },
  { id: 'sports', label: 'Sports', category: 'Sports', icon: '\u26BD' },
  { id: 'stem', label: 'STEM', category: 'Science/STEM', icon: '\uD83D\uDD2C' },
  { id: 'art', label: 'Arts', category: 'Art', icon: '\uD83C\uDFA8' },
  { id: 'openings', label: 'Has Openings', icon: '\u2713' },
];

/**
 * Search Bar Component
 */
const SearchBar = memo(function SearchBar({ value, onChange, onClear, placeholder = "Search camps..." }) {
  const inputRef = useRef(null);
  const haptic = useHaptic();

  const handleClear = () => {
    haptic.light();
    onClear();
    inputRef.current?.focus();
  };

  return (
    <div className="filter-search">
      <svg className="filter-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="filter-search-input"
        aria-label="Search camps"
      />
      {value && (
        <button
          onClick={handleClear}
          className="filter-search-clear"
          aria-label="Clear search"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});

/**
 * Quick Filter Chip
 */
const QuickChip = memo(function QuickChip({ filter, isActive, onClick, count }) {
  const haptic = useHaptic();

  const handleClick = () => {
    haptic.light();
    onClick(filter);
  };

  return (
    <button
      onClick={handleClick}
      className={`filter-chip ${isActive ? 'filter-chip--active' : ''}`}
      aria-pressed={isActive}
      type="button"
    >
      <span className="filter-chip-icon">{filter.icon}</span>
      <span className="filter-chip-label">{filter.label}</span>
      {count !== undefined && count > 0 && (
        <span className="filter-chip-count">{count}</span>
      )}
    </button>
  );
});

/**
 * Active Filter Pills - Show what's currently applied
 */
const ActiveFilters = memo(function ActiveFilters({ filters, onRemove, onClearAll }) {
  const haptic = useHaptic();

  const activeCount = Object.keys(filters).filter(key => {
    const value = filters[key];
    return value && (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  if (activeCount === 0) return null;

  const handleRemove = (key) => {
    haptic.light();
    onRemove(key);
  };

  const handleClearAll = () => {
    haptic.medium();
    onClearAll();
  };

  return (
    <div className="filter-active">
      <div className="filter-active-pills">
        {Object.entries(filters).map(([key, value]) => {
          if (!value || (Array.isArray(value) && value.length === 0)) return null;

          const label = Array.isArray(value)
            ? `${key}: ${value.length}`
            : typeof value === 'boolean'
            ? key
            : `${key}: ${value}`;

          return (
            <button
              key={key}
              onClick={() => handleRemove(key)}
              className="filter-active-pill"
              type="button"
              aria-label={`Remove ${label} filter`}
            >
              <span>{label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          );
        })}
      </div>
      <button
        onClick={handleClearAll}
        className="filter-clear-all"
        type="button"
      >
        Clear all
      </button>
    </div>
  );
});

/**
 * Main FilterBar Component
 */
export const FilterBar = memo(function FilterBar({
  searchQuery = '',
  onSearchChange,
  filters = {},
  onFiltersChange,
  onClearFilters,
  onOpenAdvancedFilters,
  categories = [],
  categoryCounts = {},
  resultsCount = 0
}) {
  const haptic = useHaptic();

  const handleQuickFilter = (filter) => {
    const newFilters = { ...filters };

    if (filter.id === 'extended-care') {
      newFilters.extendedCare = !filters.extendedCare;
    } else if (filter.id === 'under-350') {
      if (filters.priceMax === 350) {
        delete newFilters.priceMax;
      } else {
        newFilters.priceMax = 350;
      }
    } else if (filter.id === 'openings') {
      newFilters.hasOpenings = !filters.hasOpenings;
    } else if (filter.category) {
      const current = filters.categories || [];
      if (current.includes(filter.category)) {
        newFilters.categories = current.filter(c => c !== filter.category);
      } else {
        newFilters.categories = [...current, filter.category];
      }
    }

    onFiltersChange(newFilters);
  };

  const isQuickFilterActive = (filter) => {
    if (filter.id === 'extended-care') return filters.extendedCare;
    if (filter.id === 'under-350') return filters.priceMax === 350;
    if (filter.id === 'openings') return filters.hasOpenings;
    if (filter.category) return filters.categories?.includes(filter.category);
    return false;
  };

  const handleRemoveFilter = (key) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const handleMoreFilters = () => {
    haptic.medium();
    onOpenAdvancedFilters?.();
  };

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key];
    return value && (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  return (
    <div className="filter-bar">
      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        onClear={() => onSearchChange('')}
      />

      {/* Quick Filters */}
      <div className="filter-chips">
        {QUICK_FILTERS.map(filter => (
          <QuickChip
            key={filter.id}
            filter={filter}
            isActive={isQuickFilterActive(filter)}
            onClick={handleQuickFilter}
            count={filter.category ? categoryCounts[filter.category] : undefined}
          />
        ))}
        <button
          onClick={handleMoreFilters}
          className="filter-more-btn"
          type="button"
          aria-label={`More filters${activeFiltersCount > 0 ? ` (${activeFiltersCount} active)` : ''}`}
        >
          <span>More</span>
          {activeFiltersCount > 0 && (
            <span className="filter-more-badge">{activeFiltersCount}</span>
          )}
        </button>
      </div>

      {/* Active Filters */}
      <ActiveFilters
        filters={filters}
        onRemove={handleRemoveFilter}
        onClearAll={onClearFilters}
      />

      {/* Results Count */}
      {resultsCount !== undefined && (
        <div className="filter-results" aria-live="polite" aria-atomic="true">
          <span className="filter-results-count">{resultsCount}</span>
          <span className="filter-results-label">camps</span>
        </div>
      )}
    </div>
  );
});

export default FilterBar;

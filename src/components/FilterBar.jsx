import React, { useState, memo, useRef, useEffect } from 'react';
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
  { id: 'extended-care', label: 'Extended Care', icon: '⏰' },
  { id: 'under-350', label: 'Under $350', icon: '💰' },
  { id: 'sports', label: 'Sports', category: 'Sports', icon: '⚽' },
  { id: 'stem', label: 'STEM', category: 'Science/STEM', icon: '🔬' },
  { id: 'art', label: 'Arts', category: 'Art', icon: '🎨' },
  { id: 'openings', label: 'Has Openings', icon: '✓' },
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
      <svg className="filter-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
 * More Filters Panel - Slide-out drawer for advanced options
 */
const MoreFiltersPanel = memo(function MoreFiltersPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  categories = [],
  priceRange = { min: 0, max: 1000 }
}) {
  const haptic = useHaptic();
  const panelRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    haptic.light();
    onClose();
  };

  return (
    <>
      <div className="filter-overlay" onClick={handleClose} />
      <aside ref={panelRef} className="filter-panel" role="dialog" aria-label="More filters">
        <header className="filter-panel-header">
          <h2 className="filter-panel-title">More Filters</h2>
          <button
            onClick={handleClose}
            className="filter-panel-close"
            aria-label="Close"
            type="button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="filter-panel-body">
          {/* Age Range */}
          <section className="filter-group">
            <h3 className="filter-group-title">Age</h3>
            <div className="filter-age-inputs">
              <input
                type="number"
                min="3"
                max="18"
                placeholder="Min"
                aria-label="Minimum age"
                value={filters.minAge || ''}
                onChange={(e) => onFiltersChange({ ...filters, minAge: e.target.value ? parseInt(e.target.value, 10) : null })}
                className="filter-age-input"
              />
              <span className="filter-age-separator">to</span>
              <input
                type="number"
                min="3"
                max="18"
                placeholder="Max"
                aria-label="Maximum age"
                value={filters.maxAge || ''}
                onChange={(e) => onFiltersChange({ ...filters, maxAge: e.target.value ? parseInt(e.target.value, 10) : null })}
                className="filter-age-input"
              />
            </div>
          </section>

          {/* Price Range */}
          <section className="filter-group">
            <h3 className="filter-group-title">Price per Week</h3>
            <div className="filter-price-range">
              <div className="filter-price-labels">
                <span>${filters.priceMin || priceRange.min}</span>
                <span>${filters.priceMax || priceRange.max}</span>
              </div>
              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max}
                step="25"
                aria-label={`Minimum price per week: $${filters.priceMin || priceRange.min}`}
                value={filters.priceMin || priceRange.min}
                onChange={(e) => onFiltersChange({ ...filters, priceMin: parseInt(e.target.value, 10) })}
                className="filter-price-slider"
              />
              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max}
                step="25"
                aria-label={`Maximum price per week: $${filters.priceMax || priceRange.max}`}
                value={filters.priceMax || priceRange.max}
                onChange={(e) => onFiltersChange({ ...filters, priceMax: parseInt(e.target.value, 10) })}
                className="filter-price-slider"
              />
            </div>
          </section>

          {/* Categories */}
          <section className="filter-group">
            <h3 className="filter-group-title">Categories</h3>
            <div className="filter-category-grid">
              {categories.map(category => (
                <label key={category} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.categories?.includes(category) || false}
                    onChange={(e) => {
                      const current = filters.categories || [];
                      const updated = e.target.checked
                        ? [...current, category]
                        : current.filter(c => c !== category);
                      onFiltersChange({ ...filters, categories: updated });
                    }}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="filter-group">
            <h3 className="filter-group-title">Features</h3>
            <div className="filter-features">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={filters.extendedCare || false}
                  onChange={(e) => onFiltersChange({ ...filters, extendedCare: e.target.checked })}
                />
                <span>Extended Care</span>
              </label>
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={filters.foodIncluded || false}
                  onChange={(e) => onFiltersChange({ ...filters, foodIncluded: e.target.checked })}
                />
                <span>Food Included</span>
              </label>
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={filters.hasTransport || false}
                  onChange={(e) => onFiltersChange({ ...filters, hasTransport: e.target.checked })}
                />
                <span>Transportation</span>
              </label>
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={filters.siblingDiscount || false}
                  onChange={(e) => onFiltersChange({ ...filters, siblingDiscount: e.target.checked })}
                />
                <span>Sibling Discount</span>
              </label>
            </div>
          </section>
        </div>

        <footer className="filter-panel-footer">
          <button
            onClick={handleClose}
            className="filter-panel-apply"
            type="button"
          >
            Show Results
          </button>
        </footer>
      </aside>
    </>
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
  categories = [],
  categoryCounts = {},
  priceRange,
  resultsCount = 0
}) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
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
    setShowMoreFilters(true);
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
        <div className="filter-results">
          <span className="filter-results-count">{resultsCount}</span>
          <span className="filter-results-label">camps</span>
        </div>
      )}

      {/* More Filters Panel */}
      <MoreFiltersPanel
        isOpen={showMoreFilters}
        onClose={() => setShowMoreFilters(false)}
        filters={filters}
        onFiltersChange={onFiltersChange}
        categories={categories}
        priceRange={priceRange}
      />
    </div>
  );
});

export default FilterBar;

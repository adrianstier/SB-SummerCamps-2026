import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Santa Barbara area coordinates (downtown)
const SB_DEFAULT_LOCATION = { lat: 34.4208, lng: -119.6982 };

// Camp location coordinates (approximate based on addresses)
const CAMP_LOCATIONS = {
  'east-beach': { lat: 34.4133, lng: -119.6856 },
  'west-beach': { lat: 34.4081, lng: -119.6975 },
  'ucsb': { lat: 34.4140, lng: -119.8489 },
  'goleta': { lat: 34.4358, lng: -119.8276 },
  'downtown-sb': { lat: 34.4208, lng: -119.6982 },
  'mission-canyon': { lat: 34.4490, lng: -119.7123 },
  'default': { lat: 34.4208, lng: -119.6982 }
};

// Parse address to get approximate coordinates
function getLocationFromAddress(address) {
  if (!address) return CAMP_LOCATIONS.default;
  const lower = address.toLowerCase();

  if (lower.includes('east beach')) return CAMP_LOCATIONS['east-beach'];
  if (lower.includes('west beach') || lower.includes('harbor')) return CAMP_LOCATIONS['west-beach'];
  if (lower.includes('ucsb')) return CAMP_LOCATIONS.ucsb;
  if (lower.includes('goleta') || lower.includes('hollister')) return CAMP_LOCATIONS.goleta;
  if (lower.includes('mission canyon')) return CAMP_LOCATIONS['mission-canyon'];
  if (lower.includes('state street') || lower.includes('downtown')) return CAMP_LOCATIONS['downtown-sb'];

  return CAMP_LOCATIONS.default;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Summer 2026 weeks
export const SUMMER_WEEKS_2026 = [
  { id: 'w1', label: 'Jun 8-12', start: '2026-06-08', end: '2026-06-12' },
  { id: 'w2', label: 'Jun 15-19', start: '2026-06-15', end: '2026-06-19' },
  { id: 'w3', label: 'Jun 22-26', start: '2026-06-22', end: '2026-06-26' },
  { id: 'w4', label: 'Jun 29-Jul 3', start: '2026-06-29', end: '2026-07-03' },
  { id: 'w5', label: 'Jul 6-10', start: '2026-07-06', end: '2026-07-10' },
  { id: 'w6', label: 'Jul 13-17', start: '2026-07-13', end: '2026-07-17' },
  { id: 'w7', label: 'Jul 20-24', start: '2026-07-20', end: '2026-07-24' },
  { id: 'w8', label: 'Jul 27-31', start: '2026-07-27', end: '2026-07-31' },
  { id: 'w9', label: 'Aug 3-7', start: '2026-08-03', end: '2026-08-07' },
  { id: 'w10', label: 'Aug 10-14', start: '2026-08-10', end: '2026-08-14' },
  { id: 'w11', label: 'Aug 17-21', start: '2026-08-17', end: '2026-08-21' },
];

// Filter presets
export const FILTER_PRESETS = [
  {
    id: 'working-parents',
    name: 'Best for Working Parents',
    description: 'Extended care, 8+ hour coverage',
    filters: {
      extendedCare: true,
      minHours: 8,
      sortBy: 'hours',
      sortDir: 'desc'
    }
  },
  {
    id: 'budget-full-day',
    name: 'Budget-Friendly Full Day',
    description: 'Under $350/week with full-day hours',
    filters: {
      maxPrice: 350,
      minHours: 6,
      sortBy: 'min_price',
      sortDir: 'asc'
    }
  },
  {
    id: 'active-outdoor',
    name: 'Active & Outdoors',
    description: 'Sports, nature, and outdoor activities',
    filters: {
      categories: ['Sports', 'Nature/Outdoor', 'Beach/Surf'],
      sortBy: 'camp_name',
      sortDir: 'asc'
    }
  },
  {
    id: 'creative-arts',
    name: 'Creative Arts',
    description: 'Art, music, theater, and dance',
    filters: {
      categories: ['Art', 'Music', 'Theater', 'Dance'],
      sortBy: 'camp_name',
      sortDir: 'asc'
    }
  },
  {
    id: 'stem-learning',
    name: 'STEM & Learning',
    description: 'Science, technology, and education',
    filters: {
      categories: ['Science/STEM', 'Education'],
      sortBy: 'camp_name',
      sortDir: 'asc'
    }
  },
  {
    id: 'openings-available',
    name: 'Has Openings',
    description: 'Camps accepting new registrations',
    filters: {
      hasOpenings: true,
      sortBy: 'camp_name',
      sortDir: 'asc'
    }
  },
  {
    id: 'nearby',
    name: 'Nearby',
    description: 'Sorted by distance from your location',
    filters: {
      sortByDistance: true
    }
  }
];

// Price slider component
const PriceRangeSlider = memo(function PriceRangeSlider({
  minPrice,
  maxPrice,
  priceMin,
  priceMax,
  onMinChange,
  onMaxChange
}) {
  const [localMin, setLocalMin] = useState(priceMin);
  const [localMax, setLocalMax] = useState(priceMax);

  useEffect(() => {
    setLocalMin(priceMin);
    setLocalMax(priceMax);
  }, [priceMin, priceMax]);

  const handleMinChange = (e) => {
    const value = parseInt(e.target.value);
    setLocalMin(value);
  };

  const handleMaxChange = (e) => {
    const value = parseInt(e.target.value);
    setLocalMax(value);
  };

  const handleMinCommit = () => {
    const value = Math.min(localMin, localMax - 50);
    onMinChange(value);
  };

  const handleMaxCommit = () => {
    const value = Math.max(localMax, localMin + 50);
    onMaxChange(value);
  };

  const minPercent = ((localMin - minPrice) / (maxPrice - minPrice)) * 100;
  const maxPercent = ((localMax - minPrice) / (maxPrice - minPrice)) * 100;

  return (
    <div className="price-range-slider">
      <div className="price-range-labels">
        <span className="price-range-value">${localMin}</span>
        <span className="price-range-value">${localMax}</span>
      </div>
      <div className="price-range-track">
        <div
          className="price-range-fill"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          step={25}
          value={localMin}
          onChange={handleMinChange}
          onMouseUp={handleMinCommit}
          onTouchEnd={handleMinCommit}
          className="price-range-input price-range-input-min"
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          step={25}
          value={localMax}
          onChange={handleMaxChange}
          onMouseUp={handleMaxCommit}
          onTouchEnd={handleMaxCommit}
          className="price-range-input price-range-input-max"
          aria-label="Maximum price"
        />
      </div>
    </div>
  );
});

// Category multi-select component
const CategoryMultiSelect = memo(function CategoryMultiSelect({
  categories,
  selectedCategories,
  onChange,
  categoryCounts
}) {
  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter(c => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  return (
    <div className="category-multi-select">
      {categories.map(category => {
        const count = categoryCounts?.[category] || 0;
        const isSelected = selectedCategories.includes(category);
        return (
          <button
            key={category}
            onClick={() => toggleCategory(category)}
            className={`category-chip ${isSelected ? 'active' : ''}`}
            aria-pressed={isSelected}
          >
            <span className="category-chip-name">{category}</span>
            {count > 0 && <span className="category-chip-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
});

// Week selector component
const WeekSelector = memo(function WeekSelector({ selectedWeeks, onChange }) {
  const toggleWeek = (weekId) => {
    if (selectedWeeks.includes(weekId)) {
      onChange(selectedWeeks.filter(w => w !== weekId));
    } else {
      onChange([...selectedWeeks, weekId]);
    }
  };

  const selectAll = () => {
    onChange(SUMMER_WEEKS_2026.map(w => w.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="week-selector">
      <div className="week-selector-header">
        <span className="week-selector-label">Summer 2026 Weeks</span>
        <div className="week-selector-actions">
          <button onClick={selectAll} className="week-selector-action">All</button>
          <button onClick={clearAll} className="week-selector-action">None</button>
        </div>
      </div>
      <div className="week-selector-grid">
        {SUMMER_WEEKS_2026.map(week => {
          const isSelected = selectedWeeks.includes(week.id);
          return (
            <button
              key={week.id}
              onClick={() => toggleWeek(week.id)}
              className={`week-chip ${isSelected ? 'active' : ''}`}
              aria-pressed={isSelected}
            >
              {week.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// Saved search item
const SavedSearchItem = memo(function SavedSearchItem({ search, onApply, onDelete }) {
  return (
    <div className="saved-search-item">
      <button onClick={() => onApply(search)} className="saved-search-apply">
        <span className="saved-search-name">{search.name}</span>
        <span className="saved-search-count">{search.filterCount} filters</span>
      </button>
      <button
        onClick={() => onDelete(search.id)}
        className="saved-search-delete"
        aria-label={`Delete ${search.name}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

// Main AdvancedFilters component
export const AdvancedFilters = memo(function AdvancedFilters({
  // Current filter state
  filters,
  onFiltersChange,
  // Available options
  categories,
  categoryCounts,
  priceRange,
  // Callbacks
  onClearFilters,
  onApplyPreset,
  // Save search functionality
  savedSearches,
  onSaveSearch,
  onDeleteSavedSearch,
  onApplySavedSearch,
  // Location
  userLocation,
  onRequestLocation,
}) {
  const { user } = useAuth();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories?.length > 0) count++;
    if (filters.childAge) count++;
    if (filters.priceMin > (priceRange?.min || 0)) count++;
    if (filters.priceMax < (priceRange?.max || 1000)) count++;
    if (filters.selectedWeeks?.length > 0) count++;
    if (filters.extendedCare) count++;
    if (filters.foodIncluded) count++;
    if (filters.hasTransport) count++;
    if (filters.siblingDiscount) count++;
    if (filters.hasOpenings) count++;
    if (filters.matchWorkSchedule) count++;
    if (filters.sortByDistance) count++;
    return count;
  }, [filters, priceRange]);

  // Handle saving current search
  const handleSaveSearch = () => {
    if (!searchName.trim()) return;

    const newSearch = {
      id: Date.now().toString(),
      name: searchName.trim(),
      filters: { ...filters },
      filterCount: activeFilterCount,
      createdAt: new Date().toISOString()
    };

    onSaveSearch(newSearch);
    setSearchName('');
    setShowSaveDialog(false);
  };

  // Handle applying a preset
  const handleApplyPreset = (preset) => {
    onApplyPreset(preset);
  };

  return (
    <div className="advanced-filters">
      {/* Filter Presets */}
      <div className="filter-section">
        <h4 className="filter-section-title">Quick Presets</h4>
        <div className="filter-presets-grid">
          {FILTER_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className="filter-preset-card"
            >
              <span className="filter-preset-name">{preset.name}</span>
              <span className="filter-preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Multi-Select */}
      <div className="filter-section">
        <h4 className="filter-section-title">Categories</h4>
        <p className="filter-section-hint">Select multiple to show camps in any category</p>
        <CategoryMultiSelect
          categories={categories}
          selectedCategories={filters.categories || []}
          onChange={(categories) => onFiltersChange({ ...filters, categories })}
          categoryCounts={categoryCounts}
        />
      </div>

      {/* Price Range Slider */}
      <div className="filter-section">
        <h4 className="filter-section-title">Price per Week</h4>
        <PriceRangeSlider
          minPrice={priceRange?.min || 0}
          maxPrice={priceRange?.max || 1000}
          priceMin={filters.priceMin ?? (priceRange?.min || 0)}
          priceMax={filters.priceMax ?? (priceRange?.max || 1000)}
          onMinChange={(val) => onFiltersChange({ ...filters, priceMin: val })}
          onMaxChange={(val) => onFiltersChange({ ...filters, priceMax: val })}
        />
      </div>

      {/* Week Availability */}
      <div className="filter-section">
        <h4 className="filter-section-title">Available Weeks</h4>
        <p className="filter-section-hint">Show camps running during these weeks</p>
        <WeekSelector
          selectedWeeks={filters.selectedWeeks || []}
          onChange={(weeks) => onFiltersChange({ ...filters, selectedWeeks: weeks })}
        />
      </div>

      {/* Distance Sorting */}
      <div className="filter-section">
        <h4 className="filter-section-title">Distance</h4>
        <div className="distance-filter">
          <button
            onClick={() => onFiltersChange({ ...filters, sortByDistance: !filters.sortByDistance })}
            className={`filter-toggle ${filters.sortByDistance ? 'active' : ''}`}
            aria-pressed={filters.sortByDistance}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Sort by distance</span>
            {filters.sortByDistance && (
              <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          {!userLocation && filters.sortByDistance && (
            <button onClick={onRequestLocation} className="location-request-btn">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Use my location
            </button>
          )}
          {userLocation && (
            <p className="location-status">
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Using your location
            </p>
          )}
        </div>
      </div>

      {/* Availability Filter */}
      <div className="filter-section">
        <h4 className="filter-section-title">Availability</h4>
        <button
          onClick={() => onFiltersChange({ ...filters, hasOpenings: !filters.hasOpenings })}
          className={`filter-toggle ${filters.hasOpenings ? 'active' : ''}`}
          aria-pressed={filters.hasOpenings}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Show only camps with openings</span>
          {filters.hasOpenings && (
            <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Feature Toggles */}
      <div className="filter-section">
        <h4 className="filter-section-title">Features</h4>
        <div className="feature-toggles">
          {[
            { key: 'extendedCare', label: 'Extended Care', icon: '⏰' },
            { key: 'foodIncluded', label: 'Food Included', icon: '🍽️' },
            { key: 'hasTransport', label: 'Transportation', icon: '🚐' },
            { key: 'siblingDiscount', label: 'Sibling Discount', icon: '👨‍👩‍👧' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => onFiltersChange({ ...filters, [key]: !filters[key] })}
              className={`feature-toggle-btn ${filters[key] ? 'active' : ''}`}
              aria-pressed={filters[key]}
            >
              <span className="feature-toggle-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
          {user && (
            <button
              onClick={() => onFiltersChange({ ...filters, matchWorkSchedule: !filters.matchWorkSchedule })}
              className={`feature-toggle-btn ${filters.matchWorkSchedule ? 'active' : ''}`}
              aria-pressed={filters.matchWorkSchedule}
            >
              <span className="feature-toggle-icon">💼</span>
              <span>Fits My Hours</span>
            </button>
          )}
        </div>
      </div>

      {/* Saved Searches */}
      {user && (
        <div className="filter-section">
          <h4 className="filter-section-title">Saved Searches</h4>

          {savedSearches && savedSearches.length > 0 ? (
            <div className="saved-searches-list">
              {savedSearches.map(search => (
                <SavedSearchItem
                  key={search.id}
                  search={search}
                  onApply={onApplySavedSearch}
                  onDelete={onDeleteSavedSearch}
                />
              ))}
            </div>
          ) : (
            <p className="saved-searches-empty">No saved searches yet</p>
          )}

          {activeFilterCount > 0 && (
            <div className="save-search-area">
              {showSaveDialog ? (
                <div className="save-search-dialog">
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Name this search..."
                    className="save-search-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSearch();
                      if (e.key === 'Escape') setShowSaveDialog(false);
                    }}
                  />
                  <div className="save-search-buttons">
                    <button onClick={() => setShowSaveDialog(false)} className="save-search-cancel">
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSearch}
                      className="save-search-confirm"
                      disabled={!searchName.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowSaveDialog(true)} className="save-search-btn">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save this search ({activeFilterCount} filters)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <div className="filter-section filter-section-clear">
          <button onClick={onClearFilters} className="clear-all-btn">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
});

// Export utility functions for use in App.jsx
export { calculateDistance, getLocationFromAddress, SB_DEFAULT_LOCATION };

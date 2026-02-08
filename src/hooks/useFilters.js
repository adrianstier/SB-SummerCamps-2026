import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  SUMMER_WEEKS_2026,
  FILTER_PRESETS,
  calculateDistance,
  getLocationFromAddress,
  SB_DEFAULT_LOCATION
} from '../components/AdvancedFilters';

const SEARCH_DEBOUNCE_MS = 300;

// Default filter state
const DEFAULT_FILTERS = {
  search: '',
  categories: [],
  childAge: '',
  priceMin: 0,
  priceMax: Infinity,
  selectedWeeks: [],
  extendedCare: false,
  foodIncluded: false,
  hasTransport: false,
  siblingDiscount: false,
  hasOpenings: false,
  matchWorkSchedule: false,
  sortByDistance: false,
  sortBy: 'camp_name',
  sortDir: 'asc'
};

// Storage key for saved searches
const SAVED_SEARCHES_KEY = 'sb-camps-saved-searches';

// Encode filters to URL params
function encodeFiltersToURL(filters) {
  const params = new URLSearchParams();

  if (filters.search) params.set('q', filters.search);
  if (filters.categories?.length) params.set('cat', filters.categories.join(','));
  if (filters.childAge) params.set('age', filters.childAge);
  if (filters.priceMin > 0) params.set('pmin', filters.priceMin.toString());
  if (Number.isFinite(filters.priceMax)) params.set('pmax', filters.priceMax.toString());
  if (filters.selectedWeeks?.length) params.set('weeks', filters.selectedWeeks.join(','));
  if (filters.extendedCare) params.set('ec', '1');
  if (filters.foodIncluded) params.set('food', '1');
  if (filters.hasTransport) params.set('trans', '1');
  if (filters.siblingDiscount) params.set('sib', '1');
  if (filters.hasOpenings) params.set('open', '1');
  if (filters.matchWorkSchedule) params.set('work', '1');
  if (filters.sortByDistance) params.set('dist', '1');
  if (filters.sortBy !== 'camp_name') params.set('sort', filters.sortBy);
  if (filters.sortDir !== 'asc') params.set('dir', filters.sortDir);

  return params.toString();
}

// Decode URL params to filters
function decodeFiltersFromURL(searchParams) {
  const filters = { ...DEFAULT_FILTERS };

  const q = searchParams.get('q');
  if (q) filters.search = q;

  const cat = searchParams.get('cat');
  if (cat) filters.categories = cat.split(',').filter(Boolean);

  const age = searchParams.get('age');
  if (age) filters.childAge = age;

  const pmin = searchParams.get('pmin');
  if (pmin) filters.priceMin = parseInt(pmin, 10);

  const pmax = searchParams.get('pmax');
  if (pmax) filters.priceMax = parseInt(pmax, 10);

  const weeks = searchParams.get('weeks');
  if (weeks) filters.selectedWeeks = weeks.split(',').filter(Boolean);

  if (searchParams.get('ec') === '1') filters.extendedCare = true;
  if (searchParams.get('food') === '1') filters.foodIncluded = true;
  if (searchParams.get('trans') === '1') filters.hasTransport = true;
  if (searchParams.get('sib') === '1') filters.siblingDiscount = true;
  if (searchParams.get('open') === '1') filters.hasOpenings = true;
  if (searchParams.get('work') === '1') filters.matchWorkSchedule = true;
  if (searchParams.get('dist') === '1') filters.sortByDistance = true;

  const sort = searchParams.get('sort');
  if (sort) filters.sortBy = sort;

  const dir = searchParams.get('dir');
  if (dir) filters.sortDir = dir;

  return filters;
}

// Check if a camp has sessions during selected weeks
function campHasSessionsDuringWeeks(camp, selectedWeeks) {
  if (!selectedWeeks || selectedWeeks.length === 0) return true;

  // Check extracted sessions
  const sessions = camp.extracted?.sessions;
  if (!sessions || sessions.length === 0) {
    // If no session data, assume camp runs all summer
    return true;
  }

  // Check summer_dates field
  const summerDates = camp.summer_dates?.toLowerCase() || '';
  if (summerDates.includes('june') || summerDates.includes('july') || summerDates.includes('august')) {
    // Camp mentions summer months, likely runs during selected weeks
    return true;
  }

  // Default to showing the camp if we can't determine sessions
  return true;
}

// Check if camp has openings
function campHasOpenings(camp) {
  // Check registration status
  const regStatus = camp.reg_status?.toLowerCase() || '';
  if (regStatus.includes('open') || regStatus.includes('accepting')) return true;
  if (regStatus.includes('closed') || regStatus.includes('full') || regStatus.includes('waitlist')) return false;

  // Check extracted availability
  const availability = camp.extracted?.availability;
  if (availability) {
    if (availability.isOpen === true) return true;
    if (availability.isOpen === false) return false;
    if (availability.hasWaitlist) return false;
  }

  // Check 2026_reg_date for hints
  const regDate = camp['2026_reg_date']?.toLowerCase() || '';
  if (regDate.includes('open') || regDate.includes('rolling')) return true;
  if (regDate.includes('full') || regDate.includes('closed') || regDate.includes('waitlist')) return false;

  // Default to true (show camp) if unknown
  return true;
}

// Parse hours string to get duration
function getHoursDuration(hoursStr) {
  if (!hoursStr) return 0;

  // Try to extract times like "9am-3pm" or "9:00 AM - 3:00 PM"
  const match = hoursStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?.*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return 0;

  let startHour = parseInt(match[1], 10);
  const startPM = (match[3] || '').toLowerCase() === 'pm';
  let endHour = parseInt(match[4], 10);
  const endPM = (match[6] || '').toLowerCase() === 'pm';

  // Convert to 24-hour
  if (startPM && startHour !== 12) startHour += 12;
  if (!startPM && startHour === 12) startHour = 0;
  if (endPM && endHour !== 12) endHour += 12;
  if (!endPM && endHour === 12) endHour = 0;

  // If end is before start, assume PM
  if (endHour < startHour) endHour += 12;

  return endHour - startHour;
}

// Main useFilters hook
export function useFilters(priceRange = { min: 0, max: Infinity }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isOnBrowsePage = location.pathname === '/';

  // Track whether this is the initial mount (to read URL params once)
  const initializedRef = useRef(false);

  // Initialize filters from URL search params or defaults
  const [filters, setFilters] = useState(() => {
    const urlFilters = decodeFiltersFromURL(searchParams);

    // Don't apply default price filter - let users see all camps initially
    // Price range filtering happens via the slider, not default URL params

    return urlFilters;
  });

  // User location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(SAVED_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Debounced search input state
  const [searchInput, setSearchInputRaw] = useState(filters.search || '');
  const searchDebounceRef = useRef(null);

  const setSearchInput = useCallback((val) => {
    setSearchInputRaw(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null;
      setFilters(prev => ({ ...prev, search: val }));
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  // Sync searchInput when filters.search changes externally (e.g. preset, clear, URL)
  useEffect(() => {
    if (!searchDebounceRef.current) {
      setSearchInputRaw(filters.search || '');
    }
  }, [filters.search]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Sync filters to URL search params (only on the browse page)
  useEffect(() => {
    // Skip the initial render - filters were already read from URL
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    // Only sync filter params to URL when on the browse page (/)
    if (!isOnBrowsePage) return;

    const encoded = encodeFiltersToURL(filters);
    const currentSearch = searchParams.toString();

    // Only update if different to avoid unnecessary re-renders
    if (currentSearch !== encoded) {
      if (encoded) {
        setSearchParams(new URLSearchParams(encoded), { replace: true });
      } else {
        // Clear all params when filters are at defaults
        setSearchParams({}, { replace: true });
      }
    }
  }, [filters, isOnBrowsePage, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update price range when it changes - but only if user has set a specific filter
  // Don't auto-apply price filter on initial load (Infinity means no filter)
  useEffect(() => {
    if (priceRange.max && Number.isFinite(filters.priceMax) && filters.priceMax > priceRange.max) {
      setFilters(prev => ({ ...prev, priceMax: priceRange.max }));
    }
  }, [priceRange.max]);

  // Persist saved searches
  useEffect(() => {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(savedSearches));
  }, [savedSearches]);

  // Request user location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
      },
      (error) => {
        setLocationError(error.message);
        // Fall back to default SB location
        setUserLocation(SB_DEFAULT_LOCATION);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Clear all filters - reset to defaults (no price filter)
  const clearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  // Apply a preset
  const applyPreset = useCallback((preset) => {
    const newFilters = {
      ...DEFAULT_FILTERS,
      ...preset.filters
    };
    setFilters(newFilters);
  }, []);

  // Save a search
  const saveSearch = useCallback((search) => {
    setSavedSearches(prev => [search, ...prev].slice(0, 10)); // Max 10 saved
  }, []);

  // Delete a saved search
  const deleteSavedSearch = useCallback((id) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  }, []);

  // Apply a saved search
  const applySavedSearch = useCallback((search) => {
    setFilters(search.filters);
  }, []);

  // Generate shareable URL
  const shareableURL = useMemo(() => {
    const encoded = encodeFiltersToURL(filters);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin + '/' : '';
    return encoded ? `${baseUrl}?${encoded}` : baseUrl;
  }, [filters]);

  // Filter and sort camps function
  const filterAndSortCamps = useCallback((camps, profile = null) => {
    let result = [...camps];

    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(camp =>
        camp.camp_name?.toLowerCase().includes(searchLower) ||
        camp.description?.toLowerCase().includes(searchLower) ||
        camp.category?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter (OR logic for multi-select)
    if (filters.categories && filters.categories.length > 0) {
      result = result.filter(camp =>
        filters.categories.includes(camp.category)
      );
    }

    // Age filter - skip camps with no age data rather than using extreme defaults
    if (filters.childAge) {
      const age = parseInt(filters.childAge, 10);
      result = result.filter(camp => {
        // If camp has no age data, skip it (don't include in results)
        if (camp.min_age == null && camp.max_age == null) {
          return false;
        }
        const minAge = camp.min_age != null ? parseInt(camp.min_age, 10) : 0;
        const maxAge = camp.max_age != null ? parseInt(camp.max_age, 10) : 18;
        return age >= minAge && age <= maxAge;
      });
    }

    // Price filter (range) - only apply when meaningful values are set
    // Skip filtering if priceMax is Infinity (no filter set)
    if (filters.priceMin > 0 || Number.isFinite(filters.priceMax)) {
      // Compute effective max price from data range if priceMax is Infinity
      const effectiveMaxPrice = Number.isFinite(filters.priceMax)
        ? filters.priceMax
        : Math.max(...result.map(c => c.min_price || 0), 0);

      result = result.filter(camp => {
        const minPrice = camp.min_price || 0;
        return minPrice >= filters.priceMin && minPrice <= effectiveMaxPrice;
      });
    }

    // Week availability filter
    if (filters.selectedWeeks && filters.selectedWeeks.length > 0) {
      result = result.filter(camp => campHasSessionsDuringWeeks(camp, filters.selectedWeeks));
    }

    // Openings filter
    if (filters.hasOpenings) {
      result = result.filter(camp => campHasOpenings(camp));
    }

    // Feature filters
    if (filters.extendedCare) {
      result = result.filter(camp => camp.has_extended_care || (camp.extended_care && /^yes/i.test(camp.extended_care)));
    }
    if (filters.foodIncluded) {
      result = result.filter(camp => camp.food_included);
    }
    if (filters.hasTransport) {
      result = result.filter(camp => camp.has_transport);
    }
    if (filters.siblingDiscount) {
      result = result.filter(camp => camp.has_sibling_discount);
    }

    // Work schedule filter
    if (filters.matchWorkSchedule && profile) {
      const workStart = profile.work_hours_start || '08:00';
      const workEnd = profile.work_hours_end || '17:30';

      result = result.filter(camp => {
        // Basic hours check - camp should cover work hours
        const hours = camp.hours || '';
        const duration = getHoursDuration(hours);
        return duration >= 6; // At least 6 hours
      });
    }

    // Sorting
    if (filters.sortByDistance) {
      const location = userLocation || SB_DEFAULT_LOCATION;
      result = result.map(camp => ({
        ...camp,
        _distance: calculateDistance(
          location.lat,
          location.lng,
          ...Object.values(getLocationFromAddress(camp.address))
        )
      })).sort((a, b) => a._distance - b._distance);
    } else {
      // Regular sorting
      result.sort((a, b) => {
        let comparison = 0;
        const { sortBy, sortDir } = filters;

        switch (sortBy) {
          case 'camp_name':
            comparison = (a.camp_name || '').localeCompare(b.camp_name || '');
            break;
          case 'min_price':
            comparison = (a.min_price || 0) - (b.min_price || 0);
            break;
          case 'min_age':
            comparison = (a.min_age || 0) - (b.min_age || 0);
            break;
          case 'hours':
            comparison = getHoursDuration(b.hours) - getHoursDuration(a.hours);
            break;
          default:
            comparison = (a.camp_name || '').localeCompare(b.camp_name || '');
        }

        return sortDir === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [filters, userLocation]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories?.length > 0) count++;
    if (filters.childAge) count++;
    if (filters.priceMin > 0) count++;
    if (filters.priceMax < (priceRange?.max || Infinity)) count++;
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

  return {
    filters,
    updateFilters,
    clearFilters,
    applyPreset,
    filterAndSortCamps,
    activeFilterCount,
    // Debounced search
    searchInput,
    setSearchInput,
    // Location
    userLocation,
    locationError,
    requestLocation,
    // Saved searches
    savedSearches,
    saveSearch,
    deleteSavedSearch,
    applySavedSearch,
    // Shareable URL
    shareableURL,
    // Constants
    FILTER_PRESETS
  };
}

export { DEFAULT_FILTERS, SUMMER_WEEKS_2026, FILTER_PRESETS };

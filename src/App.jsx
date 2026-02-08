import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useFavorites } from './contexts/FavoritesContext';
import { useSquads } from './contexts/SquadsContext';
import { useCamps } from './contexts/CampsContext';
import { useCompare } from './contexts/CompareContext';
import { useRecommendations } from './hooks/useRecommendations';
import { useScrollReveal } from './hooks/useScrollReveal';
import { useFilters } from './hooks/useFilters';
import { AuthButton } from './components/AuthButton';
import { FavoriteButton } from './components/FavoriteButton';
import NotificationBell from './components/NotificationBell';
import { AdvancedFilters } from './components/AdvancedFilters';
import { getRegistrationStatus } from './lib/supabase';
import { formatPrice } from './lib/formatters';
import BrandIcon from './components/BrandIcon';
// SECURITY: Validate URL schemes before rendering as href
function safeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper to check if a camp is effectively closed
function isCampEffectivelyClosed(camp) {
  if (camp.is_closed) return true;
  const cat = (camp.category || '').toUpperCase();
  return cat === 'CLOSED' || cat === 'NO CAMP';
}

// Category class mappings
const categoryClasses = {
  'Beach/Surf': 'category-beach-surf',
  'Theater': 'category-theater',
  'Dance': 'category-dance',
  'Art': 'category-art',
  'Science/STEM': 'category-science-stem',
  'Nature/Outdoor': 'category-nature-outdoor',
  'Sports': 'category-sports',
  'Music': 'category-music',
  'Cooking': 'category-cooking',
  'Faith-Based': 'category-faith-based',
  'Animals/Zoo': 'category-animals-zoo',
  'Multi-Activity': 'category-multi-activity',
  'Education': 'category-education',
  'Overnight': 'category-overnight',
};

// Category gradient colors for card headers
const categoryGradients = {
  'Beach/Surf': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  'Theater': 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
  'Dance': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  'Art': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'Science/STEM': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  'Nature/Outdoor': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'Sports': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'Music': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'Cooking': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  'Faith-Based': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  'Animals/Zoo': 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
  'Multi-Activity': 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
  'Education': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  'Overnight': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
};

// Category icons for browse grid
const categoryIcons = [
  { name: 'Beach/Surf', icon: 'beach-surf' },
  { name: 'Sports', icon: 'sports' },
  { name: 'Art', icon: 'art' },
  { name: 'Science/STEM', icon: 'science-stem' },
  { name: 'Nature/Outdoor', icon: 'nature-outdoor' },
  { name: 'Theater', icon: 'theater' },
  { name: 'Dance', icon: 'dance' },
  { name: 'Music', icon: 'music' },
  { name: 'Cooking', icon: 'cooking' },
  { name: 'Animals/Zoo', icon: 'animals-zoo' },
  { name: 'Multi-Activity', icon: 'multi-activity' },
  { name: 'Education', icon: 'education' },
  { name: 'Faith-Based', icon: 'faith-based' },
  { name: 'Overnight', icon: 'overnight' },
];

// Memoized icon components
const SearchIcon = memo(function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
});

const FilterIcon = memo(function FilterIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
});

const GridIcon = memo(function GridIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
});

const TableIcon = memo(function TableIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
});

const ExternalLinkIcon = memo(function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
});

const ChevronIcon = memo(function ChevronIcon({ expanded }) {
  return (
    <svg className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
});

const LoadingSpinner = memo(function LoadingSpinner({ className = "w-5 h-5" }) {
  return (
    <svg className={`${className} animate-spin loading-spinner-branded`} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
});

const AppLogo = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="11" r="5" fill="#f9cf45" />
    <path d="M16 3v3M16 14v3M9 11H6M26 11h-3M10.5 5.5l2 2M19.5 7.5l2-2M10.5 16.5l2-2M19.5 14.5l2 2" stroke="#f9cf45" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M3 24c3-3 6-1 9 1s6 3 9 1 6-3 9-1" stroke="#3ba8a8" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M3 28c3-2 6-1 9 1s6 2 9 0 6-2 9 0" stroke="#6bc4c4" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const CalendarPlanIcon = memo(function CalendarPlanIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
});

const DashboardIcon = memo(function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
});

const CompareIcon = memo(function CompareIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
});

const VerifiedIcon = memo(function VerifiedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--ocean-500)' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
});

// ── Main App Component (Browse Page Content) ──
export default function App() {
  const navigate = useNavigate();
  const { camps, categories, stats, loading, error } = useCamps();
  const { compareList, toggleCompare, removeFromCompare, clearCompare } = useCompare();
  const { profile, user } = useAuth();
  const { favorites } = useFavorites();
  const { friendInterestCounts, squads } = useSquads();

  // Advanced filters hook
  const priceRange = useMemo(() => ({
    min: stats?.priceRange?.min || 0,
    max: stats?.priceRange?.max || 1000
  }), [stats?.priceRange]);

  const {
    filters, updateFilters, clearFilters,
    applyPreset, filterAndSortCamps, activeFilterCount,
    searchInput, setSearchInput,
    userLocation, locationError, requestLocation,
    savedSearches, saveSearch, deleteSavedSearch, applySavedSearch, shareableURL
  } = useFilters(priceRange);

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [expandedCamp, setExpandedCamp] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const tableRef = useRef(null);

  // Filtered camps
  const filteredCamps = useMemo(() => filterAndSortCamps(camps, profile), [camps, filterAndSortCamps, profile]);
  const searchResultCount = filteredCamps.length;

  // Detect mobile viewport
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Copy share URL
  const copyShareUrl = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableURL);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareableURL;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedShareUrl(true);
      setTimeout(() => setCopiedShareUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }, [shareableURL]);

  // Handle shared schedule view
  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center p-12 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--terra-100)' }}>
            <svg className="w-10 h-10" style={{ color: 'var(--terra-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-heading mb-3" style={{ color: 'var(--earth-800)' }}>Could not load camps</h1>
          <p className="text-base mb-2" style={{ color: 'var(--earth-700)' }}>
            {error.includes('network') || error.includes('fetch') ? 'Check your internet connection and try again.' : 'Something went wrong loading camp data.'}
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-6">Refresh Page</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <header className="hero-section relative pt-4 pb-16 sm:pt-8 sm:pb-24 md:pt-12 md:pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6 sm:mb-12 md:mb-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <AppLogo className="w-8 h-8 sm:w-9 sm:h-9" />
              <span className="font-sans font-semibold text-xs sm:text-sm tracking-wide uppercase hidden xs:block" style={{ color: 'var(--earth-700)', letterSpacing: '0.08em' }}>
                Santa Barbara
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <Link to="/dashboard" className="btn-secondary hidden md:flex" title="My Plan">
                  <DashboardIcon /><span className="hidden lg:inline">My Plan</span>
                </Link>
              )}
              {compareList.length > 0 && (
                <button onClick={() => navigate('/compare')} className="btn-secondary relative p-2 sm:px-3" title="Compare camps">
                  <CompareIcon /><span className="hidden md:inline ml-1">Compare</span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] sm:text-xs font-bold flex items-center justify-center text-white" style={{ background: 'var(--terra-500)' }}>{compareList.length}</span>
                </button>
              )}
              <button onClick={() => navigate('/schedule')} className="btn-primary text-sm sm:text-base px-3 sm:px-4">
                <CalendarPlanIcon /><span>Plan My Summer</span>
              </button>
              <button onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')} className="btn-secondary hidden sm:flex" title={viewMode === 'grid' ? 'Switch to table view' : 'Switch to grid view'}>
                {viewMode === 'grid' ? <TableIcon /> : <GridIcon />}
                <span className="hidden md:inline">{viewMode === 'grid' ? 'Table' : 'Grid'}</span>
              </button>
              {user && (
                <Link to="/family" className="filter-control-btn hidden md:flex" title="Family planning workspace">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="hidden lg:inline">Family</span>
                </Link>
              )}
              {user && <NotificationBell />}
              <AuthButton />
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="hero-title animate-fade-up" style={{ '--fade-delay': '0ms' }}>
              <span className="hero-year-badge">Summer 2026</span>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display leading-tight mb-6" style={{ color: 'var(--earth-800)' }}>
                Your summer,{' '}<span className="text-gradient">sorted.</span>
              </h1>
            </div>
            <p className="hero-subtitle animate-fade-up font-sans text-lg md:text-xl font-body mb-10" style={{ '--fade-delay': '100ms', color: 'var(--earth-700)', opacity: 0.9 }}>
              {stats ? (<>Stop juggling spreadsheets. <strong>{stats.active}</strong> camps, one plan, zero scrambling.</>) : (<>Stop juggling spreadsheets. All your camps, one plan, zero scrambling.</>)}
            </p>

            {/* Search Bar */}
            <div className="hero-search animate-fade-up relative max-w-2xl mx-auto mb-8" style={{ '--fade-delay': '200ms' }}>
              <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ color: 'var(--sand-400)' }}><SearchIcon /></div>
              <input type="text" placeholder="Search camps by name or activity" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="search-input" aria-label="Search camps by name or activity" />
              {searchInput && (
                <button className="absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-sand-200 transition-colors" onClick={() => setSearchInput('')} title="Clear search" aria-label="Clear search" style={{ color: 'var(--sand-400)' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {searchInput && searchInput !== (filters.search || '') && (<div className="absolute right-14 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--sand-500)' }}>Searching...</div>)}
            </div>

            {searchResultCount !== null && filters.search && (
              <p className="text-center text-sm mb-4" style={{ color: 'var(--earth-700)' }}>Found <strong>{searchResultCount}</strong> {searchResultCount === 1 ? 'camp' : 'camps'} matching "{filters.search}"</p>
            )}

            {stats && (
              <div className="hero-stats animate-fade-up flex flex-wrap justify-center gap-6 text-sm" style={{ '--fade-delay': '300ms', color: 'var(--earth-700)' }}>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--ocean-400)' }}></span><span><strong>{camps.length}</strong> local camps</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--terra-400)' }}></span><span><strong>{categories.length}</strong> categories</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--sun-400)' }}></span><span>Ages 3-18</span></div>
                <div className="flex items-center gap-2"><VerifiedIcon /><span>Updated Jan 2026</span></div>
              </div>
            )}
          </div>
        </div>
        <div className="wave-decoration">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="wave-fill"></path>
          </svg>
        </div>
      </header>

      {/* Filter Bar */}
      <section className="filter-bar-section sticky top-0 z-40" role="search" aria-label="Camp filters">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="filter-bar-inner">
            <div className="filter-presets">
              <span className="filter-presets-label">Quick filters</span>
              <div className="filter-presets-divider" />
              <button onClick={() => updateFilters({ ...filters, extendedCare: !filters.extendedCare })} className={`filter-preset-link priority ${filters.extendedCare ? 'active' : ''}`} data-filter="extended-care">Extended Care</button>
              <button onClick={() => { const isActive = Number.isFinite(filters.priceMax) && filters.priceMax === 300; updateFilters({ ...filters, priceMax: isActive ? Infinity : 300 }); }} className={`filter-preset-link priority ${Number.isFinite(filters.priceMax) && filters.priceMax === 300 ? 'active' : ''}`} data-filter="under-300">Under $300</button>
              <button onClick={() => { const cats = filters.categories || []; updateFilters({ ...filters, categories: cats.includes('Sports') ? cats.filter(c => c !== 'Sports') : [...cats, 'Sports'] }); }} className={`filter-preset-link priority ${filters.categories?.includes('Sports') ? 'active' : ''}`} data-filter="sports">Sports</button>
              <button onClick={() => { const cats = filters.categories || []; updateFilters({ ...filters, categories: cats.includes('Art') ? cats.filter(c => c !== 'Art') : [...cats, 'Art'] }); }} className={`filter-preset-link overflow ${filters.categories?.includes('Art') ? 'active' : ''}`} data-filter="art">Art & Creative</button>
              <button onClick={() => { const cats = filters.categories || []; updateFilters({ ...filters, categories: cats.includes('Science/STEM') ? cats.filter(c => c !== 'Science/STEM') : [...cats, 'Science/STEM'] }); }} className={`filter-preset-link overflow ${filters.categories?.includes('Science/STEM') ? 'active' : ''}`} data-filter="stem">STEM</button>
              <button onClick={() => { const cats = filters.categories || []; updateFilters({ ...filters, categories: cats.includes('Nature/Outdoor') ? cats.filter(c => c !== 'Nature/Outdoor') : [...cats, 'Nature/Outdoor'] }); }} className={`filter-preset-link overflow ${filters.categories?.includes('Nature/Outdoor') ? 'active' : ''}`} data-filter="outdoors">Outdoors</button>
            </div>
            <div className="filter-controls">
              <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`filter-control-btn ${showAdvancedFilters ? 'active' : ''}`} aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'} aria-expanded={showAdvancedFilters}>
                <FilterIcon /><span>Filters</span>{activeFilterCount > 0 && (<span className="filter-count" aria-hidden="true">{activeFilterCount}</span>)}
              </button>
              <button onClick={() => navigate('/insights')} className="filter-control-btn" title="View camp data insights and visualizations">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <span className="hidden sm:inline">Insights</span>
              </button>
              <select value={filters.sortByDistance ? 'distance-asc' : `${filters.sortBy || 'camp_name'}-${filters.sortDir || 'asc'}`} onChange={(e) => { const [field, dir] = e.target.value.split('-'); if (field === 'distance') { updateFilters({ ...filters, sortByDistance: true }); if (!userLocation) requestLocation(); } else { updateFilters({ ...filters, sortByDistance: false, sortBy: field, sortDir: dir }); } }} className="filter-sort-select" aria-label="Sort camps by">
                <option value="camp_name-asc">A-Z</option>
                <option value="camp_name-desc">Z-A</option>
                <option value="min_price-asc">Price: Low</option>
                <option value="min_price-desc">Price: High</option>
                <option value="distance-asc">Nearest</option>
              </select>
              {activeFilterCount > 0 && (
                <button onClick={copyShareUrl} className={`share-url-btn ${copiedShareUrl ? 'copied' : ''}`} title="Copy shareable URL with these filters">
                  {copiedShareUrl ? (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>) : (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>)}
                  <span className="hidden sm:inline">{copiedShareUrl ? 'Copied' : 'Share'}</span>
                </button>
              )}
              {activeFilterCount > 0 && (<button onClick={clearFilters} className="filter-clear-btn">Clear</button>)}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="active-filters-bar">
            <span className="active-filters-label">Active:</span>
            <div className="active-filters-chips">
              {filters.categories?.length > 0 && filters.categories.map(cat => (<button key={cat} onClick={() => updateFilters({ ...filters, categories: filters.categories.filter(c => c !== cat) })} className="active-filter-chip">{cat}<span className="active-filter-remove">x</span></button>))}
              {filters.childAge && (<button onClick={() => updateFilters({ ...filters, childAge: '' })} className="active-filter-chip">Age {filters.childAge}<span className="active-filter-remove">x</span></button>)}
              {Number.isFinite(filters.priceMax) && (<button onClick={() => updateFilters({ ...filters, priceMax: Infinity })} className="active-filter-chip">Under ${filters.priceMax}<span className="active-filter-remove">x</span></button>)}
              {filters.priceMin > 0 && (<button onClick={() => updateFilters({ ...filters, priceMin: 0 })} className="active-filter-chip">Min ${filters.priceMin}<span className="active-filter-remove">x</span></button>)}
              {filters.extendedCare && (<button onClick={() => updateFilters({ ...filters, extendedCare: false })} className="active-filter-chip">Extended Care<span className="active-filter-remove">x</span></button>)}
              {filters.foodIncluded && (<button onClick={() => updateFilters({ ...filters, foodIncluded: false })} className="active-filter-chip">Food Included<span className="active-filter-remove">x</span></button>)}
              {filters.hasTransport && (<button onClick={() => updateFilters({ ...filters, hasTransport: false })} className="active-filter-chip">Transportation<span className="active-filter-remove">x</span></button>)}
              {filters.siblingDiscount && (<button onClick={() => updateFilters({ ...filters, siblingDiscount: false })} className="active-filter-chip">Sibling Discount<span className="active-filter-remove">x</span></button>)}
              {filters.matchWorkSchedule && (<button onClick={() => updateFilters({ ...filters, matchWorkSchedule: false })} className="active-filter-chip">Fits My Hours<span className="active-filter-remove">x</span></button>)}
              {filters.hasOpenings && (<button onClick={() => updateFilters({ ...filters, hasOpenings: false })} className="active-filter-chip">Has Openings<span className="active-filter-remove">x</span></button>)}
              {filters.sortByDistance && (<button onClick={() => updateFilters({ ...filters, sortByDistance: false })} className="active-filter-chip">Nearest First<span className="active-filter-remove">x</span></button>)}
              {filters.selectedWeeks?.length > 0 && (<button onClick={() => updateFilters({ ...filters, selectedWeeks: [] })} className="active-filter-chip">{filters.selectedWeeks.length} Week{filters.selectedWeeks.length > 1 ? 's' : ''}<span className="active-filter-remove">x</span></button>)}
              {filters.search && (<button onClick={() => setSearchInput('')} className="active-filter-chip">"{filters.search}"<span className="active-filter-remove">x</span></button>)}
            </div>
            <button onClick={clearFilters} className="active-filters-clear">Clear all</button>
          </div>
        )}
      </section>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <section className="filter-panel-animated" style={{ background: 'white', borderBottom: '1px solid var(--sand-200)' }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--sand-100)' }}>
              <h3 className="font-serif text-xl font-heading" style={{ color: 'var(--earth-800)' }}>Filters</h3>
              <button onClick={() => setShowAdvancedFilters(false)} className="p-2 rounded-full hover:bg-sand-100 transition-colors" style={{ color: 'var(--sand-400)' }} aria-label="Close filters">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <AdvancedFilters filters={filters} onFiltersChange={updateFilters} categories={categories} categoryCounts={stats?.categories || {}} priceRange={priceRange} onClearFilters={clearFilters} onApplyPreset={applyPreset} savedSearches={savedSearches} onSaveSearch={saveSearch} onDeleteSavedSearch={deleteSavedSearch} onApplySavedSearch={applySavedSearch} userLocation={userLocation} onRequestLocation={requestLocation} />
          </div>
        </section>
      )}

      {/* Category Browse Grid */}
      {!loading && camps.length > 0 && activeFilterCount === 0 && (
        <section className="category-browse">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="category-browse-title">Browse by Interest</h2>
            <div className="category-browse-grid">
              {categoryIcons.map(({ name, icon }) => {
                const count = stats?.categories?.[name] || 0;
                if (count === 0) return null;
                return (
                  <button key={name} onClick={() => { const cats = filters.categories || []; updateFilters({ ...filters, categories: cats.includes(name) ? cats.filter(c => c !== name) : [...cats, name] }); }} className={`category-browse-card ${categoryClasses[name] || ''} ${filters.categories?.includes(name) ? 'active' : ''}`} data-category={name}>
                    <span className="category-browse-icon"><BrandIcon name={icon} size={28} /></span>
                    <span className="category-browse-name">{name}</span>
                    <span className="category-browse-count">{count} {count === 1 ? 'camp' : 'camps'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Testimonial Banner */}
      {!loading && camps.length > 0 && activeFilterCount === 0 && (
        <section className="testimonial-banner">
          <p className="testimonial-quote">"Found the right STEM camp for my 10-year-old in under 5 minutes."</p>
          <p className="testimonial-author">-- Sarah M., Goleta</p>
        </section>
      )}

      {/* Main Content */}
      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div aria-live="polite" aria-atomic="true">
          {!loading && filteredCamps.length > 0 && (
            <p className="results-count">
              Showing <strong>{filteredCamps.length}</strong> {filteredCamps.length === 1 ? 'camp' : 'camps'}
              {filters.categories?.length > 0 && <> in <strong>{filters.categories.join(', ')}</strong></>}
              {filters.childAge && <> for age <strong>{filters.childAge}</strong></>}
              {Number.isFinite(filters.priceMax) && <> under <strong>${filters.priceMax}</strong></>}
              {filters.matchWorkSchedule && <> that fit your schedule</>}
            </p>
          )}
        </div>

        {loading ? (
          <div aria-label="Finding camps" aria-busy="true">
            <p className="text-center mb-6 font-medium" style={{ color: 'var(--earth-600)' }}>Finding camps...</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-card" aria-hidden="true">
                  <div className="skeleton-card-image" />
                  <div className="skeleton-card-content">
                    <div className="skeleton-line title" />
                    <div className="skeleton-badge" style={{ marginBottom: '12px' }} />
                    <div className="skeleton-line text" />
                    <div className="skeleton-line text short" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredCamps.length === 0 ? (
          <div className="py-16 px-4">
            <div className="empty-state-card text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'var(--sand-100)' }}>
                <BrandIcon name="search" size={48} style={{ color: 'var(--sand-400)', opacity: 0.6 }} aria-hidden="true" />
              </div>
              <h2 className="font-serif text-2xl font-heading mb-3" style={{ color: 'var(--earth-800)' }}>No camps match these filters</h2>
              <p className="text-base mb-6 max-w-sm mx-auto" style={{ color: 'var(--earth-600)' }}>
                {filters.childAge ? (<>Try a wider age range or check <strong>all categories</strong>.</>) : Number.isFinite(filters.priceMax) ? (<>Try increasing your price budget or browse <strong>all camps</strong>.</>) : filters.categories?.length > 0 ? (<>Try selecting <strong>more categories</strong> or clear filters to see all camps.</>) : searchInput ? (<>No camps match "<strong>{searchInput}</strong>". Try a different search term.</>) : (<>Try adjusting your filters or clear them to see all camps.</>)}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
              </div>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCamps.map((camp, index) => (
              <CampCard
                key={camp.id}
                camp={camp}
                expanded={expandedCamp === camp.id}
                onToggle={() => {
                  if (isMobile) {
                    setExpandedCamp(expandedCamp === camp.id ? null : camp.id);
                  } else {
                    navigate(`/camp/${camp.id}`, { state: { backgroundLocation: location } });
                  }
                }}
                index={index}
                isComparing={compareList.includes(camp.id)}
                onToggleCompare={() => toggleCompare(camp.id)}
                friendInterestCounts={friendInterestCounts}
                hasSquads={squads?.length > 0}
              />
            ))}
          </div>
        ) : (
          <div ref={tableRef}>
            <CampTable camps={filteredCamps} sortBy={filters.sortBy || 'camp_name'} sortDir={filters.sortDir || 'asc'} onSort={(field) => { if ((filters.sortBy || 'camp_name') === field) { updateFilters({ ...filters, sortDir: (filters.sortDir || 'asc') === 'asc' ? 'desc' : 'asc' }); } else { updateFilters({ ...filters, sortBy: field, sortDir: 'asc' }); } }} expandedCamp={expandedCamp} onToggle={(id) => setExpandedCamp(expandedCamp === id ? null : id)} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <AppLogo className="w-7 h-7" />
              <span className="font-serif text-lg" style={{ color: 'var(--sand-100)' }}>Santa Barbara Summer Camps</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm mb-1" style={{ color: 'var(--sand-200)' }}>Data from camp websites - Updated Jan 2026</p>
              <p className="text-xs" style={{ color: 'var(--sand-400)' }}>Verify prices and availability directly with camps before enrolling.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky Compare Bar */}
      {compareList.length > 0 && (
        <div className="compare-bar">
          <div className="compare-bar-content">
            <div className="compare-bar-camps">
              {compareList.map(campId => {
                const camp = camps.find(c => c.id === campId);
                if (!camp) return null;
                return (
                  <div key={campId} className="compare-bar-chip">
                    <span className="compare-bar-chip-name">{camp.camp_name}</span>
                    <button type="button" onClick={() => removeFromCompare(campId)} className="compare-bar-chip-remove" aria-label="Remove from compare">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                );
              })}
              {compareList.length < 6 && (<span className="compare-bar-hint">Add {6 - compareList.length} more</span>)}
            </div>
            <div className="compare-bar-actions">
              <button type="button" onClick={() => clearCompare()} className="compare-bar-clear">Clear</button>
              <button type="button" onClick={() => navigate('/compare')} className="btn-primary compare-bar-button">
                <CompareIcon />Compare {compareList.length} Camps
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

// ── Sub-Components ──

// Detail Row Component
const DetailRow = memo(function DetailRow({ label, value }) {
  if (!value || value === 'Unknown' || value === 'N/A') return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--sand-400)' }}>{label}</p>
      <p className="font-medium" style={{ color: 'var(--earth-800)' }}>{value}</p>
    </div>
  );
});

// Camp Card Component
const CampCard = memo(function CampCard({ camp, expanded, onToggle, index, isComparing = false, onToggleCompare, friendInterestCounts = {}, hasSquads = false }) {
  const categoryClass = categoryClasses[camp.category] || 'category-multi-activity';
  const categoryGradient = categoryGradients[camp.category] || categoryGradients['Multi-Activity'];
  const [imageError, setImageError] = useState(false);
  const [cardRef, isRevealed] = useScrollReveal();
  const friendCount = friendInterestCounts[camp.id] || 0;

  return (
    <article id={`camp-${camp.id}`} ref={cardRef} className={`camp-card scroll-reveal stagger-${(index % 6) + 1} ${isRevealed ? 'revealed' : ''} ${camp.is_closed ? 'opacity-50' : ''} ${isComparing ? 'ring-2' : ''}`} style={{ '--stagger-index': index % 12, '--card-accent': categoryGradient, ...(isComparing ? { ringColor: 'var(--ocean-500)' } : {}) }}>
      <div className="camp-card-button" role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }} aria-label={`View details for ${camp.camp_name}`}>
        {camp.image_url && !imageError ? (
          <div className="camp-card-image"><img src={camp.image_url} alt={camp.camp_name} loading="lazy" decoding="async" onError={() => setImageError(true)} /><div className="camp-card-image-overlay" style={{ background: categoryGradient }}></div></div>
        ) : (
          <div className="camp-card-image" style={{ background: categoryGradient }}><div className="w-full h-full flex items-center justify-center opacity-40"><BrandIcon name={categoryIcons.find(c => c.name === camp.category)?.icon || 'overnight'} size={48} /></div></div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-2 mb-4">
            <h3 className="font-serif text-xl font-heading leading-tight flex-1" style={{ color: 'var(--earth-800)' }}>{camp.camp_name}</h3>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={(e) => { e.stopPropagation(); onToggleCompare?.(); }} className={`min-w-[44px] min-h-[44px] p-2 rounded-full transition-colors flex items-center justify-center ${isComparing ? '' : 'hover:bg-sand-100'}`} style={{ color: isComparing ? 'var(--ocean-600)' : 'var(--sand-400)', background: isComparing ? 'var(--ocean-100)' : 'transparent' }} title={isComparing ? 'Remove from compare' : 'Add to compare'} aria-label={isComparing ? 'Remove from compare' : 'Add to compare'} aria-pressed={isComparing}>
                <svg className="w-5 h-5" fill={isComparing ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </button>
              <FavoriteButton campId={camp.id} />
            </div>
            <ChevronIcon expanded={expanded} />
          </div>
          <div className={`${categoryClass} mb-4`}><span className="category-badge"><span className="category-dot"></span>{camp.category}</span></div>
          <p className="text-sm line-clamp-2 mb-5" style={{ color: 'var(--earth-700)', lineHeight: 1.6 }}>{camp.description}</p>
          <div className="camp-quick-info">
            <div className="camp-quick-info-item"><p className="camp-quick-info-label">Ages</p><p className="camp-quick-info-value">{camp.ages || '--'}</p></div>
            <div className="camp-quick-info-item"><p className="camp-quick-info-label">Price</p><p className="camp-quick-info-value price">{formatPrice(camp)}</p></div>
            <div className="camp-quick-info-item"><p className="camp-quick-info-label">Hours</p><p className="camp-quick-info-value">{camp.hours || 'TBD'}</p></div>
          </div>
          {!isCampEffectivelyClosed(camp) && (() => {
            const regStatus = getRegistrationStatus(camp);
            if (regStatus.status === 'unknown') return null;
            return (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3 w-fit" style={{ backgroundColor: `${regStatus.color}15`, color: regStatus.color }}>
                {regStatus.isOpen ? (<svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>) : (<svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>)}
                <span>{regStatus.label}</span>
              </div>
            );
          })()}
          {hasSquads && friendCount > 0 && (
            <div className="friend-interest-badge mb-3"><span className="friend-interest-icon"><BrandIcon name="people" size={16} /></span><span className="friend-interest-label">{friendCount} {friendCount === 1 ? 'friend' : 'friends'} interested</span></div>
          )}
          <div className="flex flex-wrap gap-2">
            {camp.has_extended_care && (<span className="feature-badge feature-badge-extended">Extended Care</span>)}
            {camp.food_included && (<span className="feature-badge feature-badge-food">Meals</span>)}
            {camp.has_transport && (<span className="feature-badge feature-badge-transport">Transport</span>)}
            {camp.has_sibling_discount && (<span className="feature-badge feature-badge-sibling">Sibling $</span>)}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="expanded-details" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <DetailRow label="Location" value={camp.address} />
            <DetailRow label="Indoor/Outdoor" value={camp.indoor_outdoor} />
            <DetailRow label="Extended Care" value={camp.extended_care} />
            <DetailRow label="Extended Care Cost" value={camp.extended_care_cost} />
            <DetailRow label="Sibling Discount" value={camp.sibling_discount} />
            <DetailRow label="Phone" value={camp.contact_phone} />
            <DetailRow label="Email" value={camp.contact_email} />
          </div>
          {camp.extracted?.activities && camp.extracted.activities.length > 0 && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--sage-50)', border: '1px solid var(--sage-200)' }}>
              <p className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--sage-600)' }}><BrandIcon name="target" size={16} /> Activities</p>
              <div className="flex flex-wrap gap-1">
                {camp.extracted.activities.slice(0, 8).map((activity, i) => (<span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--sage-100)', color: 'var(--sage-700)' }}>{activity}</span>))}
                {camp.extracted.activities.length > 8 && (<span className="text-xs px-2 py-1" style={{ color: 'var(--sage-500)' }}>+{camp.extracted.activities.length - 8} more</span>)}
              </div>
            </div>
          )}
          {camp.notes && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--sun-100)', border: '1px solid var(--sun-300)' }}>
              <p className="font-medium text-sm mb-1" style={{ color: 'var(--earth-800)' }}>Notes</p>
              <p className="text-sm" style={{ color: 'var(--earth-700)' }}>{camp.notes}</p>
            </div>
          )}
          {!isCampEffectivelyClosed(camp) && camp.website_url && camp.website_url !== 'N/A' && safeUrl(camp.website_url) && (
            <a href={safeUrl(camp.website_url)} target="_blank" rel="noopener noreferrer" className="btn-primary w-full mt-5" onClick={(e) => e.stopPropagation()}>
              <span>Visit Website</span><ExternalLinkIcon />
            </a>
          )}
        </div>
      )}
    </article>
  );
}, (prevProps, nextProps) => {
  const prevFriendCount = prevProps.friendInterestCounts?.[prevProps.camp.id] || 0;
  const nextFriendCount = nextProps.friendInterestCounts?.[nextProps.camp.id] || 0;
  return prevProps.camp.id === nextProps.camp.id && prevProps.expanded === nextProps.expanded && prevProps.isComparing === nextProps.isComparing && prevProps.index === nextProps.index && prevProps.hasSquads === nextProps.hasSquads && prevFriendCount === nextFriendCount;
});

// Camp Detail Modal
const CampDetailModal = memo(function CampDetailModal({ camp, allCamps = [], onClose, onAddToSchedule, onToggleFavorite, isFavorite, onToggleCompare, isInCompare, onSelectSimilar }) {
  const [imageError, setImageError] = useState(false);
  const categoryGradient = categoryGradients[camp.category] || categoryGradients['Multi-Activity'];
  const { findSimilarCamps } = useRecommendations();
  const similarCamps = useMemo(() => {
    if (!findSimilarCamps || allCamps.length === 0) return [];
    return findSimilarCamps(camp, allCamps, 4);
  }, [camp, allCamps, findSimilarCamps]);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  const regStatus = getRegistrationStatus(camp);
  const featurePills = [];
  if (!isCampEffectivelyClosed(camp) && regStatus.status !== 'unknown') {
    const statusIconMap = { open: 'check', upcoming: 'calendar', waitlist: 'hourglass', closed: 'x-circle' };
    featurePills.push({ icon: regStatus.isOpen ? 'check' : (statusIconMap[regStatus.status] || 'info'), label: regStatus.label, type: regStatus.isOpen ? 'open' : regStatus.status === 'upcoming' ? (regStatus.daysUntil <= 7 ? 'soon' : 'upcoming') : 'full', key: 'registration', color: regStatus.color });
  }
  if (camp.has_extended_care) featurePills.push({ icon: 'clock-plus', label: 'Extended Care', key: 'extended' });
  if (camp.food_included) featurePills.push({ icon: 'utensils', label: 'Meals Included', key: 'food' });
  if (camp.has_transport) featurePills.push({ icon: 'van', label: 'Transport', key: 'transport' });
  if (camp.has_sibling_discount) featurePills.push({ icon: 'people-percent', label: 'Sibling Discount', key: 'sibling' });
  if (camp.fsa_eligible) featurePills.push({ icon: 'card-check', label: 'FSA Eligible', key: 'fsa', type: 'fsa' });

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${camp.camp_name} details`}>
      <article className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          <span>Close</span>
        </button>
        <header className="modal-hero">
          {camp.image_url && !imageError ? (<img src={camp.image_url} alt={camp.camp_name} className="modal-hero-img" decoding="async" onError={() => setImageError(true)} />) : (<div className="modal-hero-fallback" style={{ background: categoryGradient }} />)}
          <div className="modal-hero-gradient" />
          <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
            {onToggleCompare && (<button type="button" className={`modal-favorite ${isInCompare ? 'is-active' : ''}`} onClick={onToggleCompare} aria-label={isInCompare ? 'Remove from comparison' : 'Add to comparison'}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>)}
            <button className={`modal-favorite ${isFavorite ? 'is-active' : ''}`} onClick={onToggleFavorite} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}><svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg></button>
          </div>
          <div className="modal-hero-content">
            <p className="modal-category">{camp.category}</p>
            <h1 className="modal-title">{camp.camp_name}</h1>
            <p className="modal-subtitle">{camp.ages || 'All ages'} · {formatPrice(camp)} · {camp.hours || 'Hours TBD'}</p>
          </div>
        </header>
        <div className="modal-body">
          {featurePills.length > 0 && (<div className="modal-pills">{featurePills.map((pill) => (<span key={pill.key} className={`modal-pill ${pill.type ? `modal-pill--${pill.type}` : ''}`}><span className="modal-pill-icon"><BrandIcon name={pill.icon} size={14} /></span>{pill.label}</span>))}</div>)}
          {camp.description && (<p className="modal-description">{camp.description}</p>)}
          <div className="modal-grid">
            <section className="modal-section">
              <h2 className="modal-section-title">Where & When</h2>
              <dl className="modal-dl">
                {camp.address && (<><dt>Location</dt><dd>{camp.address}</dd></>)}
                {camp.indoor_outdoor && camp.indoor_outdoor !== 'Unknown' && (<><dt>Setting</dt><dd>{camp.indoor_outdoor}</dd></>)}
                {camp.hours && (<><dt>Hours</dt><dd>{camp.hours}</dd></>)}
                {camp.extended_care && camp.extended_care !== 'Unknown' && (<><dt>Extended Care</dt><dd>{camp.extended_care}</dd></>)}
              </dl>
            </section>
            {((camp.contact_phone && !camp.contact_phone.toLowerCase().includes('see website') && camp.contact_phone.replace(/\D/g, '').length >= 7) || (camp.contact_email && !camp.contact_email.toLowerCase().includes('see website') && camp.contact_email.includes('@')) || (camp.extended_care_cost && camp.extended_care_cost !== 'Unknown' && camp.extended_care_cost !== 'N/A') || (camp.sibling_discount && camp.sibling_discount !== 'Unknown') || (camp.refund_policy && camp.refund_policy !== 'Unknown' && camp.refund_policy !== 'N/A')) && (
              <section className="modal-section">
                <h2 className="modal-section-title">Contact & Cost</h2>
                <dl className="modal-dl">
                  {camp.contact_phone && !camp.contact_phone.toLowerCase().includes('see website') && camp.contact_phone.replace(/\D/g, '').length >= 7 && (<><dt>Phone</dt><dd><a href={`tel:${camp.contact_phone.replace(/\D/g, '')}`} className="modal-link">{camp.contact_phone}</a></dd></>)}
                  {camp.contact_email && !camp.contact_email.toLowerCase().includes('see website') && camp.contact_email.includes('@') && (<><dt>Email</dt><dd><a href={`mailto:${camp.contact_email}`} className="modal-link">{camp.contact_email}</a></dd></>)}
                  {camp.extended_care_cost && camp.extended_care_cost !== 'Unknown' && camp.extended_care_cost !== 'N/A' && (<><dt>Extended Care Cost</dt><dd>{camp.extended_care_cost}</dd></>)}
                  {camp.sibling_discount && camp.sibling_discount !== 'Unknown' && (<><dt>Sibling Discount</dt><dd>{camp.sibling_discount}</dd></>)}
                  {camp.refund_policy && camp.refund_policy !== 'Unknown' && camp.refund_policy !== 'N/A' && (<><dt>Cancellation</dt><dd>{camp.refund_policy}</dd></>)}
                </dl>
              </section>
            )}
          </div>
          {camp.extracted?.pricing_tiers && (camp.extracted.pricing_tiers.earlyBird || camp.extracted.pricing_tiers.regular || camp.extracted.pricing_tiers.halfDay || camp.extracted.pricing_tiers.fullDay || camp.extracted.pricing_tiers.perSession) && (
            <section className="modal-section modal-section--full">
              <h2 className="modal-section-title">Pricing</h2>
              <dl className="modal-dl modal-dl--pricing">
                {camp.extracted.pricing_tiers.earlyBird && (<><dt>Early Bird</dt><dd>${camp.extracted.pricing_tiers.earlyBird}/week</dd></>)}
                {camp.extracted.pricing_tiers.regular && (<><dt>Regular</dt><dd>${camp.extracted.pricing_tiers.regular}/week</dd></>)}
                {camp.extracted.pricing_tiers.halfDay && (<><dt>Half Day</dt><dd>${camp.extracted.pricing_tiers.halfDay}</dd></>)}
                {camp.extracted.pricing_tiers.fullDay && (<><dt>Full Day</dt><dd>${camp.extracted.pricing_tiers.fullDay}</dd></>)}
                {camp.extracted.pricing_tiers.perSession && (<><dt>Per Session</dt><dd>${camp.extracted.pricing_tiers.perSession}</dd></>)}
              </dl>
            </section>
          )}
          {camp.extracted?.sessions && camp.extracted.sessions.length > 0 && (
            <section className="modal-section modal-section--full">
              <h2 className="modal-section-title">2026 Sessions</h2>
              <div className="modal-sessions">{camp.extracted.sessions.map((session, i) => { const text = (session.raw || '').replace(/[\n\t]+/g, ' ').trim(); return text ? (<div key={i} className="modal-session-row"><span className="modal-session-text">{text}</span></div>) : null; })}</div>
            </section>
          )}
          {camp.extracted?.activities && camp.extracted.activities.length > 0 && (
            <section className="modal-section modal-section--full">
              <h2 className="modal-section-title">Activities</h2>
              <div className="modal-tags">{camp.extracted.activities.map((activity, i) => (<span key={i} className="modal-tag">{activity}</span>))}</div>
            </section>
          )}
          {camp.extracted?.testimonials && camp.extracted.testimonials.length > 0 && (
            <div className="modal-testimonials">{camp.extracted.testimonials.slice(0, 3).map((quote, i) => (<blockquote key={i} className="modal-quote"><p>"{quote}"</p></blockquote>))}</div>
          )}
          {camp.notes && (<div className="modal-callout modal-callout--sun"><span className="modal-callout-icon"><BrandIcon name="pencil" size={18} /></span><div><strong>Notes</strong><p>{camp.notes}</p></div></div>)}
          {similarCamps.length > 0 && (
            <section className="modal-similar-camps">
              <h2 className="modal-section-title">Camps Like This</h2>
              <p className="modal-similar-subtitle">Similar options you might like</p>
              <div className="modal-similar-grid">
                {similarCamps.map(({ camp: similarCamp, explanation }) => (
                  <button key={similarCamp.id} className="modal-similar-card" onClick={() => onSelectSimilar?.(similarCamp)}>
                    {similarCamp.image_url ? (<img src={similarCamp.image_url} alt="" className="modal-similar-img" loading="lazy" />) : (<div className="modal-similar-img-fallback" style={{ background: categoryGradients[similarCamp.category] || 'var(--sand-200)' }} />)}
                    <div className="modal-similar-info">
                      <p className="modal-similar-name">{similarCamp.camp_name}</p>
                      <p className="modal-similar-meta">{similarCamp.ages || 'All ages'} · {formatPrice(similarCamp)}</p>
                      {explanation && (<p className="modal-similar-reason">{explanation}</p>)}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
        {!isCampEffectivelyClosed(camp) && regStatus.status !== 'closed' && (
          <footer className="modal-footer">
            {camp.website_url && safeUrl(camp.website_url) && (<a href={safeUrl(camp.website_url)} target="_blank" rel="noopener noreferrer" className="modal-btn modal-btn--primary">Visit Website<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg></a>)}
            <button onClick={onAddToSchedule} className="modal-btn modal-btn--secondary">Schedule This Camp<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></button>
          </footer>
        )}
        {camp.social_media && Object.keys(camp.social_media).length > 0 && (
          <div className="modal-social">
            {safeUrl(camp.social_media.facebook) && (<a href={safeUrl(camp.social_media.facebook)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="Facebook"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>)}
            {safeUrl(camp.social_media.instagram) && (<a href={safeUrl(camp.social_media.instagram)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="Instagram"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>)}
            {safeUrl(camp.social_media.youtube) && (<a href={safeUrl(camp.social_media.youtube)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="YouTube"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>)}
          </div>
        )}
      </article>
    </div>
  );
});

// Camp Table Component
const CampTable = memo(function CampTable({ camps, sortBy, sortDir, onSort, expandedCamp, onToggle }) {
  const columns = [
    { key: 'camp_name', label: 'Camp Name' },
    { key: 'ages', label: 'Ages' },
    { key: 'min_price', label: 'Price' },
    { key: 'hours', label: 'Hours' },
    { key: 'category', label: 'Category' },
    { key: 'reg_date_2026', label: 'Registration' }
  ];
  return (
    <div className="overflow-x-auto rounded-2xl" style={{ boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.08)' }}>
      <table className="data-table">
        <thead><tr>{columns.map(col => (<th key={col.key} onClick={() => onSort(col.key)} className="select-none" aria-sort={sortBy === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><span className="flex items-center gap-2">{col.label}{sortBy === col.key && (<span>{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>)}</span></th>))}</tr></thead>
        <tbody>
          {camps.map((camp) => (
            <React.Fragment key={camp.id}>
              <tr className={`cursor-pointer ${camp.is_closed ? 'opacity-50' : ''} ${expandedCamp === camp.id ? 'expanded' : ''}`} onClick={() => onToggle(camp.id)} tabIndex={0} role="button" aria-expanded={expandedCamp === camp.id} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(camp.id); } }}>
                <td className="font-medium"><span className="flex items-center gap-3"><ChevronIcon expanded={expandedCamp === camp.id} /><span style={{ color: 'var(--earth-800)' }}>{camp.camp_name}</span><span onClick={(e) => e.stopPropagation()}><FavoriteButton campId={camp.id} size="sm" /></span></span></td>
                <td>{camp.ages}</td>
                <td style={{ color: 'var(--terra-500)', fontWeight: 600 }}>{formatPrice(camp)}</td>
                <td>{camp.hours || 'TBD'}</td>
                <td><div className={categoryClasses[camp.category] || 'category-multi-activity'}><span className="category-badge"><span className="category-dot"></span>{camp.category}</span></div></td>
                <td>{camp['reg_date_2026'] || 'TBD'}</td>
              </tr>
              {expandedCamp === camp.id && (
                <tr><td colSpan={6} className="p-0">
                  <div className="expanded-details">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                      <div className="md:col-span-3 pb-4" style={{ borderBottom: '1px solid var(--sand-200)' }}><p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--sand-400)' }}>Description</p><p style={{ color: 'var(--earth-700)', lineHeight: 1.6 }}>{camp.description}</p></div>
                      <DetailRow label="Location" value={camp.address} />
                      <DetailRow label="Indoor/Outdoor" value={camp.indoor_outdoor} />
                      <DetailRow label="Food Provided" value={camp.food_provided} />
                      <DetailRow label="Extended Care" value={camp.extended_care} />
                      <DetailRow label="Sibling Discount" value={camp.sibling_discount} />
                      <DetailRow label="Phone" value={camp.contact_phone} />
                      <DetailRow label="Email" value={camp.contact_email} />
                    </div>
                    {camp.website_url && camp.website_url !== 'N/A' && safeUrl(camp.website_url) && (
                      <div className="mt-5"><a href={safeUrl(camp.website_url)} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex" onClick={(e) => e.stopPropagation()}><span>Visit Website</span><ExternalLinkIcon /></a></div>
                    )}
                  </div>
                </td></tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
});


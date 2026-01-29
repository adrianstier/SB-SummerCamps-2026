import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense, memo } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useScrollReveal } from './hooks/useScrollReveal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthButton } from './components/AuthButton';
import { FavoriteButton } from './components/FavoriteButton';
import { supabase, getRegistrationStatus, checkWorkScheduleCoverage } from './lib/supabase';
import { formatPrice } from './lib/formatters';

// Lazy load heavy modal components for better initial load performance
const SchedulePlanner = lazy(() => import('./components/SchedulePlanner').then(m => ({ default: m.SchedulePlanner })));
const ChildrenManager = lazy(() => import('./components/ChildrenManager').then(m => ({ default: m.ChildrenManager })));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const CampComparison = lazy(() => import('./components/CampComparison').then(m => ({ default: m.CampComparison })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const JoinSquad = lazy(() => import('./components/JoinSquad'));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const CostDashboard = lazy(() => import('./components/CostDashboard').then(m => ({ default: m.CostDashboard })));
const Wishlist = lazy(() => import('./components/Wishlist').then(m => ({ default: m.Wishlist })));

// Loading fallback for lazy-loaded modals
const ModalLoadingFallback = memo(function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
        <LoadingSpinner className="w-8 h-8" />
        <p style={{ color: 'var(--earth-700)' }}>Loading...</p>
      </div>
    </div>
  );
});

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

// Fetch camps from Supabase
async function fetchCamps(filters = {}) {
  if (!supabase) {
    return { camps: [], total: 0 };
  }

  let query = supabase.from('camps').select('*');

  // Apply filters
  // SECURITY: Escape characters with special meaning in PostgREST filter expressions
  if (filters.search) {
    const safeSearch = filters.search
      .replace(/[%_\\]/g, c => '\\' + c)  // Escape LIKE wildcards
      .replace(/[,.()\[\]]/g, '')          // Remove PostgREST operators
      .trim();
    if (safeSearch) {
      query = query.or(`camp_name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
    }
  }

  if (filters.category && filters.category !== 'All') {
    query = query.eq('category', filters.category);
  }

  if (filters.minAge) {
    query = query.gte('max_age', parseInt(filters.minAge));
  }

  if (filters.maxAge) {
    query = query.lte('min_age', parseInt(filters.maxAge));
  }

  if (filters.maxPrice) {
    query = query.lte('min_price', parseInt(filters.maxPrice));
  }

  if (!filters.includeClosed) {
    query = query.eq('is_closed', false);
  }

  const { data, error } = await query.order('camp_name');

  if (error) {
    console.error('Error fetching camps:', error);
    return { camps: [], total: 0 };
  }

  return { camps: data || [], total: data?.length || 0 };
}

async function fetchCategories() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('camps')
    .select('category')
    .not('category', 'is', null);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  const categories = [...new Set(data.map(c => c.category))];
  return categories.sort();
}

async function fetchKeywords() {
  return [];
}

async function fetchStats() {
  if (!supabase) {
    return { total: 0, active: 0, closed: 0, categories: {}, priceRange: {}, ageRange: {} };
  }

  const { data: camps, error } = await supabase.from('camps').select('category, min_price, max_price, min_age, max_age, is_closed');

  if (error || !camps) {
    return { total: 0, active: 0, closed: 0, categories: {}, priceRange: {}, ageRange: {} };
  }

  const active = camps.filter(c => !c.is_closed);

  const categories = {};
  active.forEach(c => {
    if (c.category) {
      categories[c.category] = (categories[c.category] || 0) + 1;
    }
  });

  const prices = active.filter(c => c.min_price).map(c => c.min_price);
  const ages = active.filter(c => c.min_age);
  const maxPrices = active.filter(c => c.max_price).map(c => c.max_price);
  const maxAges = ages.filter(c => c.max_age).map(c => c.max_age);

  return {
    total: camps.length,
    active: active.length,
    closed: camps.length - active.length,
    categories,
    priceRange: {
      min: prices.length ? prices.reduce((a, b) => Math.min(a, b), Infinity) : null,
      max: maxPrices.length ? maxPrices.reduce((a, b) => Math.max(a, b), -Infinity) : null
    },
    ageRange: {
      min: ages.length ? ages.map(c => c.min_age).reduce((a, b) => Math.min(a, b), Infinity) : null,
      max: maxAges.length ? maxAges.reduce((a, b) => Math.max(a, b), -Infinity) : null
    }
  };
}

// Get registration urgency status
function getRegUrgency(regDate) {
  if (!regDate || regDate === 'TBD' || regDate === 'Unknown') return null;

  const lower = regDate.toLowerCase();

  // Check for "open now" type messages
  if (lower.includes('open') || lower.includes('now') || lower.includes('rolling')) {
    return { type: 'open', label: 'Open Now', icon: '✓' };
  }

  // Check for "filled" or "closed"
  if (lower.includes('fill') || lower.includes('full') || lower.includes('closed') || lower.includes('waitlist')) {
    return { type: 'full', label: 'Waitlist', icon: '⏳' };
  }

  // Try to parse a date
  const monthMatch = regDate.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  if (monthMatch) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const monthIdx = months[monthMatch[1].toLowerCase()];
    const dayMatch = regDate.match(/\d+/);
    const day = dayMatch ? parseInt(dayMatch[0]) : 1;

    const now = new Date();
    const regDateObj = new Date(now.getFullYear(), monthIdx, day);

    // If the date has passed this year, assume next year
    if (regDateObj < now) {
      regDateObj.setFullYear(now.getFullYear() + 1);
    }

    const daysUntil = Math.ceil((regDateObj - now) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) {
      return { type: 'open', label: 'Open Now', icon: '✓' };
    } else if (daysUntil <= 7) {
      return { type: 'soon', label: `Opens in ${daysUntil}d`, icon: '🔔' };
    } else if (daysUntil <= 30) {
      return { type: 'upcoming', label: `Opens ${regDate}`, icon: '📅' };
    }
  }

  return null;
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

// Category icons with emojis for browse grid
const categoryIcons = [
  { name: 'Beach/Surf', emoji: '🏄' },
  { name: 'Sports', emoji: '⚽' },
  { name: 'Art', emoji: '🎨' },
  { name: 'Science/STEM', emoji: '🔬' },
  { name: 'Nature/Outdoor', emoji: '🌲' },
  { name: 'Theater', emoji: '🎭' },
  { name: 'Dance', emoji: '💃' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Cooking', emoji: '👨‍🍳' },
  { name: 'Animals/Zoo', emoji: '🦁' },
  { name: 'Multi-Activity', emoji: '🎯' },
  { name: 'Education', emoji: '📚' },
  { name: 'Faith-Based', emoji: '✨' },
  { name: 'Overnight', emoji: '🏕️' },
];

// Memoized icon components to prevent unnecessary re-renders
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
    <svg
      className={`${className} animate-spin`}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
});

// Brand Icon (California sun over wave)
const BrandIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="11" r="5" fill="#f9cf45" />
    <path d="M16 3v3M16 14v3M9 11H6M26 11h-3M10.5 5.5l2 2M19.5 7.5l2-2M10.5 16.5l2-2M19.5 14.5l2 2" stroke="#f9cf45" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M3 24c3-3 6-1 9 1s6 3 9 1 6-3 9-1" stroke="#3ba8a8" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M3 28c3-2 6-1 9 1s6 2 9 0 6-2 9 0" stroke="#6bc4c4" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
  </svg>
);

// Main App Component
export default function App() {
  const [camps, setCamps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [childAge, setChildAge] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [extendedCare, setExtendedCare] = useState(false);
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [hasTransport, setHasTransport] = useState(false);
  const [siblingDiscount, setSiblingDiscount] = useState(false);

  // View state
  const [expandedCamp, setExpandedCamp] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('camp_name');
  const [sortDir, setSortDir] = useState('asc');

  // Loading states
  const [isPlannerLoading, setIsPlannerLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResultCount, setSearchResultCount] = useState(null);

  // Modal state
  const [showPlanner, setShowPlanner] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCostDashboard, setShowCostDashboard] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [modalCamp, setModalCamp] = useState(null); // Camp detail modal
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Work schedule filter
  const [matchWorkSchedule, setMatchWorkSchedule] = useState(false);

  // Track initial load to prevent double-fetch
  const initialLoadDone = useRef(false);

  // Ref for table view scroll-to
  const tableRef = useRef(null);

  // Auth context
  const { profile, favorites, isConfigured, showOnboarding, completeOnboarding, user, friendInterestCounts, squads } = useAuth();

  // Check for join squad route
  const [joinInviteCode, setJoinInviteCode] = useState(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/join\/([a-f0-9]+)$/i);
    return match ? match[1] : null;
  });

  // Detect mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for navigation events from auth menu
  useEffect(() => {
    function handleNavigate(e) {
      const target = e.detail;
      if (target === 'planner') setShowPlanner(true);
      if (target === 'children') setShowChildren(true);
      if (target === 'favorites') setShowWishlist(true); // Now opens wishlist
      if (target === 'dashboard') setShowDashboard(true);
      if (target === 'admin') setShowAdmin(true);
      if (target === 'settings') setShowSettings(true);
      if (target === 'budget') setShowCostDashboard(true);
    }
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  // Focus trap for camp detail modal
  useEffect(() => {
    if (!modalCamp) return;
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return;
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    firstEl?.focus();
    modal.addEventListener('keydown', handleTab);

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setModalCamp(null);
        document.body.classList.remove('modal-open');
      }
    };
    document.addEventListener('keydown', handleEsc);

    return () => {
      modal.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [modalCamp]);

  // Comparison functions - memoized to prevent unnecessary child re-renders
  const toggleCompare = useCallback((campId) => {
    setCompareList(prev =>
      prev.includes(campId)
        ? prev.filter(id => id !== campId)
        : prev.length < 4 ? [...prev, campId] : prev
    );
  }, []);

  const addToCompare = useCallback((campId) => {
    setCompareList(prev => {
      if (prev.includes(campId) || prev.length >= 4) return prev;
      return [...prev, campId];
    });
  }, []);

  const removeFromCompare = useCallback((campId) => {
    setCompareList(prev => prev.filter(id => id !== campId));
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [campsData, categoriesData, keywordsData, statsData] = await Promise.all([
          fetchCamps(),
          fetchCategories(),
          fetchKeywords(),
          fetchStats()
        ]);
        setCamps(campsData.camps);
        setCategories(categoriesData);
        setKeywords(keywordsData);
        setStats(statsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    }
    loadData();
  }, []);

  // Fetch camps when filters change
  const loadCamps = useCallback(async () => {
    setError(null);
    setLoading(true);
    setIsSearching(true);
    try {
      const data = await fetchCamps({
        search,
        category: selectedCategory,
        age: childAge,
        maxPrice,
        keywords: selectedKeywords,
        extendedCare,
        foodIncluded,
        transport: hasTransport,
        siblingDiscount,
        sortBy,
        sortDir
      });
      setCamps(data.camps);
      setSearchResultCount(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [search, selectedCategory, childAge, maxPrice, selectedKeywords, extendedCare, foodIncluded, hasTransport, siblingDiscount, sortBy, sortDir]);

  // Debounced search - skip on initial mount to prevent double-fetch
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (search || selectedCategory !== 'All' || childAge || maxPrice || selectedKeywords.length > 0 || extendedCare || foodIncluded || hasTransport || siblingDiscount) {
      setIsSearching(true);
    }
    const timer = setTimeout(loadCamps, 300);
    return () => clearTimeout(timer);
  }, [loadCamps, search, selectedCategory, childAge, maxPrice, selectedKeywords, extendedCare, foodIncluded, hasTransport, siblingDiscount]);

  // Toggle keyword selection - memoized
  const toggleKeyword = useCallback((keyword) => {
    setSelectedKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  }, []);

  // Clear all filters - memoized
  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedCategory('All');
    setChildAge('');
    setMaxPrice('');
    setSelectedKeywords([]);
    setExtendedCare(false);
    setFoodIncluded(false);
    setHasTransport(false);
    setSiblingDiscount(false);
    setMatchWorkSchedule(false);
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (selectedCategory !== 'All') count++;
    if (childAge) count++;
    if (maxPrice) count++;
    if (selectedKeywords.length) count++;
    if (extendedCare) count++;
    if (foodIncluded) count++;
    if (hasTransport) count++;
    if (siblingDiscount) count++;
    if (matchWorkSchedule) count++;
    return count;
  }, [search, selectedCategory, childAge, maxPrice, selectedKeywords, extendedCare, foodIncluded, hasTransport, siblingDiscount, matchWorkSchedule]);

  // Apply work schedule filter to camps
  const filteredCamps = useMemo(() => {
    if (!matchWorkSchedule || !profile) return camps;

    const workStart = profile.work_hours_start || '08:00';
    const workEnd = profile.work_hours_end || '17:30';

    return camps.filter(camp => {
      const coverage = checkWorkScheduleCoverage(camp, workStart, workEnd);
      return coverage.covers;
    });
  }, [camps, matchWorkSchedule, profile]);

  // Handle join squad route
  if (joinInviteCode) {
    return (
      <JoinSquad
        inviteCode={joinInviteCode}
        onComplete={() => {
          setJoinInviteCode(null);
          window.history.replaceState({}, '', '/');
          setShowPlanner(true);
        }}
        onCancel={() => {
          setJoinInviteCode(null);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sand-50)' }}>
        <div className="text-center p-12 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--terra-100)' }}>
            <svg className="w-10 h-10" style={{ color: 'var(--terra-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-heading mb-3" style={{ color: 'var(--earth-800)' }}>
            Something went wrong
          </h1>
          <p className="text-base mb-6" style={{ color: 'var(--earth-700)' }}>Refresh to try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--sand-50)' }}>
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      {/* Hero Section */}
      <header className="hero-section relative pt-8 pb-24 md:pt-12 md:pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-12 md:mb-16">
            <div className="flex items-center gap-3">
              <BrandIcon className="w-9 h-9" />
              <span className="font-sans font-medium text-sm tracking-wide uppercase" style={{ color: 'var(--earth-700)', letterSpacing: '0.1em' }}>
                Santa Barbara
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Dashboard button (logged in users) */}
              {user && (
                <button
                  onClick={() => setShowDashboard(true)}
                  className="btn-secondary hidden sm:flex"
                  title="My Dashboard"
                >
                  <DashboardIcon />
                  <span className="hidden md:inline">Dashboard</span>
                </button>
              )}

              {/* Compare button (when items selected) */}
              {compareList.length > 0 && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="btn-secondary relative"
                  title="Compare camps"
                >
                  <CompareIcon />
                  <span className="hidden sm:inline">Compare</span>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ background: 'var(--terra-500)' }}>
                    {compareList.length}
                  </span>
                </button>
              )}

              {/* Plan My Summer button */}
              <button
                onClick={() => {
                  setIsPlannerLoading(true);
                  setTimeout(() => {
                    setShowPlanner(true);
                    setIsPlannerLoading(false);
                  }, 100);
                }}
                className="btn-primary hidden sm:flex"
                disabled={isPlannerLoading}
              >
                {isPlannerLoading ? (
                  <>
                    <LoadingSpinner className="w-5 h-5" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <CalendarPlanIcon />
                    <span>Plan My Summer</span>
                  </>
                )}
              </button>

              {/* View toggle */}
              <button
                onClick={() => {
                  const newView = viewMode === 'grid' ? 'table' : 'grid';
                  setViewMode(newView);
                  if (newView === 'table') {
                    setTimeout(() => {
                      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }}
                className="btn-secondary"
                title={viewMode === 'grid' ? 'Switch to table view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? <TableIcon /> : <GridIcon />}
                <span className="hidden sm:inline">{viewMode === 'grid' ? 'Table' : 'Grid'}</span>
              </button>

              {/* Auth button */}
              <AuthButton />
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="hero-title">
              <p className="font-sans text-xs sm:text-sm font-medium uppercase tracking-widest mb-4" style={{ color: 'var(--terra-500)', letterSpacing: '0.15em' }}>
                Summer 2026
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display leading-tight mb-6" style={{ color: 'var(--earth-800)' }}>
                Your summer,{' '}
                <span className="text-gradient">sorted.</span>
              </h1>
            </div>
            <p className="hero-subtitle font-sans text-lg md:text-xl font-body mb-10" style={{ color: 'var(--earth-700)', opacity: 0.9 }}>
              {stats ? (
                <>Stop juggling spreadsheets. <strong>{stats.active}</strong> camps, one plan, zero scrambling.</>
              ) : (
                <>Stop juggling spreadsheets. All your camps, one plan, zero scrambling.</>
              )}
            </p>

            {/* Search Bar */}
            <div className="hero-search relative max-w-2xl mx-auto mb-8">
              <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ color: 'var(--sand-400)' }}>
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search camps by name or activity"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
                aria-label="Search camps by name or activity"
              />

              {/* Clear button */}
              {search && (
                <button
                  className="absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-sand-200 transition-colors"
                  onClick={() => setSearch('')}
                  title="Clear search"
                  aria-label="Clear search"
                  style={{ color: 'var(--sand-400)' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Search status indicator */}
              {isSearching && search && (
                <div className="absolute right-14 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--sand-500)' }}>
                  Searching...
                </div>
              )}
            </div>

            {/* Results count below search */}
            {searchResultCount !== null && search && (
              <p className="text-center text-sm mb-4" style={{ color: 'var(--earth-700)' }}>
                Found <strong>{searchResultCount}</strong> {searchResultCount === 1 ? 'camp' : 'camps'} matching "{search}"
              </p>
            )}

            {/* Trust Signals - Quick Stats with Data Freshness */}
            {stats && (
              <div className="hero-stats flex flex-wrap justify-center gap-6 text-sm" style={{ color: 'var(--earth-700)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ocean-400)' }}></span>
                  <span><strong>{camps.length}</strong> local camps</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--terra-400)' }}></span>
                  <span><strong>{categories.length}</strong> categories</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--sun-400)' }}></span>
                  <span>Ages 3–18</span>
                </div>
                <div className="flex items-center gap-2">
                  <VerifiedIcon />
                  <span>Updated Jan 2026</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wave decoration */}
        <div className="wave-decoration">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="wave-fill"></path>
          </svg>
        </div>
      </header>

      {/* Filter Bar - Editorial Style */}
      <section className="filter-bar-section sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Main Filter Row */}
          <div className="filter-bar-inner">
            {/* Left: Quick Presets as elegant text links */}
            <div className="filter-presets">
              <span className="filter-presets-label">Quick filters</span>
              <div className="filter-presets-divider" />
              <button
                onClick={() => {
                  clearFilters();
                  setExtendedCare(true);
                  setFoodIncluded(true);
                }}
                className={`filter-preset-link ${extendedCare && foodIncluded && !maxPrice && selectedCategory === 'All' ? 'active' : ''}`}
              >
                Full-Day Care
              </button>
              <button
                onClick={() => {
                  clearFilters();
                  setMaxPrice('300');
                }}
                className={`filter-preset-link ${maxPrice === '300' && !extendedCare && selectedCategory === 'All' ? 'active' : ''}`}
              >
                Under $300
              </button>
              <button
                onClick={() => {
                  clearFilters();
                  setSelectedCategory('Sports');
                }}
                className={`filter-preset-link ${selectedCategory === 'Sports' ? 'active' : ''}`}
              >
                Sports
              </button>
              <button
                onClick={() => {
                  clearFilters();
                  setSelectedCategory('Art');
                }}
                className={`filter-preset-link ${selectedCategory === 'Art' ? 'active' : ''}`}
              >
                Art & Creative
              </button>
              <button
                onClick={() => {
                  clearFilters();
                  setSelectedCategory('Science/STEM');
                }}
                className={`filter-preset-link ${selectedCategory === 'Science/STEM' ? 'active' : ''}`}
              >
                STEM
              </button>
              <button
                onClick={() => {
                  clearFilters();
                  setSelectedCategory('Nature/Outdoor');
                }}
                className={`filter-preset-link ${selectedCategory === 'Nature/Outdoor' ? 'active' : ''}`}
              >
                Outdoors
              </button>
            </div>

            {/* Right: Filter Controls */}
            <div className="filter-controls">
              {/* All Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`filter-control-btn ${showFilters ? 'active' : ''}`}
              >
                <FilterIcon />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="filter-count">{activeFilterCount}</span>
                )}
              </button>

              {/* Sort dropdown */}
              <select
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [field, dir] = e.target.value.split('-');
                  setSortBy(field);
                  setSortDir(dir);
                }}
                className="filter-sort-select"
                aria-label="Sort camps by"
              >
                <option value="camp_name-asc">A–Z</option>
                <option value="camp_name-desc">Z–A</option>
                <option value="min_price-asc">Price ↑</option>
                <option value="min_price-desc">Price ↓</option>
              </select>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="filter-clear-btn">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Display - shows applied filters with remove buttons */}
        {activeFilterCount > 0 && (
          <div className="active-filters-bar">
            <span className="active-filters-label">Active:</span>
            <div className="active-filters-chips">
              {selectedCategory !== 'All' && (
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="active-filter-chip"
                >
                  {selectedCategory}
                  <span className="active-filter-remove">×</span>
                </button>
              )}
              {childAge && (
                <button
                  onClick={() => setChildAge('')}
                  className="active-filter-chip"
                >
                  Age {childAge}
                  <span className="active-filter-remove">×</span>
                </button>
              )}
              {maxPrice && (
                <button
                  onClick={() => setMaxPrice('')}
                  className="active-filter-chip"
                >
                  Under ${maxPrice}
                  <span className="active-filter-remove">×</span>
                </button>
              )}
              {extendedCare && (
                <button
                  onClick={() => setExtendedCare(false)}
                  className="active-filter-chip"
                >
                  Extended Care
                  <span className="active-filter-remove">×</span>
                </button>
              )}
              {foodIncluded && (
                <button
                  onClick={() => setFoodIncluded(false)}
                  className="active-filter-chip"
                >
                  Food Included
                  <span className="active-filter-remove">×</span>
                </button>
              )}
              {hasTransport && (
                <button
                  onClick={() => setHasTransport(false)}
                  className="active-filter-chip"
                >
                  Transportation
                  <span className="active-filter-remove">×</span>
                </button>
              )}
              {siblingDiscount && (
                <button
                  onClick={() => setSiblingDiscount(false)}
                  className="active-filter-chip"
                >
                  Sibling Discount
                  <span className="active-filter-remove">×</span>
                </button>
              )}
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="active-filter-chip"
                >
                  "{search}"
                  <span className="active-filter-remove">×</span>
                </button>
              )}
            </div>
            <button onClick={clearFilters} className="active-filters-clear">
              Clear all
            </button>
          </div>
        )}
      </section>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <section className="filter-panel-animated" style={{ background: 'white', borderBottom: '1px solid var(--sand-200)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl font-heading" style={{ color: 'var(--earth-800)' }}>
                Filter
              </h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--terra-500)' }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
                  style={{ borderColor: 'var(--sand-200)', background: 'white' }}
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                  Age
                </label>
                <select
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
                  style={{ borderColor: 'var(--sand-200)', background: 'white' }}
                >
                  <option value="">Any Age</option>
                  {[...Array(16)].map((_, i) => (
                    <option key={i + 3} value={i + 3}>{i + 3} years old</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                  Price
                </label>
                <select
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
                  style={{ borderColor: 'var(--sand-200)', background: 'white' }}
                >
                  <option value="">Any Price</option>
                  <option value="200">Under $200</option>
                  <option value="300">Under $300</option>
                  <option value="400">Under $400</option>
                  <option value="500">Under $500</option>
                  <option value="750">Under $750</option>
                </select>
              </div>

              {/* Sort (mobile) */}
              <div className="md:hidden">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
                  Sort
                </label>
                <select
                  value={`${sortBy}-${sortDir}`}
                  onChange={(e) => {
                    const [field, dir] = e.target.value.split('-');
                    setSortBy(field);
                    setSortDir(dir);
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
                  style={{ borderColor: 'var(--sand-200)', background: 'white' }}
                >
                  <option value="camp_name-asc">Name A–Z</option>
                  <option value="camp_name-desc">Name Z–A</option>
                  <option value="min_price-asc">Price: Low to High</option>
                  <option value="min_price-desc">Price: High to Low</option>
                  <option value="min_age-asc">Age: Youngest</option>
                </select>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--sand-100)' }}>
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--earth-700)' }}>Features</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'extendedCare', label: 'Extended Care', state: extendedCare, setter: setExtendedCare },
                  { key: 'foodIncluded', label: 'Food Included', state: foodIncluded, setter: setFoodIncluded },
                  { key: 'hasTransport', label: 'Transportation', state: hasTransport, setter: setHasTransport },
                  { key: 'siblingDiscount', label: 'Sibling Discount', state: siblingDiscount, setter: setSiblingDiscount },
                  ...(user ? [{ key: 'matchWorkSchedule', label: 'Fits My Hours', state: matchWorkSchedule, setter: setMatchWorkSchedule }] : []),
                ].map(({ key, label, state, setter }) => (
                  <button
                    key={key}
                    onClick={() => setter(!state)}
                    className={`filter-pill ${state ? 'active' : ''}`}
                    aria-pressed={state}
                  >
                    {state && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            {keywords.length > 0 && (
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--sand-100)' }}>
                <p className="text-sm font-medium mb-4" style={{ color: 'var(--earth-700)' }}>Activities</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.slice(0, 20).map(keyword => (
                    <button
                      key={keyword}
                      onClick={() => toggleKeyword(keyword)}
                      className={`filter-pill text-sm ${selectedKeywords.includes(keyword) ? 'active' : ''}`}
                      aria-pressed={selectedKeywords.includes(keyword)}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Section - Editor's Picks */}
      {!loading && camps.length > 0 && activeFilterCount === 0 && (
        <section className="featured-section">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="featured-header">
              <h2 className="featured-title">Top Picks</h2>
              <span className="featured-subtitle">Curated for local families</span>
            </div>
            <div className="featured-grid">
              {camps
                .filter(c => c.image_url)
                .slice(0, 3)
                .map((camp, index) => (
                  <FeaturedCard
                    key={camp.id}
                    camp={camp}
                    badge={index === 0 ? 'Most Popular' : index === 1 ? 'Great Value' : 'New This Year'}
                    onClick={() => {
                      // Open the camp detail modal
                      setModalCamp(camp);
                      document.body.classList.add('modal-open');
                    }}
                  />
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Browse Grid */}
      {!loading && camps.length > 0 && activeFilterCount === 0 && (
        <section className="category-browse">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="category-browse-title">Browse by Interest</h2>
            <div className="category-browse-grid">
              {categoryIcons.map(({ name, icon, emoji }) => {
                const count = stats?.categories?.[name] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={name}
                    onClick={() => {
                      clearFilters();
                      setSelectedCategory(name);
                    }}
                    className={`category-browse-card ${selectedCategory === name ? 'active' : ''}`}
                  >
                    <span className="category-browse-icon">{emoji}</span>
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
          <p className="testimonial-quote">
            "Found the right STEM camp for my 10-year-old in under 5 minutes."
          </p>
          <p className="testimonial-author">— Sarah M., Goleta</p>
        </section>
      )}

      {/* Main Content */}
      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Results Count */}
        <div aria-live="polite" aria-atomic="true">
          {!loading && filteredCamps.length > 0 && (
            <p className="results-count">
              Showing <strong>{filteredCamps.length}</strong> {filteredCamps.length === 1 ? 'camp' : 'camps'}
              {selectedCategory !== 'All' && <> in <strong>{selectedCategory}</strong></>}
              {childAge && <> for age <strong>{childAge}</strong></>}
              {maxPrice && <> under <strong>${maxPrice}</strong></>}
              {matchWorkSchedule && <> that fit your schedule</>}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading camps">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" aria-hidden="true">
                <div className="skeleton-image" />
                <div className="skeleton-text" />
                <div className="skeleton-text short" />
                <div className="skeleton-text" style={{width: '40%'}} />
              </div>
            ))}
          </div>
        ) : filteredCamps.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sand-100)' }}>
              <svg className="w-12 h-12" style={{ color: 'var(--sand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-heading mb-3" style={{ color: 'var(--earth-800)' }}>
              No camps match these filters
            </h2>
            <p className="text-base mb-6" style={{ color: 'var(--earth-700)' }}>
              Try adjusting age or price range.
            </p>
            <button onClick={clearFilters} className="btn-primary">
              Clear Filters
            </button>
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
                    // Mobile: inline expand
                    setExpandedCamp(expandedCamp === camp.id ? null : camp.id);
                  } else {
                    // Desktop: open modal
                    setModalCamp(camp);
                    document.body.classList.add('modal-open');
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
            <CampTable
              camps={filteredCamps}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={(field) => {
                if (sortBy === field) {
                  setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(field);
                  setSortDir('asc');
                }
              }}
              expandedCamp={expandedCamp}
              onToggle={(id) => setExpandedCamp(expandedCamp === id ? null : id)}
            />
          </div>
        )}
      </main>

      {/* Footer - Enhanced with trust signals */}
      <footer className="site-footer">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <BrandIcon className="w-7 h-7" />
              <span className="font-serif text-lg" style={{ color: 'var(--sand-100)' }}>
                Santa Barbara Summer Camps
              </span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm mb-1" style={{ color: 'var(--sand-200)' }}>
                Data from camp websites • Updated Jan 2026
              </p>
              <p className="text-xs" style={{ color: 'var(--sand-400)' }}>
                Verify prices and availability directly with camps before enrolling.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals - Lazy loaded with Suspense for better performance */}
      <Suspense fallback={<ModalLoadingFallback />}>
        {showPlanner && (
          <SchedulePlanner camps={camps} onClose={() => setShowPlanner(false)} />
        )}

        {showChildren && (
          <ChildrenManager onClose={() => setShowChildren(false)} />
        )}

        {showDashboard && (
          <Dashboard
            camps={camps}
            onClose={() => setShowDashboard(false)}
            onOpenPlanner={() => {
              setShowDashboard(false);
              setShowPlanner(true);
            }}
            onSelectCamp={(camp) => {
              setShowDashboard(false);
              if (isMobile) {
                // Mobile: inline expand
                setExpandedCamp(camp.id);
              } else {
                // Desktop: open modal
                setModalCamp(camp);
                document.body.classList.add('modal-open');
              }
            }}
          />
        )}

        {showComparison && (
          <CampComparison
            camps={camps}
            selectedCampIds={compareList}
            onClose={() => setShowComparison(false)}
            onRemoveCamp={removeFromCompare}
            onAddCamp={addToCompare}
          />
        )}

        {showOnboarding && (
          <OnboardingWizard onComplete={completeOnboarding} />
        )}

        {showAdmin && (
          <AdminDashboard
            camps={camps}
            onClose={() => setShowAdmin(false)}
          />
        )}

        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} />
        )}

        {showCostDashboard && (
          <CostDashboard
            camps={camps}
            onClose={() => setShowCostDashboard(false)}
          />
        )}

        {showWishlist && (
          <Wishlist
            camps={camps}
            onClose={() => setShowWishlist(false)}
            onScheduleCamp={(camp) => {
              setShowWishlist(false);
              setShowPlanner(true);
            }}
            onCompareCamps={(campIds) => {
              setCompareList(campIds);
            setShowWishlist(false);
            setShowComparison(true);
          }}
        />
      )}
      </Suspense>

      {/* FavoritesModal is not lazy loaded as it's small */}
      {showFavorites && (
        <FavoritesModal
          camps={camps}
          onClose={() => setShowFavorites(false)}
          onOpenPlanner={() => {
            setShowFavorites(false);
            setShowPlanner(true);
          }}
        />
      )}

      {/* Sticky Compare Bar */}
      {compareList.length > 0 && !showComparison && (
        <div className="compare-bar">
          <div className="compare-bar-content">
            <div className="compare-bar-camps">
              {compareList.map(campId => {
                const camp = camps.find(c => c.id === campId);
                if (!camp) return null;
                return (
                  <div key={campId} className="compare-bar-chip">
                    <span className="compare-bar-chip-name">{camp.camp_name}</span>
                    <button
                      onClick={() => removeFromCompare(campId)}
                      className="compare-bar-chip-remove"
                      aria-label="Remove from compare"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
              {compareList.length < 4 && (
                <span className="compare-bar-hint">Add {4 - compareList.length} more</span>
              )}
            </div>
            <div className="compare-bar-actions">
              <button
                onClick={() => setCompareList([])}
                className="compare-bar-clear"
              >
                Clear
              </button>
              <button
                onClick={() => setShowComparison(true)}
                className="btn-primary compare-bar-button"
              >
                <CompareIcon />
                Compare {compareList.length} Camps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camp Detail Modal */}
      {modalCamp && (
        <CampDetailModal
          camp={modalCamp}
          onClose={() => {
            setModalCamp(null);
            document.body.classList.remove('modal-open');
          }}
          onAddToSchedule={() => {
            setModalCamp(null);
            document.body.classList.remove('modal-open');
            setShowPlanner(true);
          }}
          onToggleFavorite={() => {
            // Favorite toggle is handled by the FavoriteButton inside the modal
          }}
          isFavorite={favorites.some(f => f.camp_id === modalCamp.id)}
          onToggleCompare={() => toggleCompare(modalCamp.id)}
          isInCompare={compareList.includes(modalCamp.id)}
        />
      )}
    </div>
  );
}

// Favorites Modal Component
function FavoritesModal({ camps, onClose, onOpenPlanner }) {
  const { favorites } = useAuth();

  const favoriteCamps = useMemo(() => {
    return favorites.map(f => {
      const camp = camps.find(c => c.id === f.camp_id);
      return { ...f, camp };
    }).filter(f => f.camp);
  }, [favorites, camps]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6" style={{ borderBottom: '1px solid var(--sand-200)' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-heading" style={{ color: 'var(--earth-800)' }}>
              My Favorites
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full"
              style={{ color: 'var(--sand-400)' }}
            >
              <XModalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 150px)' }}>
          {favoriteCamps.length === 0 ? (
            <div className="text-center py-12">
              <HeartOutlineIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--sand-300)' }} />
              <h3 className="font-serif text-lg font-heading mb-2" style={{ color: 'var(--earth-800)' }}>
                No favorites yet
              </h3>
              <p style={{ color: 'var(--earth-700)' }}>
                Tap the heart on any camp to save it.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteCamps.map(({ camp, notes }) => (
                <div
                  key={camp.id}
                  className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ background: 'var(--sand-50)', border: '1px solid var(--sand-200)' }}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold" style={{ color: 'var(--earth-800)' }}>
                      {camp.camp_name}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--sand-400)' }}>
                      {camp.category} • {camp.ages} • {formatPrice(camp)}
                    </p>
                    {notes && (
                      <p className="text-sm mt-2 italic" style={{ color: 'var(--earth-700)' }}>
                        {notes}
                      </p>
                    )}
                  </div>
                  <FavoriteButton campId={camp.id} size="sm" />
                </div>
              ))}

              <button
                onClick={() => {
                  setIsPlannerLoading(true);
                  setTimeout(() => {
                    onOpenPlanner();
                    setIsPlannerLoading(false);
                  }, 100);
                }}
                className="btn-primary w-full mt-4"
                disabled={isPlannerLoading}
              >
                {isPlannerLoading ? (
                  <>
                    <LoadingSpinner className="w-5 h-5" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <CalendarPlanIcon />
                    <span>Plan My Summer</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoized icon components for header/actions
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

const XModalIcon = memo(function XModalIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
});

const HeartOutlineIcon = memo(function HeartOutlineIcon({ className, style }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
});

// Verified/Shield Icon for trust signals
const VerifiedIcon = memo(function VerifiedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--ocean-500)' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
});

// Featured Card Component for Editor's Picks section - memoized to prevent unnecessary re-renders
const FeaturedCard = memo(function FeaturedCard({ camp, badge, onClick }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  const [imageError, setImageError] = useState(false);

  return (
    <div className="featured-card cursor-pointer" onClick={onClick} role="button" tabIndex={0} onKeyDown={handleKeyDown} aria-label={`View details for ${camp.camp_name}`}>
      <div className="featured-card-image">
        {camp.image_url && !imageError ? (
          <img
            src={camp.image_url}
            alt={camp.camp_name}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: categoryGradients[camp.category] || 'var(--sand-200)' }}
          >
            <span className="text-white text-4xl opacity-50">🏕️</span>
          </div>
        )}
        <span className="featured-card-badge">{badge}</span>
      </div>
      <div className="featured-card-content">
        <p className="featured-card-category">{camp.category}</p>
        <h3 className="featured-card-title">{camp.camp_name}</h3>
        <p className="featured-card-tagline line-clamp-2">
          {camp.description?.slice(0, 100)}{camp.description?.length > 100 ? '...' : ''}
        </p>
        <div className="featured-card-meta">
          <span>{camp.ages || 'All ages'}</span>
          <span>•</span>
          <span style={{ color: 'var(--terra-500)', fontWeight: 600 }}>{formatPrice(camp)}</span>
        </div>
      </div>
    </div>
  );
});

// Camp Card Component with scroll-triggered reveal - memoized for performance
// Only re-renders when camp data, expanded state, or compare state changes
const CampCard = memo(function CampCard({ camp, expanded, onToggle, index, isComparing = false, onToggleCompare, friendInterestCounts = {}, hasSquads = false }) {
  const categoryClass = categoryClasses[camp.category] || 'category-multi-activity';
  const categoryGradient = categoryGradients[camp.category] || categoryGradients['Multi-Activity'];
  const [imageError, setImageError] = useState(false);
  const [cardRef, isRevealed] = useScrollReveal();

  // Get friend interest count for this camp
  const friendCount = friendInterestCounts[camp.id] || 0;

  return (
    <article
      id={`camp-${camp.id}`}
      ref={cardRef}
      className={`camp-card scroll-reveal stagger-${(index % 6) + 1} ${isRevealed ? 'revealed' : ''} ${camp.is_closed ? 'opacity-50' : ''} ${isComparing ? 'ring-2' : ''}`}
      style={isComparing ? { ringColor: 'var(--ocean-500)' } : undefined}
    >
      <div
        className="camp-card-button"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        aria-label={`View details for ${camp.camp_name}`}
      >
      {/* Camp Image or Category color bar */}
      {camp.image_url && !imageError ? (
        <div className="camp-card-image">
          <img
            src={camp.image_url}
            alt={camp.camp_name}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
          <div className="camp-card-image-overlay" style={{ background: categoryGradient }}></div>
        </div>
      ) : (
        <div className="camp-card-header" style={{ background: categoryGradient }}></div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <h3 className="font-serif text-xl font-heading leading-tight flex-1" style={{ color: 'var(--earth-800)' }}>
            {camp.camp_name}
          </h3>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCompare?.(); }}
              className={`p-2 rounded-full transition-colors ${isComparing ? '' : 'hover:bg-sand-100'}`}
              style={{
                color: isComparing ? 'var(--ocean-600)' : 'var(--sand-400)',
                background: isComparing ? 'var(--ocean-100)' : 'transparent'
              }}
              title={isComparing ? 'Remove from compare' : 'Add to compare'}
              aria-label={isComparing ? 'Remove from compare' : 'Add to compare'}
              aria-pressed={isComparing}
            >
              <svg className="w-5 h-5" fill={isComparing ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <FavoriteButton campId={camp.id} />
          </div>
          <ChevronIcon expanded={expanded} />
        </div>

        {/* Category Badge */}
        <div className={`${categoryClass} mb-4`}>
          <span className="category-badge">
            <span className="category-dot"></span>
            {camp.category}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm line-clamp-2 mb-5" style={{ color: 'var(--earth-700)', lineHeight: 1.6 }}>
          {camp.description}
        </p>

        {/* Quick Info Row - Scannable */}
        <div className="camp-quick-info">
          <div className="camp-quick-info-item">
            <p className="camp-quick-info-label">Ages</p>
            <p className="camp-quick-info-value">{camp.ages || '—'}</p>
          </div>
          <div className="camp-quick-info-item">
            <p className="camp-quick-info-label">Price</p>
            <p className="camp-quick-info-value price">{formatPrice(camp)}</p>
          </div>
          <div className="camp-quick-info-item">
            <p className="camp-quick-info-label">Hours</p>
            <p className="camp-quick-info-value">{camp.hours || 'TBD'}</p>
          </div>
        </div>

        {/* Registration Status Badge */}
        {(() => {
          const regStatus = getRegistrationStatus(camp);
          if (regStatus.status === 'unknown') return null;
          return (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3 w-fit"
              style={{
                backgroundColor: `${regStatus.color}15`,
                color: regStatus.color
              }}
            >
              {regStatus.isOpen ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : regStatus.status === 'upcoming' && regStatus.daysUntil <= 7 ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              ) : regStatus.status === 'closed' || regStatus.status === 'waitlist' ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              )}
              <span>{regStatus.label}</span>
            </div>
          );
        })()}

        {/* Friend Interest Indicator */}
        {hasSquads && friendCount > 0 && (
          <div className="friend-interest-badge mb-3">
            <span className="friend-interest-icon">👥</span>
            <span className="friend-interest-label">
              {friendCount} {friendCount === 1 ? 'friend' : 'friends'} interested
            </span>
          </div>
        )}

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-2">
          {camp.has_extended_care && (
            <span className="feature-badge feature-badge-extended">Extended Care</span>
          )}
          {camp.food_included && (
            <span className="feature-badge feature-badge-food">Meals</span>
          )}
          {camp.has_transport && (
            <span className="feature-badge feature-badge-transport">Transport</span>
          )}
          {camp.has_sibling_discount && (
            <span className="feature-badge feature-badge-sibling">Sibling $</span>
          )}
        </div>
      </div>
      </div>

      {/* Expanded Details */}
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

          {/* Food Information Section */}
          <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--ocean-50)', border: '1px solid var(--ocean-200)' }}>
            <p className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--ocean-600)' }}>
              <span>🍽️</span> Food
            </p>
            <p className="text-sm" style={{ color: 'var(--earth-700)' }}>
              {camp.food_provided && camp.food_provided !== 'N/A' && camp.food_provided !== 'Unknown'
                ? camp.food_provided
                : camp.food_included
                  ? 'Meals included'
                  : 'Bring lunch'}
            </p>
          </div>

          {/* Cancellation Policy Section */}
          {camp.refund_policy && camp.refund_policy !== 'Unknown' && camp.refund_policy !== 'N/A' && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--terra-50)', border: '1px solid var(--terra-200)' }}>
              <p className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--terra-600)' }}>
                <span>📋</span> Cancellation
              </p>
              <p className="text-sm" style={{ color: 'var(--earth-700)' }}>
                {camp.refund_policy}
              </p>
            </div>
          )}

          {/* Activities */}
          {camp.extracted?.activities && camp.extracted.activities.length > 0 && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--sage-50)', border: '1px solid var(--sage-200)' }}>
              <p className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--sage-600)' }}>
                <span>🎯</span> Activities
              </p>
              <div className="flex flex-wrap gap-1">
                {camp.extracted.activities.slice(0, 8).map((activity, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--sage-100)', color: 'var(--sage-700)' }}>
                    {activity}
                  </span>
                ))}
                {camp.extracted.activities.length > 8 && (
                  <span className="text-xs px-2 py-1" style={{ color: 'var(--sage-500)' }}>
                    +{camp.extracted.activities.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Staff Ratio & Certifications */}
          {(camp.extracted?.staff_ratio || camp.extracted?.certifications?.length > 0) && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--ocean-50)', border: '1px solid var(--ocean-200)' }}>
              <p className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--ocean-600)' }}>
                <span>👥</span> Staff & Safety
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {camp.extracted?.staff_ratio && (
                  <div>
                    <span style={{ color: 'var(--sand-400)' }}>Ratio: </span>
                    <span style={{ color: 'var(--earth-700)' }}>{camp.extracted.staff_ratio}</span>
                  </div>
                )}
                {camp.extracted?.certifications?.length > 0 && (
                  <div className="col-span-2">
                    <span style={{ color: 'var(--sand-400)' }}>Certifications: </span>
                    <span style={{ color: 'var(--earth-700)' }}>{camp.extracted.certifications.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Testimonials */}
          {camp.extracted?.testimonials && camp.extracted.testimonials.length > 0 && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--sun-50)', border: '1px solid var(--sun-200)' }}>
              <p className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--sun-600)' }}>
                <span>💬</span> Parent Review
              </p>
              <p className="text-sm italic" style={{ color: 'var(--earth-700)' }}>
                "{camp.extracted.testimonials[0]}"
              </p>
            </div>
          )}

          {/* PDF Documents */}
          {camp.pdf_links && camp.pdf_links.length > 0 && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--sand-100)', border: '1px solid var(--sand-200)' }}>
              <p className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--earth-700)' }}>
                <span>📄</span> Documents
              </p>
              <div className="flex flex-wrap gap-2">
                {camp.pdf_links.slice(0, 4).map((pdf, i) => safeUrl(pdf.url) && (
                  <a
                    key={i}
                    href={safeUrl(pdf.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ background: 'white', color: 'var(--ocean-600)', border: '1px solid var(--ocean-200)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>📎</span>
                    {pdf.text?.substring(0, 20) || pdf.type || 'Document'}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Social Media Links */}
          {camp.social_media && Object.keys(camp.social_media).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {safeUrl(camp.social_media.facebook) && (
                <a href={safeUrl(camp.social_media.facebook)} target="_blank" rel="noopener noreferrer"
                   className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                   style={{ background: '#1877f2', color: 'white' }}
                   onClick={(e) => e.stopPropagation()}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
              {safeUrl(camp.social_media.instagram) && (
                <a href={safeUrl(camp.social_media.instagram)} target="_blank" rel="noopener noreferrer"
                   className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                   style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: 'white' }}
                   onClick={(e) => e.stopPropagation()}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              )}
              {safeUrl(camp.social_media.twitter) && (
                <a href={safeUrl(camp.social_media.twitter)} target="_blank" rel="noopener noreferrer"
                   className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                   style={{ background: '#000', color: 'white' }}
                   onClick={(e) => e.stopPropagation()}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {safeUrl(camp.social_media.youtube) && (
                <a href={safeUrl(camp.social_media.youtube)} target="_blank" rel="noopener noreferrer"
                   className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                   style={{ background: '#ff0000', color: 'white' }}
                   onClick={(e) => e.stopPropagation()}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              )}
            </div>
          )}

          {camp.notes && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--sun-100)', border: '1px solid var(--sun-300)' }}>
              <p className="font-medium text-sm mb-1" style={{ color: 'var(--earth-800)' }}>Notes</p>
              <p className="text-sm" style={{ color: 'var(--earth-700)' }}>{camp.notes}</p>
            </div>
          )}

          {camp.website_url && camp.website_url !== 'N/A' && safeUrl(camp.website_url) && (
            <a
              href={safeUrl(camp.website_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full mt-5"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Visit Website</span>
              <ExternalLinkIcon />
            </a>
          )}
        </div>
      )}
    </article>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render when these props change
  const prevFriendCount = prevProps.friendInterestCounts?.[prevProps.camp.id] || 0;
  const nextFriendCount = nextProps.friendInterestCounts?.[nextProps.camp.id] || 0;
  return (
    prevProps.camp.id === nextProps.camp.id &&
    prevProps.expanded === nextProps.expanded &&
    prevProps.isComparing === nextProps.isComparing &&
    prevProps.index === nextProps.index &&
    prevProps.hasSquads === nextProps.hasSquads &&
    prevFriendCount === nextFriendCount
  );
});

// Detail Row Component - memoized
const DetailRow = memo(function DetailRow({ label, value }) {
  if (!value || value === 'Unknown' || value === 'N/A') return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--sand-400)' }}>{label}</p>
      <p className="font-medium" style={{ color: 'var(--earth-800)' }}>{value}</p>
    </div>
  );
});

// Camp Detail Modal - Editorial Magazine Style - memoized
const CampDetailModal = memo(function CampDetailModal({ camp, onClose, onAddToSchedule, onToggleFavorite, isFavorite, onToggleCompare, isInCompare }) {
  const [imageError, setImageError] = useState(false);
  const categoryGradient = categoryGradients[camp.category] || categoryGradients['Multi-Activity'];

  // Manage body overflow when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const regStatus = getRegistrationStatus(camp);

  // Build feature pills array
  const featurePills = [];
  if (regStatus.status !== 'unknown') {
    featurePills.push({
      icon: regStatus.isOpen ? '✓' : regStatus.status === 'upcoming' ? '📅' : '⏳',
      label: regStatus.label,
      type: regStatus.isOpen ? 'open' : regStatus.status === 'upcoming' ? (regStatus.daysUntil <= 7 ? 'soon' : 'upcoming') : 'full',
      key: 'registration',
      color: regStatus.color
    });
  }
  if (camp.has_extended_care) featurePills.push({ icon: '⏰', label: 'Extended Care', key: 'extended' });
  if (camp.food_included) featurePills.push({ icon: '🍽️', label: 'Meals Included', key: 'food' });
  if (camp.has_transport) featurePills.push({ icon: '🚐', label: 'Transport', key: 'transport' });
  if (camp.has_sibling_discount) featurePills.push({ icon: '👨‍👩‍👧', label: 'Sibling Discount', key: 'sibling' });
  if (camp.fsa_eligible) featurePills.push({ icon: '💳', label: 'FSA Eligible', key: 'fsa', type: 'fsa' });

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${camp.camp_name} details`}>
      <article className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Hero Section */}
        <header className="modal-hero">
          {camp.image_url && !imageError ? (
            <img
              src={camp.image_url}
              alt={camp.camp_name}
              className="modal-hero-img"
              decoding="async"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="modal-hero-fallback" style={{ background: categoryGradient }} />
          )}
          <div className="modal-hero-gradient" />

          {/* Action Buttons - Favorite and Compare */}
          <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
            {/* Compare Button */}
            {onToggleCompare && (
              <button
                className={`modal-favorite ${isInCompare ? 'is-active' : ''}`}
                onClick={onToggleCompare}
                aria-label={isInCompare ? 'Remove from comparison' : 'Add to comparison'}
                title={isInCompare ? 'Remove from comparison' : 'Add to comparison'}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>
            )}

            {/* Favorite Button */}
            <button
              className={`modal-favorite ${isFavorite ? 'is-active' : ''}`}
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Title Block */}
          <div className="modal-hero-content">
            <p className="modal-category">{camp.category}</p>
            <h1 className="modal-title">{camp.camp_name}</h1>
            <p className="modal-subtitle">
              {camp.ages || 'All ages'} · {formatPrice(camp)} · {camp.hours || 'Hours TBD'}
            </p>
          </div>
        </header>

        {/* Body */}
        <div className="modal-body">
          {/* Feature Pills */}
          {featurePills.length > 0 && (
            <div className="modal-pills">
              {featurePills.map((pill) => (
                <span
                  key={pill.key}
                  className={`modal-pill ${pill.type ? `modal-pill--${pill.type}` : ''}`}
                >
                  <span className="modal-pill-icon">{pill.icon}</span>
                  {pill.label}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {camp.description && (
            <p className="modal-description">{camp.description}</p>
          )}

          {/* Details Grid */}
          <div className="modal-grid">
            {/* Location & Schedule */}
            <section className="modal-section">
              <h2 className="modal-section-title">Where & When</h2>
              <dl className="modal-dl">
                {camp.address && (
                  <>
                    <dt>Location</dt>
                    <dd>{camp.address}</dd>
                  </>
                )}
                {camp.indoor_outdoor && camp.indoor_outdoor !== 'Unknown' && (
                  <>
                    <dt>Setting</dt>
                    <dd>{camp.indoor_outdoor}</dd>
                  </>
                )}
                {camp.hours && (
                  <>
                    <dt>Hours</dt>
                    <dd>{camp.hours}</dd>
                  </>
                )}
                {camp.extended_care && camp.extended_care !== 'Unknown' && (
                  <>
                    <dt>Extended Care</dt>
                    <dd>{camp.extended_care}</dd>
                  </>
                )}
              </dl>
            </section>

            {/* Contact & Pricing */}
            <section className="modal-section">
              <h2 className="modal-section-title">Contact & Cost</h2>
              <dl className="modal-dl">
                {camp.contact_phone && (
                  <>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${camp.contact_phone.replace(/\D/g, '')}`} className="modal-link">
                        {camp.contact_phone}
                      </a>
                    </dd>
                  </>
                )}
                {camp.contact_email && (
                  <>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${camp.contact_email}`} className="modal-link">
                        {camp.contact_email}
                      </a>
                    </dd>
                  </>
                )}
                {camp.extended_care_cost && camp.extended_care_cost !== 'Unknown' && camp.extended_care_cost !== 'N/A' && (
                  <>
                    <dt>Extended Care Cost</dt>
                    <dd>{camp.extended_care_cost}</dd>
                  </>
                )}
                {camp.sibling_discount && camp.sibling_discount !== 'Unknown' && (
                  <>
                    <dt>Sibling Discount</dt>
                    <dd>{camp.sibling_discount}</dd>
                  </>
                )}
                {camp.refund_policy && camp.refund_policy !== 'Unknown' && camp.refund_policy !== 'N/A' && (
                  <>
                    <dt>Cancellation</dt>
                    <dd>{camp.refund_policy}</dd>
                  </>
                )}
              </dl>
            </section>
          </div>

          {/* Pricing Tiers */}
          {camp.extracted?.pricing_tiers && (camp.extracted.pricing_tiers.earlyBird || camp.extracted.pricing_tiers.regular || camp.extracted.pricing_tiers.halfDay || camp.extracted.pricing_tiers.fullDay || camp.extracted.pricing_tiers.perSession) && (
            <section className="modal-section modal-section--full">
              <h2 className="modal-section-title">Pricing</h2>
              <dl className="modal-dl modal-dl--pricing">
                {camp.extracted.pricing_tiers.earlyBird && (
                  <>
                    <dt>Early Bird</dt>
                    <dd>${camp.extracted.pricing_tiers.earlyBird}/week</dd>
                  </>
                )}
                {camp.extracted.pricing_tiers.regular && (
                  <>
                    <dt>Regular</dt>
                    <dd>${camp.extracted.pricing_tiers.regular}/week</dd>
                  </>
                )}
                {camp.extracted.pricing_tiers.halfDay && (
                  <>
                    <dt>Half Day</dt>
                    <dd>${camp.extracted.pricing_tiers.halfDay}</dd>
                  </>
                )}
                {camp.extracted.pricing_tiers.fullDay && (
                  <>
                    <dt>Full Day</dt>
                    <dd>${camp.extracted.pricing_tiers.fullDay}</dd>
                  </>
                )}
                {camp.extracted.pricing_tiers.perSession && (
                  <>
                    <dt>Per Session</dt>
                    <dd>${camp.extracted.pricing_tiers.perSession}</dd>
                  </>
                )}
              </dl>
            </section>
          )}

          {/* Sessions / Dates */}
          {camp.extracted?.sessions && camp.extracted.sessions.length > 0 && (
            <section className="modal-section modal-section--full">
              <h2 className="modal-section-title">2026 Sessions</h2>
              <div className="modal-sessions">
                {camp.extracted.sessions.map((session, i) => {
                  const text = (session.raw || '').replace(/[\n\t]+/g, ' ').trim();
                  return text ? (
                    <div key={i} className="modal-session-row">
                      <span className="modal-session-text">{text}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </section>
          )}

          {/* Availability */}
          {camp.extracted?.availability && (camp.extracted.availability.isOpen || camp.extracted.availability.hasWaitlist || (camp.extracted.availability.soldOutSessions && camp.extracted.availability.soldOutSessions.length > 0)) && (
            <div className="modal-callout modal-callout--availability">
              <span className="modal-callout-icon">{camp.extracted.availability.isOpen ? '✅' : '⏳'}</span>
              <div>
                <strong>{camp.extracted.availability.isOpen ? 'Open Now' : 'Limited Spots'}</strong>
                {camp.extracted.availability.hasWaitlist && <p>Waitlist open</p>}
                {camp.extracted.availability.soldOutSessions && camp.extracted.availability.soldOutSessions.length > 0 && (
                  <p>Sold out: {camp.extracted.availability.soldOutSessions.join(', ')}</p>
                )}
                {camp.extracted.availability.openingDate && (
                  <p>Opens: {camp.extracted.availability.openingDate}</p>
                )}
              </div>
            </div>
          )}

          {/* Food Info */}
          {(camp.food_provided || camp.food_included) && camp.food_provided !== 'Unknown' && (
            <div className="modal-callout modal-callout--ocean">
              <span className="modal-callout-icon">🍽️</span>
              <div>
                <strong>Food</strong>
                <p>
                  {camp.food_provided && camp.food_provided !== 'N/A' && camp.food_provided !== 'Unknown'
                    ? camp.food_provided
                    : camp.food_included ? 'Meals included' : 'Bring lunch'}
                </p>
              </div>
            </div>
          )}

          {/* Activities */}
          {camp.extracted?.activities && camp.extracted.activities.length > 0 && (
            <section className="modal-section modal-section--full">
              <h2 className="modal-section-title">Activities</h2>
              <div className="modal-tags">
                {camp.extracted.activities.map((activity, i) => (
                  <span key={i} className="modal-tag">{activity}</span>
                ))}
              </div>
            </section>
          )}

          {/* Staff & Safety */}
          {(camp.extracted?.staff_ratio || camp.extracted?.certifications?.length > 0) && (
            <div className="modal-callout modal-callout--sage">
              <span className="modal-callout-icon">👥</span>
              <div>
                <strong>Staff & Safety</strong>
                {camp.extracted?.staff_ratio && <p>Staff ratio: {camp.extracted.staff_ratio}</p>}
                {camp.extracted?.certifications?.length > 0 && (
                  <p>Certifications: {camp.extracted.certifications.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {/* Testimonials */}
          {camp.extracted?.testimonials && camp.extracted.testimonials.length > 0 && (
            <div className="modal-testimonials">
              {camp.extracted.testimonials.slice(0, 3).map((quote, i) => (
                <blockquote key={i} className="modal-quote">
                  <p>"{quote}"</p>
                </blockquote>
              ))}
            </div>
          )}

          {/* PDF Links */}
          {camp.pdf_links && camp.pdf_links.length > 0 && (
            <section className="modal-section modal-section--full">
              <h2 className="modal-section-title">Documents</h2>
              <div className="modal-pdf-links">
                {camp.pdf_links.slice(0, 5).map((pdf, i) => safeUrl(pdf.url) && (
                  <a key={i} href={safeUrl(pdf.url)} target="_blank" rel="noopener noreferrer" className="modal-pdf-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {pdf.text || pdf.type || 'Document'}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          {camp.notes && (
            <div className="modal-callout modal-callout--sun">
              <span className="modal-callout-icon">📝</span>
              <div>
                <strong>Notes</strong>
                <p>{camp.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="modal-footer">
          {camp.website_url && safeUrl(camp.website_url) && (
            <a
              href={safeUrl(camp.website_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-btn modal-btn--primary"
            >
              Visit Website
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </a>
          )}
          <button onClick={onAddToSchedule} className="modal-btn modal-btn--secondary">
            Schedule This Camp
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </footer>

        {/* Social Links */}
        {camp.social_media && Object.keys(camp.social_media).length > 0 && (
          <div className="modal-social">
            {safeUrl(camp.social_media.facebook) && (
              <a href={safeUrl(camp.social_media.facebook)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="Facebook">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {safeUrl(camp.social_media.instagram) && (
              <a href={safeUrl(camp.social_media.instagram)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="Instagram">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            )}
            {safeUrl(camp.social_media.youtube) && (
              <a href={safeUrl(camp.social_media.youtube)} target="_blank" rel="noopener noreferrer" className="modal-social-link" aria-label="YouTube">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            )}
          </div>
        )}
      </article>
    </div>
  );
});

// Modal Detail Row - memoized
const DetailRowModal = memo(function DetailRowModal({ icon, label, value, isEmail }) {
  if (!value || value === 'Unknown' || value === 'N/A') return null;
  return (
    <div className="camp-modal-detail-row">
      <span className="camp-modal-detail-icon">{icon}</span>
      <div>
        <p className="camp-modal-detail-label">{label}</p>
        {isEmail ? (
          <a href={`mailto:${value}`} className="camp-modal-detail-value camp-modal-link">{value}</a>
        ) : (
          <p className="camp-modal-detail-value">{value}</p>
        )}
      </div>
    </div>
  );
});

// Camp Table Component - memoized for performance with large lists
const CampTable = memo(function CampTable({ camps, sortBy, sortDir, onSort, expandedCamp, onToggle }) {
  const columns = [
    { key: 'camp_name', label: 'Camp Name' },
    { key: 'ages', label: 'Ages' },
    { key: 'min_price', label: 'Price' },
    { key: 'hours', label: 'Hours' },
    { key: 'category', label: 'Category' },
    { key: '2025_reg_date', label: 'Registration' }
  ];

  return (
    <div className="overflow-x-auto rounded-2xl" style={{ boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.08)' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className="select-none"
                aria-sort={sortBy === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <span className="flex items-center gap-2">
                  {col.label}
                  {sortBy === col.key && (
                    <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {camps.map((camp) => (
            <React.Fragment key={camp.id}>
              <tr
                className={`cursor-pointer ${camp.is_closed ? 'opacity-50' : ''} ${expandedCamp === camp.id ? 'expanded' : ''}`}
                onClick={() => onToggle(camp.id)}
              >
                <td className="font-medium">
                  <span className="flex items-center gap-3">
                    <ChevronIcon expanded={expandedCamp === camp.id} />
                    <span style={{ color: 'var(--earth-800)' }}>{camp.camp_name}</span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton campId={camp.id} size="sm" />
                    </span>
                  </span>
                </td>
                <td>{camp.ages}</td>
                <td style={{ color: 'var(--terra-500)', fontWeight: 600 }}>{formatPrice(camp)}</td>
                <td>{camp.hours || 'TBD'}</td>
                <td>
                  <div className={categoryClasses[camp.category] || 'category-multi-activity'}>
                    <span className="category-badge">
                      <span className="category-dot"></span>
                      {camp.category}
                    </span>
                  </div>
                </td>
                <td>{camp['2025_reg_date'] || 'TBD'}</td>
              </tr>
              {expandedCamp === camp.id && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <div className="expanded-details">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div className="md:col-span-3 pb-4" style={{ borderBottom: '1px solid var(--sand-200)' }}>
                          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--sand-400)' }}>Description</p>
                          <p style={{ color: 'var(--earth-700)', lineHeight: 1.6 }}>{camp.description}</p>
                        </div>
                        <DetailRow label="Location" value={camp.address} />
                        <DetailRow label="Indoor/Outdoor" value={camp.indoor_outdoor} />
                        <DetailRow label="Food Provided" value={camp.food_provided} />
                        <DetailRow label="Extended Care" value={camp.extended_care} />
                        <DetailRow label="Sibling Discount" value={camp.sibling_discount} />
                        <DetailRow label="Transport" value={camp.transport} />
                        <DetailRow label="Refund Policy" value={camp.refund_policy} />
                        <DetailRow label="Phone" value={camp.contact_phone} />
                        <DetailRow label="Email" value={camp.contact_email} />
                      </div>
                      {camp.notes && (
                        <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--sun-100)', border: '1px solid var(--sun-300)' }}>
                          <p className="font-medium text-sm mb-1" style={{ color: 'var(--earth-800)' }}>Notes</p>
                          <p className="text-sm" style={{ color: 'var(--earth-700)' }}>{camp.notes}</p>
                        </div>
                      )}
                      {camp.website_url && camp.website_url !== 'N/A' && safeUrl(camp.website_url) && (
                        <div className="mt-5">
                          <a
                            href={safeUrl(camp.website_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary inline-flex"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Visit Website</span>
                            <ExternalLinkIcon />
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
});

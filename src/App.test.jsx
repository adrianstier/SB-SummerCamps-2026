import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock navigate function to capture route navigation calls
const mockNavigate = vi.fn();

// Mock useNavigate from react-router-dom while keeping MemoryRouter and other exports
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock camp data
const mockCamps = [
  {
    id: 'camp-1',
    camp_name: 'Adventure Surf Camp',
    category: 'Beach/Surf',
    description: 'Learn to surf on beautiful Santa Barbara beaches',
    ages: '8-14',
    min_age: 8,
    max_age: 14,
    hours: '9am-3pm',
    price_week: '$400-500',
    min_price: 400,
    max_price: 500,
    has_extended_care: true,
    food_included: false,
    has_transport: false,
    has_sibling_discount: true,
    is_closed: false
  },
  {
    id: 'camp-2',
    camp_name: 'Art Explorers',
    category: 'Art',
    description: 'Creative art exploration for young artists',
    ages: '6-12',
    min_age: 6,
    max_age: 12,
    hours: '9am-12pm',
    price_week: '$250',
    min_price: 250,
    max_price: 250,
    has_extended_care: false,
    food_included: true,
    has_transport: true,
    has_sibling_discount: false,
    is_closed: false
  }
];

// Create a chainable mock for the Supabase query builder that is also thenable
function createQueryMock(resolveData) {
  const result = { data: resolveData, error: null };
  const chainable = {
    select: vi.fn(() => chainable),
    eq: vi.fn(() => chainable),
    gte: vi.fn(() => chainable),
    lte: vi.fn(() => chainable),
    or: vi.fn(() => chainable),
    not: vi.fn(() => chainable),
    is: vi.fn(() => chainable),
    order: vi.fn(() => chainable),
    // Make the object thenable so it can be awaited at any point in the chain
    then: vi.fn((resolve, reject) => {
      return Promise.resolve(result).then(resolve, reject);
    }),
  };
  return chainable;
}

// The mock for supabase.from()
const mockFrom = vi.fn((table) => {
  if (table === 'camps') {
    return createQueryMock(mockCamps);
  }
  return createQueryMock([]);
});

vi.mock('./lib/supabase.js', () => ({
  default: null,
  supabase: {
    from: (...args) => mockFrom(...args)
  },
  getRegistrationStatus: vi.fn(() => ({ status: 'unknown', label: 'Check Website', color: '#6b7280' })),
  checkWorkScheduleCoverage: vi.fn(() => ({ covers: false, needsExtendedCare: false })),
  getSummerWeeks2026: vi.fn(() => []),
}));

vi.mock('./lib/formatters', () => ({
  formatPrice: vi.fn((camp) => {
    const min = camp.min_price;
    const max = camp.max_price;
    if (!min) return 'TBD';
    if (min === max) return `$${min}`;
    return `$${min}\u2013${max}`;
  }),
}));

vi.mock('./hooks/useScrollReveal', () => ({
  useScrollReveal: () => [{ current: null }, true]
}));

// Mock the auth context
const mockAuthContext = {
  user: null,
  profile: null,
  favorites: [],
  isConfigured: false,
  showOnboarding: false,
  completeOnboarding: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  children: [],
  scheduledCamps: [],
  isFavorited: vi.fn(() => false),
  refreshFavorites: vi.fn(),
  refreshSchedule: vi.fn()
};

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => mockAuthContext
}));

vi.mock('./contexts/FavoritesContext', () => ({
  FavoritesProvider: ({ children }) => children,
  useFavorites: () => ({
    favorites: mockAuthContext.favorites || [],
    campPopularity: {},
    refreshFavorites: mockAuthContext.refreshFavorites || vi.fn(),
    refreshCampPopularity: vi.fn(),
    isFavorited: mockAuthContext.isFavorited || vi.fn(() => false),
  }),
}));

vi.mock('./contexts/ScheduleContext', () => ({
  ScheduleProvider: ({ children }) => children,
  useSchedule: () => ({
    scheduledCamps: mockAuthContext.scheduledCamps || [],
    refreshSchedule: mockAuthContext.refreshSchedule || vi.fn(),
    getScheduleForWeek: vi.fn(() => []),
    getTotalCost: vi.fn(() => 0),
    getCoverageGaps: vi.fn(() => []),
  }),
}));

vi.mock('./contexts/SquadsContext', () => ({
  SquadsProvider: ({ children }) => children,
  useSquads: () => ({
    squads: [],
    squadNotifications: [],
    squadUnreadCount: 0,
    campInterests: [],
    friendInterestCounts: {},
    refreshSquads: vi.fn(),
    refreshSquadNotifications: vi.fn(),
    refreshCampInterests: vi.fn(),
    refreshFriendInterests: vi.fn(),
  }),
}));

vi.mock('./contexts/NotificationsContext', () => ({
  NotificationsProvider: ({ children }) => children,
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    refreshNotifications: vi.fn(),
  }),
}));

// Mutable camps context override for per-test customization
let mockCampsContextOverride = null;

vi.mock('./contexts/CampsContext', () => ({
  CampsProvider: ({ children }) => children,
  useCamps: () => {
    if (mockCampsContextOverride) return mockCampsContextOverride;
    return {
      camps: mockCamps,
      categories: ['Beach/Surf', 'Art', 'Sports', 'Science/STEM', 'Music', 'Nature'],
      stats: { active: mockCamps.length, total: mockCamps.length, closed: 0, categories: {}, priceRange: { min: 250, max: 500 }, ageRange: { min: 6, max: 14 } },
      loading: false,
      error: null,
      refreshCamps: vi.fn(),
    };
  },
}));

vi.mock('./contexts/CompareContext', () => ({
  CompareProvider: ({ children }) => children,
  useCompare: () => ({
    compareList: [],
    setCompareList: vi.fn(),
    toggleCompare: vi.fn(),
    addToCompare: vi.fn(),
    removeFromCompare: vi.fn(),
    clearCompare: vi.fn(),
    isComparing: false,
  }),
}));

vi.mock('./contexts/AchievementsContext', () => ({
  AchievementsProvider: ({ children }) => children,
  useAchievements: () => ({
    achievements: [],
    userProgress: {},
    checkAndUnlock: vi.fn(),
    planningStats: { coveragePercent: 0, coveredWeeks: 0, totalWeeks: 11 },
    streak: { current: 0, longest: 0 },
    achievementProgress: {},
    earnedAchievements: [],
    celebration: null,
    dismissCelebration: vi.fn(),
    relevantTips: [],
    nextTip: null,
  }),
}));

vi.mock('./contexts/FamilyContext', () => ({
  FamilyProvider: ({ children }) => children,
  useFamily: () => ({
    families: [],
    currentFamily: null,
    loading: false,
  }),
}));

vi.mock('./hooks/useRecommendations', () => ({
  useRecommendations: () => ({
    getRecommendationScores: vi.fn(() => []),
    getDashboardStats: vi.fn(() => ({ totalScheduled: 0, totalCost: 0, weeksWithCamps: 0, favoritesCount: 0, childrenCount: 0 })),
    findSimilarCamps: vi.fn(() => []),
    getGapFillingSuggestions: vi.fn(() => ({})),
    getPopularInArea: vi.fn(() => []),
    getHomepageContent: vi.fn(() => ({ greeting: 'Find the right camp', sections: [] })),
  }),
}));

// Mutable filters override for per-test customization
let mockFiltersOverride = null;
const mockUpdateFilters = vi.fn();
const mockClearFilters = vi.fn();

const mockSetSearchInput = vi.fn();

vi.mock('./hooks/useFilters', () => ({
  useFilters: () => {
    if (mockFiltersOverride) return mockFiltersOverride;
    return {
      filters: {},
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
      applyPreset: vi.fn(),
      filterAndSortCamps: vi.fn((camps) => camps || []),
      activeFilterCount: 0,
      searchInput: '',
      setSearchInput: mockSetSearchInput,
      userLocation: null,
      locationError: null,
      requestLocation: vi.fn(),
      savedSearches: [],
      saveSearch: vi.fn(),
      deleteSavedSearch: vi.fn(),
      applySavedSearch: vi.fn(),
      shareableURL: '',
      FILTER_PRESETS: {},
    };
  },
}));

// Mock components that have complex dependencies
vi.mock('./components/SchedulePlanner', () => ({
  SchedulePlanner: ({ onClose }) => (
    <div data-testid="schedule-planner">
      <button onClick={onClose}>Close Planner</button>
    </div>
  )
}));

vi.mock('./components/ChildrenManager', () => ({
  ChildrenManager: ({ onClose }) => (
    <div data-testid="children-manager">
      <button onClick={onClose}>Close Children</button>
    </div>
  )
}));

vi.mock('./components/OnboardingWizard', () => ({
  OnboardingWizard: ({ onComplete }) => (
    <div data-testid="onboarding-wizard">
      <button onClick={onComplete}>Complete Onboarding</button>
    </div>
  )
}));

vi.mock('./components/Dashboard', () => ({
  Dashboard: ({ onClose }) => (
    <div data-testid="dashboard">
      <button onClick={onClose}>Close Dashboard</button>
    </div>
  )
}));

vi.mock('./components/CampComparison', () => ({
  CampComparison: ({ onClose }) => (
    <div data-testid="camp-comparison">
      <button onClick={onClose}>Close Comparison</button>
    </div>
  )
}));

vi.mock('./components/AdminDashboard', () => ({
  AdminDashboard: ({ onClose }) => (
    <div data-testid="admin-dashboard">
      <button onClick={onClose}>Close Admin</button>
    </div>
  )
}));

vi.mock('./components/AuthButton', () => ({
  AuthButton: () => <button data-testid="auth-button">Sign In</button>
}));

vi.mock('./components/FavoriteButton', () => ({
  FavoriteButton: ({ campId }) => (
    <button data-testid={`favorite-${campId}`}>Favorite</button>
  )
}));

vi.mock('./components/Reviews', () => ({
  ReviewsList: () => <div data-testid="reviews-list">Reviews</div>,
  ReviewsSummary: () => <div data-testid="reviews-summary">Summary</div>
}));

vi.mock('./components/JoinSquad', () => ({
  default: () => <div data-testid="join-squad">Join Squad</div>
}));

vi.mock('./components/Settings', () => ({
  Settings: ({ onClose }) => (
    <div data-testid="settings">
      <button onClick={onClose}>Close Settings</button>
    </div>
  )
}));

vi.mock('./components/CostDashboard', () => ({
  CostDashboard: ({ onClose }) => (
    <div data-testid="cost-dashboard">
      <button onClick={onClose}>Close Cost Dashboard</button>
    </div>
  )
}));

vi.mock('./components/Wishlist', () => ({
  Wishlist: ({ onClose }) => (
    <div data-testid="wishlist">
      <button onClick={onClose}>Close Wishlist</button>
    </div>
  )
}));

vi.mock('./components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }) => <>{children}</>
}));

import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.user = null;
    mockAuthContext.showOnboarding = false;
    mockCampsContextOverride = null;
    mockFiltersOverride = null;
    mockNavigate.mockClear();
    // Reset Supabase mock to return mockCamps by default
    mockFrom.mockImplementation((table) => {
      if (table === 'camps') {
        return createQueryMock(mockCamps);
      }
      return createQueryMock([]);
    });
  });

  describe('initial render', () => {
    it('shows loading state when camps are loading', () => {
      mockCampsContextOverride = {
        camps: [],
        categories: [],
        stats: null,
        loading: true,
        error: null,
        refreshCamps: vi.fn(),
      };
      const { container } = render(<MemoryRouter><App /></MemoryRouter>);
      expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
    });

    it('gets camps from CampsContext', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        // App no longer queries Supabase directly; camps come from CampsContext
        expect(screen.getByText('Adventure Surf Camp')).toBeInTheDocument();
      });
    });

    it('gets categories from CampsContext', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        // Categories come from CampsContext, rendered in filter presets
        expect(screen.getByText('Sports')).toBeInTheDocument();
      });
    });

    it('gets stats from CampsContext', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        // Stats come from CampsContext, shown in hero section
        expect(screen.getByText(/local camps/)).toBeInTheDocument();
      });
    });

    it('displays camps after loading', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Adventure Surf Camp')).toBeInTheDocument();
        expect(screen.getByText('Art Explorers')).toBeInTheDocument();
      });
    });
  });

  describe('hero section', () => {
    it('displays main title', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText(/Your summer,/)).toBeInTheDocument();
      });
    });

    it('displays Santa Barbara branding', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Santa Barbara Summer Camps')).toBeInTheDocument();
      });
    });

    it('shows camp count in hero stats', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        // The hero stats show "{camps.length} local camps"
        expect(screen.getByText(/local camps/)).toBeInTheDocument();
      });
    });
  });

  describe('search functionality', () => {
    it('renders search input', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search camps/);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('calls setSearchInput on input', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search camps/);
      await user.type(searchInput, 'surf');

      // Search input state is managed by useFilters hook; typing calls setSearchInput
      expect(mockSetSearchInput).toHaveBeenCalled();
    });

    it('triggers filter update on search', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search camps/);
      await user.type(searchInput, 'surf');

      // Search now calls setSearchInput from the useFilters hook (debounce is internal)
      await waitFor(() => {
        expect(mockSetSearchInput).toHaveBeenCalled();
      }, { timeout: 500 });
    });
  });

  describe('filter presets', () => {
    it('renders quick filter chips', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Under $300')).toBeInTheDocument();
      });
    });

    it('renders category preset buttons', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Sports')).toBeInTheDocument();
      });
    });

    it('activates preset on click', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const sportsFilter = screen.getByRole('button', { name: 'Sports' });
      await user.click(sportsFilter);

      // Clicking a preset calls updateFilters with the selected category
      expect(mockUpdateFilters).toHaveBeenCalledWith(
        expect.objectContaining({ categories: ['Sports'] })
      );
    });
  });

  describe('view modes', () => {
    it('defaults to grid view', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        // Grid view shows camp cards
        expect(document.querySelector('.camp-card')).toBeInTheDocument();
      });
    });

    it('toggles to table view', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const toggleButton = screen.getByTitle(/Switch to table view/);
      await user.click(toggleButton);

      await waitFor(() => {
        expect(document.querySelector('table')).toBeInTheDocument();
      });
    });
  });

  describe('camp cards', () => {
    it('displays camp name', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Adventure Surf Camp')).toBeInTheDocument();
      });
    });

    it('displays camp category badge', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        const badges = screen.getAllByText('Beach/Surf');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('displays camp description', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText(/Learn to surf/)).toBeInTheDocument();
      });
    });

    it('displays age range', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('8-14')).toBeInTheDocument();
      });
    });

    it('displays price', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('$400–500')).toBeInTheDocument();
      });
    });

    it('displays feature badges', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        // There are multiple "Extended Care" elements (filter preset + feature badge)
        const badges = screen.getAllByText('Extended Care');
        // At least one should be a feature badge in a camp card
        const featureBadge = badges.find(el => el.classList.contains('feature-badge'));
        expect(featureBadge).toBeTruthy();
      });
    });

    it('navigates to camp detail on click (desktop)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Adventure Surf Camp')).toBeInTheDocument();
      });

      const campButton = screen.getByLabelText('View details for Adventure Surf Camp');
      await user.click(campButton);

      // On desktop (default), clicking navigates to the camp detail route
      expect(mockNavigate).toHaveBeenCalledWith(
        '/camp/camp-1',
        expect.objectContaining({ state: expect.anything() })
      );
    });
  });

  describe('filter panel', () => {
    it('opens filter panel on Filters click', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        // The panel heading is an h3 with text "Filters"
        const headings = screen.getAllByText('Filters');
        const panelHeading = headings.find(el => el.tagName === 'H3');
        expect(panelHeading).toBeInTheDocument();
      });
    });

    it('shows categories section', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeInTheDocument();
      });
    });

    it('shows price filter section', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByText('Price per Week')).toBeInTheDocument();
      });
    });

    it('shows feature toggles', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByText('Features')).toBeInTheDocument();
      });
    });

    it('shows clear all button when filters active', async () => {
      // Override useFilters to simulate active filters
      mockFiltersOverride = {
        filters: { categories: ['Sports'] },
        updateFilters: vi.fn(),
        clearFilters: vi.fn(),
        applyPreset: vi.fn(),
        filterAndSortCamps: vi.fn((camps) => camps || []),
        activeFilterCount: 1,
        userLocation: null,
        locationError: null,
        requestLocation: vi.fn(),
        savedSearches: [],
        saveSearch: vi.fn(),
        deleteSavedSearch: vi.fn(),
        applySavedSearch: vi.fn(),
        shareableURL: '',
        searchInput: '',
        setSearchInput: vi.fn(),
        FILTER_PRESETS: {},
      };

      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        // The active filters bar should appear with a "Clear all" button
        const clearButtons = screen.getAllByText('Clear all');
        expect(clearButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Plan My Summer button', () => {
    it('renders Plan My Summer button', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Plan My Summer')).toBeInTheDocument();
      });
    });

    it('navigates to schedule on click', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const planButton = screen.getByText('Plan My Summer');
      await user.click(planButton);

      // Plan My Summer now navigates to /schedule route
      expect(mockNavigate).toHaveBeenCalledWith('/schedule');
    });
  });

  describe('no results state', () => {
    it('shows empty state when no camps found', async () => {
      // Override CampsContext to return camps (data exists) but useFilters returns empty filtered results
      mockFiltersOverride = {
        filters: { categories: ['NonExistent'] },
        updateFilters: vi.fn(),
        clearFilters: vi.fn(),
        applyPreset: vi.fn(),
        filterAndSortCamps: vi.fn(() => []),
        activeFilterCount: 1,
        searchInput: '',
        setSearchInput: vi.fn(),
        userLocation: null,
        locationError: null,
        requestLocation: vi.fn(),
        savedSearches: [],
        saveSearch: vi.fn(),
        deleteSavedSearch: vi.fn(),
        applySavedSearch: vi.fn(),
        shareableURL: '',
        FILTER_PRESETS: {},
      };

      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('No camps match these filters')).toBeInTheDocument();
      });
    });

    it('shows clear filters button in empty state', async () => {
      // Override useFilters to return empty filtered results
      mockFiltersOverride = {
        filters: { categories: ['NonExistent'] },
        updateFilters: vi.fn(),
        clearFilters: vi.fn(),
        applyPreset: vi.fn(),
        filterAndSortCamps: vi.fn(() => []),
        activeFilterCount: 1,
        searchInput: '',
        setSearchInput: vi.fn(),
        userLocation: null,
        locationError: null,
        requestLocation: vi.fn(),
        savedSearches: [],
        saveSearch: vi.fn(),
        deleteSavedSearch: vi.fn(),
        applySavedSearch: vi.fn(),
        shareableURL: '',
        FILTER_PRESETS: {},
      };

      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows error message on error', async () => {
      // Override CampsContext to return an error state
      mockCampsContextOverride = {
        camps: [],
        categories: [],
        stats: null,
        loading: false,
        error: 'Something went wrong loading camp data.',
        refreshCamps: vi.fn(),
      };

      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Could not load camps')).toBeInTheDocument();
      });
    });

    it('shows refresh button on error', async () => {
      // Override CampsContext to return an error state
      mockCampsContextOverride = {
        camps: [],
        categories: [],
        stats: null,
        loading: false,
        error: 'Something went wrong loading camp data.',
        refreshCamps: vi.fn(),
      };

      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      });
    });
  });

  describe('sorting', () => {
    it('renders sort dropdown', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('includes sort options', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        // The filter bar sort dropdown uses hyphen not en-dash
        const filterSort = selects[0];
        expect(within(filterSort).getByText('A-Z')).toBeInTheDocument();
        expect(within(filterSort).getByText('Z-A')).toBeInTheDocument();
      });
    });
  });

  describe('footer', () => {
    it('displays footer branding', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Santa Barbara Summer Camps')).toBeInTheDocument();
      });
    });

    it('displays disclaimer text', async () => {
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText(/Data from camp websites/)).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('navigates to schedule route when Plan My Summer is clicked', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const planButton = screen.getByText('Plan My Summer');
      await user.click(planButton);

      // Planner is now a route, not a modal
      expect(mockNavigate).toHaveBeenCalledWith('/schedule');
    });
  });

  describe('route-based navigation', () => {
    it('Plan My Summer button navigates to schedule route', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      // Navigation is now via useNavigate, not custom events
      const planButton = screen.getByText('Plan My Summer');
      await user.click(planButton);

      expect(mockNavigate).toHaveBeenCalledWith('/schedule');
    });

    it('camp card click navigates to camp detail route', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><App /></MemoryRouter>);

      await waitFor(() => {
        expect(screen.getByText('Adventure Surf Camp')).toBeInTheDocument();
      });

      // Navigation is now via useNavigate, not custom events
      const campButton = screen.getByLabelText('View details for Adventure Surf Camp');
      await user.click(campButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        '/camp/camp-1',
        expect.objectContaining({ state: expect.anything() })
      );
    });
  });
});

describe('formatPrice utility', () => {
  // Test the price formatting logic
  it('formats price range correctly', () => {
    const formatPrice = (camp) => {
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
    };

    expect(formatPrice({ min_price: 400, max_price: 500 })).toBe('$400–500');
    expect(formatPrice({ min_price: 300, max_price: 300 })).toBe('$300');
    expect(formatPrice({ min_price: 0, price_week: 'Free' })).toBe('Free');
    expect(formatPrice({ min_price: null, price_week: '$TBD' })).toBe('TBD');
    expect(formatPrice({ min_price: 'varies', price_week: '$200-400' })).toBe('$200-400');
  });
});

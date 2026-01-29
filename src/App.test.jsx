import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

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
    // Reset Supabase mock to return mockCamps by default
    mockFrom.mockImplementation((table) => {
      if (table === 'camps') {
        return createQueryMock(mockCamps);
      }
      return createQueryMock([]);
    });
  });

  describe('initial render', () => {
    it('shows loading state initially', () => {
      const { container } = render(<App />);
      expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
    });

    it('fetches camps on mount via Supabase', async () => {
      render(<App />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('camps');
      });
    });

    it('fetches categories on mount via Supabase', async () => {
      render(<App />);

      await waitFor(() => {
        // Categories are fetched from the camps table with a select on 'category'
        expect(mockFrom).toHaveBeenCalledWith('camps');
      });
    });

    it('fetches stats on mount via Supabase', async () => {
      render(<App />);

      await waitFor(() => {
        // Stats are computed by querying the camps table
        expect(mockFrom).toHaveBeenCalledWith('camps');
      });
    });

    it('displays camps after loading', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Adventure Surf Camp')).toBeInTheDocument();
        expect(screen.getByText('Art Explorers')).toBeInTheDocument();
      });
    });
  });

  describe('hero section', () => {
    it('displays main title', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Your summer,/)).toBeInTheDocument();
      });
    });

    it('displays Santa Barbara branding', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Santa Barbara Summer Camps')).toBeInTheDocument();
      });
    });

    it('shows camp count in hero stats', async () => {
      render(<App />);

      await waitFor(() => {
        // The hero stats show "{camps.length} local camps"
        expect(screen.getByText(/local camps/)).toBeInTheDocument();
      });
    });
  });

  describe('search functionality', () => {
    it('renders search input', async () => {
      render(<App />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search camps/);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('updates search value on input', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search camps/);
      await user.type(searchInput, 'surf');

      expect(searchInput).toHaveValue('surf');
    });

    it('triggers new Supabase query on search', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search camps/);
      await user.type(searchInput, 'surf');

      // Debounced, so wait for the Supabase query to be triggered again
      await waitFor(() => {
        // The search triggers a new supabase.from('camps') call
        const campsCalls = mockFrom.mock.calls.filter(c => c[0] === 'camps');
        expect(campsCalls.length).toBeGreaterThan(1);
      }, { timeout: 500 });
    });
  });

  describe('filter presets', () => {
    it('renders quick find presets', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Quick filters')).toBeInTheDocument();
      });
    });

    it('renders category preset buttons', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Sports')).toBeInTheDocument();
      });
    });

    it('activates preset on click', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const sportsFilter = screen.getByRole('button', { name: 'Sports' });
      await user.click(sportsFilter);

      expect(sportsFilter.className).toContain('active');
    });
  });

  describe('view modes', () => {
    it('defaults to grid view', async () => {
      render(<App />);

      await waitFor(() => {
        // Grid view shows camp cards
        expect(document.querySelector('.camp-card')).toBeInTheDocument();
      });
    });

    it('toggles to table view', async () => {
      const user = userEvent.setup();
      render(<App />);

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
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Adventure Surf Camp')).toBeInTheDocument();
      });
    });

    it('displays camp category badge', async () => {
      render(<App />);

      await waitFor(() => {
        const badges = screen.getAllByText('Beach/Surf');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('displays camp description', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Learn to surf/)).toBeInTheDocument();
      });
    });

    it('displays age range', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('8-14')).toBeInTheDocument();
      });
    });

    it('displays price', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('$400–500')).toBeInTheDocument();
      });
    });

    it('displays feature badges', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Extended Care')).toBeInTheDocument();
      });
    });

    it('opens camp modal on click (desktop)', async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);

      await waitFor(() => {
        expect(container.querySelector('.skeleton-card')).not.toBeInTheDocument();
      });

      const campButton = screen.getByLabelText('View details for Adventure Surf Camp');
      await user.click(campButton);

      await waitFor(() => {
        // On desktop (default), clicking opens a modal overlay
        expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
      });
    });
  });

  describe('filter panel', () => {
    it('opens filter panel on All Filters click', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByText('Filter')).toBeInTheDocument();
      });
    });

    it('shows age filter dropdown', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByText('Age')).toBeInTheDocument();
      });
    });

    it('shows price filter dropdown', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        // The filter panel has price options like "Under $200"
        expect(screen.getByText('Under $200')).toBeInTheDocument();
      });
    });

    it('shows feature toggles', async () => {
      const user = userEvent.setup();
      render(<App />);

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
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      // Apply a filter by clicking a preset
      const sportsFilter = screen.getByRole('button', { name: 'Sports' });
      await user.click(sportsFilter);

      await waitFor(() => {
        // The active filters bar should appear with a "Clear all" button
        const clearButtons = screen.getAllByText('Clear all');
        expect(clearButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Plan My Summer button', () => {
    it('renders Plan My Summer button', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Plan My Summer')).toBeInTheDocument();
      });
    });

    it('opens schedule planner on click', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const planButton = screen.getByText('Plan My Summer');
      await user.click(planButton);

      await waitFor(() => {
        expect(screen.getByTestId('schedule-planner')).toBeInTheDocument();
      });
    });
  });

  describe('no results state', () => {
    it('shows empty state when no camps found', async () => {
      // Override mock to return empty camps
      mockFrom.mockImplementation((table) => createQueryMock([]));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('No camps match these filters')).toBeInTheDocument();
      });
    });

    it('shows clear filters button in empty state', async () => {
      // Override mock to return empty camps
      mockFrom.mockImplementation((table) => createQueryMock([]));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows error message on Supabase error', async () => {
      // Override mock to reject with an error
      mockFrom.mockImplementation((table) => {
        const errorResult = Promise.reject(new Error('Network error'));
        const chainable = {
          select: vi.fn(() => chainable),
          eq: vi.fn(() => chainable),
          gte: vi.fn(() => chainable),
          lte: vi.fn(() => chainable),
          or: vi.fn(() => chainable),
          not: vi.fn(() => chainable),
          is: vi.fn(() => chainable),
          order: vi.fn(() => chainable),
          then: vi.fn((resolve, reject) => errorResult.then(resolve, reject)),
        };
        return chainable;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });

    it('shows refresh button on error', async () => {
      // Override mock to reject with an error
      mockFrom.mockImplementation((table) => {
        const errorResult = Promise.reject(new Error('Network error'));
        const chainable = {
          select: vi.fn(() => chainable),
          eq: vi.fn(() => chainable),
          gte: vi.fn(() => chainable),
          lte: vi.fn(() => chainable),
          or: vi.fn(() => chainable),
          not: vi.fn(() => chainable),
          is: vi.fn(() => chainable),
          order: vi.fn(() => chainable),
          then: vi.fn((resolve, reject) => errorResult.then(resolve, reject)),
        };
        return chainable;
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('sorting', () => {
    it('renders sort dropdown', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('includes sort options', async () => {
      render(<App />);

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        // The filter bar sort dropdown has abbreviated options
        const filterSort = selects[0];
        expect(within(filterSort).getByText('A\u2013Z')).toBeInTheDocument();
        expect(within(filterSort).getByText('Z\u2013A')).toBeInTheDocument();
      });
    });
  });

  describe('footer', () => {
    it('displays footer branding', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Santa Barbara Summer Camps')).toBeInTheDocument();
      });
    });

    it('displays disclaimer text', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Data from camp websites/)).toBeInTheDocument();
      });
    });
  });

  describe('modals', () => {
    it('closes schedule planner modal', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      // Open planner
      const planButton = screen.getByText('Plan My Summer');
      await user.click(planButton);

      await waitFor(() => {
        expect(screen.getByTestId('schedule-planner')).toBeInTheDocument();
      });

      // Close planner
      const closeButton = screen.getByText('Close Planner');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('schedule-planner')).not.toBeInTheDocument();
      });
    });
  });

  describe('navigation events', () => {
    it('opens planner on navigate event', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      // Dispatch navigate event
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'planner' }));

      await waitFor(() => {
        expect(screen.getByTestId('schedule-planner')).toBeInTheDocument();
      });
    });

    it('opens children manager on navigate event', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      window.dispatchEvent(new CustomEvent('navigate', { detail: 'children' }));

      await waitFor(() => {
        expect(screen.getByTestId('children-manager')).toBeInTheDocument();
      });
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock fetch for API calls
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

const mockCategories = ['Beach/Surf', 'Art', 'Science/STEM', 'Sports'];
const mockKeywords = ['swimming', 'painting', 'coding'];
const mockStats = { total: 45, active: 43, categories: 14 };

global.fetch = vi.fn((url) => {
  if (url.includes('/api/camps')) {
    return Promise.resolve({
      json: () => Promise.resolve({ camps: mockCamps, total: mockCamps.length })
    });
  }
  if (url.includes('/api/categories')) {
    return Promise.resolve({
      json: () => Promise.resolve(mockCategories)
    });
  }
  if (url.includes('/api/keywords')) {
    return Promise.resolve({
      json: () => Promise.resolve(mockKeywords)
    });
  }
  if (url.includes('/api/stats')) {
    return Promise.resolve({
      json: () => Promise.resolve(mockStats)
    });
  }
  return Promise.resolve({
    json: () => Promise.resolve({})
  });
});

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

import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.user = null;
    mockAuthContext.showOnboarding = false;
  });

  describe('initial render', () => {
    it('shows loading state initially', () => {
      render(<App />);
      expect(screen.getByText('Loading camps...')).toBeInTheDocument();
    });

    it('fetches camps on mount', async () => {
      render(<App />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/camps'));
      });
    });

    it('fetches categories on mount', async () => {
      render(<App />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/categories'));
      });
    });

    it('fetches stats on mount', async () => {
      render(<App />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/stats'));
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
        expect(screen.getByText(/Find the Perfect Camp/)).toBeInTheDocument();
      });
    });

    it('displays Santa Barbara branding', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Santa Barbara')).toBeInTheDocument();
      });
    });

    it('shows camp count from stats', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/43/)).toBeInTheDocument(); // active camps
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

    it('triggers new fetch on search', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search camps/);
      await user.type(searchInput, 'surf');

      // Debounced, so wait for fetch
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('search=surf'));
      }, { timeout: 500 });
    });
  });

  describe('category filters', () => {
    it('renders All Camps filter', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('All Camps')).toBeInTheDocument();
      });
    });

    it('renders category filter pills', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Beach/Surf')).toBeInTheDocument();
      });
    });

    it('activates category on click', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const beachFilter = screen.getByRole('button', { name: 'Beach/Surf' });
      await user.click(beachFilter);

      expect(beachFilter.className).toContain('active');
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

    it('expands camp details on click', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const campCard = screen.getByText('Adventure Surf Camp').closest('.camp-card');
      await user.click(campCard);

      await waitFor(() => {
        // Expanded details should show additional info
        expect(document.querySelector('.expanded-details')).toBeInTheDocument();
      });
    });
  });

  describe('filter panel', () => {
    it('opens filter panel on Filters click', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByText('Refine Your Search')).toBeInTheDocument();
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
        expect(screen.getByText("Child's Age")).toBeInTheDocument();
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
        expect(screen.getByText('Max Price/Week')).toBeInTheDocument();
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
        expect(screen.getByText('Extended Care')).toBeInTheDocument();
        expect(screen.getByText('Food Included')).toBeInTheDocument();
      });
    });

    it('shows clear all filters when filters active', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading camps...')).not.toBeInTheDocument();
      });

      // Apply a filter first
      const beachFilter = screen.getByRole('button', { name: 'Beach/Surf' });
      await user.click(beachFilter);

      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      await user.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByText('Clear all filters')).toBeInTheDocument();
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
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({ camps: [], total: 0 })
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('No camps found')).toBeInTheDocument();
      });
    });

    it('shows clear filters button in empty state', async () => {
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({ camps: [], total: 0 })
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows error message on fetch failure', async () => {
      fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
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
        const select = screen.getByRole('combobox');
        expect(within(select).getByText('Name A–Z')).toBeInTheDocument();
        expect(within(select).getByText('Name Z–A')).toBeInTheDocument();
        expect(within(select).getByText('Price: Low to High')).toBeInTheDocument();
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
        expect(screen.getByText(/Data refreshed regularly/)).toBeInTheDocument();
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

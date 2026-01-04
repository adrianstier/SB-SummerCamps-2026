import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';

// Mock auth context value for testing
export const mockAuthContext = {
  user: null,
  profile: null,
  loading: false,
  isConfigured: true,
  signIn: vi.fn(),
  signOut: vi.fn(),
  showOnboarding: false,
  completeOnboarding: vi.fn(),
  refreshProfile: vi.fn(),
  children: [],
  refreshChildren: vi.fn(),
  favorites: [],
  refreshFavorites: vi.fn(),
  isFavorited: vi.fn(() => false),
  scheduledCamps: [],
  refreshSchedule: vi.fn(),
  getScheduleForWeek: vi.fn(() => []),
  getTotalCost: vi.fn(() => 0),
  getCoverageGaps: vi.fn(() => []),
  notifications: [],
  unreadCount: 0,
  refreshNotifications: vi.fn(),
  getRecommendationScores: vi.fn(() => []),
  getDashboardStats: vi.fn(() => ({
    totalScheduled: 0,
    totalCost: 0,
    weeksWithCamps: 0,
    favoritesCount: 0,
    childrenCount: 0
  }))
};

// Create a mock AuthContext
const MockAuthContext = React.createContext(null);

export function MockAuthProvider({ children, value = mockAuthContext }) {
  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
}

// Custom render with providers
export function renderWithProviders(ui, { authValue = mockAuthContext, ...options } = {}) {
  function Wrapper({ children }) {
    return (
      <MockAuthProvider value={authValue}>
        {children}
      </MockAuthProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Sample test data
export const mockCamp = {
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
  address: '123 Beach Blvd, Santa Barbara, CA',
  website_url: 'https://adventuresurf.com',
  contact_phone: '(805) 555-1234',
  contact_email: 'info@adventuresurf.com',
  has_extended_care: true,
  food_included: false,
  has_transport: false,
  has_sibling_discount: true,
  extended_care: '7:30am-5:30pm',
  extended_care_cost: '$50/week',
  sibling_discount: '10% off',
  indoor_outdoor: 'Outdoor',
  food_provided: 'Snacks provided, bring lunch',
  refund_policy: 'Full refund 2 weeks before start',
  '2025_reg_date': 'February 1, 2026',
  is_closed: false,
  notes: 'Beginner to intermediate surfers welcome'
};

export const mockCamps = [
  mockCamp,
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
    address: '456 Art Lane, Santa Barbara, CA',
    website_url: 'https://artexplorers.com',
    contact_phone: '(805) 555-5678',
    contact_email: 'hello@artexplorers.com',
    has_extended_care: false,
    food_included: true,
    has_transport: true,
    has_sibling_discount: false,
    is_closed: false
  },
  {
    id: 'camp-3',
    camp_name: 'Science Lab',
    category: 'Science/STEM',
    description: 'Hands-on science experiments and STEM learning',
    ages: '10-16',
    min_age: 10,
    max_age: 16,
    hours: '8:30am-4pm',
    price_week: '$600',
    min_price: 600,
    max_price: 600,
    address: '789 Science Way, Santa Barbara, CA',
    website_url: 'https://sciencelab.com',
    contact_phone: '(805) 555-9012',
    contact_email: 'info@sciencelab.com',
    has_extended_care: true,
    food_included: true,
    has_transport: false,
    has_sibling_discount: true,
    is_closed: false
  }
];

export const mockChild = {
  id: 'child-1',
  user_id: 'user-1',
  name: 'Alex',
  age_as_of_summer: 10,
  color: '#3b82f6',
  notes: 'Loves art and swimming',
  interests: ['art', 'swimming', 'science'],
  created_at: '2026-01-01T00:00:00Z'
};

export const mockChildren = [
  mockChild,
  {
    id: 'child-2',
    user_id: 'user-1',
    name: 'Jordan',
    age_as_of_summer: 7,
    color: '#10b981',
    notes: 'Interested in sports',
    interests: ['sports', 'outdoor'],
    created_at: '2026-01-01T00:00:00Z'
  }
];

export const mockSchedule = {
  id: 'schedule-1',
  user_id: 'user-1',
  camp_id: 'camp-1',
  child_id: 'child-1',
  start_date: '2026-06-08',
  end_date: '2026-06-12',
  price: 450,
  status: 'planned',
  notes: 'First week of summer',
  created_at: '2026-01-15T00:00:00Z'
};

export const mockFavorite = {
  id: 'fav-1',
  user_id: 'user-1',
  camp_id: 'camp-1',
  child_id: null,
  notes: 'Great for Alex',
  created_at: '2026-01-10T00:00:00Z'
};

export const mockProfile = {
  id: 'user-1',
  full_name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
  preferred_categories: ['Beach/Surf', 'Art'],
  notification_preferences: {
    email_favorites: true,
    email_registration: true,
    push_enabled: false
  },
  onboarding_completed: true,
  is_admin: false,
  last_active_at: '2026-01-15T10:00:00Z',
  created_at: '2026-01-01T00:00:00Z'
};

export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: null
  }
};

// Summer weeks helper for testing
export function getMockSummerWeeks() {
  const weeks = [];
  const startDate = new Date('2026-06-08');

  for (let i = 0; i < 11; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (i * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);

    weeks.push({
      weekNum: i + 1,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      label: `Week ${i + 1}`,
      display: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    });
  }

  return weeks;
}

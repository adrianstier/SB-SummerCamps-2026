import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampComparison } from './CampComparison';
import * as AuthContext from '../contexts/AuthContext';
import * as supabase from '../lib/supabase';

// Mock dependencies
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../lib/supabase', () => ({
  createComparisonList: vi.fn(),
  shareComparisonList: vi.fn()
}));

// Mock FavoriteButton to avoid useAuth issues
vi.mock('./FavoriteButton', () => ({
  FavoriteButton: ({ campId, size }) => (
    <button aria-label={`Add ${campId} to favorites`} data-size={size}>
      ♡
    </button>
  )
}));

// Mock AchievementsContext (CampComparison uses useAchievements for trackComparison)
vi.mock('../contexts/AchievementsContext', () => ({
  useAchievements: () => ({
    trackComparison: vi.fn(),
  }),
}));

// Mock navigator.clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText
  },
  writable: true,
  configurable: true
});

const mockCamps = [
  {
    id: 'camp-1',
    camp_name: 'Adventure Surf Camp',
    category: 'Beach/Surf',
    ages: '8-14',
    min_age: 8,
    max_age: 14,
    hours: '9am-3pm',
    price_week: '$400-500',
    min_price: 400,
    max_price: 500,
    address: '123 Beach Blvd, Santa Barbara',
    website_url: 'https://adventure.com',
    contact_email: 'info@adventure.com',
    contact_phone: '(805) 555-1234',
    has_extended_care: true,
    food_included: true,
    has_transport: false,
    has_sibling_discount: true,
    indoor_outdoor: 'Outdoor',
    description: 'Learn to surf on beautiful beaches'
  },
  {
    id: 'camp-2',
    camp_name: 'Art Explorers',
    category: 'Art',
    ages: '6-12',
    min_age: 6,
    max_age: 12,
    hours: '9am-12pm',
    price_week: '$250',
    min_price: 250,
    max_price: 250,
    address: '456 Art Lane, Santa Barbara',
    website_url: 'https://art.com',
    contact_email: 'hello@art.com',
    contact_phone: '(805) 555-5678',
    has_extended_care: false,
    food_included: false,
    has_transport: true,
    has_sibling_discount: false,
    indoor_outdoor: 'Indoor',
    description: 'Creative art exploration'
  },
  {
    id: 'camp-3',
    camp_name: 'Science Lab',
    category: 'Science/STEM',
    ages: '10-16',
    min_age: 10,
    max_age: 16,
    hours: '8:30am-4pm',
    price_week: '$600',
    min_price: 600,
    max_price: 600,
    address: '789 Science Way, Santa Barbara',
    website_url: 'https://science.com',
    contact_email: 'info@science.com',
    contact_phone: '(805) 555-9012',
    has_extended_care: true,
    food_included: true,
    has_transport: true,
    has_sibling_discount: true,
    indoor_outdoor: 'Indoor',
    description: 'Hands-on science experiments'
  }
];

describe('CampComparison', () => {
  const mockOnClose = vi.fn();
  const mockOnRemoveCamp = vi.fn();
  const mockOnAddCamp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    AuthContext.useAuth.mockReturnValue({
      user: null,
      children: []
    });
  });

  describe('empty state', () => {
    it('renders empty state when no camps are selected', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={[]}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.getByText('Compare Camps')).toBeInTheDocument();
      expect(screen.getByText(/select 2.*6 camps/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /browse camps/i })).toBeInTheDocument();
    });

    it('calls onClose when "Got it" is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={[]}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      await user.click(screen.getByRole('button', { name: /browse camps/i }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('comparison table', () => {
    it('renders comparison table with selected camps', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Camp names appear multiple times in visual mode (card, price bar, age timeline)
      expect(screen.getAllByText('Adventure Surf Camp').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Art Explorers').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Comparing 2 camps')).toBeInTheDocument();
    });

    it('displays camp categories', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.getByText('Beach/Surf')).toBeInTheDocument();
      expect(screen.getByText('Art')).toBeInTheDocument();
    });

    it('displays age ranges', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.getByText('8-14')).toBeInTheDocument();
      expect(screen.getByText('6-12')).toBeInTheDocument();
    });

    it('displays prices', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.getByText('$400–500')).toBeInTheDocument();
      expect(screen.getByText('$250')).toBeInTheDocument();
    });

    it('displays boolean features correctly', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Switch to table view to see Yes/No indicators
      await user.click(screen.getByLabelText('Table view'));

      const yesElements = screen.getAllByText('Yes');
      const noElements = screen.getAllByText('No');
      expect(yesElements.length).toBeGreaterThan(0);
      expect(noElements.length).toBeGreaterThan(0);
    });

    it('displays descriptions', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Switch to table view to see descriptions
      await user.click(screen.getByLabelText('Table view'));

      expect(screen.getByText('Learn to surf on beautiful beaches')).toBeInTheDocument();
      expect(screen.getByText('Creative art exploration')).toBeInTheDocument();
    });

    it('displays website links', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Switch to table view to see website links
      await user.click(screen.getByLabelText('Table view'));

      const websiteLinks = screen.getAllByText('Visit Website');
      expect(websiteLinks.length).toBe(2);
    });

    it('limits comparison to 4 camps', () => {
      const fourthCamp = {
        ...mockCamps[0],
        id: 'camp-4',
        camp_name: 'Fourth Camp'
      };
      const fiveCamps = [...mockCamps, fourthCamp];

      render(
        <CampComparison
          camps={fiveCamps}
          selectedCampIds={['camp-1', 'camp-2', 'camp-3', 'camp-4', 'camp-5']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Should only show 4 camps max
      expect(screen.getByText('Comparing 4 camps')).toBeInTheDocument();
    });
  });

  describe('best value badge', () => {
    it('shows "Best Value" badge on cheapest camp', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.getByText('Best Value')).toBeInTheDocument();
    });
  });

  describe('extended care badge', () => {
    it('shows "Extended Care" badge when camp has extended care', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Extended Care appears as both badge and field label
      expect(screen.getAllByText('Extended Care').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('remove camp', () => {
    it('calls onRemoveCamp when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      const removeButtons = screen.getAllByLabelText(/Remove .* from comparison/);
      await user.click(removeButtons[0]);

      expect(mockOnRemoveCamp).toHaveBeenCalledWith('camp-1');
    });
  });

  describe('add camp', () => {
    it('shows add camp button when less than 6 camps selected', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // "Add Camp" appears in header button and placeholder card
      const addCampElements = screen.getAllByText('Add Camp');
      expect(addCampElements.length).toBeGreaterThanOrEqual(1);
    });

    it('hides add camp button when 6 camps selected', () => {
      const extraCamps = [
        { ...mockCamps[0], id: 'camp-4', camp_name: 'Fourth Camp' },
        { ...mockCamps[1], id: 'camp-5', camp_name: 'Fifth Camp' },
        { ...mockCamps[2], id: 'camp-6', camp_name: 'Sixth Camp' },
      ];
      const allCamps = [...mockCamps, ...extraCamps];

      render(
        <CampComparison
          camps={allCamps}
          selectedCampIds={['camp-1', 'camp-2', 'camp-3', 'camp-4', 'camp-5', 'camp-6']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.queryByText('Add Camp')).not.toBeInTheDocument();
    });

    it('opens search when add camp button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Click the header "Add Camp" button (btn-secondary class)
      const addButtons = screen.getAllByText('Add Camp');
      const headerAddButton = addButtons.map(el => el.closest('button')).find(btn => btn?.classList.contains('btn-secondary'));
      await user.click(headerAddButton || addButtons[0].closest('button'));

      expect(screen.getByPlaceholderText(/search camps to add/i)).toBeInTheDocument();
    });

    it('filters camps by search query', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      const addButtons = screen.getAllByText('Add Camp');
      const headerAddButton = addButtons.map(el => el.closest('button')).find(btn => btn?.classList.contains('btn-secondary'));
      await user.click(headerAddButton || addButtons[0].closest('button'));
      await user.type(screen.getByPlaceholderText(/search camps to add/i), 'Art');

      // Should show Art Explorers in search results
      const artElements = screen.getAllByText('Art Explorers');
      expect(artElements.length).toBeGreaterThan(0);
    });

    it('calls onAddCamp when search result is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      const addButtons = screen.getAllByText('Add Camp');
      const headerAddButton = addButtons.map(el => el.closest('button')).find(btn => btn?.classList.contains('btn-secondary'));
      await user.click(headerAddButton || addButtons[0].closest('button'));
      await user.type(screen.getByPlaceholderText(/search camps to add/i), 'Art');

      // Click on the search result button
      const searchResults = screen.getAllByText('Art Explorers');
      const searchResultButton = searchResults.find(el => el.closest('button[class*="text-left"]'));
      await user.click(searchResultButton?.closest('button') || searchResults[0].closest('button'));

      expect(mockOnAddCamp).toHaveBeenCalledWith('camp-2');
    });
  });

  describe('share functionality', () => {
    it('copies comparison to clipboard when share is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Button has icon + text
      const shareButton = screen.getByText('Share').closest('button');
      await user.click(shareButton);

      // The share functionality shows a status toast instead of alert
      await waitFor(() => {
        expect(screen.getByText('Comparison copied to clipboard!')).toBeInTheDocument();
      });
    });
  });

  describe('close functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Find the close button (X icon in header)
      const closeButtons = document.querySelectorAll('button');
      const closeButton = Array.from(closeButtons).find(btn =>
        btn.querySelector('svg path[d*="M6 18L18 6"]')
      );
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('save comparison (authenticated)', () => {
    beforeEach(() => {
      AuthContext.useAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        children: [
          { id: 'child-1', name: 'Alex' },
          { id: 'child-2', name: 'Jordan' }
        ]
      });
    });

    it('shows save section for authenticated users', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.getByPlaceholderText(/name this comparison/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save comparison/i })).toBeInTheDocument();
    });

    it('shows child selector when user has children', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.getByText('For any child')).toBeInTheDocument();
      expect(screen.getByText('Alex')).toBeInTheDocument();
      expect(screen.getByText('Jordan')).toBeInTheDocument();
    });

    it('calls createComparisonList when saving', async () => {
      supabase.createComparisonList.mockResolvedValue({ data: {}, error: null });
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const user = userEvent.setup();

      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      await user.type(screen.getByPlaceholderText(/name this comparison/i), 'My Comparison');
      await user.click(screen.getByRole('button', { name: /save comparison/i }));

      await waitFor(() => {
        expect(supabase.createComparisonList).toHaveBeenCalledWith(
          'My Comparison',
          ['camp-1', 'camp-2'],
          null
        );
      });

      alertSpy.mockRestore();
    });

    it('disables save button when name is empty', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save comparison/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('save comparison (unauthenticated)', () => {
    it('does not show save section for unauthenticated users', () => {
      AuthContext.useAuth.mockReturnValue({
        user: null,
        children: []
      });

      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      expect(screen.queryByPlaceholderText(/name this comparison/i)).not.toBeInTheDocument();
    });
  });

  describe('comparison fields', () => {
    it('displays all comparison field labels', async () => {
      const user = userEvent.setup();
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Switch to table view to see all field labels
      await user.click(screen.getByLabelText('Table view'));

      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Age Range')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Hours')).toBeInTheDocument();
      expect(screen.getByText('Indoor/Outdoor')).toBeInTheDocument();
      // "Extended Care" appears as both badge and field label - use getAllByText
      expect(screen.getAllByText('Extended Care').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Food Included')).toBeInTheDocument();
      expect(screen.getByText('Transportation')).toBeInTheDocument();
      expect(screen.getByText('Sibling Discount')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Website')).toBeInTheDocument();
    });
  });

  describe('FavoriteButton integration', () => {
    it('renders FavoriteButton for each camp', () => {
      render(
        <CampComparison
          camps={mockCamps}
          selectedCampIds={['camp-1', 'camp-2']}
          onClose={mockOnClose}
          onRemoveCamp={mockOnRemoveCamp}
          onAddCamp={mockOnAddCamp}
        />
      );

      // Each camp header should have a favorite button
      const favoriteButtons = document.querySelectorAll('[aria-label*="favorite"], [aria-label*="Add to favorites"]');
      expect(favoriteButtons.length).toBeGreaterThanOrEqual(2);
    });
  });
});

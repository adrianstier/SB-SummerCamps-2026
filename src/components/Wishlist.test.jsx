import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Wishlist } from './Wishlist';

const mockRefreshFavorites = vi.fn();
const mockOnClose = vi.fn();
const mockOnScheduleCamp = vi.fn();
const mockOnCompareCamps = vi.fn();

let mockAuthContext = {};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../lib/supabase', () => ({
  removeFavorite: vi.fn(() => Promise.resolve()),
  updateFavorite: vi.fn(() => Promise.resolve()),
  getRegistrationStatus: vi.fn((camp) => ({
    isOpen: false,
    label: 'Check Website',
    color: '#6b7280',
    daysUntil: null,
  })),
}));

import { removeFavorite, updateFavorite } from '../lib/supabase';

const mockCamps = [
  { id: 'camp-1', camp_name: 'Surf Camp', category: 'Beach', ages: '8-14', min_price: 400, max_price: 500, website_url: 'https://surf.com' },
  { id: 'camp-2', camp_name: 'Art Camp', category: 'Art', ages: '5-12', min_price: 250, max_price: 250 },
  { id: 'camp-3', camp_name: 'Dance Camp', category: 'Dance', ages: '6-10', min_price: 300, max_price: 350 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthContext = {
    favorites: [
      { id: 'fav-1', camp_id: 'camp-1', child_id: null, notes: null },
      { id: 'fav-2', camp_id: 'camp-2', child_id: 'child-1', notes: 'Great for Emma', children: { name: 'Emma', color: '#ec4899' } },
    ],
    refreshFavorites: mockRefreshFavorites,
    children: [
      { id: 'child-1', name: 'Emma' },
      { id: 'child-2', name: 'Jake' },
    ],
  };
});

describe('Wishlist', () => {
  describe('rendering', () => {
    it('renders the modal with title', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} onScheduleCamp={mockOnScheduleCamp} onCompareCamps={mockOnCompareCamps} />);
      expect(screen.getByText('Considering')).toBeInTheDocument();
    });

    it('shows correct camp count', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('2 camps saved')).toBeInTheDocument();
    });

    it('shows singular when 1 camp', () => {
      mockAuthContext.favorites = [{ id: 'fav-1', camp_id: 'camp-1', child_id: null }];
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('1 camp saved')).toBeInTheDocument();
    });

    it('displays camp names', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Surf Camp')).toBeInTheDocument();
      expect(screen.getByText('Art Camp')).toBeInTheDocument();
    });

    it('displays camp details (category, ages, price)', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText(/Beach.*8-14.*\$400-500/)).toBeInTheDocument();
    });

    it('shows child badge for favorites with child', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('For Emma')).toBeInTheDocument();
    });

    it('shows existing notes', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Great for Emma')).toBeInTheDocument();
    });

    it('shows website link when camp has website_url', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      const link = screen.getByText('Website');
      expect(link).toHaveAttribute('href', 'https://surf.com');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('shows Schedule button when onScheduleCamp provided', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} onScheduleCamp={mockOnScheduleCamp} />);
      const scheduleButtons = screen.getAllByText('Schedule');
      expect(scheduleButtons.length).toBe(2);
    });
  });

  describe('empty state', () => {
    it('shows empty message when no favorites', () => {
      mockAuthContext.favorites = [];
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('No camps saved yet')).toBeInTheDocument();
    });

    it('shows helper text in empty state', () => {
      mockAuthContext.favorites = [];
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Heart camps to save them here for later')).toBeInTheDocument();
    });
  });

  describe('filtering by child', () => {
    it('shows child filter when children exist', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('All children')).toBeInTheDocument();
    });

    it('filters favorites by selected child', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.change(screen.getByDisplayValue('All children'), { target: { value: 'child-1' } });
      // Should show camp-2 (child-1) and camp-1 (no child = shows for all)
      expect(screen.getByText('Surf Camp')).toBeInTheDocument();
      expect(screen.getByText('Art Camp')).toBeInTheDocument();
    });

    it('does not show child filter when no children', () => {
      mockAuthContext.children = [];
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.queryByText('All children')).not.toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('defaults to registration sort', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByDisplayValue('Registration Date')).toBeInTheDocument();
    });

    it('can sort by name', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.change(screen.getByDisplayValue('Registration Date'), { target: { value: 'name' } });
      const campNames = screen.getAllByText(/Camp/);
      // Art Camp should be before Surf Camp alphabetically
      expect(campNames[0].textContent).toContain('Art');
    });

    it('can sort by price', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.change(screen.getByDisplayValue('Registration Date'), { target: { value: 'price' } });
      const campElements = screen.getAllByText(/Camp/);
      // Art Camp ($250) should be before Surf Camp ($400)
      expect(campElements[0].textContent).toContain('Art');
    });
  });

  describe('actions', () => {
    it('calls removeFavorite when Remove clicked', async () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(removeFavorite).toHaveBeenCalledWith('camp-1');
        expect(mockRefreshFavorites).toHaveBeenCalled();
      });
    });

    it('calls onScheduleCamp when Schedule clicked', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} onScheduleCamp={mockOnScheduleCamp} />);
      const scheduleButtons = screen.getAllByText('Schedule');
      fireEvent.click(scheduleButtons[0]);
      expect(mockOnScheduleCamp).toHaveBeenCalledWith(mockCamps[0]);
    });

    it('calls onClose when Close button clicked', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when footer Close clicked', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      const closeButtons = screen.getAllByText('Close');
      fireEvent.click(closeButtons[closeButtons.length - 1]);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('notes editing', () => {
    it('shows "+ Add note" for items without notes', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('+ Add note')).toBeInTheDocument();
    });

    it('shows "Edit note" for items with notes', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Edit note')).toBeInTheDocument();
    });

    it('shows textarea when "+ Add note" clicked', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('+ Add note'));
      expect(screen.getByPlaceholderText('Add notes about this camp...')).toBeInTheDocument();
    });

    it('pre-fills text when "Edit note" clicked', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Edit note'));
      expect(screen.getByDisplayValue('Great for Emma')).toBeInTheDocument();
    });

    it('calls updateFavorite on Save', async () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('+ Add note'));
      fireEvent.change(screen.getByPlaceholderText('Add notes about this camp...'), { target: { value: 'New note' } });
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(updateFavorite).toHaveBeenCalledWith('camp-1', { notes: 'New note' });
        expect(mockRefreshFavorites).toHaveBeenCalled();
      });
    });

    it('hides textarea on Cancel', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('+ Add note'));
      fireEvent.click(screen.getAllByText('Cancel')[0]);
      expect(screen.queryByPlaceholderText('Add notes about this camp...')).not.toBeInTheDocument();
    });
  });

  describe('comparison', () => {
    it('shows checkboxes for each camp', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} onCompareCamps={mockOnCompareCamps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(2);
    });

    it('shows Compare button when 2+ camps selected', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} onCompareCamps={mockOnCompareCamps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText('Compare 2 Camps')).toBeInTheDocument();
    });

    it('does not show Compare button with fewer than 2 selected', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} onCompareCamps={mockOnCompareCamps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(screen.queryByText(/Compare \d+ Camps/)).not.toBeInTheDocument();
    });

    it('calls onCompareCamps with selected camp IDs', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} onCompareCamps={mockOnCompareCamps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      fireEvent.click(screen.getByText('Compare 2 Camps'));
      expect(mockOnCompareCamps).toHaveBeenCalledWith(['camp-1', 'camp-2']);
    });

    it('deselects camp when checkbox clicked again', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} onCompareCamps={mockOnCompareCamps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[0]); // deselect
      expect(screen.queryByText(/Compare \d+ Camps/)).not.toBeInTheDocument();
    });

    it('limits selection to 4 camps max', () => {
      mockAuthContext.favorites = [
        { id: 'fav-1', camp_id: 'camp-1' },
        { id: 'fav-2', camp_id: 'camp-2' },
        { id: 'fav-3', camp_id: 'camp-3' },
        { id: 'fav-4', camp_id: 'camp-4' },
        { id: 'fav-5', camp_id: 'camp-5' },
      ];
      const moreCamps = [
        ...mockCamps,
        { id: 'camp-4', camp_name: 'Camp 4', category: 'Sports', ages: '5-12', min_price: 100, max_price: 100 },
        { id: 'camp-5', camp_name: 'Camp 5', category: 'Music', ages: '5-12', min_price: 200, max_price: 200 },
      ];
      render(<Wishlist camps={moreCamps} onClose={mockOnClose} onCompareCamps={mockOnCompareCamps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(cb => fireEvent.click(cb));
      // Should only have 4 selected
      expect(screen.getByText('Compare 4 Camps')).toBeInTheDocument();
    });
  });

  describe('price formatting', () => {
    it('shows price range for different min/max', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText(/\$400-500/)).toBeInTheDocument();
    });

    it('shows single price when min equals max', () => {
      render(<Wishlist camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText(/\$250/)).toBeInTheDocument();
    });

    it('shows TBD when no prices', () => {
      mockAuthContext.favorites = [{ id: 'fav-1', camp_id: 'camp-x' }];
      const campsNoPrice = [{ id: 'camp-x', camp_name: 'Free Camp', category: 'Other', ages: '5-12' }];
      render(<Wishlist camps={campsNoPrice} onClose={mockOnClose} />);
      expect(screen.getByText(/TBD/)).toBeInTheDocument();
    });
  });
});

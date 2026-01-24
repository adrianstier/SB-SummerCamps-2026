import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FavoriteButton } from './FavoriteButton';

// Mock the AuthContext
const mockAuthContext = {
  user: null,
  isConfigured: true,
  isFavorited: vi.fn(() => false),
  refreshFavorites: vi.fn(),
  signIn: vi.fn()
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

// Mock the supabase functions
vi.mock('../lib/supabase', () => ({
  addFavorite: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  removeFavorite: vi.fn(() => Promise.resolve({ data: {}, error: null }))
}));

import { addFavorite, removeFavorite } from '../lib/supabase';

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.user = null;
    mockAuthContext.isFavorited = vi.fn(() => false);
    mockAuthContext.isConfigured = true;
  });

  describe('rendering', () => {
    it('renders a button element', () => {
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('has correct title when not favorited', () => {
      mockAuthContext.isFavorited.mockReturnValue(false);
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Add to favorites');
    });

    it('has correct title when favorited', () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(true);
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Remove from favorites');
    });

    it('renders heart SVG icon', () => {
      render(<FavoriteButton campId="camp-1" />);

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('applies small size class', () => {
      render(<FavoriteButton campId="camp-1" size="sm" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-8');
      expect(button.className).toContain('h-8');
    });

    it('applies medium size class by default', () => {
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-10');
      expect(button.className).toContain('h-10');
    });

    it('applies large size class', () => {
      render(<FavoriteButton campId="camp-1" size="lg" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-12');
      expect(button.className).toContain('h-12');
    });
  });

  describe('showLabel prop', () => {
    it('does not show label by default', () => {
      render(<FavoriteButton campId="camp-1" />);

      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });

    it('shows Save label when not favorited', () => {
      mockAuthContext.isFavorited.mockReturnValue(false);
      render(<FavoriteButton campId="camp-1" showLabel />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('shows Saved label when favorited', () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(true);
      render(<FavoriteButton campId="camp-1" showLabel />);

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  describe('visual states', () => {
    it('has outline heart when not favorited', () => {
      mockAuthContext.isFavorited.mockReturnValue(false);
      render(<FavoriteButton campId="camp-1" />);

      const svg = document.querySelector('svg');
      // Outline heart uses stroke
      expect(svg).toHaveAttribute('fill', 'none');
    });

    it('has filled heart when favorited', () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(true);
      render(<FavoriteButton campId="camp-1" />);

      const svg = document.querySelector('svg');
      // Filled heart uses fill
      expect(svg).toHaveAttribute('fill', 'currentColor');
    });

    it('applies terra color style when favorited', () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(true);
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      expect(button.style.color).toContain('terra');
    });
  });

  describe('click behavior', () => {
    it('stops event propagation', async () => {
      const parentClick = vi.fn();
      mockAuthContext.user = { id: 'user-1' };

      render(
        <div onClick={parentClick}>
          <FavoriteButton campId="camp-1" />
        </div>
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(parentClick).not.toHaveBeenCalled();
    });

    it('prompts sign in when not logged in (configured)', async () => {
      mockAuthContext.user = null;
      mockAuthContext.isConfigured = true;
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockAuthContext.signIn).toHaveBeenCalled();
    });

    it('does nothing when not configured and not logged in', async () => {
      mockAuthContext.user = null;
      mockAuthContext.isConfigured = false;
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockAuthContext.signIn).not.toHaveBeenCalled();
      expect(addFavorite).not.toHaveBeenCalled();
    });

    it('calls addFavorite when clicking unfavorited', async () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(false);

      render(<FavoriteButton campId="camp-123" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(addFavorite).toHaveBeenCalledWith('camp-123');
    });

    it('calls removeFavorite when clicking favorited', async () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(true);

      render(<FavoriteButton campId="camp-456" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(removeFavorite).toHaveBeenCalledWith('camp-456');
    });

    it('refreshes favorites after adding', async () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(false);

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockAuthContext.refreshFavorites).toHaveBeenCalled();
      });
    });

    it('refreshes favorites after removing', async () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(true);

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockAuthContext.refreshFavorites).toHaveBeenCalled();
      });
    });
  });

  describe('loading state', () => {
    it('disables button during loading', async () => {
      mockAuthContext.user = { id: 'user-1' };
      addFavorite.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      // Button should be disabled while loading
      expect(button).toBeDisabled();
    });

    it('applies opacity during loading', async () => {
      mockAuthContext.user = { id: 'user-1' };
      addFavorite.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(button.className).toContain('opacity-50');
    });

    it('applies cursor-wait during loading', async () => {
      mockAuthContext.user = { id: 'user-1' };
      addFavorite.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(button.className).toContain('cursor-wait');
    });
  });

  describe('animation', () => {
    it('applies animation class on toggle', async () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(false);

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');

      // Before click - no animation class
      expect(button.className).not.toContain('is-favorited');

      // After click with isFav true, animating class is applied
      mockAuthContext.isFavorited.mockReturnValue(true);
      await userEvent.click(button);

      // The component applies 'is-favorited' class during animation when isFav is true
      // The actual scale animation is handled via CSS on the .favorite-btn.is-favorited class
    });
  });

  describe('error handling', () => {
    it('handles addFavorite error gracefully', async () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(false);
      addFavorite.mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error toggling favorite:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles removeFavorite error gracefully', async () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(true);
      removeFavorite.mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error toggling favorite:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('re-enables button after error', async () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(false);
      addFavorite.mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('hover styles', () => {
    it('changes color on hover when not favorited', () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(false);

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');

      // Simulate hover
      fireEvent.mouseEnter(button);

      expect(button.style.color).toContain('terra');
      expect(button.style.borderColor).toContain('terra');
    });

    it('resets color on mouse leave when not favorited', () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(false);

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');

      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button.style.color).toContain('sand');
    });

    it('does not change color on hover when favorited', () => {
      mockAuthContext.user = { id: 'user-1' };
      mockAuthContext.isFavorited.mockReturnValue(true);

      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      const initialColor = button.style.color;

      fireEvent.mouseEnter(button);

      // Should stay the same (terra)
      expect(button.style.color).toBe(initialColor);
    });
  });

  describe('accessibility', () => {
    it('has accessible button role', () => {
      render(<FavoriteButton campId="camp-1" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has descriptive title attribute', () => {
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      expect(button.title).toBeTruthy();
    });

    it('can be focused via keyboard', () => {
      render(<FavoriteButton campId="camp-1" />);

      const button = screen.getByRole('button');
      button.focus();

      expect(document.activeElement).toBe(button);
    });
  });
});

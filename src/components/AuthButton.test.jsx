import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthButton } from './AuthButton';
import * as AuthContext from '../contexts/AuthContext';

// Mock useAuth hook
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('AuthButton', () => {
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();
  let dispatchEventSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    dispatchEventSpy.mockRestore();
  });

  describe('when not configured', () => {
    it('renders nothing when isConfigured is false', () => {
      AuthContext.useAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        isConfigured: false,
        signIn: mockSignIn,
        signOut: mockSignOut
      });

      const { container } = render(<AuthButton />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('loading state', () => {
    it('shows loading skeleton when loading', () => {
      AuthContext.useAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: true,
        isConfigured: true,
        signIn: mockSignIn,
        signOut: mockSignOut
      });

      render(<AuthButton />);
      expect(document.querySelector('.loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('signed out state', () => {
    beforeEach(() => {
      AuthContext.useAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        isConfigured: true,
        signIn: mockSignIn,
        signOut: mockSignOut
      });
    });

    it('renders sign in button when user is null', () => {
      render(<AuthButton />);
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('calls signIn when sign in button is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByRole('button', { name: /sign in/i }));
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });

    it('renders Google icon', () => {
      render(<AuthButton />);
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('signed in state', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com'
    };

    const mockProfile = {
      id: 'user-1',
      full_name: 'Test User',
      avatar_url: null,
      role: 'user'
    };

    beforeEach(() => {
      AuthContext.useAuth.mockReturnValue({
        user: mockUser,
        profile: mockProfile,
        loading: false,
        isConfigured: true,
        signIn: mockSignIn,
        signOut: mockSignOut
      });
    });

    it('renders avatar button when user is signed in', () => {
      render(<AuthButton />);
      // Should show first letter of name
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('shows user initials when no avatar_url', () => {
      render(<AuthButton />);
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('shows profile avatar when available', () => {
      AuthContext.useAuth.mockReturnValue({
        user: mockUser,
        profile: { ...mockProfile, avatar_url: 'https://example.com/avatar.jpg' },
        loading: false,
        isConfigured: true,
        signIn: mockSignIn,
        signOut: mockSignOut
      });

      render(<AuthButton />);
      const avatar = document.querySelector('img');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('opens menu when avatar is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('T'));

      // Menu should now be visible with user info
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('shows navigation options in menu', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('T'));

      expect(screen.getByRole('menuitem', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /my schedule/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /favorites/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /my children/i })).toBeInTheDocument();
    });

    it('dispatches navigate event for dashboard', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('T'));
      await user.click(screen.getByRole('menuitem', { name: /dashboard/i }));

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          detail: 'dashboard'
        })
      );
    });

    it('dispatches navigate event for planner', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('T'));
      await user.click(screen.getByRole('menuitem', { name: /my schedule/i }));

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          detail: 'planner'
        })
      );
    });

    it('dispatches navigate event for favorites', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('T'));
      await user.click(screen.getByRole('menuitem', { name: /favorites/i }));

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          detail: 'favorites'
        })
      );
    });

    it('dispatches navigate event for children', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('T'));
      await user.click(screen.getByRole('menuitem', { name: /my children/i }));

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          detail: 'children'
        })
      );
    });

    it('calls signOut when sign out button is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('T'));
      await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      // Open menu
      await user.click(screen.getByText('T'));
      expect(screen.getByText('Test User')).toBeInTheDocument();

      // Click outside (the overlay)
      const overlay = document.querySelector('.fixed.inset-0');
      await user.click(overlay);

      // Menu should be closed
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });

    it('closes menu after clicking a menu item', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('T'));
      await user.click(screen.getByRole('menuitem', { name: /dashboard/i }));

      // Menu should be closed
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });
  });

  describe('admin user', () => {
    beforeEach(() => {
      AuthContext.useAuth.mockReturnValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
        profile: { id: 'admin-1', full_name: 'Admin User', role: 'admin', avatar_url: null },
        loading: false,
        isConfigured: true,
        signIn: mockSignIn,
        signOut: mockSignOut
      });
    });

    it('shows admin dashboard option for admin users', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('A'));

      expect(screen.getByRole('menuitem', { name: /admin dashboard/i })).toBeInTheDocument();
    });

    it('dispatches navigate event for admin dashboard', async () => {
      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('A'));
      await user.click(screen.getByRole('menuitem', { name: /admin dashboard/i }));

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          detail: 'admin'
        })
      );
    });
  });

  describe('user without profile name', () => {
    it('uses email first character for avatar', () => {
      AuthContext.useAuth.mockReturnValue({
        user: { id: 'user-1', email: 'john@example.com' },
        profile: { id: 'user-1', full_name: null, avatar_url: null },
        loading: false,
        isConfigured: true,
        signIn: mockSignIn,
        signOut: mockSignOut
      });

      render(<AuthButton />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('shows "User" as fallback name in menu', async () => {
      AuthContext.useAuth.mockReturnValue({
        user: { id: 'user-1', email: 'john@example.com' },
        profile: { id: 'user-1', full_name: null, avatar_url: null },
        loading: false,
        isConfigured: true,
        signIn: mockSignIn,
        signOut: mockSignOut
      });

      const user = userEvent.setup();
      render(<AuthButton />);

      await user.click(screen.getByText('J'));
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });
});

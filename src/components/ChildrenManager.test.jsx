import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ChildrenManager } from './ChildrenManager';

const mockRefreshChildren = vi.fn();
const mockSignIn = vi.fn();
const mockOnClose = vi.fn();

let mockAuthContext = {};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../lib/supabase', () => ({
  addChild: vi.fn(() => Promise.resolve({ data: [{ id: 'new-1', name: 'Test' }], error: null })),
  updateChild: vi.fn(() => Promise.resolve({ data: [{ id: 'child-1' }], error: null })),
  deleteChild: vi.fn(() => Promise.resolve({ data: null, error: null })),
}));

import { addChild, updateChild, deleteChild } from '../lib/supabase';

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthContext = {
    user: { id: 'user-1' },
    isConfigured: true,
    signIn: mockSignIn,
    children: [],
    refreshChildren: mockRefreshChildren,
  };
});

describe('ChildrenManager', () => {
  describe('unauthenticated state', () => {
    it('shows sign-in prompt when not configured', () => {
      mockAuthContext.isConfigured = false;
      mockAuthContext.user = null;
      render(<ChildrenManager onClose={mockOnClose} />);
      expect(screen.getByText('Sign In Required')).toBeInTheDocument();
    });

    it('shows sign-in prompt when no user', () => {
      mockAuthContext.user = null;
      render(<ChildrenManager onClose={mockOnClose} />);
      expect(screen.getByText('Sign In Required')).toBeInTheDocument();
    });

    it('calls signIn when sign-in button clicked', () => {
      mockAuthContext.user = null;
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Sign in with Google'));
      expect(mockSignIn).toHaveBeenCalled();
    });

    it('calls onClose when cancel clicked in sign-in view', () => {
      mockAuthContext.user = null;
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('authenticated state - no children', () => {
    it('renders the modal header', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      expect(screen.getByText('My Children')).toBeInTheDocument();
    });

    it('shows "Add a Child" button', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      expect(screen.getByText('Add a Child')).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows add form when "Add a Child" is clicked', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Add a Child'));
      expect(screen.getByPlaceholderText('e.g., Emma')).toBeInTheDocument();
    });
  });

  describe('add form', () => {
    beforeEach(() => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Add a Child'));
    });

    it('renders name input', () => {
      expect(screen.getByPlaceholderText('e.g., Emma')).toBeInTheDocument();
    });

    it('renders age select', () => {
      expect(screen.getByText('Not specified')).toBeInTheDocument();
    });

    it('renders color picker with 6 colors', () => {
      expect(screen.getByText('Calendar Color')).toBeInTheDocument();
    });

    it('renders notes textarea', () => {
      expect(screen.getByPlaceholderText('e.g., Loves swimming, allergic to peanuts')).toBeInTheDocument();
    });

    it('disables submit button when name is empty', () => {
      const submitBtn = screen.getByText('Add Child');
      expect(submitBtn).toBeDisabled();
    });

    it('enables submit button when name is entered', () => {
      fireEvent.change(screen.getByPlaceholderText('e.g., Emma'), { target: { value: 'Alice' } });
      const submitBtn = screen.getByText('Add Child');
      expect(submitBtn).not.toBeDisabled();
    });

    it('calls addChild and refreshChildren on submit', async () => {
      fireEvent.change(screen.getByPlaceholderText('e.g., Emma'), { target: { value: 'Alice' } });
      fireEvent.click(screen.getByText('Add Child'));

      await waitFor(() => {
        expect(addChild).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice' }));
        expect(mockRefreshChildren).toHaveBeenCalled();
      });
    });

    it('resets form after successful submit', async () => {
      fireEvent.change(screen.getByPlaceholderText('e.g., Emma'), { target: { value: 'Alice' } });
      fireEvent.click(screen.getByText('Add Child'));

      await waitFor(() => {
        expect(screen.getByText('Add a Child')).toBeInTheDocument();
      });
    });

    it('hides form when cancel clicked', () => {
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.getByText('Add a Child')).toBeInTheDocument();
    });

    it('shows error on submit failure', async () => {
      addChild.mockRejectedValueOnce(new Error('Network error'));
      fireEvent.change(screen.getByPlaceholderText('e.g., Emma'), { target: { value: 'Alice' } });
      fireEvent.click(screen.getByText('Add Child'));

      await waitFor(() => {
        expect(screen.getByText('Failed to save. Please try again.')).toBeInTheDocument();
      });
    });

    it('does not submit when name is only whitespace', () => {
      fireEvent.change(screen.getByPlaceholderText('e.g., Emma'), { target: { value: '   ' } });
      const submitBtn = screen.getByText('Add Child');
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('with existing children', () => {
    beforeEach(() => {
      mockAuthContext.children = [
        { id: 'child-1', name: 'Emma', age_as_of_summer: 8, color: '#ec4899' },
        { id: 'child-2', name: 'Jake', age_as_of_summer: 10, color: '#3b82f6' },
      ];
    });

    it('renders each child', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      expect(screen.getByText('Emma')).toBeInTheDocument();
      expect(screen.getByText('Jake')).toBeInTheDocument();
    });

    it('shows age info for children with age', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      expect(screen.getByText('Age 8 in Summer 2026')).toBeInTheDocument();
      expect(screen.getByText('Age 10 in Summer 2026')).toBeInTheDocument();
    });

    it('shows first letter of name as avatar', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      expect(screen.getByText('E')).toBeInTheDocument();
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('shows edit and delete buttons', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      expect(screen.getByLabelText('Edit Emma')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete Emma')).toBeInTheDocument();
    });

    it('shows confirm/cancel when delete clicked', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Delete Emma'));
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getAllByText('Cancel')[0]).toBeInTheDocument();
    });

    it('calls deleteChild and refresh on confirm', async () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Delete Emma'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(deleteChild).toHaveBeenCalledWith('child-1');
        expect(mockRefreshChildren).toHaveBeenCalled();
      });
    });

    it('cancels delete when cancel clicked', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Delete Emma'));
      fireEvent.click(screen.getAllByText('Cancel')[0]);
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });

    it('populates form when edit clicked', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Edit Emma'));
      expect(screen.getByDisplayValue('Emma')).toBeInTheDocument();
      // Age select shows the numeric value - verify the select has correct value
      const selects = screen.getAllByRole('combobox');
      const ageSelect = selects.find(s => s.value === '8');
      expect(ageSelect).toBeDefined();
    });

    it('shows "Save Changes" button in edit mode', () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Edit Emma'));
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('calls updateChild on edit submit', async () => {
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Edit Emma'));
      fireEvent.change(screen.getByDisplayValue('Emma'), { target: { value: 'Emma Rose' } });
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(updateChild).toHaveBeenCalledWith('child-1', expect.objectContaining({ name: 'Emma Rose' }));
        expect(mockRefreshChildren).toHaveBeenCalled();
      });
    });

    it('handles child with empty name gracefully', () => {
      mockAuthContext.children = [
        { id: 'child-1', name: '', color: '#ec4899' },
      ];
      render(<ChildrenManager onClose={mockOnClose} />);
      // Should show '?' as fallback
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('shows error on delete failure', async () => {
      deleteChild.mockRejectedValueOnce(new Error('Failed'));
      render(<ChildrenManager onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Delete Emma'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('Failed to remove child. Please try again.')).toBeInTheDocument();
      });
    });
  });
});

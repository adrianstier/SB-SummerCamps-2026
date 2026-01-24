import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Settings } from './Settings';

const mockRefreshProfile = vi.fn();
const mockOnClose = vi.fn();
const mockUpdateProfile = vi.fn();

let mockAuthContext = {};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../lib/supabase', () => ({
  updateProfile: (...args) => mockUpdateProfile(...args),
  DEFAULT_SCHOOL_END: '2026-06-05',
  DEFAULT_SCHOOL_START: '2026-08-19',
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateProfile.mockResolvedValue();
  mockAuthContext = {
    profile: {
      school_year_end: '2026-06-05',
      school_year_start: '2026-08-19',
      work_hours_start: '08:00',
      work_hours_end: '17:30',
      summer_budget: 5000,
      notification_preferences: {
        email_notifications: true,
        registration_open: true,
        price_drop: false,
        spots_available: true,
        weekly_digest: true,
      },
    },
    refreshProfile: mockRefreshProfile,
    children: [
      { id: 'child-1', name: 'Emma' },
      { id: 'child-2', name: 'Jake' },
    ],
  };
});

describe('Settings', () => {
  describe('rendering', () => {
    it('renders the modal with title', () => {
      render(<Settings onClose={mockOnClose} />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      render(<Settings onClose={mockOnClose} />);
      expect(screen.getByText('School Dates')).toBeInTheDocument();
      expect(screen.getByText('Work Hours')).toBeInTheDocument();
      expect(screen.getByText('Budget')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('defaults to School Dates tab', () => {
      render(<Settings onClose={mockOnClose} />);
      expect(screen.getByText('School Calendar')).toBeInTheDocument();
    });

    it('renders Save Settings button', () => {
      render(<Settings onClose={mockOnClose} />);
      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });
  });

  describe('School Dates tab', () => {
    it('shows school preset buttons', () => {
      render(<Settings onClose={mockOnClose} />);
      expect(screen.getByText('SB Unified (Default)')).toBeInTheDocument();
      expect(screen.getByText('Hope Elementary')).toBeInTheDocument();
      expect(screen.getByText('Goleta Union')).toBeInTheDocument();
      expect(screen.getByText('Montecito Union')).toBeInTheDocument();
      expect(screen.getByText('Cold Spring')).toBeInTheDocument();
      expect(screen.getByText('Custom Dates')).toBeInTheDocument();
    });

    it('shows date inputs', () => {
      render(<Settings onClose={mockOnClose} />);
      expect(screen.getByText('Last Day of School')).toBeInTheDocument();
      expect(screen.getByText('First Day of School')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2026-06-05')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2026-08-19')).toBeInTheDocument();
    });

    it('shows summer weeks calculation', () => {
      render(<Settings onClose={mockOnClose} />);
      expect(screen.getByText(/weeks to plan/)).toBeInTheDocument();
    });

    it('updates dates when school preset clicked', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Goleta Union'));
      expect(screen.getByDisplayValue('2026-06-04')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2026-08-18')).toBeInTheDocument();
    });

    it('switches to Custom Dates when date input changed', () => {
      render(<Settings onClose={mockOnClose} />);
      const endDateInput = screen.getByDisplayValue('2026-06-05');
      fireEvent.change(endDateInput, { target: { value: '2026-06-10' } });
      expect(screen.getByDisplayValue('2026-06-10')).toBeInTheDocument();
    });
  });

  describe('Work Hours tab', () => {
    it('shows work hours inputs', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Work Hours'));
      expect(screen.getByText('Work Starts')).toBeInTheDocument();
      expect(screen.getByText('Work Ends')).toBeInTheDocument();
    });

    it('displays current work hours', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Work Hours'));
      expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('17:30')).toBeInTheDocument();
    });

    it('shows work hour presets', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Work Hours'));
      expect(screen.getByText('8am-5pm')).toBeInTheDocument();
      expect(screen.getByText('9am-6pm')).toBeInTheDocument();
      expect(screen.getByText('7am-4pm')).toBeInTheDocument();
    });

    it('updates hours when preset clicked', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Work Hours'));
      fireEvent.click(screen.getByText('9am-6pm'));
      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
    });
  });

  describe('Budget tab', () => {
    it('shows budget input', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Budget'));
      expect(screen.getByText('Total Summer Budget')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., 5000')).toBeInTheDocument();
    });

    it('displays current budget', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Budget'));
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
    });

    it('shows budget presets', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Budget'));
      // Budget presets and per-child breakdown may both contain $ amounts
      // Just verify at least one of each preset amount exists
      expect(screen.getAllByText(/\$2,500/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/\$5,000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/\$7,500/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/\$10,000/).length).toBeGreaterThanOrEqual(1);
    });

    it('updates budget when preset clicked', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Budget'));
      fireEvent.click(screen.getByText('$7,500'));
      expect(screen.getByDisplayValue('7500')).toBeInTheDocument();
    });

    it('shows per-child breakdown when children and budget exist', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Budget'));
      expect(screen.getByText(/2 children/)).toBeInTheDocument();
      expect(screen.getByText(/per child/)).toBeInTheDocument();
      expect(screen.getByText(/per week each/)).toBeInTheDocument();
    });

    it('does not show breakdown when no children', () => {
      mockAuthContext.children = [];
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Budget'));
      expect(screen.queryByText(/per child/)).not.toBeInTheDocument();
    });
  });

  describe('Notifications tab', () => {
    it('shows all notification preferences', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Notifications'));
      expect(screen.getByText('Email notifications')).toBeInTheDocument();
      expect(screen.getByText('Registration alerts')).toBeInTheDocument();
      expect(screen.getByText('Price drops')).toBeInTheDocument();
      expect(screen.getByText('Spots available')).toBeInTheDocument();
      expect(screen.getByText('Weekly digest')).toBeInTheDocument();
    });

    it('reflects current preferences', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Notifications'));
      const checkboxes = screen.getAllByRole('checkbox');
      // email_notifications=true, registration_open=true, price_drop=false, spots_available=true, weekly_digest=true
      expect(checkboxes[0]).toBeChecked(); // email
      expect(checkboxes[1]).toBeChecked(); // registration
      expect(checkboxes[2]).not.toBeChecked(); // price_drop
      expect(checkboxes[3]).toBeChecked(); // spots
      expect(checkboxes[4]).toBeChecked(); // weekly
    });

    it('toggles notification preference', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Notifications'));
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[2]); // toggle price_drop on
      expect(checkboxes[2]).toBeChecked();
    });
  });

  describe('saving', () => {
    it('calls updateProfile with all settings', async () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Save Settings'));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          school_year_end: '2026-06-05',
          school_year_start: '2026-08-19',
          work_hours_start: '08:00',
          work_hours_end: '17:30',
          summer_budget: 5000,
          notification_preferences: expect.objectContaining({
            email_notifications: true,
            registration_open: true,
          }),
        });
      });
    });

    it('calls refreshProfile after save', async () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Save Settings'));

      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
      });
    });

    it('shows "Saved" state after successful save', async () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Save Settings'));

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });

    it('shows "Saving..." during save', async () => {
      mockUpdateProfile.mockReturnValue(new Promise(() => {}));
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Save Settings'));
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('sends null budget when empty', async () => {
      mockAuthContext.profile.summer_budget = '';
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Save Settings'));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ summer_budget: null })
        );
      });
    });
  });

  describe('interactions', () => {
    it('calls onClose when X button clicked', () => {
      render(<Settings onClose={mockOnClose} />);
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg path'));
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel clicked', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getAllByText('Cancel')[0]);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('switches tabs correctly', () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Work Hours'));
      expect(screen.getByText('Work Schedule')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Budget'));
      expect(screen.getByText('Summer Budget')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Notifications'));
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });
  });
});

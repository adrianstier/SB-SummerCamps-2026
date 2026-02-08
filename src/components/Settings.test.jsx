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

vi.mock('../contexts/ScheduleContext', () => ({
  useSchedule: () => ({
    refreshSchedule: vi.fn(),
  }),
}));

vi.mock('../lib/supabase', () => ({
  updateProfile: (...args) => mockUpdateProfile(...args),
  getNotificationPreferences: vi.fn(() => Promise.resolve({
    notifications_enabled: true,
    registration_alerts_enabled: true,
    registration_alert_days: 7,
    registration_opening_email: true,
    price_drop_enabled: true,
    price_drop_threshold: 10,
    price_drop_email: true,
    early_bird_reminder_enabled: true,
    early_bird_days_before: 3,
    waitlist_updates_enabled: true,
    waitlist_spot_available: true,
    waitlist_position_change: true,
    waitlist_email: true,
    new_camp_match_enabled: true,
    match_by_category: true,
    match_by_age: true,
    match_by_price: false,
    new_camp_email: true,
    schedule_conflict_enabled: true,
    coverage_gap_enabled: true,
    coverage_reminder_day: 'sunday',
    friend_match_enabled: true,
    friend_match_email: true,
    friend_activity_enabled: true,
    squad_updates_enabled: true,
    weekly_digest_enabled: true,
    weekly_digest_day: 'sunday',
    weekly_digest_time: '09:00',
    digest_include_registration_dates: true,
    digest_include_coverage_status: true,
    digest_include_price_changes: true,
    digest_include_recommendations: true,
    budget_alerts_enabled: true,
    budget_warning_threshold: 80,
    budget_exceeded_email: true,
  })),
  getDefaultNotificationPreferences: vi.fn(() => ({
    notifications_enabled: true,
    registration_alerts_enabled: true,
    registration_alert_days: 7,
    registration_opening_email: true,
    price_drop_enabled: false,
    price_drop_threshold: 10,
    price_drop_email: false,
    early_bird_reminder_enabled: true,
    early_bird_days_before: 3,
    waitlist_updates_enabled: true,
    waitlist_spot_available: true,
    waitlist_position_change: true,
    waitlist_email: true,
    new_camp_match_enabled: false,
    match_by_category: true,
    match_by_age: true,
    match_by_price: false,
    new_camp_email: false,
    schedule_conflict_enabled: true,
    coverage_gap_enabled: true,
    coverage_reminder_day: 'sunday',
    friend_match_enabled: true,
    friend_match_email: false,
    friend_activity_enabled: true,
    squad_updates_enabled: true,
    weekly_digest_enabled: false,
    weekly_digest_day: 'sunday',
    weekly_digest_time: '09:00',
    digest_include_registration_dates: true,
    digest_include_coverage_status: true,
    digest_include_price_changes: true,
    digest_include_recommendations: true,
    budget_alerts_enabled: true,
    budget_warning_threshold: 80,
    budget_exceeded_email: false,
  })),
  updateNotificationPreferences: vi.fn(() => Promise.resolve()),
  clearSampleData: vi.fn(() => Promise.resolve()),
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
      preferred_categories: ['Beach/Surf', 'Sports'],
    },
    refreshProfile: mockRefreshProfile,
    refreshChildren: vi.fn(),
    refreshSchedule: vi.fn(),
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
      expect(screen.getByText('Preferences')).toBeInTheDocument();
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
    it('shows notification sections', async () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Notifications'));

      // Wait for notification prefs to load
      await waitFor(() => {
        expect(screen.getByText('All Notifications')).toBeInTheDocument();
      });

      expect(screen.getByText('Registration Alerts')).toBeInTheDocument();
      expect(screen.getByText('Price Notifications')).toBeInTheDocument();
      expect(screen.getByText('Waitlist Updates')).toBeInTheDocument();
      expect(screen.getByText('Schedule Alerts')).toBeInTheDocument();
    });

    it('shows master notification toggle', async () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Notifications'));

      await waitFor(() => {
        expect(screen.getByText('All Notifications')).toBeInTheDocument();
      });

      // Master toggle should be a switch element
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThanOrEqual(1);
    });

    it('shows checkboxes for individual notification settings', async () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Notifications'));

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('saving', () => {
    it('calls updateProfile with all settings', async () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Save Settings'));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            school_year_end: '2026-06-05',
            school_year_start: '2026-08-19',
            work_hours_start: '08:00',
            work_hours_end: '17:30',
            summer_budget: 5000,
            preferred_categories: ['Beach/Surf', 'Sports'],
          })
        );
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

    it('switches tabs correctly', async () => {
      render(<Settings onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Work Hours'));
      expect(screen.getByText('Work Schedule')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Budget'));
      expect(screen.getByText('Summer Budget')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Notifications'));
      await waitFor(() => {
        expect(screen.getByText('All Notifications')).toBeInTheDocument();
      });
    });
  });
});

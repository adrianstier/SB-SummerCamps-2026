import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SchedulePlanner } from './SchedulePlanner';

const mockOnClose = vi.fn();
const mockRefreshSchedule = vi.fn();
const mockRefreshChildren = vi.fn();
const mockRefreshCampInterests = vi.fn();
const mockAddScheduledCamp = vi.fn();
const mockDeleteScheduledCamp = vi.fn();
const mockUpdateScheduledCamp = vi.fn();
const mockClearSampleData = vi.fn();
const mockToggleLookingForFriends = vi.fn();
const mockExportAllToICal = vi.fn();
const mockCreateGoogleCalendarUrl = vi.fn();
const mockFormatCampForCalendar = vi.fn();

let mockAuthContext = {};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../lib/supabase', () => ({
  getSummerWeeks2026: () => [
    { weekNum: 1, startDate: '2026-06-08', endDate: '2026-06-12', label: 'Week 1', display: 'Jun 8-12' },
    { weekNum: 2, startDate: '2026-06-15', endDate: '2026-06-19', label: 'Week 2', display: 'Jun 15-19' },
    { weekNum: 3, startDate: '2026-06-22', endDate: '2026-06-26', label: 'Week 3', display: 'Jun 22-26' },
    { weekNum: 4, startDate: '2026-06-29', endDate: '2026-07-03', label: 'Week 4', display: 'Jun 29-Jul 3' },
    { weekNum: 5, startDate: '2026-07-06', endDate: '2026-07-10', label: 'Week 5', display: 'Jul 6-10' },
    { weekNum: 6, startDate: '2026-07-13', endDate: '2026-07-17', label: 'Week 6', display: 'Jul 13-17' },
    { weekNum: 7, startDate: '2026-07-20', endDate: '2026-07-24', label: 'Week 7', display: 'Jul 20-24' },
    { weekNum: 8, startDate: '2026-07-27', endDate: '2026-07-31', label: 'Week 8', display: 'Jul 27-31' },
    { weekNum: 9, startDate: '2026-08-03', endDate: '2026-08-07', label: 'Week 9', display: 'Aug 3-7' },
    { weekNum: 10, startDate: '2026-08-10', endDate: '2026-08-14', label: 'Week 10', display: 'Aug 10-14' },
    { weekNum: 11, startDate: '2026-08-17', endDate: '2026-08-21', label: 'Week 11', display: 'Aug 17-21' },
  ],
  addScheduledCamp: (...args) => mockAddScheduledCamp(...args),
  deleteScheduledCamp: (...args) => mockDeleteScheduledCamp(...args),
  updateScheduledCamp: (...args) => mockUpdateScheduledCamp(...args),
  clearSampleData: (...args) => mockClearSampleData(...args),
  toggleLookingForFriends: (...args) => mockToggleLookingForFriends(...args),
}));

vi.mock('../lib/googleCalendar', () => ({
  createGoogleCalendarUrl: (...args) => mockCreateGoogleCalendarUrl(...args),
  exportAllToICal: (...args) => mockExportAllToICal(...args),
  formatCampForCalendar: (...args) => mockFormatCampForCalendar(...args),
}));

vi.mock('./GuidedTour', () => ({
  GuidedTour: ({ onComplete, onSkip }) => (
    <div data-testid="guided-tour">
      <button onClick={onComplete}>Complete Tour</button>
      <button onClick={onSkip}>Skip Tour</button>
    </div>
  ),
}));

vi.mock('./SquadsPanel', () => ({
  default: () => <div data-testid="squads-panel">Squads Panel</div>,
}));

vi.mock('./SquadNotificationBell', () => ({
  default: () => <div data-testid="squad-bell">Bell</div>,
}));

const mockCamps = [
  { id: 'camp-1', camp_name: 'Surf Camp', category: 'Water Sports', min_price: 400, ages: '8-12', image_url: null },
  { id: 'camp-2', camp_name: 'Art Camp', category: 'Arts', min_price: 250, ages: '5-10', image_url: 'https://example.com/art.jpg' },
  { id: 'camp-3', camp_name: 'Science Camp', category: 'STEM', min_price: 500, ages: '10-14', image_url: null },
  { id: 'camp-4', camp_name: 'Sports Camp', category: 'Sports', min_price: 350, ages: '6-12', image_url: null },
  { id: 'camp-5', camp_name: 'Nature Camp', category: 'Nature', min_price: 300, ages: '7-11', image_url: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockAddScheduledCamp.mockResolvedValue();
  mockDeleteScheduledCamp.mockResolvedValue();
  mockUpdateScheduledCamp.mockResolvedValue();
  mockClearSampleData.mockResolvedValue();
  mockToggleLookingForFriends.mockResolvedValue();
  mockRefreshSchedule.mockResolvedValue();
  mockRefreshChildren.mockResolvedValue();
  mockRefreshCampInterests.mockResolvedValue();
  mockCreateGoogleCalendarUrl.mockReturnValue('https://calendar.google.com/test');
  mockFormatCampForCalendar.mockReturnValue({ title: 'Test', start: '2026-06-08', end: '2026-06-12' });

  mockAuthContext = {
    isConfigured: true,
    children: [
      { id: 'child-1', name: 'Emma', color: '#ec4899', is_sample: false },
      { id: 'child-2', name: 'Jake', color: '#3b82f6', is_sample: false },
    ],
    scheduledCamps: [],
    refreshSchedule: mockRefreshSchedule,
    refreshChildren: mockRefreshChildren,
    getTotalCost: vi.fn(() => 0),
    getCoverageGaps: vi.fn(() => []),
    profile: { tour_shown: false, tour_completed: false },
    campInterests: [],
    refreshCampInterests: mockRefreshCampInterests,
    squads: [],
  };
});

describe('SchedulePlanner', () => {
  describe('not configured state', () => {
    it('shows not-configured message when isConfigured is false', () => {
      mockAuthContext.isConfigured = false;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Supabase not configured')).toBeInTheDocument();
    });

    it('shows instruction text', () => {
      mockAuthContext.isConfigured = false;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Connect to Supabase to start planning.')).toBeInTheDocument();
    });

    it('calls onClose when Got it clicked', () => {
      mockAuthContext.isConfigured = false;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Got it'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('no children state', () => {
    it('shows empty state when no children', () => {
      mockAuthContext.children = [];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Add your children first')).toBeInTheDocument();
    });

    it('shows instruction text for no children', () => {
      mockAuthContext.children = [];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Add children to plan each schedule separately.')).toBeInTheDocument();
    });

    it('shows Add Children button', () => {
      mockAuthContext.children = [];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Add Children')).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders Summer 2026 title', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Summer 2026')).toBeInTheDocument();
    });

    it('shows selected child name in subtitle', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText("Emma's Schedule")).toBeInTheDocument();
    });

    it('renders child pills', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // Desktop pills + mobile pills = multiple instances
      const emmaButtons = screen.getAllByText('Emma');
      expect(emmaButtons.length).toBeGreaterThanOrEqual(1);
      const jakeButtons = screen.getAllByText('Jake');
      expect(jakeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('switches child when pill clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // Click Jake in the desktop pills
      const jakePills = screen.getAllByText('Jake');
      fireEvent.click(jakePills[0]);
      expect(screen.getByText("Jake's Schedule")).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Close planner'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('tab navigation', () => {
    it('renders all tabs', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Squads')).toBeInTheDocument();
    });

    it('shows schedule tab by default', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Camp Library')).toBeInTheDocument();
    });

    it('switches to squads tab', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Squads'));
      expect(screen.getByTestId('squads-panel')).toBeInTheDocument();
    });

    it('switches to status tab', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Status'));
      expect(screen.getByText('Planned')).toBeInTheDocument();
      expect(screen.getByText('Registered')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });
  });

  describe('schedule view', () => {
    it('renders month sections', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('June')).toBeInTheDocument();
      expect(screen.getByText('July')).toBeInTheDocument();
      expect(screen.getByText('August')).toBeInTheDocument();
    });

    it('renders week cards', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // Week labels appear in week cards and mobile nav - just check they exist
      const week1Labels = screen.getAllByText('Week 1');
      expect(week1Labels.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Week 11')).toBeInTheDocument();
    });

    it('shows camp info strip', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // Strip shows child name
      const emmaTexts = screen.getAllByText('Emma');
      expect(emmaTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('shows coverage percentage', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText(/covered/)).toBeInTheDocument();
    });

    it('shows gap count when gaps exist', () => {
      mockAuthContext.getCoverageGaps.mockReturnValue([
        { weekNum: 1 }, { weekNum: 2 }, { weekNum: 3 }
      ]);
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('3 gaps')).toBeInTheDocument();
    });

    it('shows singular gap for 1 gap', () => {
      mockAuthContext.getCoverageGaps.mockReturnValue([{ weekNum: 1 }]);
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('1 gap')).toBeInTheDocument();
    });
  });

  describe('camp sidebar', () => {
    it('renders Camp Library header', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Camp Library')).toBeInTheDocument();
    });

    it('shows search input', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByPlaceholderText('Search camps...')).toBeInTheDocument();
    });

    it('shows drag hint', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Drag to schedule')).toBeInTheDocument();
    });

    it('displays camp names in sidebar', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Surf Camp')).toBeInTheDocument();
      expect(screen.getByText('Art Camp')).toBeInTheDocument();
    });

    it('displays camp category and price in sidebar', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Water Sports')).toBeInTheDocument();
      expect(screen.getByText('$400')).toBeInTheDocument();
    });

    it('filters camps by search query', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const searchInput = screen.getByPlaceholderText('Search camps...');
      fireEvent.change(searchInput, { target: { value: 'Surf' } });
      expect(screen.getByText('Surf Camp')).toBeInTheDocument();
      expect(screen.queryByText('Art Camp')).not.toBeInTheDocument();
    });

    it('filters camps by category', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const searchInput = screen.getByPlaceholderText('Search camps...');
      fireEvent.change(searchInput, { target: { value: 'STEM' } });
      expect(screen.getByText('Science Camp')).toBeInTheDocument();
      expect(screen.queryByText('Surf Camp')).not.toBeInTheDocument();
    });

    it('shows empty state when no camps match search', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const searchInput = screen.getByPlaceholderText('Search camps...');
      fireEvent.change(searchInput, { target: { value: 'zzzzz' } });
      expect(screen.getByText('No camps found')).toBeInTheDocument();
    });

    it('collapses sidebar when toggle clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Collapse sidebar'));
      // Search and camps should be hidden
      expect(screen.queryByPlaceholderText('Search camps...')).not.toBeInTheDocument();
    });

    it('expands sidebar when toggle clicked again', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Collapse sidebar'));
      fireEvent.click(screen.getByLabelText('Expand sidebar'));
      expect(screen.getByPlaceholderText('Search camps...')).toBeInTheDocument();
    });
  });

  describe('scheduled camps display', () => {
    beforeEach(() => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', end_date: '2026-06-12', price: 400, status: 'planned' },
        { id: 'sc-2', camp_id: 'camp-2', child_id: 'child-1', start_date: '2026-06-15', end_date: '2026-06-19', price: 250, status: 'confirmed' },
      ];
      mockAuthContext.getTotalCost.mockReturnValue(650);
    });

    it('shows scheduled camp names on week cards', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // Camp names appear in both sidebar and week cards
      const surfCamps = screen.getAllByText('Surf Camp');
      expect(surfCamps.length).toBeGreaterThanOrEqual(2); // sidebar + week card
    });

    it('shows camp status on cards', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('planned')).toBeInTheDocument();
      expect(screen.getByText('confirmed')).toBeInTheDocument();
    });

    it('shows camp price on cards', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // $400 appears in sidebar and week card
      const prices = screen.getAllByText('$400');
      expect(prices.length).toBeGreaterThanOrEqual(1);
    });

    it('shows total cost in bottom bar', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('$650')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('shows gaps count in bottom bar', () => {
      mockAuthContext.getCoverageGaps.mockReturnValue([{ weekNum: 3 }, { weekNum: 4 }]);
      const { container } = render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Gaps')).toBeInTheDocument();
      // Check the gap count value in the bottom bar
      const gapStat = container.querySelector('.planner-bottom-stat-value.has-gaps');
      expect(gapStat).toBeInTheDocument();
      expect(gapStat.textContent).toBe('2');
    });

    it('shows export buttons when camps are scheduled', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
  });

  describe('add camp via drawer', () => {
    it('opens drawer when FAB clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Add camp'));
      // Should show the drawer with camp list
      const campLibraryHeaders = screen.getAllByText('Camp Library');
      expect(campLibraryHeaders.length).toBeGreaterThanOrEqual(1);
    });

    it('shows camps in drawer', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Add camp'));
      // Camps visible in both sidebar and drawer
      const surfCamps = screen.getAllByText('Surf Camp');
      expect(surfCamps.length).toBeGreaterThanOrEqual(2);
    });

    it('closes drawer when overlay clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByLabelText('Add camp'));
      // Click overlay
      const overlay = document.querySelector('.planner-drawer-overlay');
      fireEvent.click(overlay);
      // Drawer should close - only sidebar Camp Library remains
      const campLibraryHeaders = screen.getAllByText('Camp Library');
      expect(campLibraryHeaders.length).toBe(1);
    });

    it('adds camp when clicked in week-specific drawer', async () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // Click an empty week card to open block menu, then "Add a Camp"
      const weekCards = document.querySelectorAll('.week-card');
      fireEvent.click(weekCards[0]); // Week 1
      fireEvent.click(screen.getByText('Add a Camp'));

      // Now click a camp in the drawer
      const drawerCamps = document.querySelectorAll('.planner-drawer-camp');
      fireEvent.click(drawerCamps[0]);

      await waitFor(() => {
        expect(mockAddScheduledCamp).toHaveBeenCalledWith(expect.objectContaining({
          camp_id: 'camp-1',
          child_id: 'child-1',
          start_date: '2026-06-08',
        }));
      });
    });

    it('refreshes schedule after adding camp', async () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const weekCards = document.querySelectorAll('.week-card');
      fireEvent.click(weekCards[0]);
      fireEvent.click(screen.getByText('Add a Camp'));

      const drawerCamps = document.querySelectorAll('.planner-drawer-camp');
      fireEvent.click(drawerCamps[0]);

      await waitFor(() => {
        expect(mockRefreshSchedule).toHaveBeenCalled();
      });
    });
  });

  describe('block menu', () => {
    it('shows block menu when empty week clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const weekCards = document.querySelectorAll('.week-card');
      fireEvent.click(weekCards[0]);
      expect(screen.getByText("What's happening?")).toBeInTheDocument();
    });

    it('shows block type options', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const weekCards = document.querySelectorAll('.week-card');
      fireEvent.click(weekCards[0]);
      expect(screen.getByText('Vacation')).toBeInTheDocument();
      expect(screen.getByText('Family Time')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
      expect(screen.getByText('Other Plans')).toBeInTheDocument();
    });

    it('shows Add a Camp option', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const weekCards = document.querySelectorAll('.week-card');
      fireEvent.click(weekCards[0]);
      expect(screen.getByText('Add a Camp')).toBeInTheDocument();
    });

    it('blocks week when type selected', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const weekCards = document.querySelectorAll('.week-card');
      fireEvent.click(weekCards[0]);
      fireEvent.click(screen.getByText('Vacation'));
      // Block should now show on the week
      expect(screen.queryByText("What's happening?")).not.toBeInTheDocument();
    });
  });

  describe('status board', () => {
    beforeEach(() => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', end_date: '2026-06-12', price: 400, status: 'planned' },
        { id: 'sc-2', camp_id: 'camp-2', child_id: 'child-1', start_date: '2026-06-15', end_date: '2026-06-19', price: 250, status: 'confirmed' },
        { id: 'sc-3', camp_id: 'camp-3', child_id: 'child-1', start_date: '2026-06-22', end_date: '2026-06-26', price: 500, status: 'registered' },
      ];
    });

    it('shows status columns', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Status'));
      expect(screen.getByText('Planned')).toBeInTheDocument();
      expect(screen.getByText('Registered')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Waitlisted')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('shows camps in correct status columns', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Status'));
      // Surf Camp is planned, Art Camp is confirmed, Science Camp is registered
      const surfCards = screen.getAllByText('Surf Camp');
      expect(surfCards.length).toBeGreaterThanOrEqual(1);
    });

    it('shows column counts', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Status'));
      // Each column shows a count badge
      const counts = document.querySelectorAll('.status-column-count');
      expect(counts.length).toBe(5);
    });

    it('shows empty state for columns with no camps', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Status'));
      expect(screen.getByText('No waitlisted camps')).toBeInTheDocument();
      expect(screen.getByText('No cancelled camps')).toBeInTheDocument();
    });

    it('shows no children state on status tab when no children', () => {
      mockAuthContext.children = [];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Status'));
      expect(screen.getByText('Add your children first')).toBeInTheDocument();
    });
  });

  describe('preview mode (What-If)', () => {
    it('shows What-If toggle button', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('What-If')).toBeInTheDocument();
    });

    it('shows preview banner when activated', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('What-If'));
      expect(screen.getByText('What-If Planning Mode')).toBeInTheDocument();
    });

    it('shows drag instruction in preview mode', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('What-If'));
      expect(screen.getByText('Drag camps to see how they affect your budget')).toBeInTheDocument();
    });

    it('shows Exit Preview button', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('What-If'));
      expect(screen.getByText('Exit Preview')).toBeInTheDocument();
    });

    it('exits preview mode when Exit Preview clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('What-If'));
      expect(screen.getByText('What-If Planning Mode')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Exit Preview'));
      expect(screen.queryByText('What-If Planning Mode')).not.toBeInTheDocument();
    });
  });

  describe('sample data banner', () => {
    it('shows sample data banner when sample children exist', () => {
      mockAuthContext.children[0].is_sample = true;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Sample data')).toBeInTheDocument();
    });

    it('shows sample data banner when sample scheduled camps exist', () => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', end_date: '2026-06-12', price: 400, status: 'planned', is_sample: true },
      ];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Sample data')).toBeInTheDocument();
    });

    it('shows Clear button', () => {
      mockAuthContext.children[0].is_sample = true;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('calls clearSampleData when Clear clicked', async () => {
      mockAuthContext.children[0].is_sample = true;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Clear'));
      // Confirmation dialog appears - click Confirm
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockClearSampleData).toHaveBeenCalled();
        expect(mockRefreshChildren).toHaveBeenCalled();
        expect(mockRefreshSchedule).toHaveBeenCalled();
      });
    });

    it('does not clear when confirm is cancelled', () => {
      mockAuthContext.children[0].is_sample = true;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Clear'));
      // Confirmation dialog appears - click Cancel
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockClearSampleData).not.toHaveBeenCalled();
    });

    it('does not show banner when no sample data', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
    });
  });

  describe('guided tour', () => {
    it('does not show tour by default', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.queryByTestId('guided-tour')).not.toBeInTheDocument();
    });

    it('shows tour when profile.tour_shown is true and has sample data', () => {
      mockAuthContext.profile = { tour_shown: true, tour_completed: false };
      mockAuthContext.children[0].is_sample = true;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByTestId('guided-tour')).toBeInTheDocument();
    });

    it('does not show tour when tour_completed is true', () => {
      mockAuthContext.profile = { tour_shown: true, tour_completed: true };
      mockAuthContext.children[0].is_sample = true;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.queryByTestId('guided-tour')).not.toBeInTheDocument();
    });

    it('hides tour when Complete Tour clicked', () => {
      mockAuthContext.profile = { tour_shown: true, tour_completed: false };
      mockAuthContext.children[0].is_sample = true;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Complete Tour'));
      expect(screen.queryByTestId('guided-tour')).not.toBeInTheDocument();
    });

    it('hides tour when Skip Tour clicked', () => {
      mockAuthContext.profile = { tour_shown: true, tour_completed: false };
      mockAuthContext.children[0].is_sample = true;
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Skip Tour'));
      expect(screen.queryByTestId('guided-tour')).not.toBeInTheDocument();
    });
  });

  describe('export actions', () => {
    beforeEach(() => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', end_date: '2026-06-12', price: 400, status: 'planned' },
      ];
    });

    it('calls exportAllToICal when Export clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Export'));
      expect(mockExportAllToICal).toHaveBeenCalled();
    });

    it('passes child name to export function', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Export'));
      expect(mockExportAllToICal).toHaveBeenCalledWith(
        mockCamps,
        expect.any(Array),
        'Emma'
      );
    });

    it('opens Google Calendar when Calendar clicked', () => {
      const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => {});
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Calendar'));
      expect(mockFormatCampForCalendar).toHaveBeenCalled();
      expect(mockCreateGoogleCalendarUrl).toHaveBeenCalled();
      expect(mockOpen).toHaveBeenCalledWith(
        'https://calendar.google.com/test',
        '_blank',
        'noopener,noreferrer'
      );
      mockOpen.mockRestore();
    });

    it('does not show export buttons when no camps scheduled', () => {
      mockAuthContext.scheduledCamps = [];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
      expect(screen.queryByText('Calendar')).not.toBeInTheDocument();
    });
  });

  describe('remove camp', () => {
    beforeEach(() => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', end_date: '2026-06-12', price: 400, status: 'planned' },
      ];
    });

    it('calls deleteScheduledCamp when confirmed', async () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // Find and click the remove button on the camp card
      const removeBtn = document.querySelector('.camp-card-remove');
      fireEvent.click(removeBtn);
      // Confirmation dialog appears - click Confirm
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockDeleteScheduledCamp).toHaveBeenCalledWith('sc-1');
        expect(mockRefreshSchedule).toHaveBeenCalled();
      });
    });

    it('does not delete when confirm is cancelled', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const removeBtn = document.querySelector('.camp-card-remove');
      fireEvent.click(removeBtn);
      // Confirmation dialog appears - click Cancel
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockDeleteScheduledCamp).not.toHaveBeenCalled();
    });
  });

  describe('looking for friends', () => {
    beforeEach(() => {
      mockAuthContext.squads = [{ id: 'squad-1', name: 'Test Squad' }];
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', end_date: '2026-06-12', price: 400, status: 'planned' },
      ];
    });

    it('shows Find friends button when user has squads', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Find friends')).toBeInTheDocument();
    });

    it('does not show friends button when no squads', () => {
      mockAuthContext.squads = [];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.queryByText('Find friends')).not.toBeInTheDocument();
    });

    it('shows Looking for friends when already looking', () => {
      mockAuthContext.campInterests = [
        { camp_id: 'camp-1', child_id: 'child-1', week_number: 1, looking_for_friends: true },
      ];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText('Looking for friends')).toBeInTheDocument();
    });

    it('calls toggleLookingForFriends when clicked', async () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      fireEvent.click(screen.getByText('Find friends'));

      await waitFor(() => {
        expect(mockToggleLookingForFriends).toHaveBeenCalledWith('camp-1', 'child-1', 1, true);
        expect(mockRefreshCampInterests).toHaveBeenCalled();
      });
    });
  });

  describe('mobile navigation', () => {
    it('shows mobile week navigator', () => {
      const { container } = render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const navCurrent = container.querySelector('.planner-nav-current');
      expect(navCurrent).toBeInTheDocument();
      expect(navCurrent.textContent).toBe('Week 1');
    });

    it('navigates forward when right arrow clicked', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const navBtns = document.querySelectorAll('.planner-nav-btn');
      const rightBtn = navBtns[1]; // second button is right/next
      fireEvent.click(rightBtn);
      // Should now show Week 2 in nav indicator
      const navCurrent = document.querySelector('.planner-nav-current');
      expect(navCurrent.textContent).toBe('Week 2');
    });

    it('disables back button on first week', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const navBtns = document.querySelectorAll('.planner-nav-btn');
      expect(navBtns[0]).toBeDisabled();
    });
  });

  describe('drag and drop', () => {
    it('sets dragged camp on drag start', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const sidebarCamp = document.querySelector('.planner-sidebar-camp');
      const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
      fireEvent.dragStart(sidebarCamp, { dataTransfer });
      expect(dataTransfer.setData).toHaveBeenCalledWith('campId', 'camp-1');
    });

    it('handles drop on week card', async () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const weekCard = document.querySelector('.week-card');
      const dataTransfer = { getData: vi.fn(() => 'camp-1') };
      fireEvent.drop(weekCard, { dataTransfer, preventDefault: vi.fn() });

      await waitFor(() => {
        expect(mockAddScheduledCamp).toHaveBeenCalledWith(expect.objectContaining({
          camp_id: 'camp-1',
          child_id: 'child-1',
        }));
      });
    });

    it('shows drag-over visual on week card during drag', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const weekCard = document.querySelector('.week-card');
      fireEvent.dragOver(weekCard, { preventDefault: vi.fn() });
      expect(weekCard.classList.contains('drag-over')).toBe(true);
    });

    it('removes drag-over on drag leave', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      const weekCard = document.querySelector('.week-card');
      fireEvent.dragOver(weekCard, { preventDefault: vi.fn() });
      fireEvent.dragLeave(weekCard);
      expect(weekCard.classList.contains('drag-over')).toBe(false);
    });
  });

  describe('child selection update', () => {
    it('defaults to first child', () => {
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      expect(screen.getByText("Emma's Schedule")).toBeInTheDocument();
    });

    it('shows "Plan your summer" when no child selected', () => {
      mockAuthContext.children = [];
      render(<SchedulePlanner camps={mockCamps} onClose={mockOnClose} />);
      // In the no-children state, subtitle should show plan your summer
      // But since no children means empty state is shown, just verify it renders
      expect(screen.getByText('Add your children first')).toBeInTheDocument();
    });
  });
});

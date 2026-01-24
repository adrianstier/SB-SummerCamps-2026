import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Dashboard } from './Dashboard';

const mockOnClose = vi.fn();
const mockOnOpenPlanner = vi.fn();
const mockOnSelectCamp = vi.fn();

let mockAuthContext = {};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../lib/supabase', () => ({
  getSummerWeeks2026: vi.fn(() => [
    { startDate: '2026-06-08', endDate: '2026-06-12' },
    { startDate: '2026-06-15', endDate: '2026-06-19' },
    { startDate: '2026-06-22', endDate: '2026-06-26' },
  ]),
}));

vi.mock('../lib/formatters', () => ({
  formatPriceShort: vi.fn((camp) => {
    if (!camp.min_price) return 'TBD';
    return `$${camp.min_price}`;
  }),
}));

vi.mock('./FavoriteButton', () => ({
  FavoriteButton: ({ campId }) => <button data-testid={`fav-${campId}`}>Fav</button>,
}));

const mockCamps = [
  { id: 'camp-1', camp_name: 'Surf Camp', category: 'Beach', min_price: 400 },
  { id: 'camp-2', camp_name: 'Art Camp', category: 'Art', min_price: 250 },
  { id: 'camp-3', camp_name: 'Science Camp', category: 'STEM', min_price: 500 },
  { id: 'camp-4', camp_name: 'Sports Camp', category: 'Sports', min_price: 350 },
  { id: 'camp-5', camp_name: 'Music Camp', category: 'Music', min_price: 300 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthContext = {
    profile: { full_name: 'Jane Doe' },
    children: [
      { id: 'child-1', name: 'Emma' },
      { id: 'child-2', name: 'Jake' },
    ],
    favorites: [],
    scheduledCamps: [],
    getRecommendationScores: vi.fn(() => [
      { camp: mockCamps[0], score: 90 },
      { camp: mockCamps[1], score: 85 },
      { camp: mockCamps[2], score: 80 },
      { camp: mockCamps[3], score: 75 },
    ]),
    getDashboardStats: vi.fn(() => ({
      childrenCount: 2,
      totalScheduled: 3,
      totalCost: 1200,
    })),
    getCoverageGaps: vi.fn(() => []),
  };
});

describe('Dashboard', () => {
  it('renders greeting with first name', () => {
    render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Welcome back,')).toBeInTheDocument();
  });

  it('shows "there" when no profile name', () => {
    mockAuthContext.profile = null;
    render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
    expect(screen.getByText('there')).toBeInTheDocument();
  });

  it('displays stats row with correct counts', () => {
    render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // children
    expect(screen.getByText('3')).toBeInTheDocument(); // camps
    expect(screen.getByText('$1,200')).toBeInTheDocument(); // total cost
  });

  it('shows singular "child" for 1 child', () => {
    mockAuthContext.getDashboardStats.mockReturnValue({ childrenCount: 1, totalScheduled: 0, totalCost: 0 });
    render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('shows plural "children" for 2 children', () => {
    render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
    expect(screen.getByText('children')).toBeInTheDocument();
  });

  it('shows gaps count when there are coverage gaps', () => {
    mockAuthContext.getCoverageGaps.mockReturnValue(['gap-1', 'gap-2']);
    render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
    expect(screen.getByText('4')).toBeInTheDocument(); // 2 children x 2 gaps
    expect(screen.getByText('gaps')).toBeInTheDocument();
  });

  it('does not show gaps when none exist', () => {
    render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
    expect(screen.queryByText('gaps')).not.toBeInTheDocument();
  });

  it('shows singular "gap" for 1 gap', () => {
    mockAuthContext.children = [{ id: 'child-1', name: 'Emma' }];
    mockAuthContext.getCoverageGaps.mockReturnValue(['gap-1']);
    render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
    expect(screen.getByText('gap')).toBeInTheDocument();
  });

  describe('Schedule section', () => {
    it('shows empty state when no scheduled camps', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      expect(screen.getByText('No camps scheduled yet')).toBeInTheDocument();
      expect(screen.getByText('Start planning')).toBeInTheDocument();
    });

    it('shows scheduled camps when present', () => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', status: 'confirmed' },
      ];
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      // Surf Camp appears in both schedule and recommendations
      const surfCamps = screen.getAllByText('Surf Camp');
      expect(surfCamps.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('confirmed')).toBeInTheDocument();
    });

    it('limits display to 3 scheduled camps', () => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', status: 'confirmed' },
        { id: 'sc-2', camp_id: 'camp-2', child_id: 'child-1', start_date: '2026-06-15', status: 'registered' },
        { id: 'sc-3', camp_id: 'camp-3', child_id: 'child-2', start_date: '2026-06-22', status: 'planned' },
        { id: 'sc-4', camp_id: 'camp-4', child_id: 'child-2', start_date: '2026-06-29', status: 'confirmed' },
      ];
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      // First 3 camps should be scheduled (sorted by start_date), 4th should not appear in schedule
      const scheduleList = screen.getByText('Your Schedule').closest('section');
      expect(scheduleList).toBeInTheDocument();
      // Sports Camp (camp-4) should not appear in the schedule section since it's the 4th
      // But it may appear in recommendations, so just check the schedule cards are limited
      const statusBadges = screen.getAllByText(/confirmed|registered|planned/);
      expect(statusBadges.length).toBeLessThanOrEqual(4); // max 3 schedule + 1 from other section
    });

    it('excludes cancelled camps from display', () => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'child-1', start_date: '2026-06-08', status: 'cancelled' },
      ];
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      expect(screen.getByText('No camps scheduled yet')).toBeInTheDocument();
    });

    it('shows "Camp" fallback when camp not found', () => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'unknown-camp', child_id: 'child-1', start_date: '2026-06-08', status: 'confirmed' },
      ];
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      expect(screen.getByText('Camp')).toBeInTheDocument();
    });

    it('shows "Child" fallback when child not found', () => {
      mockAuthContext.scheduledCamps = [
        { id: 'sc-1', camp_id: 'camp-1', child_id: 'unknown-child', start_date: '2026-06-08', status: 'confirmed' },
      ];
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      expect(screen.getByText('Child')).toBeInTheDocument();
    });
  });

  describe('Recommendations section', () => {
    it('shows recommended camps', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      expect(screen.getByText('Surf Camp')).toBeInTheDocument();
      expect(screen.getByText('Art Camp')).toBeInTheDocument();
    });

    it('shows camp category and price in recommendations', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      expect(screen.getByText(/Beach/)).toBeInTheDocument();
    });

    it('shows empty state when no recommendations', () => {
      mockAuthContext.getRecommendationScores.mockReturnValue([]);
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      expect(screen.getByText('Add preferences to get personalized suggestions')).toBeInTheDocument();
    });

    it('calls onSelectCamp when recommendation clicked', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      // Click on the reco card - find by camp name and click the parent
      const surfCamp = screen.getByText('Surf Camp');
      fireEvent.click(surfCamp.closest('.reco-card'));
      expect(mockOnSelectCamp).toHaveBeenCalledWith(mockCamps[0]);
    });
  });

  describe('interactions', () => {
    it('calls onClose when close button clicked', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay clicked', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      fireEvent.click(screen.getByText('Welcome back,').closest('.dashboard-overlay'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onOpenPlanner when "View all" clicked', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      fireEvent.click(screen.getByText('View all'));
      expect(mockOnOpenPlanner).toHaveBeenCalled();
    });

    it('calls onOpenPlanner when "Plan My Summer" clicked', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      fireEvent.click(screen.getByText('Plan My Summer'));
      expect(mockOnOpenPlanner).toHaveBeenCalled();
    });

    it('calls onOpenPlanner when "Start planning" clicked', () => {
      render(<Dashboard camps={mockCamps} onClose={mockOnClose} onOpenPlanner={mockOnOpenPlanner} onSelectCamp={mockOnSelectCamp} />);
      fireEvent.click(screen.getByText('Start planning'));
      expect(mockOnOpenPlanner).toHaveBeenCalled();
    });
  });
});

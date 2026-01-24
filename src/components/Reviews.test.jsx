import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ReviewsSummary, WriteReviewForm, ReviewsList } from './Reviews';

let mockAuthContext = {};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

const mockGetCampRatings = vi.fn();
const mockGetReviews = vi.fn();
const mockAddReview = vi.fn();
const mockVoteReviewHelpful = vi.fn();

vi.mock('../lib/supabase', () => ({
  getCampRatings: (...args) => mockGetCampRatings(...args),
  getReviews: (...args) => mockGetReviews(...args),
  addReview: (...args) => mockAddReview(...args),
  voteReviewHelpful: (...args) => mockVoteReviewHelpful(...args),
  removeReviewVote: vi.fn(),
}));

const mockRatings = {
  avg_rating: 4.2,
  review_count: 15,
  avg_value: 3.8,
  avg_staff: 4.5,
  avg_activities: 4.3,
  avg_safety: 4.7,
  recommend_percent: 92,
};

const mockReviews = [
  {
    id: 'review-1',
    user_id: 'user-1',
    overall_rating: 5,
    review_text: 'Amazing camp experience!',
    title: 'Best Summer Ever',
    would_recommend: true,
    helpful_count: 3,
    created_at: '2025-08-15T10:00:00Z',
    year_attended: 2025,
    child_age_at_time: 8,
    profiles: { full_name: 'Jane Smith', avatar_url: 'https://example.com/avatar.jpg' },
  },
  {
    id: 'review-2',
    user_id: 'user-2',
    overall_rating: 3,
    review_text: 'It was okay.',
    title: null,
    would_recommend: false,
    helpful_count: 0,
    created_at: '2025-07-20T10:00:00Z',
    profiles: { full_name: null },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthContext = {
    user: { id: 'user-current' },
  };
  mockGetCampRatings.mockResolvedValue(mockRatings);
  mockGetReviews.mockResolvedValue(mockReviews);
  mockAddReview.mockResolvedValue({ error: null });
});

describe('ReviewsSummary', () => {
  it('renders null while loading', () => {
    mockGetCampRatings.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<ReviewsSummary campId="camp-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('displays average rating', async () => {
    render(<ReviewsSummary campId="camp-1" />);
    await waitFor(() => {
      // avg_rating appears in header and in Overall RatingBar
      const ratingElements = screen.getAllByText('4.2');
      expect(ratingElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays rating values in bars', async () => {
    render(<ReviewsSummary campId="camp-1" />);
    await waitFor(() => {
      expect(screen.getByText('3.8')).toBeInTheDocument(); // value
      expect(screen.getByText('4.5')).toBeInTheDocument(); // staff
    });
  });

  it('displays review count', async () => {
    render(<ReviewsSummary campId="camp-1" />);
    await waitFor(() => {
      expect(screen.getByText('15 reviews')).toBeInTheDocument();
    });
  });

  it('shows singular "review" for 1 review', async () => {
    mockGetCampRatings.mockResolvedValue({ ...mockRatings, review_count: 1 });
    render(<ReviewsSummary campId="camp-1" />);
    await waitFor(() => {
      expect(screen.getByText('1 review')).toBeInTheDocument();
    });
  });

  it('displays recommend percentage', async () => {
    render(<ReviewsSummary campId="camp-1" />);
    await waitFor(() => {
      expect(screen.getByText('92% would recommend')).toBeInTheDocument();
    });
  });

  it('displays rating bars', async () => {
    render(<ReviewsSummary campId="camp-1" />);
    await waitFor(() => {
      expect(screen.getByText('Overall')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
      expect(screen.getByText('Staff')).toBeInTheDocument();
      expect(screen.getByText('Activities')).toBeInTheDocument();
      expect(screen.getByText('Safety')).toBeInTheDocument();
    });
  });

  it('calls getCampRatings with campId', async () => {
    render(<ReviewsSummary campId="camp-42" />);
    await waitFor(() => {
      expect(mockGetCampRatings).toHaveBeenCalledWith('camp-42');
    });
  });

  it('renders null when ratings data is null', async () => {
    mockGetCampRatings.mockResolvedValue(null);
    const { container } = render(<ReviewsSummary campId="camp-1" />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});

describe('WriteReviewForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  it('shows sign-in prompt when no user', () => {
    mockAuthContext.user = null;
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('Sign in to write a review')).toBeInTheDocument();
  });

  it('renders review form for authenticated user', () => {
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('Review Surf Camp')).toBeInTheDocument();
  });

  it('renders overall rating stars', () => {
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('Overall Rating *')).toBeInTheDocument();
    const ratingButtons = screen.getAllByLabelText(/Rate \d out of 5 stars/);
    expect(ratingButtons.length).toBeGreaterThanOrEqual(5);
  });

  it('renders detail rating categories', () => {
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText('Value for Money')).toBeInTheDocument();
    expect(screen.getByText('Staff Quality')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
    expect(screen.getByText('Safety')).toBeInTheDocument();
  });

  it('shows error when submitting without rating', async () => {
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByText('Submit Review'));
    expect(screen.getByText('Please provide an overall rating')).toBeInTheDocument();
  });

  it('shows error when submitting without review text', async () => {
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    // Set rating
    const starButtons = screen.getAllByLabelText('Rate 4 out of 5 stars');
    fireEvent.click(starButtons[0]);
    fireEvent.click(screen.getByText('Submit Review'));
    expect(screen.getByText('Please write a review')).toBeInTheDocument();
  });

  it('submits review successfully', async () => {
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    // Set rating
    const starButtons = screen.getAllByLabelText('Rate 4 out of 5 stars');
    fireEvent.click(starButtons[0]);
    // Set review text
    fireEvent.change(screen.getByPlaceholderText(/What did you like/), { target: { value: 'Great camp!' } });
    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(mockAddReview).toHaveBeenCalledWith(expect.objectContaining({
        camp_id: 'camp-1',
        overall_rating: 4,
        review_text: 'Great camp!',
      }));
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error on submit failure', async () => {
    mockAddReview.mockResolvedValue({ error: { message: 'Server error' } });
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    const starButtons = screen.getAllByLabelText('Rate 5 out of 5 stars');
    fireEvent.click(starButtons[0]);
    fireEvent.change(screen.getByPlaceholderText(/What did you like/), { target: { value: 'Great!' } });
    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows generic error on exception', async () => {
    mockAddReview.mockRejectedValue(new Error('Network'));
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    const starButtons = screen.getAllByLabelText('Rate 5 out of 5 stars');
    fireEvent.click(starButtons[0]);
    fireEvent.change(screen.getByPlaceholderText(/What did you like/), { target: { value: 'Nice!' } });
    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(screen.getByText('Failed to submit review. Please try again.')).toBeInTheDocument();
    });
  });

  it('calls onClose when Cancel clicked', () => {
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('has would_recommend checkbox defaulting to checked', () => {
    render(<WriteReviewForm campId="camp-1" campName="Surf Camp" onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    const checkbox = screen.getByLabelText('I would recommend this camp to other families');
    expect(checkbox).toBeChecked();
  });
});

describe('ReviewsList', () => {
  it('shows loading state initially', () => {
    mockGetReviews.mockReturnValue(new Promise(() => {}));
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    expect(screen.getByText('Loading reviews...')).toBeInTheDocument();
  });

  it('displays reviews after loading', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Amazing camp experience!')).toBeInTheDocument();
      expect(screen.getByText('It was okay.')).toBeInTheDocument();
    });
  });

  it('shows review count in header', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Reviews (2)')).toBeInTheDocument();
    });
  });

  it('shows reviewer name', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows "Anonymous" when no reviewer name', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });
  });

  it('shows review title when present', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Best Summer Ever')).toBeInTheDocument();
    });
  });

  it('shows "Would recommend" badge', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText(/Would recommend/)).toBeInTheDocument();
    });
  });

  it('shows helpful count', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Helpful (3)')).toBeInTheDocument();
    });
  });

  it('shows "Write a Review" button when user has not reviewed', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Write a Review')).toBeInTheDocument();
    });
  });

  it('hides "Write a Review" button when user has reviewed', async () => {
    mockAuthContext.user = { id: 'user-1' }; // same as review-1's user_id
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.queryByText('Write a Review')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no reviews', async () => {
    mockGetReviews.mockResolvedValue([]);
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument();
      expect(screen.getByText('Be the first to share your experience!')).toBeInTheDocument();
    });
  });

  it('shows "Write the First Review" in empty state when authenticated', async () => {
    mockGetReviews.mockResolvedValue([]);
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Write the First Review')).toBeInTheDocument();
    });
  });

  it('hides write button in empty state when not authenticated', async () => {
    mockAuthContext.user = null;
    mockGetReviews.mockResolvedValue([]);
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.queryByText('Write the First Review')).not.toBeInTheDocument();
    });
  });

  it('shows review form when Write a Review clicked', async () => {
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Write a Review')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Write a Review'));
    expect(screen.getByText('Review Surf Camp')).toBeInTheDocument();
  });

  it('shows reviewer avatar when available', async () => {
    const { container } = render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      // Avatar img has alt="" (decorative), so use querySelector
      const avatarImg = container.querySelector('img[src="https://example.com/avatar.jpg"]');
      expect(avatarImg).toBeInTheDocument();
    });
  });

  it('votes review helpful', async () => {
    mockVoteReviewHelpful.mockResolvedValue();
    render(<ReviewsList campId="camp-1" campName="Surf Camp" />);
    await waitFor(() => {
      expect(screen.getByText('Helpful (3)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Helpful (3)'));
    await waitFor(() => {
      expect(mockVoteReviewHelpful).toHaveBeenCalledWith('review-1');
    });
  });
});

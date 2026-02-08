import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getReviews, getCampRatings, addReview, voteReviewHelpful, removeReviewVote } from '../lib/supabase';
import BrandIcon from './BrandIcon';
import './Reviews.css';

// Helper to pick an avatar color class based on the first letter of the name
function getAvatarClass(name) {
  if (!name) return 'review-avatar-default';
  const letter = name.charAt(0).toUpperCase();
  if (letter <= 'F') return 'review-avatar-a';
  if (letter <= 'L') return 'review-avatar-b';
  if (letter <= 'R') return 'review-avatar-c';
  if (letter <= 'V') return 'review-avatar-d';
  return 'review-avatar-default';
}

// Star Rating Component
function StarRating({ rating, onChange, readonly = false, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const sizeMap = { sm: 16, md: 22, lg: 32 };
  const px = sizeMap[size] || sizeMap.md;

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hover || rating) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            className={`star-rating-btn ${isFilled ? 'star-filled' : 'star-empty'}`}
            aria-label={`Rate ${star} out of 5 stars`}
          >
            <svg
              width={px}
              height={px}
              fill={isFilled ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isFilled ? 0 : 1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// Rating Bar Component (Amazon-style)
function RatingBar({ label, rating, maxRating = 5 }) {
  const percentage = (rating / maxRating) * 100;

  return (
    <div className="reviews-rating-bar">
      <span className="reviews-rating-bar-label">{label}</span>
      <div className="reviews-rating-bar-track">
        <div
          className="reviews-rating-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="reviews-rating-bar-value">{rating?.toFixed(1) || '\u2014'}</span>
    </div>
  );
}

// Reviews Summary Component
export function ReviewsSummary({ campId }) {
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRatings() {
      const data = await getCampRatings(campId);
      setRatings(data);
      setLoading(false);
    }
    loadRatings();
  }, [campId]);

  if (loading || !ratings) {
    return null;
  }

  return (
    <div className="reviews-summary">
      <div className="reviews-summary-header">
        <div className="reviews-summary-score">
          <div className="reviews-summary-score-number">
            {ratings.avg_rating}
          </div>
          <StarRating rating={parseFloat(ratings.avg_rating)} readonly size="sm" />
          <div className="reviews-summary-score-label">
            {ratings.review_count} review{ratings.review_count !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="reviews-summary-bars">
          <RatingBar label="Overall" rating={ratings.avg_rating} />
          <RatingBar label="Value" rating={ratings.avg_value} />
          <RatingBar label="Staff" rating={ratings.avg_staff} />
          <RatingBar label="Activities" rating={ratings.avg_activities} />
          <RatingBar label="Safety" rating={ratings.avg_safety} />
        </div>
      </div>
      <div className="reviews-recommend">
        <span className="reviews-recommend-badge">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {ratings.recommend_percent}% would recommend
        </span>
      </div>
    </div>
  );
}

// Review Card Component
function ReviewCard({ review, onHelpful }) {
  const [voted, setVoted] = useState(false);
  const { user } = useAuth();

  const handleHelpful = async () => {
    if (!user || voted) return;
    try {
      await voteReviewHelpful(review.id);
      setVoted(true);
      onHelpful?.();
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const reviewDate = new Date(review.created_at);
  const dateStr = reviewDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const reviewerName = review.profiles?.full_name || 'Anonymous';
  const avatarClass = getAvatarClass(reviewerName);

  return (
    <div className="review-card">
      {/* Header */}
      <div className="review-card-header">
        <div className="review-card-author">
          <div className={`review-card-avatar ${avatarClass}`}>
            {review.profiles?.avatar_url ? (
              <img
                src={review.profiles.avatar_url}
                alt=""
              />
            ) : (
              <div className="review-card-avatar-initial">
                {reviewerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="review-card-author-info">
            <span className="review-card-author-name">
              {reviewerName}
            </span>
            <span className="review-card-author-meta">
              {dateStr}
              {review.year_attended && ` \u00B7 Attended ${review.year_attended}`}
              {review.child_age_at_time && ` \u00B7 Child age ${review.child_age_at_time}`}
            </span>
          </div>
        </div>
        <StarRating rating={review.overall_rating} readonly size="sm" />
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="review-card-title">
          {review.title}
        </h4>
      )}

      {/* Review text */}
      <p className="review-card-body">
        {review.review_text}
      </p>

      {/* Would recommend */}
      {review.would_recommend && (
        <span className="review-recommend-pill">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Would recommend
        </span>
      )}

      {/* Helpful button */}
      <div className="review-card-footer">
        <button
          onClick={handleHelpful}
          disabled={!user || voted}
          className={`review-helpful-btn ${voted ? 'voted' : ''}`}
        >
          <svg fill={voted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          Helpful ({review.helpful_count})
        </button>
      </div>
    </div>
  );
}

// Write Review Form
export function WriteReviewForm({ campId, campName, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    overall_rating: 0,
    value_rating: 0,
    staff_rating: 0,
    activities_rating: 0,
    safety_rating: 0,
    title: '',
    review_text: '',
    child_age_at_time: '',
    year_attended: new Date().getFullYear() - 1,
    would_recommend: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.overall_rating) {
      setError('Please provide an overall rating');
      return;
    }
    if (!form.review_text.trim()) {
      setError('Please write a review');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await addReview({
        camp_id: campId,
        ...form,
        child_age_at_time: form.child_age_at_time ? parseInt(form.child_age_at_time) : null
      });

      if (submitError) {
        setError(submitError.message);
      } else {
        onSuccess?.();
        onClose?.();
      }
    } catch (err) {
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="reviews-signin">
        <div className="reviews-signin-icon">
          <BrandIcon name="writing" size={28} />
        </div>
        <h3>Sign in to write a review</h3>
        <p>Help other families make decisions</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="review-form-header">
        <h3>Review {campName}</h3>
        <p>Help other families make decisions</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Overall Rating */}
      <div className="review-form-rating-group">
        <label>Overall Rating *</label>
        <StarRating
          rating={form.overall_rating}
          onChange={(rating) => setForm({ ...form, overall_rating: rating })}
          size="lg"
        />
      </div>

      {/* Detailed Ratings */}
      <div className="review-form-ratings-grid">
        {[
          { key: 'value_rating', label: 'Value for Money' },
          { key: 'staff_rating', label: 'Staff Quality' },
          { key: 'activities_rating', label: 'Activities' },
          { key: 'safety_rating', label: 'Safety' }
        ].map(({ key, label }) => (
          <div key={key} className="review-form-rating-group">
            <label>{label}</label>
            <StarRating
              rating={form[key]}
              onChange={(rating) => setForm({ ...form, [key]: rating })}
              size="sm"
            />
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="review-form-field">
        <label>Review Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Sum up your experience in a few words"
          className="review-form-input"
        />
      </div>

      {/* Review Text */}
      <div className="review-form-field">
        <label>Your Review *</label>
        <textarea
          value={form.review_text}
          onChange={(e) => setForm({ ...form, review_text: e.target.value })}
          placeholder="What did you like? What could be improved? Would you recommend this camp?"
          rows={5}
          className="review-form-input review-form-textarea"
        />
      </div>

      {/* Context */}
      <div className="review-form-context-grid">
        <div className="review-form-field">
          <label>Year Attended</label>
          <select
            value={form.year_attended}
            onChange={(e) => setForm({ ...form, year_attended: parseInt(e.target.value) })}
            className="review-form-input"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
        <div className="review-form-field">
          <label>Child's Age at Time</label>
          <select
            value={form.child_age_at_time}
            onChange={(e) => setForm({ ...form, child_age_at_time: e.target.value })}
            className="review-form-input"
          >
            <option value="">Select age</option>
            {[...Array(16)].map((_, i) => (
              <option key={i + 3} value={i + 3}>{i + 3} years old</option>
            ))}
          </select>
        </div>
      </div>

      {/* Would Recommend */}
      <div className="review-form-recommend">
        <input
          type="checkbox"
          id="would_recommend"
          checked={form.would_recommend}
          onChange={(e) => setForm({ ...form, would_recommend: e.target.checked })}
        />
        <label htmlFor="would_recommend">
          I would recommend this camp to other families
        </label>
      </div>

      {/* Actions */}
      <div className="review-form-actions">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}

// Reviews List Component
export function ReviewsList({ campId, campName }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWriteForm, setShowWriteForm] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    const data = await getReviews(campId);
    setReviews(data);
    setLoading(false);
  }, [campId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Escape key closes write review modal
  useEffect(() => {
    if (!showWriteForm) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowWriteForm(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showWriteForm]);

  const userHasReviewed = reviews.some(r => r.user_id === user?.id);

  if (loading) {
    return (
      <div className="text-center py-8" aria-busy="true" aria-live="polite">
        <div className="loader mx-auto mb-4"></div>
        <p style={{ color: 'var(--sand-400)' }}>Loading reviews...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="reviews-list-header">
        <h3 className="heading-md">Reviews ({reviews.length})</h3>
        {user && !userHasReviewed && (
          <button
            onClick={() => setShowWriteForm(true)}
            className="btn-primary"
          >
            <svg className="icon-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Write a Review
          </button>
        )}
      </div>

      {/* Write Review Modal */}
      {showWriteForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Write a review">
          <div className="modal modal-md" style={{ padding: 'var(--space-6)' }}>
            <WriteReviewForm
              campId={campId}
              campName={campName}
              onClose={() => setShowWriteForm(false)}
              onSuccess={loadReviews}
            />
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map(review => (
            <ReviewCard key={review.id} review={review} onHelpful={loadReviews} />
          ))}
        </div>
      ) : (
        <div className="reviews-empty">
          <div className="reviews-empty-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h4>No reviews yet</h4>
          <p>Be the first to share your experience.</p>
          {user && (
            <button
              onClick={() => setShowWriteForm(true)}
              className="btn-primary"
            >
              Write the First Review
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewsList;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getReviews, getCampRatings, addReview, voteReviewHelpful, removeReviewVote } from '../lib/supabase';

// Star Rating Component
function StarRating({ rating, onChange, readonly = false, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-transform hover:scale-110`}
        >
          <svg
            className={sizeClass}
            fill={(hover || rating) >= star ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            style={{ color: (hover || rating) >= star ? 'var(--sun-400)' : 'var(--sand-300)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// Rating Bar Component
function RatingBar({ label, rating, maxRating = 5 }) {
  const percentage = (rating / maxRating) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-20" style={{ color: 'var(--earth-700)' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--sand-100)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, background: 'var(--sun-400)' }}
        />
      </div>
      <span className="text-sm font-medium w-8" style={{ color: 'var(--earth-800)' }}>{rating?.toFixed(1) || '—'}</span>
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
    <div className="p-4 rounded-xl" style={{ background: 'var(--sun-50)', border: '1px solid var(--sun-200)' }}>
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className="text-4xl font-bold" style={{ color: 'var(--earth-800)' }}>
            {ratings.avg_rating}
          </div>
          <StarRating rating={parseFloat(ratings.avg_rating)} readonly size="sm" />
          <div className="text-sm mt-1" style={{ color: 'var(--sand-400)' }}>
            {ratings.review_count} review{ratings.review_count !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <RatingBar label="Overall" rating={ratings.avg_rating} />
          <RatingBar label="Value" rating={ratings.avg_value} />
          <RatingBar label="Staff" rating={ratings.avg_staff} />
          <RatingBar label="Activities" rating={ratings.avg_activities} />
          <RatingBar label="Safety" rating={ratings.avg_safety} />
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 pt-3" style={{ borderTop: '1px solid var(--sun-200)' }}>
        <span className="text-2xl">👍</span>
        <span className="font-medium" style={{ color: 'var(--sage-600)' }}>
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

  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--sand-50)', border: '1px solid var(--sand-200)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {review.profiles?.avatar_url ? (
            <img
              src={review.profiles.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--ocean-100)' }}>
              <span className="text-lg">👤</span>
            </div>
          )}
          <div>
            <p className="font-medium" style={{ color: 'var(--earth-800)' }}>
              {review.profiles?.full_name || 'Anonymous'}
            </p>
            <p className="text-xs" style={{ color: 'var(--sand-400)' }}>
              {dateStr}
              {review.year_attended && ` • Attended ${review.year_attended}`}
              {review.child_age_at_time && ` • Child age ${review.child_age_at_time}`}
            </p>
          </div>
        </div>
        <StarRating rating={review.overall_rating} readonly size="sm" />
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold mb-2" style={{ color: 'var(--earth-800)' }}>
          {review.title}
        </h4>
      )}

      {/* Review text */}
      <p className="text-sm mb-4" style={{ color: 'var(--earth-700)', lineHeight: 1.6 }}>
        {review.review_text}
      </p>

      {/* Would recommend */}
      {review.would_recommend && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm px-3 py-1 rounded-full" style={{ background: 'var(--sage-100)', color: 'var(--sage-600)' }}>
            ✓ Would recommend
          </span>
        </div>
      )}

      {/* Helpful button */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--sand-200)' }}>
        <button
          onClick={handleHelpful}
          disabled={!user || voted}
          className={`flex items-center gap-2 text-sm transition-colors ${
            voted ? 'text-sage-600' : 'text-sand-400 hover:text-ocean-600'
          }`}
          style={{ color: voted ? 'var(--sage-600)' : undefined }}
        >
          <svg className="w-4 h-4" fill={voted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
      <div className="text-center py-8">
        <span className="text-4xl block mb-3">✍️</span>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--earth-800)' }}>
          Sign in to write a review
        </h3>
        <p className="text-sm" style={{ color: 'var(--sand-400)' }}>
          Share your experience to help other families
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="font-serif text-xl font-semibold" style={{ color: 'var(--earth-800)' }}>
          Review {campName}
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--sand-400)' }}>
          Share your experience to help other families
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--terra-100)', color: 'var(--terra-600)' }}>
          {error}
        </div>
      )}

      {/* Overall Rating */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
          Overall Rating *
        </label>
        <StarRating
          rating={form.overall_rating}
          onChange={(rating) => setForm({ ...form, overall_rating: rating })}
          size="lg"
        />
      </div>

      {/* Detailed Ratings */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: 'value_rating', label: 'Value for Money' },
          { key: 'staff_rating', label: 'Staff Quality' },
          { key: 'activities_rating', label: 'Activities' },
          { key: 'safety_rating', label: 'Safety' }
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              {label}
            </label>
            <StarRating
              rating={form[key]}
              onChange={(rating) => setForm({ ...form, [key]: rating })}
              size="sm"
            />
          </div>
        ))}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
          Review Title
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Sum up your experience in a few words"
          className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:ring-2"
          style={{ borderColor: 'var(--sand-200)' }}
        />
      </div>

      {/* Review Text */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
          Your Review *
        </label>
        <textarea
          value={form.review_text}
          onChange={(e) => setForm({ ...form, review_text: e.target.value })}
          placeholder="What did you like? What could be improved? Would you recommend this camp?"
          rows={5}
          className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 resize-none"
          style={{ borderColor: 'var(--sand-200)' }}
        />
      </div>

      {/* Context */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
            Year Attended
          </label>
          <select
            value={form.year_attended}
            onChange={(e) => setForm({ ...form, year_attended: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--sand-200)' }}
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
            Child's Age at Time
          </label>
          <select
            value={form.child_age_at_time}
            onChange={(e) => setForm({ ...form, child_age_at_time: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--sand-200)' }}
          >
            <option value="">Select age</option>
            {[...Array(16)].map((_, i) => (
              <option key={i + 3} value={i + 3}>{i + 3} years old</option>
            ))}
          </select>
        </div>
      </div>

      {/* Would Recommend */}
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--sand-50)' }}>
        <input
          type="checkbox"
          id="would_recommend"
          checked={form.would_recommend}
          onChange={(e) => setForm({ ...form, would_recommend: e.target.checked })}
          className="w-5 h-5 rounded"
        />
        <label htmlFor="would_recommend" className="font-medium" style={{ color: 'var(--earth-800)' }}>
          I would recommend this camp to other families
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
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

  useEffect(() => {
    loadReviews();
  }, [campId]);

  async function loadReviews() {
    setLoading(true);
    const data = await getReviews(campId);
    setReviews(data);
    setLoading(false);
  }

  const userHasReviewed = reviews.some(r => r.user_id === user?.id);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="loader mx-auto mb-4"></div>
        <p style={{ color: 'var(--sand-400)' }}>Loading reviews...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--earth-800)' }}>
          Reviews ({reviews.length})
        </h3>
        {user && !userHasReviewed && (
          <button
            onClick={() => setShowWriteForm(true)}
            className="btn-primary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Write a Review
          </button>
        )}
      </div>

      {/* Write Review Modal */}
      {showWriteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
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
        <div className="text-center py-12 rounded-xl" style={{ background: 'var(--sand-50)' }}>
          <span className="text-4xl block mb-3">📝</span>
          <h4 className="font-medium mb-2" style={{ color: 'var(--earth-800)' }}>
            No reviews yet
          </h4>
          <p className="text-sm mb-4" style={{ color: 'var(--sand-400)' }}>
            Be the first to share your experience!
          </p>
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

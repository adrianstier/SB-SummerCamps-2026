import React, { memo, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FavoriteButton } from './FavoriteButton';
import { formatPriceShort } from '../lib/formatters';
import './RecommendationSection.css';

/**
 * RecommendationCard - A compact card showing a recommended camp with explanation
 */
export const RecommendationCard = memo(function RecommendationCard({
  camp,
  explanation,
  score,
  onSelect,
  onSchedule,
  size = 'normal'  // 'normal', 'compact', 'large'
}) {
  if (!camp) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.();
    }
  };

  return (
    <div
      className={`reco-card reco-card--${size}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View ${camp.camp_name}`}
    >
      {/* Image or color bar */}
      {camp.image_url ? (
        <div className="reco-card-image">
          <img
            src={camp.image_url}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="reco-card-color-bar" data-category={camp.category} />
      )}

      <div className="reco-card-content">
        <div className="reco-card-header">
          <p className="reco-card-category">{camp.category}</p>
          <h4 className="reco-card-name">{camp.camp_name}</h4>
        </div>

        <p className="reco-card-meta">
          {camp.ages || 'All ages'} · {formatPriceShort(camp)}
        </p>

        {/* Why we recommend this */}
        {explanation && (
          <p className="reco-card-explanation">{explanation}</p>
        )}

        <div className="reco-card-actions" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton campId={camp.id} size="sm" />
          {onSchedule && (
            <button
              className="reco-card-schedule-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSchedule(camp);
              }}
              aria-label={`Schedule ${camp.camp_name}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * SimilarCampsSection - Shows camps similar to a given camp
 */
export const SimilarCampsSection = memo(function SimilarCampsSection({
  camp,
  allCamps,
  onSelectCamp,
  limit = 4
}) {
  const { findSimilarCamps } = useAuth();

  const similarCamps = useMemo(() => {
    if (!camp || !allCamps || !findSimilarCamps) return [];
    return findSimilarCamps(camp, allCamps, limit);
  }, [camp, allCamps, findSimilarCamps, limit]);

  if (similarCamps.length === 0) return null;

  return (
    <section className="similar-camps-section">
      <h3 className="similar-camps-title">Camps Like This</h3>
      <div className="similar-camps-grid">
        {similarCamps.map(({ camp: similarCamp, explanation }) => (
          <RecommendationCard
            key={similarCamp.id}
            camp={similarCamp}
            explanation={explanation}
            onSelect={() => onSelectCamp?.(similarCamp)}
            size="compact"
          />
        ))}
      </div>
    </section>
  );
});

/**
 * PersonalizedRecommendations - Shows personalized camp recommendations
 */
export const PersonalizedRecommendations = memo(function PersonalizedRecommendations({
  camps,
  onSelectCamp,
  onScheduleCamp,
  title = 'Recommended for You',
  subtitle = null,
  limit = 6
}) {
  const { getRecommendationScores, profile, children } = useAuth();

  const recommendations = useMemo(() => {
    if (!camps || !getRecommendationScores) return [];
    return getRecommendationScores(camps, limit);
  }, [camps, getRecommendationScores, limit]);

  // Don't show if no user profile or children
  if (!profile || children.length === 0 || recommendations.length === 0) {
    return null;
  }

  const displaySubtitle = subtitle || (
    children.length === 1
      ? `Based on ${children[0].name}'s profile`
      : 'Based on your family'
  );

  return (
    <section className="personalized-reco-section">
      <div className="personalized-reco-header">
        <div>
          <h2 className="personalized-reco-title">{title}</h2>
          {displaySubtitle && (
            <p className="personalized-reco-subtitle">{displaySubtitle}</p>
          )}
        </div>
        <span className="personalized-reco-badge">For You</span>
      </div>

      <div className="personalized-reco-grid">
        {recommendations.map(({ camp, explanation, score }) => (
          <RecommendationCard
            key={camp.id}
            camp={camp}
            explanation={explanation}
            score={score}
            onSelect={() => onSelectCamp?.(camp)}
            onSchedule={onScheduleCamp}
          />
        ))}
      </div>
    </section>
  );
});

/**
 * GapSuggestions - Shows camps to fill schedule gaps
 */
export const GapSuggestions = memo(function GapSuggestions({
  camps,
  onSelectCamp,
  onScheduleCamp
}) {
  const { getGapFillingSuggestions, children } = useAuth();

  const gapSuggestions = useMemo(() => {
    if (!camps || !getGapFillingSuggestions) return {};
    return getGapFillingSuggestions(camps);
  }, [camps, getGapFillingSuggestions]);

  // Check if any child has gaps
  const hasGaps = Object.values(gapSuggestions).some(childGaps =>
    childGaps && childGaps.length > 0
  );

  if (!hasGaps) return null;

  return (
    <section className="gap-suggestions-section">
      <div className="gap-suggestions-header">
        <div>
          <h2 className="gap-suggestions-title">Complete Your Summer</h2>
          <p className="gap-suggestions-subtitle">Fill coverage gaps</p>
        </div>
        <span className="gap-suggestions-icon">📅</span>
      </div>

      {children.map(child => {
        const childGaps = gapSuggestions[child.id] || [];
        if (childGaps.length === 0) return null;

        return (
          <div key={child.id} className="gap-child-section">
            <h4 className="gap-child-name">
              <span
                className="gap-child-dot"
                style={{ background: child.color || 'var(--ocean-400)' }}
              />
              {child.name}'s Gaps
            </h4>

            {childGaps.map(({ week, recommendations }) => (
              <div key={week.weekNum} className="gap-week-section">
                <p className="gap-week-label">
                  Week {week.weekNum}: {week.display}
                </p>
                <div className="gap-week-camps">
                  {recommendations.slice(0, 2).map(({ camp, explanation }) => (
                    <RecommendationCard
                      key={camp.id}
                      camp={camp}
                      explanation={explanation}
                      onSelect={() => onSelectCamp?.(camp)}
                      onSchedule={onScheduleCamp}
                      size="compact"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
});

/**
 * PopularCampsSection - Shows camps popular in the area
 */
export const PopularCampsSection = memo(function PopularCampsSection({
  camps,
  onSelectCamp,
  limit = 6
}) {
  const { getPopularInArea } = useAuth();

  const popularCamps = useMemo(() => {
    if (!camps || !getPopularInArea) return [];
    return getPopularInArea(camps, limit);
  }, [camps, getPopularInArea, limit]);

  if (popularCamps.length === 0) return null;

  return (
    <section className="popular-camps-section">
      <div className="popular-camps-header">
        <div>
          <h2 className="popular-camps-title">Popular in Santa Barbara</h2>
          <p className="popular-camps-subtitle">Local families love these</p>
        </div>
        <span className="popular-camps-icon">⭐</span>
      </div>

      <div className="popular-camps-grid">
        {popularCamps.map(({ camp, explanation }) => (
          <RecommendationCard
            key={camp.id}
            camp={camp}
            explanation={explanation}
            onSelect={() => onSelectCamp?.(camp)}
            size="normal"
          />
        ))}
      </div>
    </section>
  );
});

export default {
  RecommendationCard,
  SimilarCampsSection,
  PersonalizedRecommendations,
  GapSuggestions,
  PopularCampsSection
};

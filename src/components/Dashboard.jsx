import React, { useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useSchedule } from '../contexts/ScheduleContext';
import { useRecommendations } from '../hooks/useRecommendations';
import { useAchievements } from '../contexts/AchievementsContext';
import { FavoriteButton } from './FavoriteButton';
import { ProgressTracker } from './ProgressTracker';
import { AchievementBadges } from './AchievementBadges';
import { getSummerWeeks2026 } from '../lib/supabase';
import { formatPriceShort } from '../lib/formatters';
import { GapSuggestions } from './RecommendationSection';
import './Dashboard.css';

// Map camp categories to a dot color for the timeline
const CATEGORY_DOT_COLORS = {
  'Beach/Surf': '#0891b2',
  'Theater': '#9333ea',
  'Dance': '#db2777',
  'Art': '#d97706',
  'Science/STEM': '#2563eb',
  'Nature/Outdoor': '#16a34a',
  'Sports': '#ea580c',
  'Music': '#4f46e5',
  'Cooking': '#dc2626',
  'Faith-Based': '#7c3aed',
  'Animals/Zoo': '#65a30d',
  'Multi-Activity': '#475569',
  'Education': '#0d9488',
  'Overnight': '#e11d48',
};

export function Dashboard({ camps, onClose, onOpenPlanner, onSelectCamp }) {
  const { profile, children } = useAuth();
  const { favorites } = useFavorites();
  const { scheduledCamps, getCoverageGaps } = useSchedule();
  const { getRecommendationScores, getDashboardStats } = useRecommendations();

  const stats = getDashboardStats();
  const summerWeeks = getSummerWeeks2026();

  // Get recommended camps
  const recommendations = useMemo(() => {
    return getRecommendationScores(camps).slice(0, 4);
  }, [camps, getRecommendationScores]);

  // Get upcoming scheduled camps (only future camps)
  const upcomingCamps = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare by date only

    return scheduledCamps
      .filter(sc => sc.status !== 'cancelled' && new Date(sc.start_date) >= now)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 3)
      .map(sc => ({
        ...sc,
        camp: camps.find(c => c.id === sc.camp_id),
        child: children.find(c => c.id === sc.child_id)
      }));
  }, [scheduledCamps, camps, children]);

  // Get coverage gaps for each child
  const totalGaps = useMemo(() => {
    return children.reduce((sum, child) => {
      return sum + getCoverageGaps(child.id, summerWeeks).length;
    }, 0);
  }, [children, summerWeeks, getCoverageGaps]);

  // Count total weeks planned across all children
  const weeksPlanned = useMemo(() => {
    return scheduledCamps.filter(sc => sc.status !== 'cancelled').length;
  }, [scheduledCamps]);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Build a motivational hero stat line
  const heroStatText = useMemo(() => {
    if (weeksPlanned > 0 && totalGaps === 0) {
      return 'Summer is fully covered. Nice work.';
    }
    if (weeksPlanned > 0) {
      return `${weeksPlanned} week${weeksPlanned === 1 ? '' : 's'} planned so far`;
    }
    if (children.length > 0) {
      return 'Your summer calendar is ready to fill';
    }
    return 'Plan your summer in minutes';
  }, [weeksPlanned, totalGaps, children.length]);

  // Escape key handler
  const handleEscapeKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  return (
    <div className="dashboard-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Dashboard">
      <div className="dashboard-modal" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className="dashboard-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header - Gradient welcome hero */}
        <header className="dashboard-header dash-animate dash-delay-1">
          <div className="dashboard-greeting">
            <p className="dashboard-welcome">Welcome back,</p>
            <h1 className="dashboard-name">{firstName}</h1>
            <div className="dashboard-hero-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {weeksPlanned > 0 && totalGaps === 0 ? (
                  <path d="M20 6L9 17l-5-5" />
                ) : (
                  <>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </>
                )}
              </svg>
              {heroStatText}
            </div>
          </div>

          {/* Stats cards row */}
          <div className="dashboard-stats-row">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-stat-icon--children" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="dashboard-stat-text">
                <span className="dashboard-stat-number">{stats.childrenCount}</span>
                <span className="dashboard-stat-label">{stats.childrenCount === 1 ? 'Child' : 'Children'}</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-stat-icon--camps" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="dashboard-stat-text">
                <span className="dashboard-stat-number">{stats.totalScheduled}</span>
                <span className="dashboard-stat-label">Camps</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-stat-icon--cost" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="dashboard-stat-text">
                <span className="dashboard-stat-number">${stats.totalCost.toLocaleString()}</span>
                <span className="dashboard-stat-label">Total</span>
              </div>
            </div>

            {totalGaps > 0 && (
              <div className="dashboard-stat-card dashboard-stat-card--alert">
                <div className="dashboard-stat-icon dashboard-stat-icon--gaps" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="dashboard-stat-text">
                  <span className="dashboard-stat-number">{totalGaps}</span>
                  <span className="dashboard-stat-label">{totalGaps === 1 ? 'Gap' : 'Gaps'}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <div className="dashboard-content">
          {/* Two column layout */}
          <div className="dashboard-grid">
            {/* Left column - Schedule */}
            <section className="dashboard-section dash-animate dash-delay-2">
              <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">Your Schedule</h2>
                <span className="dashboard-section-line" />
                <button onClick={onOpenPlanner} className="dashboard-section-link">
                  View all
                </button>
              </div>

              {upcomingCamps.length > 0 ? (
                <div className="dashboard-schedule-timeline">
                  {upcomingCamps.map(sc => (
                    <TimelineCard key={sc.id} scheduled={sc} />
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <div className="dashboard-empty-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                      <path d="M12 14v4M10 16h4" />
                    </svg>
                  </div>
                  <p className="dashboard-empty-text">No camps scheduled yet</p>
                  <p className="dashboard-empty-subtext">Drag camps onto your calendar to get started</p>
                  <button onClick={onOpenPlanner} className="dashboard-empty-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Start planning
                  </button>
                </div>
              )}
            </section>

            {/* Right column - Recommendations */}
            <section className="dashboard-section dash-animate dash-delay-3">
              <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">Recommended</h2>
                <span className="dashboard-section-line" />
                <span className="dashboard-section-badge">For you</span>
              </div>

              {recommendations.length > 0 ? (
                <div className="dashboard-reco-list">
                  {recommendations.map(({ camp, score, explanation }) => (
                    <RecoCard
                      key={camp.id}
                      camp={camp}
                      score={score}
                      explanation={explanation}
                      onSelect={() => onSelectCamp?.(camp)}
                    />
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <div className="dashboard-empty-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <p className="dashboard-empty-text">No recommendations yet</p>
                  <p className="dashboard-empty-subtext">Add preferences for personalized picks</p>
                </div>
              )}
            </section>
          </div>

          {/* Progress & Achievements Section */}
          <section className="dashboard-section dashboard-gamification dash-animate dash-delay-4">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Your Progress</h2>
              <span className="dashboard-section-line" />
            </div>
            <ProgressTracker variant="default" showMilestones={true} />
            <div className="dashboard-achievements-preview">
              <AchievementBadges variant="compact" maxVisible={8} />
            </div>
          </section>

          {/* Gap Suggestions - Only show if there are gaps */}
          {totalGaps > 0 && (
            <div className="dash-animate dash-delay-5">
              <GapSuggestions
                camps={camps}
                onSelectCamp={onSelectCamp}
                onScheduleCamp={(camp) => {
                  onOpenPlanner?.();
                }}
              />
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <footer className="dashboard-footer">
          <button onClick={onOpenPlanner} className="dashboard-cta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Plan My Summer
          </button>
        </footer>
      </div>
    </div>
  );
}

// Timeline Card Component - visual timeline with category-colored dots
function TimelineCard({ scheduled }) {
  const startDate = new Date(scheduled.start_date);
  const day = startDate.getDate();
  const month = startDate.toLocaleDateString('en-US', { month: 'short' });
  const dotColor = CATEGORY_DOT_COLORS[scheduled.camp?.category] || '#a69578';

  return (
    <div className="timeline-item">
      <span
        className="timeline-dot"
        style={{ '--dot-color': dotColor }}
      />
      <div className="timeline-card">
        <div className="schedule-card-date">
          <div className="schedule-card-day">{day}</div>
          <div className="schedule-card-month">{month}</div>
        </div>
        <div className="schedule-card-info">
          <p className="schedule-card-name">{scheduled.camp?.camp_name || 'Camp'}</p>
          <p className="schedule-card-child">{scheduled.child?.name || 'Child'}</p>
        </div>
        <span className={`schedule-card-status ${scheduled.status}`}>
          {scheduled.status}
        </span>
      </div>
    </div>
  );
}

// Recommendation Card Component
function RecoCard({ camp, score, explanation, onSelect }) {
  return (
    <div className="reco-card" onClick={onSelect}>
      <div className="reco-card-info">
        <p className="reco-card-name">{camp.camp_name}</p>
        <p className="reco-card-meta">
          {camp.category} · {formatPriceShort(camp)}
        </p>
        {explanation && (
          <p className="reco-card-reason">{explanation}</p>
        )}
      </div>
      <div className="reco-card-fav" onClick={e => e.stopPropagation()}>
        <FavoriteButton campId={camp.id} size="sm" />
      </div>
    </div>
  );
}

export default Dashboard;

import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FavoriteButton } from './FavoriteButton';
import { getSummerWeeks2026 } from '../lib/supabase';
import { formatPriceShort } from '../lib/formatters';
import './Dashboard.css';

export function Dashboard({ camps, onClose, onOpenPlanner, onSelectCamp }) {
  const {
    profile,
    children,
    favorites,
    scheduledCamps,
    getRecommendationScores,
    getDashboardStats,
    getCoverageGaps
  } = useAuth();

  const stats = getDashboardStats();
  const summerWeeks = getSummerWeeks2026();

  // Get recommended camps
  const recommendations = useMemo(() => {
    return getRecommendationScores(camps).slice(0, 4);
  }, [camps, getRecommendationScores]);

  // Get upcoming scheduled camps
  const upcomingCamps = useMemo(() => {
    return scheduledCamps
      .filter(sc => sc.status !== 'cancelled')
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

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="dashboard-overlay" onClick={onClose}>
      <div className="dashboard-modal" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className="dashboard-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header - Clean and minimal */}
        <header className="dashboard-header">
          <div className="dashboard-greeting">
            <p className="dashboard-welcome">Welcome back,</p>
            <h1 className="dashboard-name">{firstName}</h1>
          </div>

          {/* Compact stats row */}
          <div className="dashboard-stats-row">
            <div className="dashboard-stat-item">
              <span className="dashboard-stat-number">{stats.childrenCount}</span>
              <span className="dashboard-stat-label">{stats.childrenCount === 1 ? 'child' : 'children'}</span>
            </div>
            <div className="dashboard-stat-divider" />
            <div className="dashboard-stat-item">
              <span className="dashboard-stat-number">{stats.totalScheduled}</span>
              <span className="dashboard-stat-label">camps</span>
            </div>
            <div className="dashboard-stat-divider" />
            <div className="dashboard-stat-item">
              <span className="dashboard-stat-number">${stats.totalCost.toLocaleString()}</span>
              <span className="dashboard-stat-label">total</span>
            </div>
            {totalGaps > 0 && (
              <>
                <div className="dashboard-stat-divider" />
                <div className="dashboard-stat-item dashboard-stat-alert">
                  <span className="dashboard-stat-number">{totalGaps}</span>
                  <span className="dashboard-stat-label">{totalGaps === 1 ? 'gap' : 'gaps'}</span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Main content */}
        <div className="dashboard-content">
          {/* Two column layout */}
          <div className="dashboard-grid">
            {/* Left column - Schedule */}
            <section className="dashboard-section">
              <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">Your Schedule</h2>
                <button onClick={onOpenPlanner} className="dashboard-section-link">
                  View all
                </button>
              </div>

              {upcomingCamps.length > 0 ? (
                <div className="dashboard-schedule-list">
                  {upcomingCamps.map(sc => (
                    <ScheduleCard key={sc.id} scheduled={sc} />
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <p className="dashboard-empty-text">No camps scheduled yet</p>
                  <button onClick={onOpenPlanner} className="dashboard-empty-btn">
                    Start planning
                  </button>
                </div>
              )}
            </section>

            {/* Right column - Recommendations */}
            <section className="dashboard-section">
              <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">Recommended</h2>
                <span className="dashboard-section-badge">For you</span>
              </div>

              {recommendations.length > 0 ? (
                <div className="dashboard-reco-list">
                  {recommendations.map(({ camp, score }) => (
                    <RecoCard
                      key={camp.id}
                      camp={camp}
                      score={score}
                      onSelect={() => onSelectCamp?.(camp)}
                    />
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <p className="dashboard-empty-text">Add preferences for personalized picks</p>
                </div>
              )}
            </section>
          </div>
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

        {/* Styles are in Dashboard.css */}
      </div>
    </div>
  );
}

// Schedule Card Component
function ScheduleCard({ scheduled }) {
  const startDate = new Date(scheduled.start_date);
  const day = startDate.getDate();
  const month = startDate.toLocaleDateString('en-US', { month: 'short' });

  return (
    <div className="schedule-card">
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
  );
}

// Recommendation Card Component
function RecoCard({ camp, score, onSelect }) {
  return (
    <div className="reco-card" onClick={onSelect}>
      <div className="reco-card-info">
        <p className="reco-card-name">{camp.camp_name}</p>
        <p className="reco-card-meta">
          {camp.category} · {formatPriceShort(camp)}
        </p>
      </div>
      <div className="reco-card-fav" onClick={e => e.stopPropagation()}>
        <FavoriteButton campId={camp.id} size="sm" />
      </div>
    </div>
  );
}

export default Dashboard;

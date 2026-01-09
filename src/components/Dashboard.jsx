import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FavoriteButton } from './FavoriteButton';
import { getSummerWeeks2026 } from '../lib/supabase';

// Format price for display
function formatPrice(camp) {
  const minPrice = camp.price_min || camp.min_price;
  const maxPrice = camp.price_max || camp.max_price;

  if (!minPrice || minPrice === '0' || minPrice === 0) {
    if (camp.price_week && /free/i.test(camp.price_week)) return 'Free';
    if (camp.price_week && camp.price_week !== '$TBD') return camp.price_week;
    return 'TBD';
  }

  const min = parseInt(minPrice);
  const max = parseInt(maxPrice);

  if (isNaN(min)) return camp.price_week || 'TBD';
  if (min === max || isNaN(max)) return `$${min}`;
  return `$${min}–${max}`;
}

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
                  <p className="dashboard-empty-text">Add preferences to get personalized suggestions</p>
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

        {/* Inline styles */}
        <style>{`
          .dashboard-overlay {
            position: fixed;
            inset: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: rgba(31, 26, 22, 0.6);
            backdrop-filter: blur(8px);
          }

          .dashboard-modal {
            position: relative;
            width: 100%;
            max-width: 800px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            background: #fff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 24px 48px -12px rgba(31, 26, 22, 0.25);
          }

          .dashboard-close {
            position: absolute;
            top: 1.25rem;
            right: 1.25rem;
            z-index: 10;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--sand-100);
            border: none;
            border-radius: 50%;
            color: var(--earth-600);
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .dashboard-close:hover {
            background: var(--sand-200);
            color: var(--earth-800);
          }

          /* Header */
          .dashboard-header {
            padding: 2rem 2rem 1.5rem;
            background: var(--sand-50);
            border-bottom: 1px solid var(--sand-200);
          }

          .dashboard-greeting {
            margin-bottom: 1.25rem;
          }

          .dashboard-welcome {
            font-family: 'Outfit', sans-serif;
            font-size: 0.8125rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--sand-500);
            margin: 0 0 0.25rem;
          }

          .dashboard-name {
            font-family: 'Fraunces', Georgia, serif;
            font-size: 2rem;
            font-weight: 600;
            color: var(--earth-800);
            margin: 0;
            line-height: 1.1;
          }

          /* Stats row */
          .dashboard-stats-row {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .dashboard-stat-item {
            display: flex;
            align-items: baseline;
            gap: 0.375rem;
          }

          .dashboard-stat-number {
            font-family: 'Fraunces', Georgia, serif;
            font-size: 1.375rem;
            font-weight: 600;
            color: var(--earth-800);
          }

          .dashboard-stat-label {
            font-family: 'Outfit', sans-serif;
            font-size: 0.8125rem;
            color: var(--sand-500);
          }

          .dashboard-stat-divider {
            width: 1px;
            height: 24px;
            background: var(--sand-300);
          }

          .dashboard-stat-alert .dashboard-stat-number {
            color: var(--sun-600);
          }

          .dashboard-stat-alert .dashboard-stat-label {
            color: var(--sun-600);
          }

          /* Content */
          .dashboard-content {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem 2rem;
          }

          .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }

          @media (max-width: 640px) {
            .dashboard-grid {
              grid-template-columns: 1fr;
              gap: 1.5rem;
            }
          }

          /* Section */
          .dashboard-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          }

          .dashboard-section-title {
            font-family: 'Outfit', sans-serif;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--sand-500);
            margin: 0;
          }

          .dashboard-section-link {
            font-family: 'Outfit', sans-serif;
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--ocean-600);
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
          }

          .dashboard-section-link:hover {
            text-decoration: underline;
          }

          .dashboard-section-badge {
            font-family: 'Outfit', sans-serif;
            font-size: 0.6875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--sage-600);
            background: var(--sage-100);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
          }

          /* Schedule cards */
          .dashboard-schedule-list {
            display: flex;
            flex-direction: column;
            gap: 0.625rem;
          }

          .schedule-card {
            display: flex;
            align-items: center;
            gap: 0.875rem;
            padding: 0.875rem;
            background: white;
            border: 1px solid var(--sand-200);
            border-radius: 12px;
            transition: all 0.15s ease;
          }

          .schedule-card:hover {
            border-color: var(--sand-300);
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }

          .schedule-card-date {
            text-align: center;
            min-width: 44px;
          }

          .schedule-card-day {
            font-family: 'Fraunces', Georgia, serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--earth-800);
            line-height: 1;
          }

          .schedule-card-month {
            font-family: 'Outfit', sans-serif;
            font-size: 0.6875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--sand-400);
          }

          .schedule-card-info {
            flex: 1;
            min-width: 0;
          }

          .schedule-card-name {
            font-family: 'Outfit', sans-serif;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--earth-800);
            margin: 0 0 0.125rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .schedule-card-child {
            font-family: 'Outfit', sans-serif;
            font-size: 0.75rem;
            color: var(--sand-500);
          }

          .schedule-card-status {
            font-family: 'Outfit', sans-serif;
            font-size: 0.6875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
          }

          .schedule-card-status.planned {
            background: var(--sun-100);
            color: var(--sun-700);
          }

          .schedule-card-status.confirmed {
            background: var(--sage-100);
            color: var(--sage-700);
          }

          /* Recommendation cards */
          .dashboard-reco-list {
            display: flex;
            flex-direction: column;
            gap: 0.625rem;
          }

          .reco-card {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.875rem;
            background: white;
            border: 1px solid var(--sand-200);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .reco-card:hover {
            border-color: var(--ocean-300);
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }

          .reco-card-info {
            flex: 1;
            min-width: 0;
          }

          .reco-card-name {
            font-family: 'Outfit', sans-serif;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--earth-800);
            margin: 0 0 0.25rem;
            line-height: 1.3;
          }

          .reco-card-meta {
            font-family: 'Outfit', sans-serif;
            font-size: 0.75rem;
            color: var(--sand-500);
          }

          .reco-card-fav {
            flex-shrink: 0;
            margin-top: 0.125rem;
          }

          /* Empty state */
          .dashboard-empty {
            padding: 1.5rem 1rem;
            text-align: center;
            background: var(--sand-50);
            border-radius: 12px;
          }

          .dashboard-empty-text {
            font-family: 'Outfit', sans-serif;
            font-size: 0.875rem;
            color: var(--sand-500);
            margin: 0;
          }

          .dashboard-empty-btn {
            font-family: 'Outfit', sans-serif;
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--ocean-600);
            background: none;
            border: none;
            cursor: pointer;
            margin-top: 0.75rem;
            padding: 0;
          }

          .dashboard-empty-btn:hover {
            text-decoration: underline;
          }

          /* Footer */
          .dashboard-footer {
            padding: 1rem 2rem 1.5rem;
            display: flex;
            justify-content: center;
          }

          .dashboard-cta {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.75rem;
            font-family: 'Outfit', sans-serif;
            font-size: 0.9375rem;
            font-weight: 600;
            color: #fff;
            background: var(--terra-500);
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px -2px rgba(232, 90, 53, 0.4);
          }

          .dashboard-cta:hover {
            background: var(--terra-600);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px -2px rgba(232, 90, 53, 0.5);
          }

          /* Mobile adjustments */
          @media (max-width: 640px) {
            .dashboard-modal {
              max-height: 95vh;
              border-radius: 20px 20px 0 0;
            }

            .dashboard-header {
              padding: 1.5rem 1.25rem 1.25rem;
            }

            .dashboard-name {
              font-size: 1.625rem;
            }

            .dashboard-stats-row {
              gap: 0.75rem;
            }

            .dashboard-stat-number {
              font-size: 1.125rem;
            }

            .dashboard-content {
              padding: 1.25rem;
            }

            .dashboard-footer {
              padding: 1rem 1.25rem 1.25rem;
            }
          }
        `}</style>
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
          {camp.category} · {formatPrice(camp)}
        </p>
      </div>
      <div className="reco-card-fav" onClick={e => e.stopPropagation()}>
        <FavoriteButton campId={camp.id} size="sm" />
      </div>
    </div>
  );
}

export default Dashboard;

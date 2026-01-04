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
    return getRecommendationScores(camps).slice(0, 6);
  }, [camps, getRecommendationScores]);

  // Get favorite camps with details
  const favoriteCamps = useMemo(() => {
    return favorites
      .map(f => ({
        ...f,
        camp: camps.find(c => c.id === f.camp_id)
      }))
      .filter(f => f.camp)
      .slice(0, 4);
  }, [favorites, camps]);

  // Get upcoming scheduled camps
  const upcomingCamps = useMemo(() => {
    return scheduledCamps
      .filter(sc => sc.status !== 'cancelled')
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 4)
      .map(sc => ({
        ...sc,
        camp: camps.find(c => c.id === sc.camp_id)
      }));
  }, [scheduledCamps, camps]);

  // Get coverage gaps for each child
  const childCoverageGaps = useMemo(() => {
    return children.map(child => ({
      child,
      gaps: getCoverageGaps(child.id, summerWeeks)
    }));
  }, [children, summerWeeks, getCoverageGaps]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6" style={{ background: 'linear-gradient(135deg, var(--ocean-500) 0%, var(--ocean-600) 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-14 h-14 rounded-full border-2 border-white/30"
                />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  👋
                </div>
              )}
              <div>
                <h2 className="text-white text-xl font-semibold">
                  {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}!` : 'Your Dashboard'}
                </h2>
                <p className="text-white/80 text-sm">
                  Plan your family's perfect summer
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <StatCard icon="👨‍👩‍👧‍👦" value={stats.childrenCount} label="Children" />
            <StatCard icon="📅" value={stats.totalScheduled} label="Camps Planned" />
            <StatCard icon="❤️" value={stats.favoritesCount} label="Favorites" />
            <StatCard
              icon="💰"
              value={stats.totalCost > 0 ? `$${stats.totalCost.toLocaleString()}` : '$0'}
              label="Est. Total"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recommendations */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--earth-800)' }}>
                  Recommended for You
                </h3>
                {recommendations.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--ocean-100)', color: 'var(--ocean-600)' }}>
                    Based on your preferences
                  </span>
                )}
              </div>

              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map(({ camp, score }) => (
                    <RecommendedCampCard
                      key={camp.id}
                      camp={camp}
                      score={score}
                      onSelect={() => onSelectCamp?.(camp)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="🔍"
                  title="No recommendations yet"
                  description="Complete your profile and add preferences to get personalized camp suggestions."
                />
              )}
            </section>

            {/* Upcoming Schedule */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--earth-800)' }}>
                  Upcoming Schedule
                </h3>
                <button
                  onClick={onOpenPlanner}
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--ocean-600)' }}
                >
                  View Full Schedule
                </button>
              </div>

              {upcomingCamps.length > 0 ? (
                <div className="space-y-3">
                  {upcomingCamps.map(sc => (
                    <ScheduledCampCard key={sc.id} scheduled={sc} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="📅"
                  title="No camps scheduled"
                  description="Start planning your summer by adding camps to your schedule."
                  action={
                    <button onClick={onOpenPlanner} className="btn-primary mt-4">
                      Open Planner
                    </button>
                  }
                />
              )}
            </section>

            {/* Coverage Gaps */}
            {childCoverageGaps.length > 0 && childCoverageGaps.some(c => c.gaps.length > 0) && (
              <section className="lg:col-span-2">
                <h3 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
                  Coverage Gaps
                </h3>
                <div className="p-4 rounded-xl" style={{ background: 'var(--sun-50)', border: '1px solid var(--sun-200)' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-medium mb-2" style={{ color: 'var(--earth-800)' }}>
                        Some weeks need coverage
                      </p>
                      <div className="space-y-2">
                        {childCoverageGaps.filter(c => c.gaps.length > 0).map(({ child, gaps }) => (
                          <div key={child.id} className="text-sm" style={{ color: 'var(--earth-700)' }}>
                            <span className="font-medium">{child.name}:</span>{' '}
                            {gaps.length} week{gaps.length !== 1 ? 's' : ''} without camps
                            <span className="text-xs ml-2" style={{ color: 'var(--sand-400)' }}>
                              ({gaps.map(g => g.label).join(', ')})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Favorites */}
            <section className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--earth-800)' }}>
                  Your Favorites
                </h3>
                {favoriteCamps.length > 4 && (
                  <button className="text-sm font-medium hover:underline" style={{ color: 'var(--ocean-600)' }}>
                    View All ({favorites.length})
                  </button>
                )}
              </div>

              {favoriteCamps.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {favoriteCamps.map(({ camp }) => (
                    <FavoriteCampCard
                      key={camp.id}
                      camp={camp}
                      onSelect={() => onSelectCamp?.(camp)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="❤️"
                  title="No favorites yet"
                  description="Browse camps and click the heart icon to save them here."
                />
              )}
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--sand-200)' }}>
          <button onClick={onOpenPlanner} className="btn-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Plan My Summer</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, value, label }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-white text-xl font-bold">{value}</p>
          <p className="text-white/70 text-xs">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Recommended Camp Card
function RecommendedCampCard({ camp, score, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
      style={{ background: 'var(--sand-50)', border: '1px solid var(--sand-200)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium truncate" style={{ color: 'var(--earth-800)' }}>
            {camp.camp_name}
          </h4>
          <div
            className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background: score >= 50 ? 'var(--sage-100)' : score >= 30 ? 'var(--ocean-100)' : 'var(--sand-100)',
              color: score >= 50 ? 'var(--sage-600)' : score >= 30 ? 'var(--ocean-600)' : 'var(--sand-500)'
            }}
          >
            {score >= 50 ? 'Great Match' : score >= 30 ? 'Good Match' : 'Match'}
          </div>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--sand-400)' }}>
          {camp.category} • {camp.ages} • {formatPrice(camp)}
        </p>
        <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--earth-600)' }}>
          {camp.description?.substring(0, 100)}...
        </p>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <FavoriteButton campId={camp.id} size="sm" />
      </div>
    </div>
  );
}

// Scheduled Camp Card
function ScheduledCampCard({ scheduled }) {
  const startDate = new Date(scheduled.start_date);
  const endDate = new Date(scheduled.end_date);
  const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl"
      style={{ background: 'var(--sand-50)', border: '1px solid var(--sand-200)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
        style={{ background: scheduled.children?.color || 'var(--ocean-500)', color: 'white' }}
      >
        {startDate.getDate()}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate" style={{ color: 'var(--earth-800)' }}>
          {scheduled.camp?.camp_name || scheduled.camp_id}
        </h4>
        <p className="text-sm" style={{ color: 'var(--sand-400)' }}>
          {scheduled.children?.name} • {dateRange}
        </p>
      </div>
      <span
        className="px-2 py-1 rounded-full text-xs font-medium capitalize"
        style={{
          background: scheduled.status === 'confirmed' ? 'var(--sage-100)' : 'var(--sun-100)',
          color: scheduled.status === 'confirmed' ? 'var(--sage-600)' : 'var(--sun-600)'
        }}
      >
        {scheduled.status}
      </span>
    </div>
  );
}

// Favorite Camp Card
function FavoriteCampCard({ camp, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
      style={{ background: 'var(--sand-50)', border: '1px solid var(--sand-200)' }}
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate" style={{ color: 'var(--earth-800)' }}>
          {camp.camp_name}
        </h4>
        <p className="text-sm" style={{ color: 'var(--sand-400)' }}>
          {camp.category} • {formatPrice(camp)}
        </p>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <FavoriteButton campId={camp.id} size="sm" />
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-8 px-4 rounded-xl" style={{ background: 'var(--sand-50)' }}>
      <span className="text-4xl block mb-3">{icon}</span>
      <h4 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>{title}</h4>
      <p className="text-sm" style={{ color: 'var(--sand-400)' }}>{description}</p>
      {action}
    </div>
  );
}

export default Dashboard;

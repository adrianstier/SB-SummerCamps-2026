import React, { memo, useState, useMemo } from 'react';
import { useAchievements, ACHIEVEMENTS } from '../contexts/AchievementsContext';
import './AchievementBadges.css';

// Category display names
const CATEGORY_LABELS = {
  milestone: 'Milestones',
  planning: 'Planning',
  timing: 'Timing',
  engagement: 'Engagement',
  streak: 'Streaks',
  social: 'Social'
};

export const AchievementBadges = memo(function AchievementBadges({
  variant = 'grid', // 'grid', 'compact', 'inline'
  showLocked = true,
  maxVisible = null,
  className = ''
}) {
  const { achievements, earnedAchievements, achievementProgress } = useAchievements();
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [filter, setFilter] = useState('all');

  // Convert achievements object to array and sort
  const achievementList = useMemo(() => {
    return Object.values(achievements).sort((a, b) => {
      // Earned first
      const aEarned = earnedAchievements.includes(a.id);
      const bEarned = earnedAchievements.includes(b.id);
      if (aEarned !== bEarned) return bEarned ? 1 : -1;
      // Then by category
      return a.category.localeCompare(b.category);
    });
  }, [achievements, earnedAchievements]);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    let list = achievementList;

    if (!showLocked) {
      list = list.filter(a => earnedAchievements.includes(a.id));
    }

    if (filter !== 'all') {
      list = list.filter(a => a.category === filter);
    }

    if (maxVisible) {
      list = list.slice(0, maxVisible);
    }

    return list;
  }, [achievementList, showLocked, filter, maxVisible, earnedAchievements]);

  // Group by category for grid view
  const groupedAchievements = useMemo(() => {
    const groups = {};
    filteredAchievements.forEach(a => {
      if (!groups[a.category]) {
        groups[a.category] = [];
      }
      groups[a.category].push(a);
    });
    return groups;
  }, [filteredAchievements]);

  if (variant === 'inline') {
    // Simple inline display of earned badges
    const earned = achievementList.filter(a => earnedAchievements.includes(a.id));

    return (
      <div className={`achievement-badges-inline ${className}`}>
        {earned.slice(0, 5).map(achievement => (
          <span
            key={achievement.id}
            className="achievement-inline-badge"
            title={achievement.title}
          >
            {achievement.icon}
          </span>
        ))}
        {earned.length > 5 && (
          <span className="achievement-inline-more">+{earned.length - 5}</span>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`achievement-badges-compact ${className}`}>
        <div className="achievement-compact-header">
          <span className="achievement-compact-title">Badges</span>
          <span className="achievement-compact-count">
            {achievementProgress.earned}/{achievementProgress.total}
          </span>
        </div>
        <div className="achievement-compact-list">
          {filteredAchievements.map(achievement => {
            const isEarned = earnedAchievements.includes(achievement.id);
            return (
              <button
                key={achievement.id}
                className={`achievement-compact-badge ${isEarned ? 'earned' : 'locked'} ${achievement.isLegendary ? 'legendary' : ''}`}
                onClick={() => setSelectedAchievement(achievement)}
                title={isEarned ? achievement.title : 'Locked'}
              >
                <span className="achievement-compact-icon">
                  {isEarned ? achievement.icon : '🔒'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className={`achievement-badges ${className}`}>
      {/* Header */}
      <div className="achievement-header">
        <div className="achievement-header-left">
          <h3 className="achievement-title">Achievements</h3>
          <span className="achievement-count">
            {achievementProgress.earned} of {achievementProgress.total} unlocked
          </span>
        </div>

        {/* Filter tabs */}
        <div className="achievement-filters">
          <button
            className={`achievement-filter ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {Object.keys(CATEGORY_LABELS).map(cat => (
            <button
              key={cat}
              className={`achievement-filter ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="achievement-progress">
        <div className="achievement-progress-bar">
          <div
            className="achievement-progress-fill"
            style={{ width: `${achievementProgress.percent}%` }}
          />
        </div>
        <span className="achievement-progress-text">
          {achievementProgress.percent}% Complete
        </span>
      </div>

      {/* Grouped badges */}
      {filter === 'all' ? (
        Object.entries(groupedAchievements).map(([category, badges]) => (
          <div key={category} className="achievement-group">
            <h4 className="achievement-group-title">{CATEGORY_LABELS[category]}</h4>
            <div className="achievement-grid">
              {badges.map(achievement => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  isEarned={earnedAchievements.includes(achievement.id)}
                  onClick={() => setSelectedAchievement(achievement)}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="achievement-grid">
          {filteredAchievements.map(achievement => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              isEarned={earnedAchievements.includes(achievement.id)}
              onClick={() => setSelectedAchievement(achievement)}
            />
          ))}
        </div>
      )}

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          isEarned={earnedAchievements.includes(selectedAchievement.id)}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </div>
  );
});

// Individual achievement card
const AchievementCard = memo(function AchievementCard({ achievement, isEarned, onClick }) {
  return (
    <button
      className={`achievement-card ${isEarned ? 'earned' : 'locked'} ${achievement.isLegendary ? 'legendary' : ''}`}
      onClick={onClick}
    >
      <div className="achievement-card-icon">
        {isEarned ? achievement.icon : '🔒'}
      </div>
      <div className="achievement-card-content">
        <span className="achievement-card-title">
          {isEarned ? achievement.title : '???'}
        </span>
        <span className="achievement-card-desc">
          {isEarned ? achievement.description : 'Keep planning to unlock'}
        </span>
      </div>
      {isEarned && achievement.isLegendary && (
        <div className="achievement-card-legendary">
          <span>Legendary</span>
        </div>
      )}
    </button>
  );
});

// Achievement detail modal
const AchievementModal = memo(function AchievementModal({ achievement, isEarned, onClose }) {
  return (
    <div className="achievement-modal-overlay" onClick={onClose}>
      <div
        className={`achievement-modal ${isEarned ? 'earned' : 'locked'} ${achievement.isLegendary ? 'legendary' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={`Achievement: ${achievement.title}`}
      >
        <button className="achievement-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="achievement-modal-icon">
          {isEarned ? achievement.icon : '🔒'}
        </div>

        <h3 className="achievement-modal-title">
          {isEarned ? achievement.title : 'Locked Achievement'}
        </h3>

        <p className="achievement-modal-desc">
          {achievement.description}
        </p>

        {isEarned && (
          <div className="achievement-modal-celebration">
            {achievement.celebration}
          </div>
        )}

        {achievement.isLegendary && (
          <div className="achievement-modal-legendary">
            <span className="achievement-legendary-star">⭐</span>
            Legendary Achievement
          </div>
        )}

        <div className="achievement-modal-category">
          {CATEGORY_LABELS[achievement.category]}
        </div>
      </div>
    </div>
  );
});

export default AchievementBadges;

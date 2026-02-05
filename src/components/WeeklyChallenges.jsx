import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { useAchievements } from '../contexts/AchievementsContext';
import BrandIcon from './BrandIcon';
import './WeeklyChallenges.css';

// Sample weekly challenges - in production, these would come from Supabase
const WEEKLY_CHALLENGES = [
  {
    id: 'schedule-3-camps',
    title: 'Triple Threat',
    description: 'Schedule 3 camps this week',
    target: 3,
    icon: 'calendar',
    points: 50,
    type: 'scheduled_count'
  },
  {
    id: 'explore-5-camps',
    title: 'Camp Explorer',
    description: 'View details of 5 different camps',
    target: 5,
    icon: 'search',
    points: 30,
    type: 'viewed_count'
  },
  {
    id: 'favorite-3-camps',
    title: 'Heart Collector',
    description: 'Save 3 camps to your favorites',
    target: 3,
    icon: 'heart',
    points: 25,
    type: 'favorites_count'
  },
  {
    id: 'cover-week',
    title: 'Full Coverage',
    description: 'Fully plan at least one week',
    target: 1,
    icon: 'check',
    points: 40,
    type: 'covered_weeks'
  }
];

// Get the current challenge based on week number
function getCurrentChallenge() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
  return WEEKLY_CHALLENGES[weekNum % WEEKLY_CHALLENGES.length];
}

// Get end of current week (Sunday 11:59:59 PM in local time)
function getWeekEnd() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + daysUntilSunday);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

export const WeeklyChallenges = memo(function WeeklyChallenges({
  variant = 'default', // 'default', 'compact', 'sidebar'
  className = ''
}) {
  const { planningStats } = useAchievements();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [hasEnded, setHasEnded] = useState(false);

  const challenge = useMemo(() => getCurrentChallenge(), []);
  const weekEnd = useMemo(() => getWeekEnd(), []);

  // Calculate progress based on challenge type
  const progress = useMemo(() => {
    switch (challenge.type) {
      case 'scheduled_count':
        return Math.min(planningStats.scheduledCount || 0, challenge.target);
      case 'viewed_count':
        return Math.min(planningStats.viewedCamps || 0, challenge.target);
      case 'favorites_count':
        return Math.min(planningStats.favoritesCount || 0, challenge.target);
      case 'covered_weeks':
        return Math.min(planningStats.coveredWeeks || 0, challenge.target);
      default:
        return 0;
    }
  }, [challenge, planningStats]);

  const isCompleted = progress >= challenge.target;
  const progressPercent = Math.round((progress / challenge.target) * 100);

  // BUG-F-014: Timer that properly handles countdown without showing negative
  const updateTimer = useCallback(() => {
    const now = new Date();
    const diff = weekEnd - now;

    // If time is up, show "Ended" instead of negative time
    if (diff <= 0) {
      setHasEnded(true);
      setTimeRemaining('Challenge ended');
      return;
    }

    setHasEnded(false);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h remaining`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m remaining`);
    } else {
      setTimeRemaining(`${minutes}m remaining`);
    }
  }, [weekEnd]);

  // Update timer every minute
  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [updateTimer]);

  if (variant === 'compact') {
    return (
      <div className={`weekly-challenge weekly-challenge-compact ${className}`}>
        <div className="weekly-challenge-compact-header">
          <span className="weekly-challenge-compact-title">Weekly Challenge</span>
          <span className={`weekly-challenge-compact-timer ${hasEnded ? 'ended' : ''}`}>
            {timeRemaining}
          </span>
        </div>
        <div className="weekly-challenge-compact-content">
          <span className="weekly-challenge-compact-icon">
            <BrandIcon name={challenge.icon} size={16} />
          </span>
          <div className="weekly-challenge-compact-info">
            <span className="weekly-challenge-compact-name">{challenge.title}</span>
            <div className="weekly-challenge-compact-progress">
              <div
                className={`weekly-challenge-compact-progress-fill ${isCompleted ? 'complete' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className="weekly-challenge-compact-score">
            {progress}/{challenge.target}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`weekly-challenge ${className}`}>
      <div className="weekly-challenge-header">
        <div className="weekly-challenge-header-left">
          <h3 className="weekly-challenge-title">Weekly Challenge</h3>
          <span className={`weekly-challenge-timer ${hasEnded ? 'ended' : ''}`}>
            <BrandIcon name="clock" size={14} />
            {timeRemaining}
          </span>
        </div>
        <div className="weekly-challenge-points">
          <BrandIcon name="star" size={14} />
          <span>{challenge.points} pts</span>
        </div>
      </div>

      <div className={`weekly-challenge-card ${isCompleted ? 'complete' : ''}`}>
        <div className="weekly-challenge-icon">
          <BrandIcon name={challenge.icon} size={24} />
        </div>

        <div className="weekly-challenge-content">
          <h4 className="weekly-challenge-name">{challenge.title}</h4>
          <p className="weekly-challenge-desc">{challenge.description}</p>

          <div className="weekly-challenge-progress-container">
            <div className="weekly-challenge-progress">
              <div
                className={`weekly-challenge-progress-fill ${isCompleted ? 'complete' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="weekly-challenge-progress-text">
              {progress} / {challenge.target}
            </span>
          </div>
        </div>

        {isCompleted && (
          <div className="weekly-challenge-complete-badge">
            <BrandIcon name="check" size={16} />
          </div>
        )}
      </div>

      {hasEnded && !isCompleted && (
        <p className="weekly-challenge-expired">
          Challenge expired. New challenge starts soon.
        </p>
      )}
    </div>
  );
});

export default WeeklyChallenges;

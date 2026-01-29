import React, { memo, useMemo } from 'react';
import { useAchievements } from '../contexts/AchievementsContext';
import './ProgressTracker.css';

// Milestone markers for the progress bar
const MILESTONES = [
  { percent: 25, label: '25%', message: 'Great start!' },
  { percent: 50, label: '50%', message: 'Halfway there!' },
  { percent: 75, label: '75%', message: 'Almost done!' },
  { percent: 100, label: '100%', message: 'Summer sorted!' }
];

export const ProgressTracker = memo(function ProgressTracker({
  variant = 'default', // 'default', 'compact', 'detailed'
  showMilestones = true,
  showStats = false,
  className = ''
}) {
  const { planningStats, streak, achievementProgress } = useAchievements();

  const {
    coveragePercent,
    coveredWeeks,
    totalWeeks,
    gapCount,
    totalCost,
    budget
  } = planningStats;

  // Determine current milestone
  const currentMilestone = useMemo(() => {
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (coveragePercent >= MILESTONES[i].percent) {
        return MILESTONES[i];
      }
    }
    return null;
  }, [coveragePercent]);

  // Next milestone to reach
  const nextMilestone = useMemo(() => {
    for (let i = 0; i < MILESTONES.length; i++) {
      if (coveragePercent < MILESTONES[i].percent) {
        return MILESTONES[i];
      }
    }
    return null;
  }, [coveragePercent]);

  if (variant === 'compact') {
    return (
      <div className={`progress-tracker progress-tracker-compact ${className}`}>
        <div className="progress-compact-bar">
          <div
            className="progress-compact-fill"
            style={{ width: `${Math.min(coveragePercent, 100)}%` }}
          />
        </div>
        <span className="progress-compact-text">
          {coveragePercent}% planned
        </span>
      </div>
    );
  }

  return (
    <div className={`progress-tracker ${variant === 'detailed' ? 'progress-tracker-detailed' : ''} ${className}`}>
      {/* Header */}
      <div className="progress-header">
        <div className="progress-title">
          <span className="progress-label">Summer Planning Progress</span>
          <span className="progress-percent">{coveragePercent}%</span>
        </div>
        {streak.count > 1 && (
          <div className="progress-streak" title={`${streak.count}-day planning streak`}>
            <span className="progress-streak-icon">🔥</span>
            <span className="progress-streak-count">{streak.count}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div
            className={`progress-fill ${coveragePercent >= 100 ? 'progress-complete' : ''}`}
            style={{ width: `${Math.min(coveragePercent, 100)}%` }}
          >
            {coveragePercent >= 100 && (
              <span className="progress-complete-icon">✓</span>
            )}
          </div>
        </div>

        {/* Milestone Markers */}
        {showMilestones && (
          <div className="progress-milestones">
            {MILESTONES.map(milestone => (
              <div
                key={milestone.percent}
                className={`progress-milestone ${coveragePercent >= milestone.percent ? 'reached' : ''}`}
                style={{ left: `${milestone.percent}%` }}
              >
                <div className="progress-milestone-marker" />
                <span className="progress-milestone-label">{milestone.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="progress-status">
        {coveragePercent >= 100 ? (
          <span className="progress-status-complete">
            Your summer is fully planned!
          </span>
        ) : nextMilestone ? (
          <span className="progress-status-text">
            {coveredWeeks} of {totalWeeks} weeks covered
            {gapCount > 0 && (
              <span className="progress-gaps"> · {gapCount} {gapCount === 1 ? 'gap' : 'gaps'}</span>
            )}
          </span>
        ) : (
          <span className="progress-status-text">
            {coveredWeeks} of {totalWeeks} weeks covered
          </span>
        )}
      </div>

      {/* Detailed Stats */}
      {showStats && variant === 'detailed' && (
        <div className="progress-stats">
          <div className="progress-stat">
            <span className="progress-stat-value">{coveredWeeks}</span>
            <span className="progress-stat-label">Weeks Covered</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-value">{gapCount}</span>
            <span className="progress-stat-label">{gapCount === 1 ? 'Gap' : 'Gaps'}</span>
          </div>
          {budget && (
            <div className="progress-stat">
              <span className={`progress-stat-value ${totalCost > budget ? 'over-budget' : ''}`}>
                ${totalCost.toLocaleString()}
              </span>
              <span className="progress-stat-label">of ${budget.toLocaleString()}</span>
            </div>
          )}
          <div className="progress-stat">
            <span className="progress-stat-value">{achievementProgress.earned}</span>
            <span className="progress-stat-label">Badges Earned</span>
          </div>
        </div>
      )}

      {/* Achievement count for non-detailed */}
      {!showStats && achievementProgress.earned > 0 && (
        <div className="progress-badges-hint">
          <span className="progress-badges-icon">🏆</span>
          <span>{achievementProgress.earned} badge{achievementProgress.earned !== 1 ? 's' : ''} earned</span>
        </div>
      )}
    </div>
  );
});

export default ProgressTracker;

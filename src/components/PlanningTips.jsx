import React, { memo, useState, useEffect, useCallback } from 'react';
import { useAchievements } from '../contexts/AchievementsContext';
import './PlanningTips.css';

// Tip display component
export const PlanningTip = memo(function PlanningTip({
  tip,
  onDismiss,
  onNext,
  showNavigation = false,
  currentIndex,
  totalCount,
  variant = 'default' // 'default', 'inline', 'compact'
}) {
  if (!tip) return null;

  if (variant === 'compact') {
    return (
      <div className="planning-tip-compact">
        <span className="planning-tip-compact-icon">{tip.icon}</span>
        <span className="planning-tip-compact-text">{tip.tip}</span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="planning-tip-inline">
        <span className="planning-tip-inline-icon">{tip.icon}</span>
        <p className="planning-tip-inline-text">{tip.tip}</p>
        {onDismiss && (
          <button className="planning-tip-inline-dismiss" onClick={onDismiss} aria-label="Dismiss tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="planning-tip">
      <div className="planning-tip-icon">{tip.icon}</div>
      <div className="planning-tip-content">
        <p className="planning-tip-text">{tip.tip}</p>
        {showNavigation && totalCount > 1 && (
          <div className="planning-tip-nav">
            <span className="planning-tip-counter">
              {currentIndex + 1} of {totalCount}
            </span>
            <button
              className="planning-tip-next"
              onClick={onNext}
              aria-label="Next tip"
            >
              Next tip
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
      {onDismiss && (
        <button className="planning-tip-dismiss" onClick={onDismiss} aria-label="Dismiss tip">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});

// Container for contextual tips
export const PlanningTipsContainer = memo(function PlanningTipsContainer({
  variant = 'default',
  maxTips = 1,
  dismissible = true,
  className = ''
}) {
  const { currentTip, relevantTips, nextTip } = useAchievements();
  const [dismissedTips, setDismissedTips] = useState(() => {
    const saved = localStorage.getItem('sb-camps-dismissed-tips');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter out dismissed tips
  const visibleTips = relevantTips.filter(tip => !dismissedTips.includes(tip.id));

  // Persist dismissed tips
  useEffect(() => {
    localStorage.setItem('sb-camps-dismissed-tips', JSON.stringify(dismissedTips));
  }, [dismissedTips]);

  const handleDismiss = useCallback((tipId) => {
    setDismissedTips(prev => [...prev, tipId]);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % visibleTips.length);
    nextTip();
  }, [visibleTips.length, nextTip]);

  if (visibleTips.length === 0) return null;

  const tipsToShow = visibleTips.slice(0, maxTips);
  const tip = tipsToShow[currentIndex % tipsToShow.length];

  return (
    <div className={`planning-tips-container ${className}`}>
      <PlanningTip
        tip={tip}
        onDismiss={dismissible ? () => handleDismiss(tip.id) : null}
        onNext={handleNext}
        showNavigation={visibleTips.length > 1}
        currentIndex={currentIndex % visibleTips.length}
        totalCount={visibleTips.length}
        variant={variant}
      />
    </div>
  );
});

// Did You Know fact display
export const DidYouKnow = memo(function DidYouKnow({
  variant = 'default', // 'default', 'compact'
  autoRotate = false,
  rotateInterval = 30000, // 30 seconds
  className = ''
}) {
  const { getRandomFact } = useAchievements();
  const [fact, setFact] = useState(() => getRandomFact());
  const [visible, setVisible] = useState(true);

  // Auto-rotate facts
  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setFact(getRandomFact());
        setVisible(true);
      }, 300);
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, rotateInterval, getRandomFact]);

  const handleRefresh = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setFact(getRandomFact());
      setVisible(true);
    }, 200);
  }, [getRandomFact]);

  if (variant === 'compact') {
    return (
      <div className={`did-you-know-compact ${className}`}>
        <span className="did-you-know-compact-icon">💡</span>
        <span className={`did-you-know-compact-text ${visible ? 'visible' : ''}`}>
          {fact}
        </span>
      </div>
    );
  }

  return (
    <div className={`did-you-know ${className}`}>
      <div className="did-you-know-header">
        <span className="did-you-know-label">Did you know?</span>
        <button
          className="did-you-know-refresh"
          onClick={handleRefresh}
          aria-label="Show another fact"
          title="Show another fact"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>
      <p className={`did-you-know-text ${visible ? 'visible' : ''}`}>
        {fact}
      </p>
    </div>
  );
});

export default PlanningTipsContainer;

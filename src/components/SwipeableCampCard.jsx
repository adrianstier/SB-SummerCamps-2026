import React, { memo, useState, useRef, useCallback } from 'react';
import { useHaptic } from '../hooks/usePWA';

/**
 * SwipeableCampCard - A camp card with swipe gestures
 * Swipe right = favorite, Swipe left = dismiss/hide
 */
export const SwipeableCampCard = memo(function SwipeableCampCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  onTap,
  rightLabel = 'Save',
  leftLabel = 'Hide',
  rightColor = 'var(--terra-500)',
  leftColor = 'var(--sand-500)',
  disabled = false,
  swipeThreshold = 80,
  animationDuration = 300
}) {
  const haptic = useHaptic();
  const cardRef = useRef(null);

  const [state, setState] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    direction: null,
    isAnimating: false
  });

  const handleTouchStart = useCallback((e) => {
    if (disabled || state.isAnimating) return;

    setState({
      isDragging: true,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      currentX: 0,
      direction: null,
      isAnimating: false
    });
  }, [disabled, state.isAnimating]);

  const handleTouchMove = useCallback((e) => {
    if (!state.isDragging || state.isAnimating) return;

    const deltaX = e.touches[0].clientX - state.startX;
    const deltaY = e.touches[0].clientY - state.startY;

    // Only allow horizontal swipe if horizontal movement > vertical
    if (Math.abs(deltaX) < Math.abs(deltaY) && Math.abs(deltaX) < 10) {
      return;
    }

    // Prevent vertical scroll during horizontal swipe
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }

    // Apply resistance at the edges
    const resistance = 0.5;
    const resistedX = deltaX * resistance;

    setState(s => ({
      ...s,
      currentX: resistedX,
      direction: deltaX > 0 ? 'right' : 'left'
    }));

    // Haptic feedback at threshold
    if (Math.abs(resistedX) >= swipeThreshold && Math.abs(state.currentX) < swipeThreshold) {
      haptic.light();
    }
  }, [state.isDragging, state.startX, state.startY, state.currentX, state.isAnimating, swipeThreshold, haptic]);

  const handleTouchEnd = useCallback(() => {
    if (!state.isDragging) return;

    const { currentX, direction, startX, startY } = state;
    const threshold = swipeThreshold;

    // Check if it was a tap (minimal movement)
    const isTap = Math.abs(currentX) < 10;

    if (isTap) {
      setState({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        direction: null,
        isAnimating: false
      });
      onTap?.();
      return;
    }

    // Check if swipe was completed
    if (Math.abs(currentX) >= threshold) {
      haptic.medium();

      // Animate out
      setState(s => ({ ...s, isAnimating: true }));

      const targetX = direction === 'right' ? window.innerWidth : -window.innerWidth;

      if (cardRef.current) {
        cardRef.current.style.transition = `transform ${animationDuration}ms ease-out, opacity ${animationDuration}ms ease-out`;
        cardRef.current.style.transform = `translateX(${targetX}px) rotate(${direction === 'right' ? 10 : -10}deg)`;
        cardRef.current.style.opacity = '0';
      }

      setTimeout(() => {
        if (direction === 'right') {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }, animationDuration);
    } else {
      // Spring back
      setState(s => ({ ...s, isAnimating: true }));

      if (cardRef.current) {
        cardRef.current.style.transition = `transform 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
        cardRef.current.style.transform = 'translateX(0) rotate(0deg)';
      }

      setTimeout(() => {
        setState({
          isDragging: false,
          startX: 0,
          startY: 0,
          currentX: 0,
          direction: null,
          isAnimating: false
        });
      }, 200);
    }
  }, [state, swipeThreshold, animationDuration, haptic, onSwipeRight, onSwipeLeft, onTap]);

  const { currentX, direction, isDragging } = state;
  const progress = Math.min(Math.abs(currentX) / swipeThreshold, 1);
  const rotation = (currentX / window.innerWidth) * 15;

  // Background reveal colors based on swipe direction
  const showRightAction = direction === 'right' && Math.abs(currentX) > 20;
  const showLeftAction = direction === 'left' && Math.abs(currentX) > 20;

  return (
    <div className="swipeable-card-container">
      {/* Background action indicators */}
      <div
        className={`swipeable-action swipeable-action--right ${showRightAction ? 'swipeable-action--visible' : ''}`}
        style={{
          backgroundColor: rightColor,
          opacity: showRightAction ? Math.min(progress, 0.9) : 0
        }}
      >
        <div className="swipeable-action-content" style={{ opacity: progress }}>
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{rightLabel}</span>
        </div>
      </div>

      <div
        className={`swipeable-action swipeable-action--left ${showLeftAction ? 'swipeable-action--visible' : ''}`}
        style={{
          backgroundColor: leftColor,
          opacity: showLeftAction ? Math.min(progress, 0.9) : 0
        }}
      >
        <div className="swipeable-action-content" style={{ opacity: progress }}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{leftLabel}</span>
        </div>
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        className={`swipeable-card ${isDragging ? 'swipeable-card--dragging' : ''}`}
        style={{
          transform: isDragging ? `translateX(${currentX}px) rotate(${rotation}deg)` : undefined
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
});

/**
 * SwipeHint - Shows a hint animation for swipe gestures
 * Display once on first visit to educate users
 */
export const SwipeHint = memo(function SwipeHint({ onDismiss }) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className="swipe-hint" onClick={handleDismiss}>
      <div className="swipe-hint-content">
        <div className="swipe-hint-animation">
          <div className="swipe-hint-card">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div className="swipe-hint-arrows">
            <span className="swipe-hint-arrow swipe-hint-arrow--left">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="swipe-hint-label">Skip</span>
            </span>
            <span className="swipe-hint-arrow swipe-hint-arrow--right">
              <span className="swipe-hint-label">Save</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
        </div>
        <p className="swipe-hint-text">Swipe cards to save or skip</p>
        <button className="swipe-hint-dismiss">Got it</button>
      </div>
    </div>
  );
});

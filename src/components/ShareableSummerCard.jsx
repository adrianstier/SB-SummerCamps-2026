import React, { memo, useRef, useCallback, useState } from 'react';
import { useAchievements } from '../contexts/AchievementsContext';
import { useAuth } from '../contexts/AuthContext';
import './ShareableSummerCard.css';

// Theme options for the shareable card
const CARD_THEMES = [
  { id: 'ocean', label: 'Ocean', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  { id: 'sunset', label: 'Sunset', gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
  { id: 'forest', label: 'Forest', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
  { id: 'lavender', label: 'Lavender', gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' },
  { id: 'sunshine', label: 'Sunshine', gradient: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)' },
];

export const ShareableSummerCard = memo(function ShareableSummerCard({
  onClose,
  className = ''
}) {
  const { planningStats, earnedAchievements, achievementProgress, achievements } = useAchievements();
  const { profile, children: familyChildren, scheduledCamps } = useAuth();
  const cardRef = useRef(null);
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'My';

  // Get top categories from scheduled camps
  const topCategories = React.useMemo(() => {
    const categoryCounts = {};
    scheduledCamps.forEach(sc => {
      const category = sc.camps?.category;
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
    return Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);
  }, [scheduledCamps]);

  // Get recent achievements to display
  const recentBadges = React.useMemo(() => {
    return earnedAchievements
      .slice(-4)
      .map(id => achievements[id.toUpperCase()])
      .filter(Boolean);
  }, [earnedAchievements, achievements]);

  // Generate image from the card (using html2canvas approach)
  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;

    setIsGenerating(true);

    try {
      // Dynamic import html2canvas (would need to be installed)
      // For now, we'll use the native share API with text
      // In production, you'd use html2canvas or similar

      // Create shareable text content
      const shareText = `${firstName}'s Summer 2026 is ${planningStats.coveragePercent}% planned!
${planningStats.coveredWeeks} weeks covered with ${planningStats.scheduledCount} camps.
${achievementProgress.earned} achievements unlocked.
#SummerCamps #SantaBarbara #SummerPlanning`;

      return { text: shareText };
    } catch (error) {
      console.error('Failed to generate share content:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [firstName, planningStats, achievementProgress]);

  // Share functionality
  const handleShare = useCallback(async () => {
    const content = await generateImage();
    if (!content) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${firstName}'s Summer 2026 Plan`,
          text: content.text,
          url: window.location.origin,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(content.text);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  }, [generateImage, firstName]);

  // Download as image (simplified - would use html2canvas in production)
  const handleDownload = useCallback(() => {
    // In production, this would convert the card to an image using html2canvas
    // For now, show a message that this feature requires additional setup
    alert('Image download requires html2canvas library. Share feature works with native sharing.');
  }, []);

  return (
    <div className={`shareable-card-overlay ${className}`} onClick={onClose}>
      <div className="shareable-card-modal" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button className="shareable-card-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="shareable-card-header">
          <h2 className="shareable-card-title">Share Your Summer Plan</h2>
          <p className="shareable-card-subtitle">Show off your planning progress</p>
        </div>

        {/* Theme selector */}
        <div className="shareable-card-themes">
          {CARD_THEMES.map(theme => (
            <button
              key={theme.id}
              className={`shareable-theme-btn ${selectedTheme.id === theme.id ? 'active' : ''}`}
              onClick={() => setSelectedTheme(theme)}
              style={{ background: theme.gradient }}
              aria-label={`Select ${theme.label} theme`}
              title={theme.label}
            />
          ))}
        </div>

        {/* The shareable card preview */}
        <div className="shareable-card-preview" ref={cardRef}>
          <div className="shareable-card" style={{ '--card-gradient': selectedTheme.gradient }}>
            {/* Card header */}
            <div className="shareable-card-bg" />
            <div className="shareable-card-content">
              <div className="shareable-card-top">
                <span className="shareable-card-label">Summer 2026</span>
                <span className="shareable-card-brand">SB Camps</span>
              </div>

              <h3 className="shareable-card-name">{firstName}'s Summer</h3>

              {/* Progress circle */}
              <div className="shareable-progress-container">
                <div className="shareable-progress-ring">
                  <svg viewBox="0 0 100 100">
                    <circle
                      className="shareable-progress-bg"
                      cx="50"
                      cy="50"
                      r="42"
                    />
                    <circle
                      className="shareable-progress-fill"
                      cx="50"
                      cy="50"
                      r="42"
                      style={{
                        strokeDasharray: `${planningStats.coveragePercent * 2.64} 264`,
                      }}
                    />
                  </svg>
                  <div className="shareable-progress-value">
                    <span className="shareable-progress-percent">{planningStats.coveragePercent}%</span>
                    <span className="shareable-progress-label">Planned</span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="shareable-stats">
                <div className="shareable-stat">
                  <span className="shareable-stat-value">{planningStats.coveredWeeks}</span>
                  <span className="shareable-stat-label">Weeks</span>
                </div>
                <div className="shareable-stat-divider" />
                <div className="shareable-stat">
                  <span className="shareable-stat-value">{planningStats.scheduledCount}</span>
                  <span className="shareable-stat-label">Camps</span>
                </div>
                <div className="shareable-stat-divider" />
                <div className="shareable-stat">
                  <span className="shareable-stat-value">{achievementProgress.earned}</span>
                  <span className="shareable-stat-label">Badges</span>
                </div>
              </div>

              {/* Categories */}
              {topCategories.length > 0 && (
                <div className="shareable-categories">
                  {topCategories.map(cat => (
                    <span key={cat} className="shareable-category">{cat}</span>
                  ))}
                </div>
              )}

              {/* Badges */}
              {recentBadges.length > 0 && (
                <div className="shareable-badges">
                  {recentBadges.map(badge => (
                    <span key={badge.id} className="shareable-badge" title={badge.title}>
                      {badge.icon}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Card footer */}
            <div className="shareable-card-footer">
              <span>sb-summer-camps.vercel.app</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="shareable-card-actions">
          <button
            className="shareable-action-btn secondary"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download
          </button>
          <button
            className={`shareable-action-btn primary ${shareSuccess ? 'success' : ''}`}
            onClick={handleShare}
            disabled={isGenerating}
          >
            {shareSuccess ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Shared
              </>
            ) : isGenerating ? (
              <>
                <svg className="shareable-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

// Simple button to trigger share modal
export const ShareButton = memo(function ShareButton({ onClick, className = '' }) {
  return (
    <button className={`share-summer-btn ${className}`} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
      <span>Share Plan</span>
    </button>
  );
});

export default ShareableSummerCard;

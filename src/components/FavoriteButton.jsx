import React, { useState, useCallback, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addFavorite, removeFavorite } from '../lib/supabase';

// Size configuration moved outside component to prevent recreation on each render
const SIZE_CONFIG = {
  sm: { button: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { button: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { button: 'w-12 h-12', icon: 'w-6 h-6' }
};

// Memoized HeartIcon to prevent unnecessary re-renders
const HeartIcon = memo(function HeartIcon({ filled, className }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
});

// Memoized FavoriteButton to prevent unnecessary re-renders when parent updates
export const FavoriteButton = memo(function FavoriteButton({ campId, size = 'md', showLabel = false }) {
  const { user, isConfigured, isFavorited, refreshFavorites, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  const isFav = isFavorited(campId);
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  const handleClick = useCallback(async (e) => {
    e.stopPropagation();

    if (!isConfigured || !user) {
      if (isConfigured) {
        signIn();
      }
      return;
    }

    setLoading(true);
    setAnimating(true);

    try {
      if (isFav) {
        await removeFavorite(campId);
      } else {
        await addFavorite(campId);
      }
      await refreshFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 300);
    }
  }, [campId, isConfigured, user, isFav, refreshFavorites, signIn]);

  const handleMouseEnter = useCallback((e) => {
    if (!isFav) {
      e.currentTarget.style.color = 'var(--terra-400)';
      e.currentTarget.style.borderColor = 'var(--terra-200)';
    }
  }, [isFav]);

  const handleMouseLeave = useCallback((e) => {
    if (!isFav) {
      e.currentTarget.style.color = 'var(--sand-400)';
      e.currentTarget.style.borderColor = 'var(--sand-200)';
    }
  }, [isFav]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        ${config.button}
        favorite-btn flex items-center justify-center gap-2 rounded-full
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        ${animating && isFav ? 'is-favorited' : ''}
      `}
      style={{
        background: isFav ? 'var(--terra-100)' : 'white',
        color: isFav ? 'var(--terra-500)' : 'var(--sand-400)',
        border: `2px solid ${isFav ? 'var(--terra-200)' : 'var(--sand-200)'}`
      }}
      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isFav}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <HeartIcon filled={isFav} className={config.icon} />
      {showLabel && (
        <span className="text-sm font-medium pr-1">
          {isFav ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
});

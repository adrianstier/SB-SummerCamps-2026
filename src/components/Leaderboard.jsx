import React, { memo, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import BrandIcon from './BrandIcon';
import './Leaderboard.css';

/**
 * Leaderboard component with real-time updates
 * Shows planning progress rankings for users
 */
export const Leaderboard = memo(function Leaderboard({
  variant = 'default', // 'default', 'compact', 'sidebar'
  limit = 10,
  className = ''
}) {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profiles with their planning stats (scheduled camps count)
      // In a real implementation, you'd have a leaderboard_scores table or computed view
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          scheduled_camps:scheduled_camps(count)
        `)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      // Transform and sort by scheduled camps count
      const ranked = (data || [])
        .map(profile => ({
          id: profile.id,
          name: profile.full_name || 'Anonymous Planner',
          avatar: profile.avatar_url,
          score: profile.scheduled_camps?.[0]?.count || 0,
          isCurrentUser: profile.id === user?.id
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setEntries(ranked);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Real-time subscription for leaderboard updates
  useEffect(() => {
    if (!supabase) return;

    // Subscribe to scheduled_camps changes to update leaderboard in real-time
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_camps'
        },
        () => {
          // Refetch leaderboard when any scheduled camp changes
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard]);

  // Find current user's rank if not in top entries
  const currentUserEntry = entries.find(e => e.isCurrentUser);
  const currentUserRank = currentUserEntry?.rank;

  if (variant === 'compact') {
    return (
      <div className={`leaderboard leaderboard-compact ${className}`}>
        <div className="leaderboard-compact-header">
          <span className="leaderboard-compact-title">Top Planners</span>
          {lastUpdate && (
            <span className="leaderboard-live-indicator" title="Real-time updates">
              <span className="leaderboard-live-dot" />
            </span>
          )}
        </div>
        <div className="leaderboard-compact-list">
          {loading ? (
            <div className="leaderboard-loading">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="leaderboard-empty">No data yet</div>
          ) : (
            entries.slice(0, 5).map(entry => (
              <LeaderboardEntryCompact key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`leaderboard ${className}`}>
      <div className="leaderboard-header">
        <div className="leaderboard-header-left">
          <h3 className="leaderboard-title">Leaderboard</h3>
          {lastUpdate && (
            <span className="leaderboard-live-indicator" title="Real-time updates enabled">
              <span className="leaderboard-live-dot" />
              <span className="leaderboard-live-text">Live</span>
            </span>
          )}
        </div>
        <button
          className="leaderboard-refresh"
          onClick={fetchLeaderboard}
          disabled={loading}
          aria-label="Refresh leaderboard"
        >
          <BrandIcon name="refresh" size={16} />
        </button>
      </div>

      <div className="leaderboard-content">
        {loading ? (
          <div className="leaderboard-loading">
            <div className="leaderboard-loading-spinner" />
            <span>Loading rankings...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="leaderboard-empty">
            <BrandIcon name="trophy" size={32} />
            <p>No rankings yet</p>
            <span>Start planning to appear on the leaderboard</span>
          </div>
        ) : (
          <div className="leaderboard-list">
            {entries.map(entry => (
              <LeaderboardEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {currentUserRank && currentUserRank > limit && (
        <div className="leaderboard-current-user">
          <span className="leaderboard-current-user-label">Your rank</span>
          <LeaderboardEntry entry={currentUserEntry} />
        </div>
      )}
    </div>
  );
});

// Individual leaderboard entry
const LeaderboardEntry = memo(function LeaderboardEntry({ entry }) {
  const getRankClass = (rank) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <BrandIcon name="trophy" size={16} />;
    if (rank === 2) return <BrandIcon name="star" size={16} />;
    if (rank === 3) return <BrandIcon name="medal" size={16} />;
    return rank;
  };

  return (
    <div className={`leaderboard-entry ${entry.isCurrentUser ? 'current-user' : ''} ${getRankClass(entry.rank)}`}>
      <div className="leaderboard-entry-rank">
        {getRankIcon(entry.rank)}
      </div>
      <div className="leaderboard-entry-avatar">
        {entry.avatar ? (
          <img src={entry.avatar} alt="" />
        ) : (
          <div className="leaderboard-entry-avatar-placeholder">
            {entry.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="leaderboard-entry-info">
        <span className="leaderboard-entry-name">
          {entry.name}
          {entry.isCurrentUser && <span className="leaderboard-entry-you">(You)</span>}
        </span>
      </div>
      <div className="leaderboard-entry-score">
        <span className="leaderboard-entry-score-value">{entry.score}</span>
        <span className="leaderboard-entry-score-label">camps</span>
      </div>
    </div>
  );
});

// Compact entry for sidebar view
const LeaderboardEntryCompact = memo(function LeaderboardEntryCompact({ entry }) {
  return (
    <div className={`leaderboard-entry-compact ${entry.isCurrentUser ? 'current-user' : ''}`}>
      <span className="leaderboard-entry-compact-rank">#{entry.rank}</span>
      <span className="leaderboard-entry-compact-name">{entry.name}</span>
      <span className="leaderboard-entry-compact-score">{entry.score}</span>
    </div>
  );
});

export default Leaderboard;

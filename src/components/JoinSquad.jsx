import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSquadByInviteCode, joinSquad } from '../lib/supabase';

export default function JoinSquad({ inviteCode, onComplete, onCancel }) {
  const { user, refreshSquads, signIn } = useAuth();
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [shareSchedule, setShareSchedule] = useState(true);
  const [revealIdentity, setRevealIdentity] = useState(false);

  useEffect(() => {
    loadSquad();
  }, [inviteCode]);

  async function loadSquad() {
    setLoading(true);
    setError(null);
    const data = await getSquadByInviteCode(inviteCode);
    if (data) {
      setSquad(data);
    } else {
      setError('Invalid or expired invite link');
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!user) {
      signIn();
      return;
    }

    setJoining(true);
    setError(null);

    const { error: joinError } = await joinSquad(squad.id, revealIdentity, shareSchedule);

    if (joinError) {
      if (joinError.code === '23505') {
        setError('You are already a member of this squad');
      } else {
        setError(joinError.message);
      }
      setJoining(false);
      return;
    }

    await refreshSquads();
    onComplete();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="w-8 h-8 border-2 border-ocean-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !squad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-earth-900 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
            Invalid Link
          </h2>
          <p className="text-sm text-earth-600 mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--ocean-500)' }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm text-earth-500 mb-2">You're invited to join</p>
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-ocean-100 flex items-center justify-center">
            <span className="text-2xl font-semibold text-ocean-600">
              {squad.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-earth-900" style={{ fontFamily: 'Fraunces, serif' }}>
            {squad.name}
          </h2>
          <p className="text-sm text-earth-500 mt-1">
            {squad.member_count} {squad.member_count === 1 ? 'member' : 'members'}
          </p>
        </div>

        {/* Privacy Settings */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-earth-700 mb-3">
            Your privacy settings
          </label>
          <div className="space-y-4 p-4 bg-sand-50 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shareSchedule}
                onChange={(e) => setShareSchedule(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-sand-300 text-ocean-500 focus:ring-ocean-500"
              />
              <div>
                <div className="text-sm text-earth-800">Share my schedule with this squad</div>
                <div className="text-xs text-earth-500">Squad members will see your camp plans</div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={revealIdentity}
                onChange={(e) => setRevealIdentity(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-sand-300 text-ocean-500 focus:ring-ocean-500"
              />
              <div>
                <div className="text-sm text-earth-800">Show my name to squad members</div>
                <div className="text-xs text-earth-500">Default: anonymous - shown as "a friend"</div>
              </div>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--ocean-500)' }}
        >
          {joining ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Joining...
            </span>
          ) : user ? (
            'Join Squad'
          ) : (
            'Sign in to Join'
          )}
        </button>

        <button
          onClick={onCancel}
          className="w-full mt-3 py-2 text-sm text-earth-500 hover:text-earth-700 transition-colors"
        >
          No thanks, go to home
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createSquad } from '../lib/supabase';

export default function CreateSquadModal({ onClose }) {
  const { refreshSquads } = useAuth();
  const [name, setName] = useState('');
  const [shareSchedule, setShareSchedule] = useState(true);
  const [revealIdentity, setRevealIdentity] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a squad name');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: createError } = await createSquad(name.trim(), revealIdentity);

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    await refreshSquads();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-earth-900" style={{ fontFamily: 'Fraunces, serif' }}>
            Create a Squad
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors"
          >
            <svg className="w-5 h-5 text-earth-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Squad Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-earth-700 mb-2">
              Squad name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., "Soccer Team Parents"'
              className="w-full px-4 py-3 border border-sand-200 rounded-lg text-earth-800 placeholder-earth-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Privacy Settings */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-earth-700 mb-3">
              Your privacy
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
                  <div className="text-sm text-earth-800">Show my name</div>
                  <div className="text-xs text-earth-500">Default: anonymous - shown as "a friend"</div>
                </div>
              </label>
            </div>
            <p className="text-xs text-earth-400 mt-2">
              You can change these settings anytime.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--ocean-500)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Squad'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CreateSquadModal from './CreateSquadModal';
import SquadDetail from './SquadDetail';

export default function SquadsPanel({ onClose }) {
  const { squads, squadNotifications, squadUnreadCount } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState(null);

  // Get summary info for each squad
  const getSquadSummary = (squad) => {
    const memberCount = squad.squad_members?.length || 0;

    // Check for recent notifications for this squad
    const squadNotifs = squadNotifications.filter(n => n.squad_id === squad.id && !n.read);
    const hasMatch = squadNotifs.some(n => n.type === 'friend_match');
    const hasLooking = squadNotifs.some(n => n.type === 'looking_for_friends');

    return { memberCount, hasMatch, hasLooking, unreadCount: squadNotifs.length };
  };

  if (selectedSquad) {
    return (
      <SquadDetail
        squad={selectedSquad}
        onBack={() => setSelectedSquad(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sand-200">
        <h2 className="text-xl font-semibold text-earth-900" style={{ fontFamily: 'Fraunces, serif' }}>
          My Squads
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--ocean-500)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Squad
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {squads.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : (
          <div className="space-y-3">
            {squads.map(squad => {
              const summary = getSquadSummary(squad);
              return (
                <SquadCard
                  key={squad.id}
                  squad={squad}
                  summary={summary}
                  onClick={() => setSelectedSquad(squad)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Create Squad Modal */}
      {showCreateModal && (
        <CreateSquadModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-16 h-16 rounded-full bg-ocean-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-ocean-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-earth-900 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
        Coordinate with friends
      </h3>
      <p className="text-sm text-earth-600 mb-6 max-w-xs">
        Create a squad to share schedules and find camps where your kids can go together.
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
        style={{ backgroundColor: 'var(--ocean-500)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create a Squad
      </button>
    </div>
  );
}

function SquadCard({ squad, summary, onClick }) {
  const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
  const colorIndex = squad.name.charCodeAt(0) % colors.length;
  const squadColor = colors[colorIndex];

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border border-sand-200 hover:border-ocean-300 hover:shadow-md transition-all bg-white group"
    >
      <div className="flex items-start gap-3">
        {/* Squad icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ backgroundColor: squadColor }}
        >
          {squad.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Squad name and member count */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-earth-900 truncate">{squad.name}</h3>
            <span className="text-xs text-earth-500 flex-shrink-0">
              {summary.memberCount} {summary.memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>

          {/* Status indicators */}
          <div className="mt-1.5">
            {summary.hasMatch ? (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <span className="text-base">🎯</span>
                <span>Match found!</span>
              </div>
            ) : summary.hasLooking ? (
              <div className="flex items-center gap-1.5 text-sm text-ocean-600">
                <span className="text-base">👀</span>
                <span>Friend looking for company</span>
              </div>
            ) : summary.unreadCount > 0 ? (
              <div className="flex items-center gap-1.5 text-sm text-earth-500">
                <span className="w-2 h-2 rounded-full bg-ocean-500"></span>
                <span>{summary.unreadCount} new update{summary.unreadCount > 1 ? 's' : ''}</span>
              </div>
            ) : (
              <div className="text-sm text-earth-400">
                No new activity
              </div>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className="w-5 h-5 text-earth-400 group-hover:text-ocean-500 transition-colors flex-shrink-0 mt-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

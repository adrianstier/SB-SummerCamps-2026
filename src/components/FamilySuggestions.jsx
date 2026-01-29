import React, { useState } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from '../lib/formatters';

export default function FamilySuggestions() {
  const { user, children: familyChildren } = useAuth();
  const {
    suggestions,
    pendingSuggestions,
    suggestCamp,
    respondToSuggestion,
    currentFamily,
    currentFamilyMembers
  } = useFamily();

  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [filter, setFilter] = useState('pending'); // 'pending', 'all', 'sent'
  const [responding, setResponding] = useState(null);
  const [error, setError] = useState(null);

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    if (filter === 'pending') return s.status === 'pending' && (s.suggested_to === user?.id || s.suggested_to === null);
    if (filter === 'sent') return s.suggested_by === user?.id;
    return true;
  });

  async function handleRespond(suggestionId, accept) {
    setResponding(suggestionId);
    setError(null);

    const result = await respondToSuggestion(suggestionId, accept);
    if (result.error) {
      setError(result.error.message);
    }

    setResponding(null);
  }

  if (!currentFamily) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-earth-600">Select a family to view suggestions.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with filter and add button */}
      <div className="p-4 border-b border-sand-200 bg-white flex items-center justify-between">
        <div className="flex gap-2">
          <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')} count={pendingSuggestions.length}>
            For You
          </FilterButton>
          <FilterButton active={filter === 'sent'} onClick={() => setFilter('sent')}>
            Sent
          </FilterButton>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterButton>
        </div>

        <button
          onClick={() => setShowSuggestModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Suggest
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 text-red-800 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredSuggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center mb-3">
              <LightbulbIcon className="w-6 h-6 text-earth-400" />
            </div>
            <h3 className="font-medium text-earth-900 mb-1">
              {filter === 'pending' ? 'No suggestions for you' : filter === 'sent' ? 'No suggestions sent' : 'No suggestions yet'}
            </h3>
            <p className="text-sm text-earth-600 max-w-xs">
              {filter === 'pending'
                ? 'When your partner suggests a camp, it will appear here.'
                : 'Suggest camps to help your partner discover great options.'}
            </p>
          </div>
        ) : (
          filteredSuggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              isOwn={suggestion.suggested_by === user?.id}
              onAccept={() => handleRespond(suggestion.id, true)}
              onDecline={() => handleRespond(suggestion.id, false)}
              isResponding={responding === suggestion.id}
            />
          ))
        )}
      </div>

      {/* Suggest Camp Modal */}
      {showSuggestModal && (
        <SuggestCampModal
          onClose={() => setShowSuggestModal(false)}
          familyMembers={currentFamilyMembers}
          children={familyChildren}
          onSuggest={suggestCamp}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-ocean-100 text-ocean-700'
          : 'text-earth-600 hover:bg-sand-100'
      }`}
    >
      {children}
      {count > 0 && (
        <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-coral-500 text-white rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}

function SuggestionCard({ suggestion, isOwn, onAccept, onDecline, isResponding }) {
  const {
    camp_id,
    note,
    status,
    created_at,
    week_date,
    suggested_by_profile,
    suggested_to_profile,
    children
  } = suggestion;

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    added: 'bg-ocean-100 text-ocean-700'
  };

  return (
    <div className="bg-white rounded-lg border border-sand-200 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {suggested_by_profile?.avatar_url ? (
              <img src={suggested_by_profile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-medium text-sm">
                {suggested_by_profile?.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <p className="text-sm">
                <span className="font-medium text-earth-900">{suggested_by_profile?.full_name}</span>
                {' suggested to '}
                <span className="font-medium text-earth-900">
                  {suggested_to_profile?.full_name || 'everyone'}
                </span>
              </p>
              <p className="text-xs text-earth-400">{formatDistanceToNow(new Date(created_at))}</p>
            </div>
          </div>

          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[status]}`}>
            {status}
          </span>
        </div>

        {/* Camp info */}
        <div className="bg-sand-50 rounded-lg p-3 mb-3">
          <h4 className="font-medium text-earth-900 mb-1">{camp_id}</h4>
          <div className="flex flex-wrap gap-2 text-xs text-earth-600">
            {children && (
              <span style={{ color: children.color }}>For {children.name}</span>
            )}
            {week_date && (
              <span>Week of {new Date(week_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
          </div>
        </div>

        {/* Note */}
        {note && (
          <p className="text-sm text-earth-600 italic mb-3">"{note}"</p>
        )}

        {/* Actions for pending suggestions (not own) */}
        {status === 'pending' && !isOwn && (
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              disabled={isResponding}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isResponding ? '...' : 'Add to Schedule'}
            </button>
            <button
              onClick={onDecline}
              disabled={isResponding}
              className="px-4 py-2 text-sm font-medium text-earth-700 bg-sand-200 rounded-lg hover:bg-sand-300 disabled:opacity-50 transition-colors"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestCampModal({ onClose, familyMembers, children, onSuggest, currentUserId }) {
  const [campSearch, setCampSearch] = useState('');
  const [selectedCampId, setSelectedCampId] = useState('');
  const [suggestTo, setSuggestTo] = useState('');
  const [childId, setChildId] = useState('');
  const [weekDate, setWeekDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const otherMembers = familyMembers.filter(m => m.user_id !== currentUserId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedCampId) return;

    setSubmitting(true);
    setError(null);

    const result = await onSuggest({
      camp_id: selectedCampId,
      suggested_to: suggestTo || null,
      child_id: childId || null,
      week_date: weekDate || null,
      note: note || null
    });

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-sand-200">
          <h2 className="font-serif text-lg font-semibold text-earth-900">Suggest a Camp</h2>
          <button onClick={onClose} className="p-1 text-earth-400 hover:text-earth-600">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-800 text-sm rounded-lg">{error}</div>
          )}

          {/* Camp search/select */}
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Camp Name or ID *
            </label>
            <input
              type="text"
              value={selectedCampId}
              onChange={(e) => setSelectedCampId(e.target.value)}
              placeholder="Enter camp name or ID"
              className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500"
              required
            />
            <p className="mt-1 text-xs text-earth-500">
              Enter the camp ID (e.g., "ucsb-day-camp") or name
            </p>
          </div>

          {/* Suggest to */}
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Suggest To
            </label>
            <select
              value={suggestTo}
              onChange={(e) => setSuggestTo(e.target.value)}
              className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500"
            >
              <option value="">Everyone in the family</option>
              {otherMembers.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profiles?.full_name || 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          {/* For child */}
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              For Child
            </label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500"
            >
              <option value="">Any child</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>

          {/* Week */}
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Suggested Week
            </label>
            <select
              value={weekDate}
              onChange={(e) => setWeekDate(e.target.value)}
              className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500"
            >
              <option value="">Any week</option>
              {getWeekOptions().map(week => (
                <option key={week.value} value={week.value}>{week.label}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Add a Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why you think this camp is a good fit..."
              rows={3}
              className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-earth-700 hover:bg-sand-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedCampId || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Sending...' : 'Send Suggestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Generate week options
function getWeekOptions() {
  const weeks = [];
  const startDate = new Date('2026-06-08');
  const endDate = new Date('2026-08-14');

  let currentDate = new Date(startDate);
  let weekNum = 1;

  while (currentDate < endDate) {
    const weekStart = new Date(currentDate);
    weeks.push({
      value: weekStart.toISOString().split('T')[0],
      label: `Week ${weekNum} (${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
    });
    currentDate.setDate(currentDate.getDate() + 7);
    weekNum++;
  }

  return weeks;
}

// Icons
function LightbulbIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

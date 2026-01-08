import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getSquadCampInterests,
  updateSquadMembership,
  leaveSquad,
  deleteSquad,
  regenerateInviteCode
} from '../lib/supabase';

export default function SquadDetail({ squad, onBack, onClose }) {
  const { user, refreshSquads, refreshSquadNotifications } = useAuth();
  const [squadInterests, setSquadInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = squad.created_by === user?.id;
  const myMembership = squad.squad_members?.find(m => m.user_id === user?.id);

  useEffect(() => {
    loadSquadInterests();
  }, [squad.id]);

  async function loadSquadInterests() {
    setLoading(true);
    const interests = await getSquadCampInterests(squad.id);
    setSquadInterests(interests);
    setLoading(false);
  }

  // Group interests by week and camp
  const groupedInterests = useMemo(() => {
    const weeks = {};
    squadInterests.forEach(interest => {
      const key = `week-${interest.week_number}`;
      if (!weeks[key]) {
        weeks[key] = { weekNumber: interest.week_number, camps: {} };
      }

      const campKey = interest.camp_id;
      if (!weeks[key].camps[campKey]) {
        weeks[key].camps[campKey] = {
          campId: interest.camp_id,
          interests: []
        };
      }

      weeks[key].camps[campKey].interests.push(interest);
    });

    // Convert to sorted array
    return Object.values(weeks)
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map(week => ({
        ...week,
        camps: Object.values(week.camps)
      }));
  }, [squadInterests]);

  const inviteUrl = `${window.location.origin}/join/${squad.invite_code}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${squad.name}`,
          text: `Join my summer camp coordination squad!`,
          url: inviteUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  }

  if (showSettings) {
    return (
      <SquadSettings
        squad={squad}
        membership={myMembership}
        isOwner={isOwner}
        onBack={() => setShowSettings(false)}
        onLeave={async () => {
          await leaveSquad(squad.id);
          await refreshSquads();
          onBack();
        }}
        onDelete={async () => {
          await deleteSquad(squad.id);
          await refreshSquads();
          onBack();
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sand-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors"
          >
            <svg className="w-5 h-5 text-earth-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-earth-900" style={{ fontFamily: 'Fraunces, serif' }}>
            {squad.name}
          </h2>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg hover:bg-sand-100 transition-colors"
        >
          <svg className="w-5 h-5 text-earth-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Members */}
      <div className="px-4 py-3 border-b border-sand-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-earth-700">Members</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-sand-100 text-earth-600">
            {squad.squad_members?.length || 0}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {squad.squad_members?.map(member => (
            <MemberBadge
              key={member.id}
              member={member}
              isCurrentUser={member.user_id === user?.id}
            />
          ))}
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-ocean-600 bg-ocean-50 rounded-full hover:bg-ocean-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          inviteUrl={inviteUrl}
          squadName={squad.name}
          onCopy={handleCopyLink}
          onShare={handleShare}
          copied={copied}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Schedule Overview */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-earth-700 mb-3">Summer Overview</h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-ocean-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groupedInterests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-earth-500">No camps scheduled yet</p>
            <p className="text-xs text-earth-400 mt-1">
              Add camps to your schedule to see overlaps
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedInterests.map(week => (
              <WeekSection
                key={week.weekNumber}
                weekNumber={week.weekNumber}
                camps={week.camps}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberBadge({ member, isCurrentUser }) {
  const name = member.reveal_identity
    ? (member.profiles?.full_name || 'Anonymous')
    : isCurrentUser
      ? 'You'
      : 'Friend';

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-sand-50 rounded-full">
      <div className="w-5 h-5 rounded-full bg-earth-200 flex items-center justify-center">
        {member.profiles?.avatar_url ? (
          <img
            src={member.profiles.avatar_url}
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <svg className="w-3 h-3 text-earth-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>
      <span className="text-xs font-medium text-earth-700">
        {isCurrentUser ? 'You' : name}
      </span>
      {member.role === 'owner' && (
        <span className="text-xs text-earth-400">(owner)</span>
      )}
    </div>
  );
}

function WeekSection({ weekNumber, camps, currentUserId }) {
  // Week dates for 2026
  const getWeekDates = (weekNum) => {
    const startDate = new Date('2026-06-08');
    startDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 4);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-earth-800">Week {weekNumber}</span>
        <span className="text-xs text-earth-400">{getWeekDates(weekNumber)}</span>
      </div>
      <div className="space-y-2">
        {camps.map(camp => (
          <CampInterestCard
            key={camp.campId}
            campId={camp.campId}
            interests={camp.interests}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

function CampInterestCard({ campId, interests, currentUserId }) {
  const currentUserInterest = interests.find(i => i.user_id === currentUserId);
  const otherInterests = interests.filter(i => i.user_id !== currentUserId);
  const hasMatch = currentUserInterest && otherInterests.length > 0;

  // Status icons
  const getStatusIcon = (status) => {
    switch (status) {
      case 'booked':
        return <span className="text-green-600">✓</span>;
      case 'scheduled':
        return <span className="text-ocean-600">✓</span>;
      default:
        return <span className="text-earth-400">👀</span>;
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${hasMatch ? 'border-green-200 bg-green-50' : 'border-sand-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-earth-900">{campId}</span>
        {hasMatch && (
          <span className="text-xs font-medium text-green-600 flex items-center gap-1">
            <span>🎉</span> Match!
          </span>
        )}
      </div>
      <div className="space-y-1">
        {currentUserInterest && (
          <div className="flex items-center gap-2 text-sm">
            {getStatusIcon(currentUserInterest.status)}
            <span className="text-earth-700">
              You ({currentUserInterest.children?.name || 'child'})
            </span>
            <span className="text-xs text-earth-400">
              {currentUserInterest.status}
            </span>
            {currentUserInterest.looking_for_friends && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-ocean-100 text-ocean-700">
                looking for friends
              </span>
            )}
          </div>
        )}
        {otherInterests.map(interest => (
          <div key={interest.id} className="flex items-center gap-2 text-sm">
            {getStatusIcon(interest.status)}
            <span className="text-earth-700">
              {interest.reveal_identity ? interest.member_name : 'A friend'}
              {interest.children?.name && ` (${interest.children.name})`}
            </span>
            <span className="text-xs text-earth-400">
              {interest.status}
            </span>
            {interest.looking_for_friends && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-ocean-100 text-ocean-700">
                looking for friends
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InviteModal({ inviteUrl, squadName, onCopy, onShare, copied, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-earth-900" style={{ fontFamily: 'Fraunces, serif' }}>
            Invite to {squadName}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand-100">
            <svg className="w-5 h-5 text-earth-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-earth-600 mb-4">Share this link:</p>

        <div className="flex items-center gap-2 p-3 bg-sand-50 rounded-lg mb-4">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 bg-transparent text-sm text-earth-700 outline-none"
          />
          <button
            onClick={onCopy}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              copied ? 'bg-green-100 text-green-700' : 'bg-ocean-100 text-ocean-700 hover:bg-ocean-200'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--ocean-500)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>

        <p className="text-xs text-earth-400 text-center mt-4">
          Only people with this link can join
        </p>
      </div>
    </div>
  );
}

function SquadSettings({ squad, membership, isOwner, onBack, onLeave, onDelete }) {
  const { refreshSquads } = useAuth();
  const [revealIdentity, setRevealIdentity] = useState(membership?.reveal_identity || false);
  const [shareSchedule, setShareSchedule] = useState(membership?.share_schedule ?? true);
  const [saving, setSaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleToggle(field, value) {
    setSaving(true);
    if (field === 'reveal_identity') {
      setRevealIdentity(value);
      await updateSquadMembership(squad.id, { reveal_identity: value });
    } else {
      setShareSchedule(value);
      await updateSquadMembership(squad.id, { share_schedule: value });
    }
    await refreshSquads();
    setSaving(false);
  }

  async function handleRegenerateLink() {
    await regenerateInviteCode(squad.id);
    await refreshSquads();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-sand-200">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-sand-100">
          <svg className="w-5 h-5 text-earth-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-earth-900" style={{ fontFamily: 'Fraunces, serif' }}>
          Squad Settings
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Privacy Settings */}
        <div>
          <h3 className="text-sm font-medium text-earth-700 mb-3">Your Privacy</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm text-earth-800">Share schedule</div>
                <div className="text-xs text-earth-500">Squad members see your camp plans</div>
              </div>
              <button
                onClick={() => handleToggle('share_schedule', !shareSchedule)}
                disabled={saving}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  shareSchedule ? 'bg-ocean-500' : 'bg-earth-200'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  shareSchedule ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm text-earth-800">Reveal identity</div>
                <div className="text-xs text-earth-500">Show your name instead of "a friend"</div>
              </div>
              <button
                onClick={() => handleToggle('reveal_identity', !revealIdentity)}
                disabled={saving}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  revealIdentity ? 'bg-ocean-500' : 'bg-earth-200'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  revealIdentity ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </label>
          </div>
        </div>

        {/* Invite Link (owner only) */}
        {isOwner && (
          <div>
            <h3 className="text-sm font-medium text-earth-700 mb-3">Invite Link</h3>
            <div className="flex items-center justify-between p-3 bg-sand-50 rounded-lg">
              <span className="text-sm text-earth-600 truncate mr-2">
                {`${window.location.origin}/join/${squad.invite_code}`}
              </span>
              <button
                onClick={handleRegenerateLink}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-ocean-600 hover:bg-ocean-50 rounded transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div>
          <h3 className="text-sm font-medium text-red-600 mb-3">Danger Zone</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="flex-1 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Leave Squad
            </button>
            {isOwner && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Squad
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Leave Confirmation */}
      {showLeaveConfirm && (
        <ConfirmModal
          title="Leave Squad?"
          message="You'll no longer be able to see squad members' schedules or receive match notifications."
          confirmText="Leave"
          onConfirm={onLeave}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Squad?"
          message="This will permanently delete the squad for all members. This action cannot be undone."
          confirmText="Delete"
          danger
          onConfirm={onDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, danger, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-earth-900 mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
          {title}
        </h3>
        <p className="text-sm text-earth-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-earth-700 border border-sand-200 rounded-lg hover:bg-sand-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-ocean-500 hover:bg-ocean-600'
            }`}
          >
            {loading ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

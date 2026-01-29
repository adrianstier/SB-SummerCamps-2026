import React, { useState, useEffect } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import FamilyActivityFeed from './FamilyActivityFeed';
import FamilyComments from './FamilyComments';
import FamilySuggestions from './FamilySuggestions';
import FamilyApprovals from './FamilyApprovals';

export default function FamilyWorkspace({ onClose }) {
  const { user } = useAuth();
  const {
    families,
    currentFamily,
    setCurrentFamily,
    pendingInvitations,
    loading,
    isCurrentFamilyAdmin,
    currentFamilyMembers,
    createFamily,
    leaveFamily,
    deleteFamily,
    inviteToFamily,
    respondToInvitation,
    updateFamilyMember,
    removeFamilyMember,
    regenerateFamilyInviteCode,
    getFamilyByInviteCode,
    joinFamily,
    pendingSuggestions,
    pendingApprovals,
    unreadFamilyCount
  } = useFamily();

  const [activeTab, setActiveTab] = useState('activity'); // 'activity', 'comments', 'suggestions', 'approvals', 'settings'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Form states
  const [newFamilyName, setNewFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [joinPreview, setJoinPreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Look up family by invite code
  useEffect(() => {
    async function lookupCode() {
      if (inviteCode.length >= 12) {
        const family = await getFamilyByInviteCode(inviteCode);
        setJoinPreview(family);
      } else {
        setJoinPreview(null);
      }
    }
    lookupCode();
  }, [inviteCode, getFamilyByInviteCode]);

  async function handleCreateFamily(e) {
    e.preventDefault();
    if (!newFamilyName.trim()) return;

    const result = await createFamily(newFamilyName.trim());
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess('Family created');
      setShowCreateModal(false);
      setNewFamilyName('');
    }
  }

  async function handleJoinFamily(e) {
    e.preventDefault();
    if (!joinPreview) return;

    const result = await joinFamily(joinPreview.id);
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(`Joined ${joinPreview.name}`);
      setShowJoinModal(false);
      setInviteCode('');
      setJoinPreview(null);
    }
  }

  async function handleSendInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentFamily) return;

    const result = await inviteToFamily(currentFamily.id, inviteEmail.trim(), inviteMessage || null);
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteMessage('');
    }
  }

  async function handleAcceptInvitation(invitationId) {
    const result = await respondToInvitation(invitationId, true);
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess('Invitation accepted');
    }
  }

  async function handleDeclineInvitation(invitationId) {
    const result = await respondToInvitation(invitationId, false);
    if (result.error) {
      setError(result.error.message);
    }
  }

  async function handleCopyInviteCode() {
    if (currentFamily?.invite_code) {
      await navigator.clipboard.writeText(currentFamily.invite_code);
      setSuccess('Invite code copied');
    }
  }

  async function handleRegenerateCode() {
    if (!currentFamily) return;
    const result = await regenerateFamilyInviteCode(currentFamily.id);
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess('New invite code generated');
    }
  }

  async function handleLeaveFamily() {
    if (!currentFamily) return;
    if (!confirm(`Leave ${currentFamily.name}?`)) return;

    const result = await leaveFamily(currentFamily.id);
    if (result.error) {
      setError(result.error.message);
    }
  }

  async function handleDeleteFamily() {
    if (!currentFamily) return;
    if (!confirm(`Delete ${currentFamily.name}? This cannot be undone.`)) return;

    const result = await deleteFamily(currentFamily.id);
    if (result.error) {
      setError(result.error.message);
    }
  }

  async function handleRemoveMember(memberId, memberName) {
    if (!currentFamily) return;
    if (!confirm(`Remove ${memberName} from the family?`)) return;

    const result = await removeFamilyMember(currentFamily.id, memberId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(`${memberName} removed`);
    }
  }

  async function handleToggleApprovalPermission(memberId, currentValue) {
    if (!currentFamily) return;
    const result = await updateFamilyMember(currentFamily.id, memberId, {
      can_approve_camps: !currentValue
    });
    if (result.error) {
      setError(result.error.message);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-ocean-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-sand-50">
      {/* Header */}
      <header className="bg-white border-b border-sand-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-earth-600 hover:text-earth-900 hover:bg-sand-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="font-serif text-xl font-semibold text-earth-900">Family Planning</h1>
              {currentFamily && (
                <p className="text-sm text-earth-600">{currentFamily.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification badge */}
            {unreadFamilyCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium text-white bg-coral-500 rounded-full">
                {unreadFamilyCount}
              </span>
            )}

            {/* Family selector */}
            {families.length > 1 && (
              <select
                value={currentFamily?.id || ''}
                onChange={(e) => {
                  const family = families.find(f => f.id === e.target.value);
                  setCurrentFamily(family);
                }}
                className="px-3 py-1.5 text-sm border border-sand-300 rounded-lg bg-white focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              >
                {families.map(family => (
                  <option key={family.id} value={family.id}>{family.name}</option>
                ))}
              </select>
            )}

            {/* Actions menu */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsModal(!showSettingsModal)}
                className="p-2 text-earth-600 hover:text-earth-900 hover:bg-sand-100 rounded-lg transition-colors"
                aria-label="Family settings"
              >
                <SettingsIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Pending invitations banner */}
        {pendingInvitations.length > 0 && (
          <div className="mt-3 p-3 bg-ocean-50 border border-ocean-200 rounded-lg">
            <p className="text-sm font-medium text-ocean-900 mb-2">
              You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? 's' : ''}
            </p>
            {pendingInvitations.map(invitation => (
              <div key={invitation.id} className="flex items-center justify-between py-2 border-t border-ocean-200 first:border-t-0">
                <div>
                  <p className="text-sm text-earth-900">{invitation.families?.name}</p>
                  <p className="text-xs text-earth-600">From {invitation.profiles?.full_name}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    className="px-3 py-1 text-xs font-medium text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    className="px-3 py-1 text-xs font-medium text-earth-700 bg-sand-200 rounded-lg hover:bg-sand-300 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Status messages */}
        {(error || success) && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {error || success}
          </div>
        )}
      </header>

      {/* Empty state - no families */}
      {families.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-ocean-50 flex items-center justify-center mb-4">
            <UsersIcon className="w-8 h-8 text-ocean-500" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-earth-900 mb-2">
            Plan together
          </h2>
          <p className="text-sm text-earth-600 mb-6 max-w-xs">
            Create a family workspace to collaborate on summer planning with your partner.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 transition-colors"
            >
              Create Family
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 text-sm font-medium text-earth-700 bg-sand-200 rounded-lg hover:bg-sand-300 transition-colors"
            >
              Join with Code
            </button>
          </div>
        </div>
      )}

      {/* Main content - has families */}
      {families.length > 0 && currentFamily && (
        <>
          {/* Tab navigation */}
          <nav className="bg-white border-b border-sand-200 px-4">
            <div className="flex gap-1 -mb-px overflow-x-auto">
              <TabButton
                active={activeTab === 'activity'}
                onClick={() => setActiveTab('activity')}
                icon={<ActivityIcon />}
                label="Activity"
              />
              <TabButton
                active={activeTab === 'comments'}
                onClick={() => setActiveTab('comments')}
                icon={<CommentIcon />}
                label="Notes"
              />
              <TabButton
                active={activeTab === 'suggestions'}
                onClick={() => setActiveTab('suggestions')}
                icon={<LightbulbIcon />}
                label="Suggestions"
                badge={pendingSuggestions.length}
              />
              <TabButton
                active={activeTab === 'approvals'}
                onClick={() => setActiveTab('approvals')}
                icon={<CheckCircleIcon />}
                label="Approvals"
                badge={pendingApprovals.length}
              />
            </div>
          </nav>

          {/* Tab content */}
          <main className="flex-1 overflow-y-auto">
            {activeTab === 'activity' && <FamilyActivityFeed />}
            {activeTab === 'comments' && <FamilyComments />}
            {activeTab === 'suggestions' && <FamilySuggestions />}
            {activeTab === 'approvals' && <FamilyApprovals />}
          </main>
        </>
      )}

      {/* Create Family Modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} title="Create Family">
          <form onSubmit={handleCreateFamily} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Family Name
              </label>
              <input
                type="text"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                placeholder="e.g., The Smiths"
                className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-earth-700 hover:bg-sand-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFamilyName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Join Family Modal */}
      {showJoinModal && (
        <Modal onClose={() => { setShowJoinModal(false); setInviteCode(''); setJoinPreview(null); }} title="Join Family">
          <form onSubmit={handleJoinFamily} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Paste invite code here"
                className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 font-mono"
                autoFocus
              />
            </div>
            {joinPreview && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">Found: {joinPreview.name}</p>
                <p className="text-xs text-green-700">{joinPreview.member_count} member{joinPreview.member_count !== 1 ? 's' : ''}</p>
              </div>
            )}
            {inviteCode.length >= 12 && !joinPreview && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">No family found with this code</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowJoinModal(false); setInviteCode(''); setJoinPreview(null); }}
                className="px-4 py-2 text-sm font-medium text-earth-700 hover:bg-sand-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!joinPreview}
                className="px-4 py-2 text-sm font-medium text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Join Family
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invite Partner Modal */}
      {showInviteModal && (
        <Modal onClose={() => setShowInviteModal(false)} title="Invite Partner">
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="partner@email.com"
                className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Message (optional)
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal note..."
                rows={3}
                className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              />
            </div>
            <div className="p-3 bg-sand-100 rounded-lg">
              <p className="text-sm text-earth-700">
                <strong>Or share this code:</strong>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 px-3 py-2 bg-white border border-sand-300 rounded font-mono text-sm">
                  {currentFamily?.invite_code}
                </code>
                <button
                  type="button"
                  onClick={handleCopyInviteCode}
                  className="px-3 py-2 text-sm font-medium text-ocean-700 bg-ocean-100 rounded-lg hover:bg-ocean-200 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-sm font-medium text-earth-700 hover:bg-sand-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inviteEmail.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send Invite
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Settings Modal */}
      {showSettingsModal && currentFamily && (
        <Modal onClose={() => setShowSettingsModal(false)} title="Family Settings">
          <div className="space-y-6">
            {/* Members section */}
            <div>
              <h3 className="text-sm font-medium text-earth-900 mb-3">Members</h3>
              <div className="space-y-2">
                {currentFamilyMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-sand-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-medium">
                          {member.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-earth-900">
                          {member.profiles?.full_name || 'Unknown'}
                          {member.user_id === user?.id && ' (you)'}
                        </p>
                        <p className="text-xs text-earth-500 capitalize">{member.role}</p>
                      </div>
                    </div>
                    {isCurrentFamilyAdmin && member.user_id !== user?.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleApprovalPermission(member.user_id, member.can_approve_camps)}
                          className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                            member.can_approve_camps
                              ? 'bg-green-100 text-green-700'
                              : 'bg-sand-200 text-earth-600'
                          }`}
                          title={member.can_approve_camps ? 'Can approve camps' : 'Cannot approve camps'}
                        >
                          {member.can_approve_camps ? 'Approver' : 'Member'}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.user_id, member.profiles?.full_name)}
                          className="p-1 text-earth-400 hover:text-red-600 transition-colors"
                          title="Remove member"
                        >
                          <XIcon />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowSettingsModal(false); setShowInviteModal(true); }}
                className="mt-3 w-full px-4 py-2 text-sm font-medium text-ocean-700 bg-ocean-50 rounded-lg hover:bg-ocean-100 transition-colors"
              >
                Invite Partner
              </button>
            </div>

            {/* Invite code section */}
            {isCurrentFamilyAdmin && (
              <div>
                <h3 className="text-sm font-medium text-earth-900 mb-2">Invite Code</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-sand-100 border border-sand-300 rounded font-mono text-sm">
                    {currentFamily.invite_code}
                  </code>
                  <button
                    onClick={handleCopyInviteCode}
                    className="px-3 py-2 text-sm font-medium text-ocean-700 bg-ocean-100 rounded-lg hover:bg-ocean-200 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleRegenerateCode}
                    className="px-3 py-2 text-sm font-medium text-earth-600 bg-sand-200 rounded-lg hover:bg-sand-300 transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}

            {/* Family actions */}
            <div className="pt-4 border-t border-sand-200 space-y-2">
              {!isCurrentFamilyAdmin && (
                <button
                  onClick={handleLeaveFamily}
                  className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Leave Family
                </button>
              )}
              {isCurrentFamilyAdmin && currentFamilyMembers.length === 1 && (
                <button
                  onClick={handleDeleteFamily}
                  className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete Family
                </button>
              )}
            </div>

            {/* Create/Join actions for additional families */}
            <div className="pt-4 border-t border-sand-200 space-y-2">
              <button
                onClick={() => { setShowSettingsModal(false); setShowCreateModal(true); }}
                className="w-full px-4 py-2 text-sm font-medium text-earth-700 bg-sand-100 rounded-lg hover:bg-sand-200 transition-colors"
              >
                Create Another Family
              </button>
              <button
                onClick={() => { setShowSettingsModal(false); setShowJoinModal(true); }}
                className="w-full px-4 py-2 text-sm font-medium text-earth-700 bg-sand-100 rounded-lg hover:bg-sand-200 transition-colors"
              >
                Join Another Family
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Tab button component
function TabButton({ active, onClick, icon, label, badge = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-ocean-500 text-ocean-700'
          : 'border-transparent text-earth-600 hover:text-earth-900 hover:border-sand-300'
      }`}
    >
      <span className="w-4 h-4">{icon}</span>
      {label}
      {badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs font-medium text-white bg-coral-500 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

// Modal component
function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-sand-200">
          <h2 className="font-serif text-lg font-semibold text-earth-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-earth-400 hover:text-earth-600 transition-colors"
          >
            <XIcon />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Icons
function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

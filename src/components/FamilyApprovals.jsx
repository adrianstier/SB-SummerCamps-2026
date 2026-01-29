import React, { useState } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from '../lib/formatters';

export default function FamilyApprovals() {
  const { user } = useAuth();
  const {
    approvalRequests,
    pendingApprovals,
    respondToApproval,
    canApproveCamps,
    requiresApproval,
    currentFamily
  } = useFamily();

  const [filter, setFilter] = useState('pending'); // 'pending', 'all', 'mine'
  const [responding, setResponding] = useState(null);
  const [error, setError] = useState(null);

  // Filter approvals
  const filteredApprovals = approvalRequests.filter(a => {
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'mine') return a.requested_by === user?.id;
    return true;
  });

  async function handleRespond(approvalId, approved, note = null) {
    setResponding(approvalId);
    setError(null);

    const result = await respondToApproval(approvalId, approved, note);
    if (result.error) {
      setError(result.error.message);
    }

    setResponding(null);
  }

  if (!currentFamily) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-earth-600">Select a family to view approvals.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with filter */}
      <div className="p-4 border-b border-sand-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')} count={pendingApprovals.length}>
              Pending
            </FilterButton>
            <FilterButton active={filter === 'mine'} onClick={() => setFilter('mine')}>
              My Requests
            </FilterButton>
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </FilterButton>
          </div>
        </div>

        {/* Approval status indicator */}
        {requiresApproval ? (
          <div className="flex items-center gap-2 text-sm text-earth-600 bg-sand-50 px-3 py-2 rounded-lg">
            <ShieldIcon className="w-4 h-4 text-ocean-500" />
            <span>Approval required for schedule changes</span>
            {canApproveCamps && (
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                You can approve
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-earth-500 bg-sand-50 px-3 py-2 rounded-lg">
            <ShieldOffIcon className="w-4 h-4" />
            <span>Approval not required</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 text-red-800 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Approvals list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredApprovals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center mb-3">
              <CheckCircleIcon className="w-6 h-6 text-earth-400" />
            </div>
            <h3 className="font-medium text-earth-900 mb-1">
              {filter === 'pending' ? 'No pending approvals' : filter === 'mine' ? 'No requests from you' : 'No approvals yet'}
            </h3>
            <p className="text-sm text-earth-600 max-w-xs">
              {filter === 'pending'
                ? 'All clear! No schedule changes need your approval.'
                : requiresApproval
                  ? 'When you make schedule changes, approval requests will appear here.'
                  : 'Approval is not required for this family.'}
            </p>
          </div>
        ) : (
          filteredApprovals.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              currentUserId={user?.id}
              canApprove={canApproveCamps && approval.status === 'pending' && approval.requested_by !== user?.id}
              onApprove={(note) => handleRespond(approval.id, true, note)}
              onReject={(note) => handleRespond(approval.id, false, note)}
              isResponding={responding === approval.id}
            />
          ))
        )}
      </div>
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

function ApprovalCard({ approval, currentUserId, canApprove, onApprove, onReject, isResponding }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const {
    action_type,
    action_data,
    status,
    created_at,
    requested_by,
    requested_by_profile,
    responded_by_profile,
    response_note,
    responded_at
  } = approval;

  const isOwnRequest = requested_by === currentUserId;

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  const actionLabels = {
    add_camp: 'Add Camp',
    remove_camp: 'Remove Camp',
    move_camp: 'Move Camp',
    update_camp: 'Update Camp'
  };

  function handleReject() {
    onReject(rejectNote || null);
    setShowRejectModal(false);
    setRejectNote('');
  }

  return (
    <div className="bg-white rounded-lg border border-sand-200 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {requested_by_profile?.avatar_url ? (
              <img src={requested_by_profile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-medium text-sm">
                {requested_by_profile?.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <p className="text-sm">
                <span className="font-medium text-earth-900">
                  {isOwnRequest ? 'You' : requested_by_profile?.full_name}
                </span>
                {' requested to '}
                <span className="font-medium text-earth-900 lowercase">
                  {actionLabels[action_type] || action_type}
                </span>
              </p>
              <p className="text-xs text-earth-400">{formatDistanceToNow(new Date(created_at))}</p>
            </div>
          </div>

          <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${statusColors[status]}`}>
            {status}
          </span>
        </div>

        {/* Action details */}
        <div className="bg-sand-50 rounded-lg p-3 mb-3">
          {action_data?.camp_name && (
            <h4 className="font-medium text-earth-900 mb-1">{action_data.camp_name}</h4>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-earth-600">
            {action_data?.child_name && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: action_data.child_color || '#6366f1' }}></span>
                {action_data.child_name}
              </span>
            )}
            {action_data?.week_date && (
              <span>
                Week of {new Date(action_data.week_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {action_data?.from_week && action_data?.to_week && (
              <span>
                Moving from {new Date(action_data.from_week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' → '}
                {new Date(action_data.to_week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Response info for completed approvals */}
        {status !== 'pending' && responded_by_profile && (
          <div className={`flex items-start gap-2 p-2 rounded-lg mb-3 ${status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex-shrink-0">
              {responded_by_profile.avatar_url ? (
                <img src={responded_by_profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-sand-200 flex items-center justify-center text-xs font-medium">
                  {responded_by_profile.full_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-earth-700">
                <span className="font-medium">{responded_by_profile.full_name}</span>
                {' '}
                {status === 'approved' ? 'approved' : 'rejected'}
                {' '}
                {formatDistanceToNow(new Date(responded_at))}
              </p>
              {response_note && (
                <p className="text-sm text-earth-600 italic mt-1">"{response_note}"</p>
              )}
            </div>
          </div>
        )}

        {/* Actions for pending approvals */}
        {canApprove && (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(null)}
              disabled={isResponding}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isResponding ? '...' : 'Approve'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isResponding}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </div>
        )}

        {/* Waiting indicator for own requests */}
        {isOwnRequest && status === 'pending' && (
          <div className="flex items-center gap-2 text-sm text-earth-500 bg-sand-50 px-3 py-2 rounded-lg">
            <ClockIcon className="w-4 h-4" />
            <span>Waiting for approval</span>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRejectModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-sand-200">
              <h3 className="font-serif text-lg font-semibold text-earth-900">Reject Request</h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-earth-600">
                Add an optional note explaining why you're rejecting this request.
              </p>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Optional note..."
                rows={3}
                className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-earth-700 hover:bg-sand-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function CheckCircleIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShieldIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ShieldOffIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

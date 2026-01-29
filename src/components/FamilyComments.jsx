import React, { useState } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from '../lib/formatters';

export default function FamilyComments() {
  const { user, children: familyChildren, scheduledCamps } = useAuth();
  const {
    comments,
    addComment,
    updateComment,
    deleteComment,
    pinComment,
    isCurrentFamilyAdmin,
    currentFamily
  } = useFamily();

  const [newComment, setNewComment] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Filter comments based on selection
  const filteredComments = comments.filter(c => {
    if (selectedWeek && c.week_date !== selectedWeek) return false;
    if (selectedChild && c.child_id !== selectedChild) return false;
    return true;
  });

  // Separate pinned and unpinned
  const pinnedComments = filteredComments.filter(c => c.is_pinned);
  const regularComments = filteredComments.filter(c => !c.is_pinned);

  async function handleSubmitComment(e) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    const result = await addComment({
      comment_text: newComment.trim(),
      week_date: selectedWeek,
      child_id: selectedChild,
      parent_comment_id: replyingTo?.id || null
    });

    if (result.error) {
      setError(result.error.message);
    } else {
      setNewComment('');
      setReplyingTo(null);
    }

    setSubmitting(false);
  }

  async function handleUpdateComment() {
    if (!editText.trim() || !editingComment) return;

    const result = await updateComment(editingComment.id, editText.trim());
    if (result.error) {
      setError(result.error.message);
    } else {
      setEditingComment(null);
      setEditText('');
    }
  }

  async function handleDeleteComment(commentId) {
    if (!confirm('Delete this note?')) return;
    await deleteComment(commentId);
  }

  async function handleTogglePin(comment) {
    await pinComment(comment.id, !comment.is_pinned);
  }

  function startEdit(comment) {
    setEditingComment(comment);
    setEditText(comment.comment_text);
  }

  function startReply(comment) {
    setReplyingTo(comment);
    setNewComment('');
  }

  if (!currentFamily) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-earth-600">Select a family to view notes.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="p-4 border-b border-sand-200 bg-white flex flex-wrap gap-2">
        <select
          value={selectedWeek || ''}
          onChange={(e) => setSelectedWeek(e.target.value || null)}
          className="px-3 py-1.5 text-sm border border-sand-300 rounded-lg bg-white focus:ring-2 focus:ring-ocean-500"
        >
          <option value="">All weeks</option>
          {getWeekOptions().map(week => (
            <option key={week.value} value={week.value}>{week.label}</option>
          ))}
        </select>

        <select
          value={selectedChild || ''}
          onChange={(e) => setSelectedChild(e.target.value || null)}
          className="px-3 py-1.5 text-sm border border-sand-300 rounded-lg bg-white focus:ring-2 focus:ring-ocean-500"
        >
          <option value="">All children</option>
          {familyChildren.map(child => (
            <option key={child.id} value={child.id}>{child.name}</option>
          ))}
        </select>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-800 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Pinned comments */}
        {pinnedComments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-earth-500 uppercase tracking-wide flex items-center gap-1">
              <PinIcon className="w-3 h-3" />
              Pinned
            </h3>
            {pinnedComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isOwn={comment.user_id === user?.id}
                isAdmin={isCurrentFamilyAdmin}
                onEdit={startEdit}
                onDelete={handleDeleteComment}
                onReply={startReply}
                onTogglePin={handleTogglePin}
                editingId={editingComment?.id}
                editText={editText}
                setEditText={setEditText}
                onSaveEdit={handleUpdateComment}
                onCancelEdit={() => { setEditingComment(null); setEditText(''); }}
              />
            ))}
          </div>
        )}

        {/* Regular comments */}
        {regularComments.length > 0 ? (
          <div className="space-y-2">
            {pinnedComments.length > 0 && (
              <h3 className="text-xs font-medium text-earth-500 uppercase tracking-wide pt-2">All Notes</h3>
            )}
            {regularComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isOwn={comment.user_id === user?.id}
                isAdmin={isCurrentFamilyAdmin}
                onEdit={startEdit}
                onDelete={handleDeleteComment}
                onReply={startReply}
                onTogglePin={handleTogglePin}
                editingId={editingComment?.id}
                editText={editText}
                setEditText={setEditText}
                onSaveEdit={handleUpdateComment}
                onCancelEdit={() => { setEditingComment(null); setEditText(''); }}
              />
            ))}
          </div>
        ) : pinnedComments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center mb-3">
              <CommentIcon className="w-6 h-6 text-earth-400" />
            </div>
            <h3 className="font-medium text-earth-900 mb-1">No notes yet</h3>
            <p className="text-sm text-earth-600 max-w-xs">
              Add notes about camps, schedules, or anything your family should know.
            </p>
          </div>
        )}
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-ocean-50 border-t border-ocean-200 flex items-center justify-between">
          <span className="text-sm text-ocean-700">
            Replying to {replyingTo.profiles?.full_name}
          </span>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-ocean-600 hover:text-ocean-800"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New comment form */}
      <form onSubmit={handleSubmitComment} className="p-4 border-t border-sand-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? 'Write a reply...' : 'Add a note for your family...'}
            className="flex-1 px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CommentCard({
  comment,
  isOwn,
  isAdmin,
  onEdit,
  onDelete,
  onReply,
  onTogglePin,
  editingId,
  editText,
  setEditText,
  onSaveEdit,
  onCancelEdit
}) {
  const isEditing = editingId === comment.id;
  const { profiles, comment_text, created_at, is_pinned, replies, children } = comment;

  return (
    <div className={`bg-white rounded-lg border ${is_pinned ? 'border-ocean-300 bg-ocean-50/50' : 'border-sand-200'} overflow-hidden`}>
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {profiles?.avatar_url ? (
              <img src={profiles.avatar_url} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-medium text-xs">
                {profiles?.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-earth-900">{profiles?.full_name}</span>
              {children && (
                <span className="text-xs text-earth-500 ml-2">
                  about <span style={{ color: children.color }}>{children.name}</span>
                </span>
              )}
              <span className="text-xs text-earth-400 ml-2">
                {formatDistanceToNow(new Date(created_at))}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={() => onTogglePin(comment)}
                className={`p-1 rounded transition-colors ${is_pinned ? 'text-ocean-600' : 'text-earth-400 hover:text-earth-600'}`}
                title={is_pinned ? 'Unpin' : 'Pin'}
              >
                <PinIcon className="w-4 h-4" />
              </button>
            )}
            {isOwn && (
              <>
                <button
                  onClick={() => onEdit(comment)}
                  className="p-1 text-earth-400 hover:text-earth-600 transition-colors"
                  title="Edit"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="p-1 text-earth-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-3 py-2 border border-sand-300 rounded-lg focus:ring-2 focus:ring-ocean-500"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1 text-sm text-earth-600 hover:bg-sand-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                className="px-3 py-1 text-sm text-white bg-ocean-500 rounded-lg hover:bg-ocean-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-earth-700 whitespace-pre-wrap">{comment_text}</p>
        )}

        {/* Reply button */}
        {!isEditing && (
          <button
            onClick={() => onReply(comment)}
            className="mt-2 text-xs text-ocean-600 hover:text-ocean-800 transition-colors"
          >
            Reply
          </button>
        )}
      </div>

      {/* Replies */}
      {replies && replies.length > 0 && (
        <div className="border-t border-sand-200 bg-sand-50/50 px-3 py-2 space-y-2">
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-2">
              {reply.profiles?.avatar_url ? (
                <img src={reply.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-medium text-[10px] flex-shrink-0">
                  {reply.profiles?.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-earth-900">{reply.profiles?.full_name}</span>
                <span className="text-xs text-earth-400 ml-1">
                  {formatDistanceToNow(new Date(reply.created_at))}
                </span>
                <p className="text-xs text-earth-600 mt-0.5">{reply.comment_text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Generate week options for filter
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
function CommentIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function PinIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function EditIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

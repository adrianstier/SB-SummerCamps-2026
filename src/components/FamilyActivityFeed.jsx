import React, { useEffect } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { formatDistanceToNow } from '../lib/formatters';

export default function FamilyActivityFeed() {
  const {
    activityFeed,
    refreshActivityFeed,
    familyNotifications,
    markNotificationRead,
    markAllNotificationsRead
  } = useFamily();

  // Mark notifications as read when viewing
  useEffect(() => {
    const unreadNotifications = familyNotifications.filter(n => !n.read);
    if (unreadNotifications.length > 0) {
      // Mark all as read after a short delay (so user sees them first)
      const timer = setTimeout(() => {
        markAllNotificationsRead();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [familyNotifications, markAllNotificationsRead]);

  if (activityFeed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center mb-3">
          <ActivityIcon className="w-6 h-6 text-earth-400" />
        </div>
        <h3 className="font-medium text-earth-900 mb-1">No activity yet</h3>
        <p className="text-sm text-earth-600 max-w-xs">
          Activity from family members will appear here. Start by adding camps to the schedule.
        </p>
      </div>
    );
  }

  // Group activities by date
  const groupedActivities = activityFeed.reduce((groups, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {});

  return (
    <div className="p-4 space-y-6">
      {Object.entries(groupedActivities).map(([date, activities]) => (
        <div key={date}>
          <h3 className="text-xs font-medium text-earth-500 uppercase tracking-wide mb-3">{date}</h3>
          <div className="space-y-3">
            {activities.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityItem({ activity }) {
  const { activity_type, details, camp_name, children, profiles, created_at, week_date } = activity;

  const actorName = profiles?.full_name || 'Someone';
  const childName = children?.name;
  const childColor = children?.color;

  // Format the activity message
  const getMessage = () => {
    switch (activity_type) {
      case 'camp_added':
        return (
          <>
            <strong>{actorName}</strong> added <strong>{camp_name || 'a camp'}</strong>
            {childName && <> for <span style={{ color: childColor }}>{childName}</span></>}
          </>
        );
      case 'camp_removed':
        return (
          <>
            <strong>{actorName}</strong> removed <strong>{camp_name || 'a camp'}</strong>
            {childName && <> from <span style={{ color: childColor }}>{childName}</span>'s schedule</>}
          </>
        );
      case 'camp_updated':
        return (
          <>
            <strong>{actorName}</strong> updated <strong>{camp_name || 'a camp'}</strong>
            {details?.old_status !== details?.new_status && (
              <> status to <StatusBadge status={details?.new_status} /></>
            )}
          </>
        );
      case 'comment_added':
        return (
          <>
            <strong>{actorName}</strong> left a note
            {childName && <> on <span style={{ color: childColor }}>{childName}</span>'s schedule</>}
          </>
        );
      case 'comment_reply':
        return (
          <>
            <strong>{actorName}</strong> replied to a note
          </>
        );
      case 'suggestion_sent':
        return (
          <>
            <strong>{actorName}</strong> suggested <strong>{camp_name || 'a camp'}</strong>
          </>
        );
      case 'suggestion_accepted':
        return (
          <>
            <strong>{actorName}</strong> accepted a suggestion for <strong>{camp_name || 'a camp'}</strong>
          </>
        );
      case 'suggestion_declined':
        return (
          <>
            <strong>{actorName}</strong> declined a suggestion for <strong>{camp_name || 'a camp'}</strong>
          </>
        );
      case 'approval_requested':
        return (
          <>
            <strong>{actorName}</strong> requested approval to add <strong>{camp_name || 'a camp'}</strong>
          </>
        );
      case 'approval_approved':
        return (
          <>
            <strong>{actorName}</strong> approved adding <strong>{camp_name || 'a camp'}</strong>
          </>
        );
      case 'approval_denied':
        return (
          <>
            <strong>{actorName}</strong> denied adding <strong>{camp_name || 'a camp'}</strong>
          </>
        );
      case 'member_joined':
        return (
          <>
            <strong>{actorName}</strong> joined the family
          </>
        );
      case 'member_left':
        return (
          <>
            <strong>{actorName}</strong> left the family
          </>
        );
      case 'member_invited':
        return (
          <>
            <strong>{actorName}</strong> invited someone to the family
          </>
        );
      case 'child_added':
        return (
          <>
            <strong>{actorName}</strong> added {childName ? <span style={{ color: childColor }}>{childName}</span> : 'a child'} to the family
          </>
        );
      case 'settings_changed':
        return (
          <>
            <strong>{actorName}</strong> updated family settings
          </>
        );
      default:
        return (
          <>
            <strong>{actorName}</strong> made a change
          </>
        );
    }
  };

  const getIcon = () => {
    switch (activity_type) {
      case 'camp_added':
        return <PlusCircleIcon className="w-4 h-4 text-green-600" />;
      case 'camp_removed':
        return <MinusCircleIcon className="w-4 h-4 text-red-500" />;
      case 'camp_updated':
        return <EditIcon className="w-4 h-4 text-ocean-500" />;
      case 'comment_added':
      case 'comment_reply':
        return <CommentIcon className="w-4 h-4 text-purple-500" />;
      case 'suggestion_sent':
      case 'suggestion_accepted':
      case 'suggestion_declined':
        return <LightbulbIcon className="w-4 h-4 text-amber-500" />;
      case 'approval_requested':
      case 'approval_approved':
      case 'approval_denied':
        return <CheckCircleIcon className="w-4 h-4 text-ocean-500" />;
      case 'member_joined':
      case 'member_invited':
        return <UserPlusIcon className="w-4 h-4 text-green-600" />;
      case 'member_left':
        return <UserMinusIcon className="w-4 h-4 text-earth-500" />;
      default:
        return <ActivityIcon className="w-4 h-4 text-earth-400" />;
    }
  };

  return (
    <div className="flex gap-3 p-3 bg-white rounded-lg border border-sand-200 hover:border-sand-300 transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {profiles?.avatar_url ? (
          <img src={profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-medium text-sm">
            {profiles?.full_name?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-earth-700">
            {getMessage()}
          </p>
          <span className="flex-shrink-0">{getIcon()}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-earth-400">
            {formatDistanceToNow(new Date(created_at))}
          </span>
          {week_date && (
            <>
              <span className="text-earth-300">-</span>
              <span className="text-xs text-earth-500">
                Week of {new Date(week_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    planned: 'bg-sand-200 text-earth-700',
    registered: 'bg-ocean-100 text-ocean-700',
    confirmed: 'bg-green-100 text-green-700',
    waitlisted: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${colors[status] || colors.planned}`}>
      {status}
    </span>
  );
}

// Icons
function ActivityIcon({ className }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function PlusCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MinusCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function CommentIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function LightbulbIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function CheckCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserPlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function UserMinusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
    </svg>
  );
}

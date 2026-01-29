import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  supabase,
  getFamilies,
  createFamily,
  updateFamily,
  deleteFamily,
  joinFamily,
  leaveFamily,
  updateFamilyMember,
  removeFamilyMember,
  getFamilyByInviteCode,
  regenerateFamilyInviteCode,
  inviteToFamily,
  getMyInvitations,
  respondToInvitation,
  getScheduleComments,
  addScheduleComment,
  updateScheduleComment,
  deleteScheduleComment,
  toggleCommentPin,
  getCampSuggestions,
  suggestCamp,
  respondToSuggestion,
  getApprovalRequests,
  requestApproval,
  respondToApproval,
  getFamilyActivityFeed,
  getFamilyNotifications,
  markFamilyNotificationRead,
  markAllFamilyNotificationsRead,
  getUnreadFamilyNotificationCount,
  subscribeFamilyNotifications,
  subscribeFamilyActivity,
  subscribeScheduleComments,
  subscribeCampSuggestions,
  subscribeApprovalRequests
} from '../lib/supabase';

const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const { user, isConfigured } = useAuth();

  // Family state
  const [families, setFamilies] = useState([]);
  const [currentFamily, setCurrentFamily] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Family-specific data (for current family)
  const [comments, setComments] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [familyNotifications, setFamilyNotifications] = useState([]);
  const [unreadFamilyCount, setUnreadFamilyCount] = useState(0);

  // Subscriptions
  const [subscriptions, setSubscriptions] = useState([]);

  // Load families when user logs in
  useEffect(() => {
    if (!isConfigured || !user) {
      setFamilies([]);
      setCurrentFamily(null);
      setPendingInvitations([]);
      setLoading(false);
      return;
    }

    loadFamilyData();
  }, [user, isConfigured]);

  // Set up real-time subscriptions when current family changes
  useEffect(() => {
    // Clean up old subscriptions
    subscriptions.forEach(sub => sub.unsubscribe());
    setSubscriptions([]);

    if (!currentFamily || !user) return;

    // Set up new subscriptions
    const newSubscriptions = [
      subscribeFamilyNotifications(user.id, handleNewNotification),
      subscribeFamilyActivity(currentFamily.id, handleNewActivity),
      subscribeScheduleComments(currentFamily.id, handleCommentChange),
      subscribeCampSuggestions(currentFamily.id, handleSuggestionChange),
      subscribeApprovalRequests(currentFamily.id, handleApprovalChange)
    ];

    setSubscriptions(newSubscriptions);

    // Load family-specific data
    loadFamilySpecificData(currentFamily.id);

    return () => {
      newSubscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [currentFamily?.id, user?.id]);

  // Real-time handlers
  function handleNewNotification(notification) {
    setFamilyNotifications(prev => [notification, ...prev]);
    setUnreadFamilyCount(prev => prev + 1);
  }

  function handleNewActivity(activity) {
    setActivityFeed(prev => [activity, ...prev]);
  }

  function handleCommentChange(eventType, data) {
    if (eventType === 'INSERT') {
      setComments(prev => [data, ...prev]);
    } else if (eventType === 'UPDATE') {
      setComments(prev => prev.map(c => c.id === data.id ? data : c));
    } else if (eventType === 'DELETE') {
      setComments(prev => prev.filter(c => c.id !== data.id));
    }
  }

  function handleSuggestionChange(eventType, data) {
    if (eventType === 'INSERT') {
      setSuggestions(prev => [data, ...prev]);
    } else if (eventType === 'UPDATE') {
      setSuggestions(prev => prev.map(s => s.id === data.id ? data : s));
    } else if (eventType === 'DELETE') {
      setSuggestions(prev => prev.filter(s => s.id !== data.id));
    }
  }

  function handleApprovalChange(eventType, data) {
    if (eventType === 'INSERT') {
      setApprovalRequests(prev => [data, ...prev]);
    } else if (eventType === 'UPDATE') {
      setApprovalRequests(prev => prev.map(a => a.id === data.id ? data : a));
    } else if (eventType === 'DELETE') {
      setApprovalRequests(prev => prev.filter(a => a.id !== data.id));
    }
  }

  // Load all family data
  async function loadFamilyData() {
    setLoading(true);
    try {
      const [familiesData, invitationsData, notificationsData, unreadCount] = await Promise.all([
        getFamilies(),
        getMyInvitations(),
        getFamilyNotifications(),
        getUnreadFamilyNotificationCount()
      ]);

      setFamilies(familiesData);
      setPendingInvitations(invitationsData);
      setFamilyNotifications(notificationsData);
      setUnreadFamilyCount(unreadCount);

      // Auto-select first family if available
      if (familiesData.length > 0 && !currentFamily) {
        setCurrentFamily(familiesData[0]);
      }
    } catch (error) {
      console.error('Error loading family data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Load data specific to current family
  async function loadFamilySpecificData(familyId) {
    try {
      const [commentsData, suggestionsData, approvalsData, activityData] = await Promise.all([
        getScheduleComments(familyId),
        getCampSuggestions(familyId),
        getApprovalRequests(familyId),
        getFamilyActivityFeed(familyId)
      ]);

      setComments(commentsData);
      setSuggestions(suggestionsData);
      setApprovalRequests(approvalsData);
      setActivityFeed(activityData);
    } catch (error) {
      console.error('Error loading family-specific data:', error);
    }
  }

  // Family management actions
  const handleCreateFamily = useCallback(async (name) => {
    const result = await createFamily(name);
    if (result.data) {
      await loadFamilyData();
      setCurrentFamily(result.data);
    }
    return result;
  }, []);

  const handleUpdateFamily = useCallback(async (familyId, updates) => {
    const result = await updateFamily(familyId, updates);
    if (result.data) {
      setFamilies(prev => prev.map(f => f.id === familyId ? { ...f, ...result.data } : f));
      if (currentFamily?.id === familyId) {
        setCurrentFamily(prev => ({ ...prev, ...result.data }));
      }
    }
    return result;
  }, [currentFamily]);

  const handleDeleteFamily = useCallback(async (familyId) => {
    const result = await deleteFamily(familyId);
    if (!result.error) {
      setFamilies(prev => prev.filter(f => f.id !== familyId));
      if (currentFamily?.id === familyId) {
        setCurrentFamily(families.find(f => f.id !== familyId) || null);
      }
    }
    return result;
  }, [currentFamily, families]);

  const handleJoinFamily = useCallback(async (familyId) => {
    const result = await joinFamily(familyId);
    if (result.data) {
      await loadFamilyData();
    }
    return result;
  }, []);

  const handleLeaveFamily = useCallback(async (familyId) => {
    const result = await leaveFamily(familyId);
    if (!result.error) {
      setFamilies(prev => prev.filter(f => f.id !== familyId));
      if (currentFamily?.id === familyId) {
        setCurrentFamily(families.find(f => f.id !== familyId) || null);
      }
    }
    return result;
  }, [currentFamily, families]);

  const handleInviteToFamily = useCallback(async (familyId, email, message) => {
    return inviteToFamily(familyId, email, message);
  }, []);

  const handleRespondToInvitation = useCallback(async (invitationId, accept) => {
    const result = await respondToInvitation(invitationId, accept);
    if (!result.error) {
      setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
      if (accept) {
        await loadFamilyData();
      }
    }
    return result;
  }, []);

  // Comment actions
  const handleAddComment = useCallback(async (comment) => {
    const result = await addScheduleComment({
      ...comment,
      family_id: currentFamily?.id
    });
    if (result.data) {
      // Optimistic update handled by subscription
    }
    return result;
  }, [currentFamily]);

  const handleUpdateComment = useCallback(async (commentId, text) => {
    return updateScheduleComment(commentId, text);
  }, []);

  const handleDeleteComment = useCallback(async (commentId) => {
    return deleteScheduleComment(commentId);
  }, []);

  const handlePinComment = useCallback(async (commentId, isPinned) => {
    return toggleCommentPin(commentId, isPinned);
  }, []);

  // Suggestion actions
  const handleSuggestCamp = useCallback(async (suggestion) => {
    return suggestCamp({
      ...suggestion,
      family_id: currentFamily?.id
    });
  }, [currentFamily]);

  const handleRespondToSuggestion = useCallback(async (suggestionId, accept) => {
    return respondToSuggestion(suggestionId, accept);
  }, []);

  // Approval actions
  const handleRequestApproval = useCallback(async (request) => {
    return requestApproval({
      ...request,
      family_id: currentFamily?.id
    });
  }, [currentFamily]);

  const handleRespondToApproval = useCallback(async (requestId, approve, note) => {
    return respondToApproval(requestId, approve, note);
  }, []);

  // Notification actions
  const handleMarkNotificationRead = useCallback(async (notificationId) => {
    const result = await markFamilyNotificationRead(notificationId);
    if (!result.error) {
      setFamilyNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadFamilyCount(prev => Math.max(0, prev - 1));
    }
    return result;
  }, []);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    const result = await markAllFamilyNotificationsRead();
    if (!result.error) {
      setFamilyNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadFamilyCount(0);
    }
    return result;
  }, []);

  // Refresh functions
  const refreshFamilies = useCallback(async () => {
    const data = await getFamilies();
    setFamilies(data);
  }, []);

  const refreshInvitations = useCallback(async () => {
    const data = await getMyInvitations();
    setPendingInvitations(data);
  }, []);

  const refreshComments = useCallback(async () => {
    if (currentFamily) {
      const data = await getScheduleComments(currentFamily.id);
      setComments(data);
    }
  }, [currentFamily]);

  const refreshSuggestions = useCallback(async () => {
    if (currentFamily) {
      const data = await getCampSuggestions(currentFamily.id);
      setSuggestions(data);
    }
  }, [currentFamily]);

  const refreshApprovalRequests = useCallback(async () => {
    if (currentFamily) {
      const data = await getApprovalRequests(currentFamily.id);
      setApprovalRequests(data);
    }
  }, [currentFamily]);

  const refreshActivityFeed = useCallback(async () => {
    if (currentFamily) {
      const data = await getFamilyActivityFeed(currentFamily.id);
      setActivityFeed(data);
    }
  }, [currentFamily]);

  const refreshFamilyNotifications = useCallback(async () => {
    const [notifications, count] = await Promise.all([
      getFamilyNotifications(),
      getUnreadFamilyNotificationCount()
    ]);
    setFamilyNotifications(notifications);
    setUnreadFamilyCount(count);
  }, []);

  // Computed values
  const currentFamilyMembers = useMemo(() => {
    return currentFamily?.family_members || [];
  }, [currentFamily]);

  const isCurrentFamilyAdmin = useMemo(() => {
    if (!currentFamily || !user) return false;
    const membership = currentFamily.family_members?.find(m => m.user_id === user.id);
    return membership?.role === 'owner' || membership?.role === 'admin';
  }, [currentFamily, user]);

  const canEditSchedule = useMemo(() => {
    if (!currentFamily || !user) return true; // No family = full access
    const membership = currentFamily.family_members?.find(m => m.user_id === user.id);
    return membership?.can_edit_schedule ?? true;
  }, [currentFamily, user]);

  const canApproveCamps = useMemo(() => {
    if (!currentFamily || !user) return true;
    const membership = currentFamily.family_members?.find(m => m.user_id === user.id);
    return membership?.can_approve_camps ?? false;
  }, [currentFamily, user]);

  const requiresApproval = useMemo(() => {
    return currentFamily?.settings?.require_approval ?? false;
  }, [currentFamily]);

  const pendingSuggestions = useMemo(() => {
    if (!user) return [];
    return suggestions.filter(s =>
      s.status === 'pending' &&
      (s.suggested_to === user.id || s.suggested_to === null)
    );
  }, [suggestions, user]);

  const pendingApprovals = useMemo(() => {
    return approvalRequests.filter(a => a.status === 'pending');
  }, [approvalRequests]);

  const value = useMemo(() => ({
    // State
    families,
    currentFamily,
    pendingInvitations,
    loading,
    comments,
    suggestions,
    approvalRequests,
    activityFeed,
    familyNotifications,
    unreadFamilyCount,

    // Computed
    currentFamilyMembers,
    isCurrentFamilyAdmin,
    canEditSchedule,
    canApproveCamps,
    requiresApproval,
    pendingSuggestions,
    pendingApprovals,

    // Actions - Family management
    setCurrentFamily,
    createFamily: handleCreateFamily,
    updateFamily: handleUpdateFamily,
    deleteFamily: handleDeleteFamily,
    joinFamily: handleJoinFamily,
    leaveFamily: handleLeaveFamily,
    inviteToFamily: handleInviteToFamily,
    respondToInvitation: handleRespondToInvitation,
    updateFamilyMember,
    removeFamilyMember,
    getFamilyByInviteCode,
    regenerateFamilyInviteCode,

    // Actions - Comments
    addComment: handleAddComment,
    updateComment: handleUpdateComment,
    deleteComment: handleDeleteComment,
    pinComment: handlePinComment,

    // Actions - Suggestions
    suggestCamp: handleSuggestCamp,
    respondToSuggestion: handleRespondToSuggestion,

    // Actions - Approvals
    requestApproval: handleRequestApproval,
    respondToApproval: handleRespondToApproval,

    // Actions - Notifications
    markNotificationRead: handleMarkNotificationRead,
    markAllNotificationsRead: handleMarkAllNotificationsRead,

    // Refresh functions
    refreshFamilies,
    refreshInvitations,
    refreshComments,
    refreshSuggestions,
    refreshApprovalRequests,
    refreshActivityFeed,
    refreshFamilyNotifications
  }), [
    families,
    currentFamily,
    pendingInvitations,
    loading,
    comments,
    suggestions,
    approvalRequests,
    activityFeed,
    familyNotifications,
    unreadFamilyCount,
    currentFamilyMembers,
    isCurrentFamilyAdmin,
    canEditSchedule,
    canApproveCamps,
    requiresApproval,
    pendingSuggestions,
    pendingApprovals,
    handleCreateFamily,
    handleUpdateFamily,
    handleDeleteFamily,
    handleJoinFamily,
    handleLeaveFamily,
    handleInviteToFamily,
    handleRespondToInvitation,
    handleAddComment,
    handleUpdateComment,
    handleDeleteComment,
    handlePinComment,
    handleSuggestCamp,
    handleRespondToSuggestion,
    handleRequestApproval,
    handleRespondToApproval,
    handleMarkNotificationRead,
    handleMarkAllNotificationsRead,
    refreshFamilies,
    refreshInvitations,
    refreshComments,
    refreshSuggestions,
    refreshApprovalRequests,
    refreshActivityFeed,
    refreshFamilyNotifications
  ]);

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}

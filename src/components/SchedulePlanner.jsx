import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSummerWeeks2026, addScheduledCamp, deleteScheduledCamp, updateScheduledCamp, clearSampleData, toggleLookingForFriends } from '../lib/supabase';
import { createGoogleCalendarUrl, exportAllToICal, formatCampForCalendar } from '../lib/googleCalendar';
import { GuidedTour } from './GuidedTour';
import SquadsPanel from './SquadsPanel';
import SquadNotificationBell from './SquadNotificationBell';
import './SchedulePlanner.css';

const summerWeeks = getSummerWeeks2026();

const CATEGORY_COLORS = {
  'Sports': '#3b82f6',
  'Arts': '#8b5cf6',
  'STEM': '#10b981',
  'Nature': '#059669',
  'Academic': '#f59e0b',
  'Music': '#ec4899',
  'Adventure': '#f97316',
  'Water Sports': '#0ea5e9',
};

// Block types for non-camp weeks
const BLOCK_TYPES = [
  { id: 'vacation', label: 'Vacation', icon: '🏖️', color: '#60a5fa' },
  { id: 'family', label: 'Family Time', icon: '👨‍👩‍👧‍👦', color: '#a78bfa' },
  { id: 'travel', label: 'Travel', icon: '✈️', color: '#34d399' },
  { id: 'other', label: 'Other Plans', icon: '📅', color: '#f472b6' },
];

export function SchedulePlanner({ camps, onClose }) {
  const {
    isConfigured,
    children,
    scheduledCamps,
    refreshSchedule,
    refreshChildren,
    getTotalCost,
    getCoverageGaps,
    profile,
    campInterests,
    refreshCampInterests,
    squads
  } = useAuth();

  const [selectedChild, setSelectedChild] = useState(children[0]?.id || null);
  const [showAddCamp, setShowAddCamp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clearingSampleData, setClearingSampleData] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showCampDrawer, setShowCampDrawer] = useState(false);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [dragOverWeek, setDragOverWeek] = useState(null);
  const [showBlockMenu, setShowBlockMenu] = useState(null); // { weekNum }
  const [blockedWeeks, setBlockedWeeks] = useState({}); // { [childId]: { [weekNum]: { type, label, note } } }
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' or 'squads'
  const [draggedCamp, setDraggedCamp] = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const weekScrollRef = useRef(null);
  const [draggedScheduledCamp, setDraggedScheduledCamp] = useState(null); // For status board drag
  const [addingCamp, setAddingCamp] = useState(false); // Prevent duplicate submissions
  const [statusMessage, setStatusMessage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // What-If Planning Preview mode
  const [previewMode, setPreviewMode] = useState(false);
  const [previewCamps, setPreviewCamps] = useState([]); // Temporary camps for preview

  // Update selectedChild when children array changes
  useEffect(() => {
    if (children.length > 0 && (!selectedChild || !children.some(c => c.id === selectedChild))) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Auto-dismiss status message after 4 seconds
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // Helper to show inline status messages
  function showStatus(message) {
    setStatusMessage(message);
  }

  // Focus trap for mobile camp drawer
  useEffect(() => {
    if (!showCampDrawer) return;
    const drawer = document.querySelector('.planner-drawer');
    if (!drawer) return;
    const focusable = drawer.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    first?.focus();
    drawer.addEventListener('keydown', handleTab);
    const handleEsc = (e) => { if (e.key === 'Escape') setShowCampDrawer(false); };
    document.addEventListener('keydown', handleEsc);
    return () => { drawer.removeEventListener('keydown', handleTab); document.removeEventListener('keydown', handleEsc); };
  }, [showCampDrawer]);

  const campLookup = useMemo(() => {
    const map = new Map();
    camps.forEach(c => map.set(c.id, c));
    return map;
  }, [camps]);

  // Filter camps for add modal
  const filteredCamps = useMemo(() => {
    if (!searchQuery) return camps.slice(0, 30);
    const query = searchQuery.toLowerCase();
    return camps.filter(c =>
      c.camp_name.toLowerCase().includes(query) ||
      c.category?.toLowerCase().includes(query)
    ).slice(0, 30);
  }, [camps, searchQuery]);

  // Filter camps for sidebar
  const sidebarCamps = useMemo(() => {
    let filtered = camps;
    if (sidebarSearch) {
      const query = sidebarSearch.toLowerCase();
      filtered = camps.filter(c =>
        c.camp_name.toLowerCase().includes(query) ||
        c.category?.toLowerCase().includes(query)
      );
    }
    return filtered.slice(0, 50);
  }, [camps, sidebarSearch]);

  // Combine scheduled camps with preview camps for display
  const allDisplayCamps = useMemo(() => {
    if (!previewMode || previewCamps.length === 0) return scheduledCamps;
    return [...scheduledCamps, ...previewCamps];
  }, [scheduledCamps, previewCamps, previewMode]);

  // Calculate preview cost impact
  const previewCostImpact = useMemo(() => {
    if (!previewMode || previewCamps.length === 0) return null;
    const previewTotal = previewCamps.reduce((sum, pc) => sum + (parseFloat(pc.price) || 0), 0);
    const currentTotal = scheduledCamps
      .filter(sc => sc.status !== 'cancelled')
      .reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);
    return {
      previewTotal,
      currentTotal,
      newTotal: currentTotal + previewTotal,
      difference: previewTotal
    };
  }, [previewCamps, scheduledCamps, previewMode]);

  // Group scheduled camps by child and week
  const scheduleByChildAndWeek = useMemo(() => {
    const result = {};

    children.forEach(child => {
      result[child.id] = {};
      summerWeeks.forEach(week => {
        result[child.id][week.weekNum] = [];
      });
    });

    allDisplayCamps.forEach(sc => {
      const scStart = new Date(sc.start_date);

      summerWeeks.forEach(week => {
        const weekStart = new Date(week.startDate);
        const weekEnd = new Date(week.endDate);

        if (scStart >= weekStart && scStart <= weekEnd) {
          if (result[sc.child_id] && result[sc.child_id][week.weekNum]) {
            result[sc.child_id][week.weekNum].push(sc);
          }
        }
      });
    });

    return result;
  }, [children, allDisplayCamps]);

  // Get current child's schedule
  const currentChildSchedule = selectedChild ? scheduleByChildAndWeek[selectedChild] || {} : {};

  if (!isConfigured) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <h2 className="font-serif text-2xl font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
            Supabase not configured
          </h2>
          <p className="mb-6" style={{ color: 'var(--earth-700)' }}>
            Connect to Supabase to enable the schedule planner.
          </p>
          <button onClick={onClose} className="btn-primary">Got it</button>
        </div>
      </div>
    );
  }

  async function handleAddCamp(camp, weekNum) {
    // Prevent duplicate submissions
    if (addingCamp) return;
    setAddingCamp(true);

    const week = summerWeeks.find(w => w.weekNum === weekNum);
    if (!week || !selectedChild) {
      setAddingCamp(false);
      return;
    }

    const campData = campLookup.get(camp.id);

    // In preview mode, add to preview camps instead of database
    if (previewMode) {
      const previewCamp = {
        id: `preview-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        camp_id: camp.id,
        child_id: selectedChild,
        start_date: week.startDate,
        end_date: week.endDate,
        price: campData?.min_price || null,
        status: 'preview',
        isPreview: true,
        camps: campData // Include camp data for display
      };
      setPreviewCamps(prev => [...prev, previewCamp]);
      setShowAddCamp(null);
      setSearchQuery('');
      setShowCampDrawer(false);
      setAddingCamp(false);
      return;
    }

    try {
      // Add camp to schedule in database
      await addScheduledCamp({
        camp_id: camp.id,
        child_id: selectedChild,
        start_date: week.startDate,
        end_date: week.endDate,
        price: campData?.min_price || null,
        status: 'planned'
      });

      // Refresh schedule to show the new camp
      await refreshSchedule();

      // Close any open modals/drawers
      setShowAddCamp(null);
      setSearchQuery('');
      setShowCampDrawer(false);
    } catch (error) {
      console.error('Failed to add camp:', error);
      showStatus('Failed to add camp. Please try again.');
    } finally {
      setAddingCamp(false);
    }
  }

  // Preview mode functions
  function handleRemovePreviewCamp(previewId) {
    setPreviewCamps(prev => prev.filter(pc => pc.id !== previewId));
  }

  async function handleCommitPreviewCamps() {
    const results = { succeeded: [], failed: [] };

    // Save all preview camps to database with individual error handling
    for (const pc of previewCamps) {
      try {
        await addScheduledCamp({
          camp_id: pc.camp_id,
          child_id: pc.child_id,
          start_date: pc.start_date,
          end_date: pc.end_date,
          price: pc.price,
          status: 'planned'
        });
        results.succeeded.push(pc);
      } catch (error) {
        console.error('Failed to add preview camp:', pc, error);
        results.failed.push({ camp: pc, error });
      }
    }

    // Refresh schedule to show successfully added camps
    await refreshSchedule();

    // Clear preview mode
    setPreviewCamps([]);
    setPreviewMode(false);

    // Show user feedback about results
    if (results.failed.length > 0) {
      const failedCount = results.failed.length;
      const successCount = results.succeeded.length;
      showStatus(`Added ${successCount} camp${successCount !== 1 ? 's' : ''}. ${failedCount} failed - please try adding them individually.`);
    } else if (results.succeeded.length > 0) {
      showStatus(`Added ${results.succeeded.length} camp${results.succeeded.length !== 1 ? 's' : ''} to schedule.`);
    }
  }

  function handleCancelPreview() {
    setPreviewCamps([]);
    setPreviewMode(false);
  }

  async function handleRemoveCamp(scheduleId, e) {
    e?.stopPropagation();
    // Check if this is a preview camp
    if (typeof scheduleId === 'string' && scheduleId.startsWith('preview-')) {
      handleRemovePreviewCamp(scheduleId);
      return;
    }
    setConfirmAction({
      message: 'Remove this camp from your schedule?',
      onConfirm: async () => {
        try {
          await deleteScheduledCamp(scheduleId);
          await refreshSchedule();
        } catch (error) {
          console.error('Failed to remove camp:', error);
          showStatus('Failed to remove camp. Please try again.');
        }
      }
    });
  }

  async function handleStatusChange(scheduleId, newStatus) {
    try {
      await updateScheduledCamp(scheduleId, { status: newStatus });
      await refreshSchedule();
    } catch (error) {
      console.error('Failed to update status:', error);
      showStatus('Failed to update status. Please try again.');
    }
  }

  // Status board drag handlers
  function handleStatusDragStart(scheduledCamp, e) {
    setDraggedScheduledCamp(scheduledCamp);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleStatusDragEnd() {
    setDraggedScheduledCamp(null);
  }

  async function handleStatusDrop(newStatus, e) {
    e.preventDefault();
    try {
      if (draggedScheduledCamp && draggedScheduledCamp.status !== newStatus) {
        await handleStatusChange(draggedScheduledCamp.id, newStatus);
      }
    } catch (error) {
      console.error('Failed to update status on drop:', error);
      showStatus('Failed to update status. Please try again.');
    } finally {
      setDraggedScheduledCamp(null);
    }
  }

  // Block week functions
  function handleBlockWeek(weekNum, blockType) {
    if (!selectedChild) return;
    setBlockedWeeks(prev => ({
      ...prev,
      [selectedChild]: {
        ...(prev[selectedChild] || {}),
        [weekNum]: blockType
      }
    }));
    setShowBlockMenu(null);
  }

  function handleUnblockWeek(weekNum) {
    if (!selectedChild) return;
    setBlockedWeeks(prev => {
      const childBlocks = { ...(prev[selectedChild] || {}) };
      delete childBlocks[weekNum];
      return { ...prev, [selectedChild]: childBlocks };
    });
  }

  function getBlockedWeek(weekNum) {
    if (!selectedChild) return null;
    return blockedWeeks[selectedChild]?.[weekNum] || null;
  }

  // Check for sample data
  const hasSampleData = useMemo(() => {
    return children.some(c => c.is_sample) || scheduledCamps.some(sc => sc.is_sample);
  }, [children, scheduledCamps]);

  // Check if should show tour
  useEffect(() => {
    const shouldShowTour = profile?.tour_shown && !profile?.tour_completed && hasSampleData;
    setShowTour(shouldShowTour);
  }, [profile, hasSampleData]);

  // Close block menu when clicking outside
  useEffect(() => {
    if (!showBlockMenu) return;
    const handleClickOutside = () => setShowBlockMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showBlockMenu]);

  async function handleClearSampleData() {
    setConfirmAction({
      message: 'Clear sample data? Your real children and camps will remain.',
      onConfirm: async () => {
        setClearingSampleData(true);
        try {
          await clearSampleData();
          await refreshChildren();
          await refreshSchedule();
        } catch (error) {
          console.error('Error clearing sample data:', error);
          showStatus('Failed to clear sample data. Please try again.');
        } finally {
          setClearingSampleData(false);
        }
      }
    });
  }

  // Handle drag events
  function handleDragStart(camp, e) {
    setDraggedCamp(camp);
    e.dataTransfer.setData('campId', camp.id);
    e.dataTransfer.effectAllowed = 'copy';
  }

  function handleDragEnd() {
    setDraggedCamp(null);
    setDragOverWeek(null);
  }

  function handleWeekDrop(weekNum, e) {
    e.preventDefault();

    // Check if a child is selected
    if (!selectedChild) {
      showStatus('Please select a child first to add camps to their schedule.');
      setDragOverWeek(null);
      setDraggedCamp(null);
      return;
    }

    const campId = e.dataTransfer.getData('campId');
    if (campId) {
      const camp = campLookup.get(campId);
      if (camp) {
        handleAddCamp(camp, weekNum);
      } else {
        console.error('Camp not found:', campId);
      }
    }
    setDragOverWeek(null);
    setDraggedCamp(null);
  }

  const totalCost = getTotalCost();
  const gaps = selectedChild ? getCoverageGaps(selectedChild, summerWeeks) : [];
  const selectedChildData = children.find(c => c.id === selectedChild);

  // Check if a camp is marked as "looking for friends"
  function isLookingForFriends(campId, childId, weekNum) {
    return campInterests.some(
      ci => ci.camp_id === campId && ci.child_id === childId && ci.week_number === weekNum && ci.looking_for_friends
    );
  }

  // Toggle looking for friends
  async function handleToggleLookingForFriends(campId, childId, weekNum) {
    try {
      const currentlyLooking = isLookingForFriends(campId, childId, weekNum);
      await toggleLookingForFriends(campId, childId, weekNum, !currentlyLooking);
      await refreshCampInterests();
    } catch (error) {
      console.error('Failed to toggle looking for friends:', error);
      showStatus('Failed to update. Please try again.');
    }
  }

  // Check if user has any squads (to show the toggle)
  const hasSquads = squads.length > 0;

  // Render week card helper function
  function renderWeekCard(week) {
    const weekCamps = currentChildSchedule[week.weekNum] || [];
    const isGap = gaps.some(g => g.weekNum === week.weekNum);
    const isDragOver = dragOverWeek === week.weekNum;
    const blocked = getBlockedWeek(week.weekNum);
    const isBlockMenuOpen = showBlockMenu?.weekNum === week.weekNum;

    return (
      <div
        key={week.weekNum}
        className={`week-card ${weekCamps.length > 0 ? 'has-camps' : ''} ${isGap && !blocked ? 'is-gap' : ''} ${isDragOver ? 'drag-over' : ''} ${blocked ? 'is-blocked' : ''}`}
        style={blocked ? { '--block-color': blocked.color } : { '--child-color': selectedChildData?.color || 'var(--ocean-500)' }}
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          if (!blocked) setDragOverWeek(week.weekNum);
        }}
        onDragLeave={() => setDragOverWeek(null)}
        onDrop={(e) => !blocked && handleWeekDrop(week.weekNum, e)}
        onClick={() => {
          if (weekCamps.length === 0 && !blocked && !isBlockMenuOpen) {
            setShowBlockMenu({ weekNum: week.weekNum });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (weekCamps.length === 0 && !blocked && !isBlockMenuOpen) {
              setShowBlockMenu({ weekNum: week.weekNum });
            }
          }
        }}
      >
        {/* Week Header */}
        <div className="week-card-header">
          <span className="week-card-number">{week.weekNum}</span>
          <div className="week-card-dates">
            <span className="week-card-label">{week.label}</span>
            <span className="week-card-range">{week.display}</span>
          </div>
        </div>

        {/* Week Content */}
        <div className="week-card-content">
          {blocked ? (
            <div className="week-blocked" style={{ '--block-color': blocked.color }}>
              <span className="week-blocked-icon">{blocked.icon}</span>
              <span className="week-blocked-label">{blocked.label}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnblockWeek(week.weekNum);
                }}
                className="week-blocked-remove"
              >
                <XIcon />
              </button>
            </div>
          ) : weekCamps.length > 0 ? (
            weekCamps.map(sc => {
              const campInfo = campLookup.get(sc.camp_id);
              const lookingForFriends = isLookingForFriends(sc.camp_id, sc.child_id, week.weekNum);
              const isPreviewCamp = sc.isPreview === true;
              const catColor = CATEGORY_COLORS[campInfo?.category] || 'var(--ocean-500)';
              return (
                <div
                  key={sc.id}
                  className={`camp-card-enhanced ${lookingForFriends ? 'looking-for-friends' : ''} ${isPreviewCamp ? 'preview-camp-card' : ''}`}
                  style={{ '--child-color': selectedChildData?.color || 'var(--ocean-500)', '--cat-color': catColor }}
                >
                  <div className="camp-card-accent" />
                  <div className="camp-card-body">
                    <div className="camp-card-top">
                      <span className="camp-card-category">{campInfo?.category}</span>
                      <button
                        onClick={(e) => handleRemoveCamp(sc.id, e)}
                        className="camp-card-remove"
                      >
                        <XIcon />
                      </button>
                    </div>
                    <h4 className="camp-card-name">{campInfo?.camp_name || 'Unknown'}</h4>
                    <div className="camp-card-details">
                      <span className="camp-card-price">
                        {sc.price ? `$${sc.price}` : 'TBD'}
                      </span>
                      <span className={`camp-card-status status-${sc.status}`}>
                        {sc.status}
                      </span>
                    </div>
                    {hasSquads && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLookingForFriends(sc.camp_id, sc.child_id, week.weekNum);
                        }}
                        className={`camp-card-friends ${lookingForFriends ? 'active' : ''}`}
                      >
                        <span>👥</span>
                        <span>{lookingForFriends ? 'Looking for friends' : 'Find friends'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="week-empty">
              <div className="week-empty-icon">
                <PlusIcon />
              </div>
              <span>Add camp</span>
            </div>
          )}
        </div>

        {/* Gap indicator */}
        {isGap && weekCamps.length === 0 && !blocked && (
          <div className="week-gap-badge">
            <WarningIcon />
            Gap
          </div>
        )}

        {/* Block Menu Popup */}
        {isBlockMenuOpen && (
          <div className="week-block-menu" onClick={(e) => e.stopPropagation()}>
            <div className="block-menu-header">
              <span>What's happening?</span>
              <button onClick={() => setShowBlockMenu(null)} className="block-menu-close">
                <XIcon />
              </button>
            </div>
            <button
              onClick={() => {
                setShowBlockMenu(null);
                setShowAddCamp({ weekNum: week.weekNum });
              }}
              className="block-menu-option block-menu-camp"
            >
              <span className="block-menu-icon">🏕️</span>
              <span>Add a Camp</span>
            </button>
            <div className="block-menu-divider">
              <span>or mark as...</span>
            </div>
            {BLOCK_TYPES.map(block => (
              <button
                key={block.id}
                onClick={() => handleBlockWeek(week.weekNum, block)}
                className="block-menu-option"
                style={{ '--block-color': block.color }}
              >
                <span className="block-menu-icon">{block.icon}</span>
                <span>{block.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Mobile swipe handling
  function handleSwipe(direction) {
    if (direction === 'left' && currentWeekIndex < summerWeeks.length - 1) {
      setCurrentWeekIndex(prev => prev + 1);
    } else if (direction === 'right' && currentWeekIndex > 0) {
      setCurrentWeekIndex(prev => prev - 1);
    }
  }

  return (
    <div className="planner-container">
      {/* Inline Status Message Banner */}
      {statusMessage && (
        <div className="planner-status-message" role="alert" aria-live="assertive">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} aria-label="Dismiss message">&times;</button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="planner-confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Confirm action">
          <div className="planner-confirm-content">
            <p>{confirmAction.message}</p>
            <div className="planner-confirm-actions">
              <button onClick={() => setConfirmAction(null)} className="planner-confirm-cancel">Cancel</button>
              <button onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }} className="planner-confirm-ok">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Elegant Header */}
      <header className="planner-header">
        <div className="planner-header-inner">
          {/* Left: Title & Close */}
          <div className="planner-header-left">
            <button onClick={onClose} className="planner-close-btn" aria-label="Close planner">
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="planner-title">Summer 2026</h1>
              <p className="planner-subtitle">
                {selectedChildData ? `${selectedChildData.name}'s Schedule` : 'Plan your summer'}
              </p>
            </div>
          </div>

          {/* Center: Child Pills (Desktop) */}
          <div className="planner-children-desktop">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`planner-child-pill ${selectedChild === child.id ? 'active' : ''}`}
                style={{
                  '--child-color': child.color,
                  '--child-color-light': child.color + '20'
                }}
              >
                <span className="planner-child-dot" />
                {child.name}
              </button>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="planner-header-right">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`planner-preview-toggle ${previewMode ? 'active' : ''}`}
              title={previewMode ? 'Exit What-If Mode' : 'What-If Planning'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="planner-preview-label">What-If</span>
            </button>
            <SquadNotificationBell />
          </div>
        </div>

        {/* Mobile Child Selector */}
        <div className="planner-children-mobile">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`planner-child-pill-mobile ${selectedChild === child.id ? 'active' : ''}`}
              style={{ '--child-color': child.color }}
            >
              <span className="planner-child-avatar">{child.name.charAt(0)}</span>
              <span className="planner-child-name">{child.name}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="planner-tabs">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`planner-tab ${activeTab === 'schedule' ? 'active' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`planner-tab ${activeTab === 'status' ? 'active' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Status
        </button>
        <button
          onClick={() => setActiveTab('squads')}
          className={`planner-tab ${activeTab === 'squads' ? 'active' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Squads
        </button>
      </div>

      {/* Preview Mode Banner */}
      {previewMode && (
        <div className="planner-preview-banner">
          <div className="planner-preview-content">
            <span className="planner-preview-icon">🔮</span>
            <div className="planner-preview-info">
              <p className="planner-preview-title">What-If Planning Mode</p>
              <p className="planner-preview-text">
                {previewCamps.length === 0
                  ? 'Drag camps to see how they affect your budget'
                  : `${previewCamps.length} camp${previewCamps.length > 1 ? 's' : ''} in preview`}
                {previewCostImpact && previewCostImpact.difference > 0 && (
                  <span className="planner-preview-cost">
                    {' '}• +${previewCostImpact.difference.toLocaleString()} (Total: ${previewCostImpact.newTotal.toLocaleString()})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="planner-preview-actions">
            {previewCamps.length > 0 && (
              <button
                onClick={handleCommitPreviewCamps}
                className="planner-preview-commit"
              >
                Add to Schedule
              </button>
            )}
            <button
              onClick={handleCancelPreview}
              className="planner-preview-cancel"
            >
              {previewCamps.length > 0 ? 'Discard' : 'Exit Preview'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'squads' ? (
        <div className="planner-main" style={{ padding: 0 }}>
          <SquadsPanel onClose={onClose} />
        </div>
      ) : activeTab === 'status' ? (
        <main className="planner-main">
          {/* Status Board View */}
          {children.length === 0 ? (
            <div className="planner-empty">
              <div className="planner-empty-icon">👨‍👩‍👧‍👦</div>
              <h2 className="planner-empty-title">Add your children first</h2>
              <p className="planner-empty-text">Create profiles for each child to start planning their summer adventure.</p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'children' }))}
                className="btn-primary"
              >
                Add Children
              </button>
            </div>
          ) : (
            <div className="status-board">
              {/* Status columns: planned, registered, confirmed, waitlisted, cancelled */}
              {[
                { status: 'planned', label: 'Planned', color: '#94a3b8', icon: '📋' },
                { status: 'registered', label: 'Registered', color: '#3b82f6', icon: '✍️' },
                { status: 'confirmed', label: 'Confirmed', color: '#22c55e', icon: '✅' },
                { status: 'waitlisted', label: 'Waitlisted', color: '#f59e0b', icon: '⏳' },
                { status: 'cancelled', label: 'Cancelled', color: '#ef4444', icon: '❌' }
              ].map(column => {
                const columnCamps = scheduledCamps
                  .filter(sc => sc.child_id === selectedChild && sc.status === column.status)
                  .map(sc => ({
                    ...sc,
                    camp: campLookup.get(sc.camp_id),
                    child: children.find(c => c.id === sc.child_id)
                  }));

                return (
                  <div
                    key={column.status}
                    className="status-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleStatusDrop(column.status, e)}
                  >
                    <div className="status-column-header" style={{ '--status-color': column.color }}>
                      <span className="status-column-icon">{column.icon}</span>
                      <h3 className="status-column-title">{column.label}</h3>
                      <span className="status-column-count">{columnCamps.length}</span>
                    </div>
                    <div className="status-column-content">
                      {columnCamps.length === 0 ? (
                        <div className="status-column-empty">
                          <p>No {column.label.toLowerCase()} camps</p>
                        </div>
                      ) : (
                        columnCamps.map(sc => (
                          <div
                            key={sc.id}
                            className="status-card"
                            draggable
                            role="listitem"
                            aria-label={`${sc.camp?.camp_name || 'Camp'} - ${sc.status}`}
                            onDragStart={(e) => handleStatusDragStart(sc, e)}
                            onDragEnd={handleStatusDragEnd}
                          >
                            <div className="status-card-header">
                              <h4 className="status-card-title">{sc.camp?.camp_name || 'Unknown Camp'}</h4>
                              <button
                                onClick={() => handleRemoveCamp(sc.id)}
                                className="status-card-remove"
                                aria-label="Remove camp"
                              >
                                <XIcon />
                              </button>
                            </div>
                            <div className="status-card-meta">
                              <span className="status-card-category">{sc.camp?.category}</span>
                              <span className="status-card-price">{sc.price ? `$${sc.price}` : 'TBD'}</span>
                            </div>
                            <div className="status-card-dates">
                              {new Date(sc.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' - '}
                              {new Date(sc.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      ) : (
      <main className="planner-main">
        {/* Sample Data Banner */}
        {hasSampleData && !previewMode && (
          <div className="planner-sample-banner">
            <div className="planner-sample-content">
              <span className="planner-sample-icon">✨</span>
              <div>
                <p className="planner-sample-title">Sample data loaded</p>
                <p className="planner-sample-text">Clear when you're ready to plan for real</p>
              </div>
            </div>
            <button
              onClick={handleClearSampleData}
              disabled={clearingSampleData}
              className="planner-sample-clear"
            >
              {clearingSampleData ? 'Clearing...' : 'Clear'}
            </button>
          </div>
        )}

        {children.length === 0 ? (
          <div className="planner-empty">
            <div className="planner-empty-icon">👨‍👩‍👧‍👦</div>
            <h2 className="planner-empty-title">Add your children first</h2>
            <p className="planner-empty-text">Create profiles for each child to start planning their summer adventure.</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'children' }))}
              className="btn-primary"
            >
              Add Children
            </button>
          </div>
        ) : (
          <div className="planner-layout">
            {/* Compact Summer Coverage Strip */}
            <div className="summer-strip">
              <div className="summer-strip-info">
                <span className="summer-strip-child">{selectedChildData?.name}</span>
                <span className="summer-strip-stat">
                  <strong>{scheduledCamps.filter(sc => sc.child_id === selectedChild).length}</strong> camps
                </span>
                <span className="summer-strip-divider" />
                <span className="summer-strip-stat">
                  <strong>{Math.round(((11 - gaps.length) / 11) * 100)}%</strong> covered
                </span>
                {gaps.length > 0 && (
                  <span className="summer-strip-gaps">{gaps.length} gap{gaps.length > 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="summer-strip-bar">
                {summerWeeks.map((week) => {
                  const weekCamps = currentChildSchedule[week.weekNum] || [];
                  const blocked = getBlockedWeek(week.weekNum);
                  const isGap = gaps.some(g => g.weekNum === week.weekNum) && !blocked;
                  const campInfo = weekCamps[0] ? campLookup.get(weekCamps[0].camp_id) : null;
                  return (
                    <div
                      key={week.weekNum}
                      className={`strip-segment ${weekCamps.length > 0 ? 'filled' : ''} ${blocked ? 'blocked' : ''} ${isGap ? 'gap' : ''}`}
                      style={weekCamps.length > 0 ? { '--segment-color': selectedChildData?.color } : blocked ? { '--segment-color': blocked.color } : {}}
                      title={`Wk ${week.weekNum}: ${weekCamps.length > 0 ? campInfo?.camp_name || 'Camp' : blocked ? blocked.label : isGap ? 'Gap' : 'Open'}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Camp Sidebar */}
            <div className="planner-content-area">
            <aside className={`planner-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
              <div className="planner-sidebar-header">
                <h3 className="planner-sidebar-title">Camp Library</h3>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="planner-sidebar-toggle"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </button>
              </div>

              {!sidebarCollapsed && (
                <>
                  <div className="planner-sidebar-search">
                    <SearchIcon />
                    <input
                      type="text"
                      placeholder="Search camps..."
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      className="planner-sidebar-input"
                    />
                    {sidebarSearch && (
                      <button
                        onClick={() => setSidebarSearch('')}
                        className="planner-sidebar-clear"
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>

                  <div className="planner-sidebar-hint">
                    <DragIcon />
                    <span>Drag to schedule</span>
                  </div>

                  <p className="sr-only">
                    To add a camp to your schedule using keyboard, select a camp and press Enter, then use arrow keys to choose a week.
                  </p>

                  <div className="planner-sidebar-list">
                    {sidebarCamps.map(camp => {
                      const catColor = CATEGORY_COLORS[camp.category] || 'var(--ocean-500)';
                      return (
                        <div
                          key={camp.id}
                          draggable
                          tabIndex={0}
                          role="button"
                          aria-label={`${camp.camp_name}, ${camp.category}, ${camp.min_price ? '$' + camp.min_price : 'price TBD'}. Press Enter to add to schedule.`}
                          onDragStart={(e) => handleDragStart(camp, e)}
                          onDragEnd={handleDragEnd}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              // Open the add camp modal so user can pick a week
                              setShowAddCamp({ weekNum: summerWeeks[0]?.weekNum });
                              setSearchQuery(camp.camp_name);
                            }
                          }}
                          className={`planner-sidebar-camp ${draggedCamp?.id === camp.id ? 'dragging' : ''}`}
                          style={{ '--cat-color': catColor }}
                        >
                          <div className="sidebar-camp-accent" />
                          <div className="sidebar-camp-content">
                            <div className="planner-sidebar-camp-name">{camp.camp_name}</div>
                            <div className="planner-sidebar-camp-meta">
                              <span className="planner-sidebar-camp-category">{camp.category}</span>
                              <span className="planner-sidebar-camp-price">
                                {camp.min_price ? `$${camp.min_price}` : 'TBD'}
                              </span>
                            </div>
                          </div>
                          <GripIcon className="sidebar-camp-grip" />
                        </div>
                      );
                    })}
                    {sidebarCamps.length === 0 && (
                      <div className="planner-sidebar-empty">
                        <span className="sidebar-empty-icon">🔍</span>
                        <span>No camps found</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </aside>

            {/* Timeline View */}
            <div className="planner-timeline">
              {/* Editorial Month Sections */}
              <div className="month-sections">
                {/* June */}
                <section className="month-section month-june">
                  <div className="month-header">
                    <h3 className="month-name">June</h3>
                    <span className="month-range">Jun 8 - Jul 3</span>
                  </div>
                  <div className="month-weeks">
                    {summerWeeks.slice(0, 4).map((week) => renderWeekCard(week))}
                  </div>
                </section>

                {/* July */}
                <section className="month-section month-july">
                  <div className="month-header">
                    <h3 className="month-name">July</h3>
                    <span className="month-range">Jul 6 - Aug 1</span>
                  </div>
                  <div className="month-weeks">
                    {summerWeeks.slice(4, 8).map((week) => renderWeekCard(week))}
                  </div>
                </section>

                {/* August */}
                <section className="month-section month-august">
                  <div className="month-header">
                    <h3 className="month-name">August</h3>
                    <span className="month-range">Aug 4 - 22</span>
                  </div>
                  <div className="month-weeks">
                    {summerWeeks.slice(8).map((week) => renderWeekCard(week))}
                  </div>
                </section>
              </div>

              {/* Mobile Week Navigator */}
              <div className="planner-mobile-nav">
                <button
                  onClick={() => handleSwipe('right')}
                  disabled={currentWeekIndex === 0}
                  className="planner-nav-btn"
                >
                  <ChevronLeftIcon />
                </button>
                <div className="planner-nav-indicator">
                  <span className="planner-nav-current">{summerWeeks[currentWeekIndex]?.label}</span>
                  <span className="planner-nav-dates">{summerWeeks[currentWeekIndex]?.display}</span>
                </div>
                <button
                  onClick={() => handleSwipe('left')}
                  disabled={currentWeekIndex === summerWeeks.length - 1}
                  className="planner-nav-btn"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
            </div>
          </div>
        )}
      </main>
      )}

      {/* Floating Add Button (Mobile) */}
      <button
        onClick={() => setShowCampDrawer(true)}
        className="planner-fab"
        aria-label="Add camp"
      >
        <PlusIcon />
      </button>

      {/* Camp Drawer (Mobile-first) */}
      {(showCampDrawer || showAddCamp) && (
        <div className="planner-drawer-overlay" onClick={() => { setShowCampDrawer(false); setShowAddCamp(null); }}>
          <div className="planner-drawer" onClick={e => e.stopPropagation()}>
            <div className="planner-drawer-handle" />

            <div className="planner-drawer-header">
              <h2 className="planner-drawer-title">
                {showAddCamp
                  ? `Add to ${summerWeeks.find(w => w.weekNum === showAddCamp.weekNum)?.label}`
                  : 'Camp Library'
                }
              </h2>
              <button
                onClick={() => { setShowCampDrawer(false); setShowAddCamp(null); setSearchQuery(''); }}
                className="planner-drawer-close"
              >
                <XIcon />
              </button>
            </div>

            <div className="planner-drawer-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search camps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="planner-drawer-list">
              {filteredCamps.map(camp => (
                <div
                  key={camp.id}
                  className="planner-drawer-camp"
                  draggable={!showAddCamp}
                  onDragStart={(e) => handleDragStart(camp, e)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (showAddCamp && !addingCamp) {
                      handleAddCamp(camp, showAddCamp.weekNum);
                    }
                  }}
                  style={{ opacity: addingCamp ? 0.6 : 1, pointerEvents: addingCamp ? 'none' : 'auto' }}
                >
                  {camp.image_url ? (
                    <img src={camp.image_url} alt="" className="planner-drawer-camp-img" />
                  ) : (
                    <div className="planner-drawer-camp-placeholder">🏕️</div>
                  )}
                  <div className="planner-drawer-camp-info">
                    <span className="planner-drawer-camp-name">{camp.camp_name}</span>
                    <span className="planner-drawer-camp-meta">
                      {camp.category} • {camp.ages} • {camp.min_price ? `$${camp.min_price}` : 'TBD'}
                    </span>
                  </div>
                  {showAddCamp ? (
                    <span className="planner-drawer-camp-add">{addingCamp ? 'Adding...' : 'Add'}</span>
                  ) : (
                    <span className="planner-drawer-camp-drag">
                      <GripIcon />
                    </span>
                  )}
                </div>
              ))}

              {filteredCamps.length === 0 && (
                <div className="planner-drawer-empty">
                  <p>No camps found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guided Tour */}
      {showTour && (
        <GuidedTour
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}

      {/* Sticky Bottom Summary Bar */}
      <div className="planner-bottom-bar" aria-live="polite" aria-atomic="true">
        <div className="planner-bottom-bar-inner">
          {/* Stats */}
          <div className="planner-bottom-stats">
            <div className="planner-bottom-stat">
              <span className="planner-bottom-stat-value">${totalCost.toLocaleString()}</span>
              <span className="planner-bottom-stat-label">Total</span>
            </div>
            <div className="planner-bottom-stat-divider" />
            <div className="planner-bottom-stat">
              <span className={`planner-bottom-stat-value ${gaps.length > 0 ? 'has-gaps' : 'no-gaps'}`}>
                {gaps.length}
              </span>
              <span className="planner-bottom-stat-label">Gaps</span>
            </div>
          </div>

          {/* Export Actions */}
          {scheduledCamps.length > 0 && (
            <div className="planner-bottom-actions">
              <button
                onClick={() => {
                  const child = children.find(c => c.id === selectedChild);
                  const childSchedules = scheduledCamps.filter(sc => sc.child_id === selectedChild);
                  exportAllToICal(camps, childSchedules, child?.name);
                }}
                className="planner-bottom-action-btn"
                title="Download .ics file"
              >
                <DownloadIcon />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  const childSchedules = scheduledCamps.filter(sc => sc.child_id === selectedChild);
                  if (childSchedules.length > 0) {
                    const firstSchedule = childSchedules[0];
                    const camp = campLookup.get(firstSchedule.camp_id);
                    if (camp) {
                      const event = formatCampForCalendar(camp, firstSchedule);
                      window.open(createGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
                    }
                  }
                }}
                className="planner-bottom-action-btn"
                title="Add to Google Calendar"
              >
                <CalendarExportIcon />
                <span>Calendar</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Styles are in SchedulePlanner.css */}
    </div>
  );
}

// Icons
function ArrowLeftIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CalendarExportIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function GripIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
    </svg>
  );
}

function DragIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

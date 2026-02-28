import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useSchedule } from '../contexts/ScheduleContext';
import { useSquads } from '../contexts/SquadsContext';
import { useAchievements } from '../contexts/AchievementsContext';
import { addScheduledCamp, deleteScheduledCamp, updateScheduledCamp, clearSampleData, toggleLookingForFriends, getCampSessions, updateProfile, getNotificationPreferences } from '../lib/supabase';
import { createGoogleCalendarUrl, exportAllToICal, formatCampForCalendar, formatBlockedWeekForCalendar } from '../lib/googleCalendar';
import { GuidedTour } from './GuidedTour';
import SquadsPanel from './SquadsPanel';
import SquadNotificationBell from './SquadNotificationBell';
import { ShareableSummerCard } from './ShareableSummerCard';
import { ProgressTracker } from './ProgressTracker';
import { PlanningTipsContainer } from './PlanningTips';
import { AchievementBadges } from './AchievementBadges';
import BrandIcon from './BrandIcon';
import WeekColumn from './schedule/WeekColumn';
import CostSummary from './schedule/CostSummary';
import WeekSelector from './schedule/WeekSelector';
import BlockedWeekManager from './schedule/BlockedWeekManager';
import {
  summerWeeks, TOTAL_SUMMER_WEEKS, CATEGORY_COLORS, CONFLICT_TYPES,
  BLOCK_COLORS, BLOCK_ICONS, generateGroupId,
  formatWorkTime,
  ArrowLeftIcon, XIcon, PlusIcon, DownloadIcon, CalendarExportIcon,
  SearchIcon, ChevronLeftIcon, ChevronRightIcon, GripIcon, DragIcon,
  WarningIcon, ClockIcon, ShareIcon, PrintIcon, EmailIcon, MessageIcon,
} from './schedule/utils';
import './SchedulePlanner.css';

export function SchedulePlanner({ camps, onClose }) {
  const navigate = useNavigate();
  const {
    isConfigured,
    children,
    refreshChildren,
    profile,
    refreshProfile,
    user
  } = useAuth();
  const { favorites } = useFavorites();
  const { scheduledCamps, refreshSchedule, getTotalCost, getCoverageGaps } = useSchedule();
  const { squads, campInterests, refreshCampInterests } = useSquads();

  // Get achievements context for gamification features
  const { celebration, dismissCelebration } = useAchievements();

  const [selectedChild, setSelectedChild] = useState(children[0]?.id || null);
  const [showAddCamp, setShowAddCamp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clearingSampleData, setClearingSampleData] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showCampDrawer, setShowCampDrawer] = useState(false);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [dragOverWeek, setDragOverWeek] = useState(null);
  const [showBlockMenu, setShowBlockMenu] = useState(null); // { weekNum }
  const [showCustomBlockModal, setShowCustomBlockModal] = useState(null); // { weekNum, editExisting?: block }
  const [blockedWeeks, setBlockedWeeks] = useState(() => profile?.blocked_weeks || {}); // { [childId]: { [weekNum]: { type, label, note, icon, color } } }
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

  // New enhanced features state
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [conflicts, setConflicts] = useState([]); // Array of detected conflicts
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showShareCard, setShowShareCard] = useState(false); // Visual shareable card
  const [showPrintView, setShowPrintView] = useState(false);
  const [showAutoFillSuggestions, setShowAutoFillSuggestions] = useState(false);
  const [autoFillSuggestions, setAutoFillSuggestions] = useState([]);
  const [campSessions, setCampSessions] = useState({}); // { campId: [sessions] }
  const [showSessionPicker, setShowSessionPicker] = useState(null); // { camp, weekNum }
  const [movingCamp, setMovingCamp] = useState(null); // For drag between weeks
  const [moveMenuCamp, setMoveMenuCamp] = useState(null); // For keyboard-accessible move menu { id, currentWeek }
  const [draggingBlock, setDraggingBlock] = useState(null); // For dragging blocked weeks { weekNum, block, groupWeeks }

  // Touch drag state for mobile
  const [touchDragState, setTouchDragState] = useState(null);
  const touchStartRef = useRef(null);
  const touchMoveRef = useRef(null);

  const [budgetWarningThreshold, setBudgetWarningThreshold] = useState(0.8);

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

  // Sync blocked weeks from profile (cross-device persistence)
  useEffect(() => {
    if (profile?.blocked_weeks) {
      setBlockedWeeks(profile.blocked_weeks);
    }
  }, [profile?.blocked_weeks]);

  // Load budget warning threshold from notification preferences
  useEffect(() => {
    const loadBudgetThreshold = async () => {
      try {
        const prefs = await getNotificationPreferences();
        if (prefs?.budget_warning_threshold) {
          // Convert from percentage (80) to decimal (0.8)
          setBudgetWarningThreshold(prefs.budget_warning_threshold / 100);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
        // Keep default threshold of 0.8
      }
    };
    loadBudgetThreshold();
  }, []);

  // Persist blocked weeks to profile when they change
  const blockedWeeksRef = useRef(blockedWeeks);
  useEffect(() => {
    // Skip if no meaningful change
    const current = JSON.stringify(blockedWeeks);
    const previous = JSON.stringify(blockedWeeksRef.current);
    if (current === previous) return;
    blockedWeeksRef.current = blockedWeeks;

    // Debounce save to avoid too many API calls
    const timer = setTimeout(async () => {
      try {
        await updateProfile({ blocked_weeks: blockedWeeks });
      } catch (error) {
        console.error('Failed to save blocked weeks:', error);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [blockedWeeks]);

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
      const scEnd = new Date(sc.end_date);

      summerWeeks.forEach(week => {
        const weekStart = new Date(week.startDate);
        const weekEnd = new Date(week.endDate);

        // Check for any overlap between camp dates and week dates
        // Camp overlaps if: camp starts before week ends AND camp ends after week starts
        const hasOverlap = scStart <= weekEnd && scEnd >= weekStart;

        if (hasOverlap) {
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

  // Compute group positions for connected block styling
  const blockGroupPositions = useMemo(() => {
    if (!selectedChild) return {};
    const childBlocks = blockedWeeks[selectedChild] || {};
    const positions = {};

    // Group blocks by groupId
    const groups = {};
    Object.entries(childBlocks).forEach(([wn, block]) => {
      const gid = block.groupId;
      if (gid) {
        if (!groups[gid]) groups[gid] = [];
        groups[gid].push(Number(wn));
      }
    });

    Object.entries(childBlocks).forEach(([wn, block]) => {
      const weekNum = Number(wn);
      const gid = block.groupId;
      if (!gid || !groups[gid] || groups[gid].length <= 1) {
        positions[weekNum] = 'solo';
      } else {
        const sorted = [...groups[gid]].sort((a, b) => a - b);
        if (weekNum === sorted[0]) positions[weekNum] = 'start';
        else if (weekNum === sorted[sorted.length - 1]) positions[weekNum] = 'end';
        else positions[weekNum] = 'middle';
      }
    });

    return positions;
  }, [selectedChild, blockedWeeks]);

  // Calculate week-by-week cost breakdown
  const weekCostBreakdown = useMemo(() => {
    if (!selectedChild) return [];

    return summerWeeks.map(week => {
      const weekCamps = currentChildSchedule[week.weekNum] || [];
      const blocked = blockedWeeks[selectedChild]?.[week.weekNum];
      const weekCost = weekCamps.reduce((sum, sc) => sum + (parseFloat(sc.price) || 0), 0);

      return {
        weekNum: week.weekNum,
        label: week.label,
        display: week.display,
        camps: weekCamps,
        cost: weekCost,
        isBlocked: !!blocked,
        blockType: blocked
      };
    });
  }, [selectedChild, currentChildSchedule, blockedWeeks]);

  // Calculate running total and cumulative costs
  const costStats = useMemo(() => {
    let runningTotal = 0;
    const byWeek = weekCostBreakdown.map(week => {
      runningTotal += week.cost;
      return { ...week, runningTotal };
    });

    const totalCost = runningTotal;
    const avgPerWeek = totalCost / TOTAL_SUMMER_WEEKS;
    const maxWeekCost = Math.max(...byWeek.map(w => w.cost), 0);

    return { byWeek, totalCost, avgPerWeek, maxWeekCost };
  }, [weekCostBreakdown]);

  // Calculate coverage percentage
  const coverageStats = useMemo(() => {
    if (!selectedChild) return { percentage: 0, coveredWeeks: 0, gaps: [] };

    const childCamps = scheduledCamps.filter(sc => sc.child_id === selectedChild && sc.status !== 'cancelled');
    const childBlocks = blockedWeeks[selectedChild] || {};

    let coveredWeeks = 0;
    const gapWeeks = [];

    summerWeeks.forEach(week => {
      const hasCamp = childCamps.some(sc => {
        const scStart = new Date(sc.start_date);
        const weekStart = new Date(week.startDate);
        const weekEnd = new Date(week.endDate);
        return scStart >= weekStart && scStart <= weekEnd;
      });
      const hasBlock = !!childBlocks[week.weekNum];

      if (hasCamp || hasBlock) {
        coveredWeeks++;
      } else {
        gapWeeks.push(week);
      }
    });

    return {
      percentage: Math.round((coveredWeeks / TOTAL_SUMMER_WEEKS) * 100),
      coveredWeeks,
      totalWeeks: TOTAL_SUMMER_WEEKS,
      gaps: gapWeeks
    };
  }, [selectedChild, scheduledCamps, blockedWeeks]);

  // Generate auto-fill suggestions for gaps
  const generateAutoFillSuggestions = useCallback(() => {
    if (!selectedChild || coverageStats.gaps.length === 0) {
      setAutoFillSuggestions([]);
      return;
    }

    const child = children.find(c => c.id === selectedChild);
    if (!child) return;

    const suggestions = [];

    coverageStats.gaps.forEach(gap => {
      // Find camps that match child's age
      const matchingCamps = camps.filter(camp => {
        // Check age range
        const minAge = parseInt(camp.min_age) || 0;
        const maxAge = parseInt(camp.max_age) || 18;
        const childAge = child.age_as_of_summer || 8;

        if (childAge < minAge || childAge > maxAge) return false;

        // Don't suggest camps already scheduled that week
        const alreadyScheduled = scheduledCamps.some(
          sc => sc.camp_id === camp.id && sc.child_id === selectedChild &&
                new Date(sc.start_date).toDateString() === new Date(gap.startDate).toDateString()
        );
        if (alreadyScheduled) return false;

        return true;
      });

      // Score and sort matching camps
      const scoredCamps = matchingCamps.map(camp => {
        let score = 0;
        // Prefer camps the user has favorited
        if (favorites.some(f => f.camp_id === camp.id)) score += 50;
        // Prefer camps with similar categories to previously scheduled
        const scheduledCategories = scheduledCamps
          .map(sc => campLookup.get(sc.camp_id)?.category)
          .filter(Boolean);
        if (scheduledCategories.includes(camp.category)) score += 30;
        // Prefer camps with good data
        if (camp.description) score += 10;
        if (camp.website_url) score += 5;

        return { camp, score };
      }).sort((a, b) => b.score - a.score);

      // Take top 3 suggestions per gap
      suggestions.push({
        gap,
        camps: scoredCamps.slice(0, 3).map(s => s.camp)
      });
    });

    setAutoFillSuggestions(suggestions);
    setShowAutoFillSuggestions(true);
  }, [selectedChild, coverageStats.gaps, children, camps, scheduledCamps, favorites, campLookup]);

  if (!isConfigured) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <h2 className="font-serif text-2xl font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
            Supabase not configured
          </h2>
          <p className="mb-6" style={{ color: 'var(--earth-700)' }}>
            Connect to Supabase to start planning.
          </p>
          <button onClick={onClose} className="btn-primary">Got it</button>
        </div>
      </div>
    );
  }

  async function handleAddCamp(camp, weekNum, sessionOverride = null) {
    // Prevent duplicate submissions
    if (addingCamp) return;
    setAddingCamp(true);

    const week = summerWeeks.find(w => w.weekNum === weekNum);
    if (!week || !selectedChild) {
      setAddingCamp(false);
      return;
    }

    const campData = campLookup.get(camp.id);

    // Use session override dates if provided (from session picker)
    const startDate = sessionOverride?.start_date || week.startDate;
    const endDate = sessionOverride?.end_date || week.endDate;

    // In preview mode, add to preview camps instead of database
    if (previewMode) {
      const previewCamp = {
        id: `preview-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        camp_id: camp.id,
        child_id: selectedChild,
        start_date: startDate,
        end_date: endDate,
        camp_name: campData?.camp_name || camp.camp_name || camp.id,
        price: campData?.min_price || null,
        status: 'preview',
        isPreview: true,
        session_name: sessionOverride?.session_name || null,
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
      const result = await addScheduledCamp({
        camp_id: camp.id,
        child_id: selectedChild,
        start_date: startDate,
        end_date: endDate,
        camp_name: campData?.camp_name || camp.camp_name || camp.id,
        price: campData?.min_price || null,
        status: 'planned',
        session_name: sessionOverride?.session_name || null
      });

      if (result?.error) {
        throw new Error(result.error.message || 'Failed to save camp');
      }

      // Refresh schedule to show the new camp
      await refreshSchedule();

      // Close any open modals/drawers
      setShowAddCamp(null);
      setSearchQuery('');
      setShowCampDrawer(false);
    } catch (error) {
      console.error('Failed to add camp:', error);
      const errorMsg = error.message || 'Unknown error';
      showStatus(`Failed to add camp: ${errorMsg}`);
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
        const result = await addScheduledCamp({
          camp_id: pc.camp_id,
          child_id: pc.child_id,
          start_date: pc.start_date,
          end_date: pc.end_date,
          camp_name: pc.camps?.camp_name || pc.camp_id,
          price: pc.price,
          status: 'planned'
        });
        if (result?.error) {
          throw new Error(result.error.message || 'Failed to save camp');
        }
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
    setShowBlockMenu(null);

    // All block types go through the modal so users can pick week range
    if (blockType.isCustom) {
      setShowCustomBlockModal({ weekNum });
    } else {
      // Pre-fill the modal with the selected type
      setShowCustomBlockModal({
        weekNum,
        editExisting: {
          ...blockType,
          groupId: generateGroupId(),
        },
      });
    }
  }

  function applyBlockToChild(childId, weekNums, customBlock) {
    setBlockedWeeks(prev => {
      const childBlocks = { ...(prev[childId] || {}) };

      // If editing, remove old group weeks first
      if (customBlock.groupId) {
        Object.keys(childBlocks).forEach(wn => {
          if (childBlocks[wn]?.groupId === customBlock.groupId) {
            delete childBlocks[wn];
          }
        });
      }

      // Apply block to all selected weeks
      weekNums.forEach(wn => {
        childBlocks[wn] = { ...customBlock };
      });

      return { ...prev, [childId]: childBlocks };
    });
  }

  function handleSaveCustomBlock(weekNums, customBlock) {
    if (!selectedChild) return;

    // Apply to the current child
    applyBlockToChild(selectedChild, weekNums, customBlock);
    setShowCustomBlockModal(null);

    // If there are other children, offer to apply the same block to them
    const otherChildren = children.filter(c => c.id !== selectedChild);
    if (otherChildren.length > 0) {
      const otherNames = otherChildren.map(c => c.name).join(' and ');
      setConfirmAction({
        message: `Apply "${customBlock.label}" to ${otherNames} too?`,
        onConfirm: () => {
          otherChildren.forEach(child => {
            // Use a new groupId per child so they're independently editable
            const childBlock = { ...customBlock, groupId: generateGroupId() };
            applyBlockToChild(child.id, weekNums, childBlock);
          });
        },
      });
    }
  }

  function handleEditBlock(weekNum) {
    if (!selectedChild) return;
    const existingBlock = blockedWeeks[selectedChild]?.[weekNum];
    if (!existingBlock) return;

    // Assign groupId to legacy blocks so the editor can track them
    let blockToEdit = existingBlock;
    if (!existingBlock.groupId) {
      blockToEdit = { ...existingBlock, groupId: generateGroupId() };
      setBlockedWeeks(prev => ({
        ...prev,
        [selectedChild]: { ...(prev[selectedChild] || {}), [weekNum]: blockToEdit }
      }));
    }

    // Find all weeks in this group
    const groupId = blockToEdit.groupId;
    const groupWeekNums = Object.keys(blockedWeeks[selectedChild] || {})
      .filter(wn => blockedWeeks[selectedChild][wn]?.groupId === groupId)
      .map(Number)
      .sort((a, b) => a - b);

    // For legacy blocks that just got a groupId, the filter above won't find them yet
    if (groupWeekNums.length === 0) groupWeekNums.push(weekNum);

    setShowCustomBlockModal({
      weekNum,
      editExisting: blockToEdit,
      initialWeekNums: groupWeekNums,
    });
  }

  function handleUnblockWeek(weekNum) {
    if (!selectedChild) return;
    const block = blockedWeeks[selectedChild]?.[weekNum];
    const groupId = block?.groupId;

    // Count weeks in this group
    const groupWeekCount = groupId
      ? Object.values(blockedWeeks[selectedChild] || {}).filter(b => b?.groupId === groupId).length
      : 1;

    const doRemove = () => {
      setBlockedWeeks(prev => {
        const childBlocks = { ...(prev[selectedChild] || {}) };
        if (groupId) {
          Object.keys(childBlocks).forEach(wn => {
            if (childBlocks[wn]?.groupId === groupId) {
              delete childBlocks[wn];
            }
          });
        } else {
          delete childBlocks[weekNum];
        }
        return { ...prev, [selectedChild]: childBlocks };
      });
    };

    // Confirm before removing multi-week blocks
    if (groupWeekCount > 1) {
      setConfirmAction({
        message: `Remove all ${groupWeekCount} weeks of "${block.label}"?`,
        onConfirm: doRemove,
      });
    } else {
      doRemove();
    }
  }

  // Block drag-and-drop handlers
  function handleBlockDragStart(weekNum, e) {
    if (!selectedChild) return;
    const block = blockedWeeks[selectedChild]?.[weekNum];
    if (!block) return;

    // Find all weeks in this group
    const groupId = block.groupId;
    const groupWeeks = groupId
      ? Object.keys(blockedWeeks[selectedChild] || {})
          .filter(wn => blockedWeeks[selectedChild][wn]?.groupId === groupId)
          .map(Number)
          .sort((a, b) => a - b)
      : [weekNum];

    e.dataTransfer.setData('blockWeekNum', String(weekNum));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingBlock({ weekNum, block, groupWeeks });
  }

  function handleBlockDragEnd() {
    setDraggingBlock(null);
    setDragOverWeek(null);
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

  // Close block menu when clicking outside (defer so opening click doesn't immediately close it)
  useEffect(() => {
    if (!showBlockMenu) return;
    const handleClickOutside = () => setShowBlockMenu(null);
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showBlockMenu]);

  // Detect conflicts whenever schedule changes
  useEffect(() => {
    if (!selectedChild || scheduledCamps.length < 2) {
      setConflicts([]);
      return;
    }
    const childCamps = scheduledCamps.filter(sc => sc.child_id === selectedChild && sc.status !== 'cancelled');
    const detected = [];

    for (let i = 0; i < childCamps.length; i++) {
      for (let j = i + 1; j < childCamps.length; j++) {
        const campA = childCamps[i];
        const campB = childCamps[j];
        const startA = new Date(campA.start_date);
        const endA = new Date(campA.end_date);
        const startB = new Date(campB.start_date);
        const endB = new Date(campB.end_date);

        // Check for date overlap
        if (startA <= endB && endA >= startB) {
          // Check if same week (not necessarily a problem but flag it)
          const sameWeek = startA.toDateString() === startB.toDateString();
          detected.push({
            type: sameWeek ? CONFLICT_TYPES.SAME_WEEK : CONFLICT_TYPES.OVERLAP,
            camps: [campA, campB],
            message: sameWeek
              ? `${campLookup.get(campA.camp_id)?.camp_name || 'Camp'} and ${campLookup.get(campB.camp_id)?.camp_name || 'Camp'} are scheduled for the same week`
              : `${campLookup.get(campA.camp_id)?.camp_name || 'Camp'} overlaps with ${campLookup.get(campB.camp_id)?.camp_name || 'Camp'}`
          });
        }
      }
    }
    setConflicts(detected);
  }, [scheduledCamps, selectedChild, campLookup]);

  // Fetch camp sessions when session picker is opened (falls back to extracted.sessions)
  useEffect(() => {
    if (!showSessionPicker) return;
    const fetchSessions = async () => {
      const campId = showSessionPicker.camp.id;
      const camp = showSessionPicker.camp;
      if (campSessions[campId] !== undefined) return; // Already cached (including empty array)

      try {
        const sessions = await getCampSessions(campId);

        // If database has sessions, use them
        if (sessions && sessions.length > 0) {
          setCampSessions(prev => ({ ...prev, [campId]: sessions }));
          return;
        }

        // Fall back to extracted.sessions from camp object
        if (camp.extracted?.sessions && camp.extracted.sessions.length > 0) {
          const extractedSessions = camp.extracted.sessions
            .filter(s => s.parsed?.startDate || s.raw) // Only sessions with some data
            .map((s, index) => ({
              id: `extracted-${campId}-${index}`,
              name: s.parsed?.name || s.raw?.split(/[-–]/)?.[0]?.trim() || `Session ${index + 1}`,
              start_date: s.parsed?.startDate || null,
              end_date: s.parsed?.endDate || null,
              price: s.parsed?.price || null,
              is_available: true, // Assume available from scraped data
              raw: s.raw // Keep raw for display fallback
            }));
          setCampSessions(prev => ({ ...prev, [campId]: extractedSessions }));
          return;
        }

        // No sessions found anywhere
        setCampSessions(prev => ({ ...prev, [campId]: [] }));
      } catch (error) {
        console.error('Failed to fetch camp sessions:', error);
        // Set to empty array on error to prevent infinite loading state
        setCampSessions(prev => ({ ...prev, [campId]: [] }));
      }
    };
    fetchSessions();
  }, [showSessionPicker, campSessions]);

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

  // Generate shareable schedule link
  function handleShareSchedule() {
    const child = children.find(c => c.id === selectedChild);
    if (!child) return;

    // Build a shareable data object
    const childSchedule = scheduledCamps.filter(sc => sc.child_id === selectedChild);
    const scheduleData = {
      childName: child.name,
      weeks: summerWeeks.map(week => {
        const weekCamps = childSchedule.filter(sc => {
          const scStart = new Date(sc.start_date);
          const weekStart = new Date(week.startDate);
          const weekEnd = new Date(week.endDate);
          return scStart >= weekStart && scStart <= weekEnd;
        });
        return {
          weekNum: week.weekNum,
          display: week.display,
          camps: weekCamps.map(sc => ({
            name: campLookup.get(sc.camp_id)?.camp_name || 'Camp',
            price: sc.price,
            status: sc.status
          }))
        };
      }).filter(w => w.camps.length > 0),
      totalCost: getTotalCost()
    };

    // Encode as URL-safe base64 for query parameter
    // Use URL-safe base64: replace + with -, / with _, and remove padding =
    const jsonStr = JSON.stringify(scheduleData);
    const base64 = btoa(jsonStr);
    const urlSafeBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = `${window.location.origin}?shared=${encodeURIComponent(urlSafeBase64)}`;
    setShareLink(url);
    setShowShareModal(true);
  }

  // Copy share link to clipboard
  async function copyShareLink() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showStatus('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      showStatus('Failed to copy link');
    }
  }

  // Handle print view
  function handlePrint() {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  }

  // Move camp to a different week
  async function handleMoveCamp(scheduledCampId, newWeekNum) {
    const newWeek = summerWeeks.find(w => w.weekNum === newWeekNum);
    if (!newWeek) return;

    try {
      await updateScheduledCamp(scheduledCampId, {
        start_date: newWeek.startDate,
        end_date: newWeek.endDate
      });
      await refreshSchedule();
      showStatus('Camp moved successfully');
    } catch (error) {
      console.error('Failed to move camp:', error);
      showStatus('Failed to move camp. Please try again.');
    }
    setMovingCamp(null);
  }

  // Start moving a camp (drag between weeks)
  function handleStartMoveCamp(scheduledCamp, e) {
    e.stopPropagation();
    setMovingCamp(scheduledCamp);
    e.dataTransfer.setData('movingCampId', scheduledCamp.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  // Apply auto-fill suggestion
  async function handleApplyAutoFill(gap, camp) {
    await handleAddCamp(camp, gap.weekNum);
    // Remove this suggestion from the list
    setAutoFillSuggestions(prev =>
      prev.map(s => s.gap.weekNum === gap.weekNum
        ? { ...s, camps: s.camps.filter(c => c.id !== camp.id) }
        : s
      ).filter(s => s.camps.length > 0)
    );
  }

  // Apply all auto-fill suggestions (first camp for each gap)
  async function handleApplyAllAutoFill() {
    for (const suggestion of autoFillSuggestions) {
      if (suggestion.camps.length > 0) {
        await handleAddCamp(suggestion.camps[0], suggestion.gap.weekNum);
      }
    }
    setAutoFillSuggestions([]);
    setShowAutoFillSuggestions(false);
    showStatus('All gaps filled');
  }

  // Touch handlers for mobile drag-drop
  function handleTouchStart(camp, e) {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      camp,
      startTime: Date.now()
    };
  }

  function handleTouchMove(e) {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Start drag if moved enough
    if (deltaX > 10 || deltaY > 10) {
      setTouchDragState({
        camp: touchStartRef.current.camp,
        x: touch.clientX,
        y: touch.clientY
      });

      // Find week under touch point
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const weekCard = element?.closest('.week-card');
      if (weekCard) {
        const weekNum = parseInt(weekCard.dataset.weekNum);
        setDragOverWeek(weekNum);
      }
    }
  }

  function handleTouchEnd(e) {
    if (touchDragState && dragOverWeek) {
      // Don't drop on blocked weeks
      const isTargetBlocked = !!(selectedChild && blockedWeeks[selectedChild]?.[dragOverWeek]);
      if (!isTargetBlocked) {
        handleAddCamp(touchDragState.camp, dragOverWeek);
      }
    }

    touchStartRef.current = null;
    setTouchDragState(null);
    setDragOverWeek(null);
  }

  // Handle session picker selection
  async function handleSelectSession(session) {
    if (!showSessionPicker) return;

    const camp = showSessionPicker.camp;
    await handleAddCamp(camp, showSessionPicker.weekNum, {
      start_date: session.start_date,
      end_date: session.end_date,
      session_name: session.name
    });
    setShowSessionPicker(null);
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
      setMovingCamp(null);
      setDraggingBlock(null);
      return;
    }

    // Check if we're moving a block
    const blockWeekNum = e.dataTransfer.getData('blockWeekNum');
    if (blockWeekNum) {
      if (!draggingBlock) {
        // State lost — clean up lingering UI state
        setDragOverWeek(null);
        return;
      }
      const { groupWeeks, block } = draggingBlock;
      const draggedWeek = Number(blockWeekNum);
      const offset = weekNum - draggedWeek;

      if (offset === 0) {
        setDraggingBlock(null);
        setDragOverWeek(null);
        return;
      }

      // Calculate new week positions
      const newWeeks = groupWeeks.map(w => w + offset);

      // Validate: all new weeks must be valid and empty (no camps, no other blocks)
      const childBlocks = blockedWeeks[selectedChild] || {};
      const valid = newWeeks.every(nw => {
        if (nw < 1 || nw > TOTAL_SUMMER_WEEKS) return false;
        const existingBlock = childBlocks[nw];
        // Allow if it's part of the same group being moved
        if (existingBlock && existingBlock.groupId === block.groupId) return true;
        if (existingBlock) return false;
        // Check for scheduled camps
        const weekCamps = currentChildSchedule[nw] || [];
        return weekCamps.length === 0;
      });

      if (!valid) {
        showStatus('Can\'t move here — some weeks are occupied.');
        setDraggingBlock(null);
        setDragOverWeek(null);
        return;
      }

      // Move the block group
      setBlockedWeeks(prev => {
        const cb = { ...(prev[selectedChild] || {}) };
        // Remove old positions
        groupWeeks.forEach(w => delete cb[w]);
        // Set new positions
        newWeeks.forEach(w => { cb[w] = { ...block }; });
        return { ...prev, [selectedChild]: cb };
      });

      setDraggingBlock(null);
      setDragOverWeek(null);
      return;
    }

    // Check if we're moving an existing scheduled camp
    const movingCampId = e.dataTransfer.getData('movingCampId');
    if (movingCampId) {
      handleMoveCamp(movingCampId, weekNum);
      setDragOverWeek(null);
      setMovingCamp(null);
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
  const gaps = selectedChild
    ? getCoverageGaps(selectedChild, summerWeeks).filter(
        week => !blockedWeeks[selectedChild]?.[week.weekNum]
      )
    : [];
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

  // Render week card using extracted WeekColumn sub-component
  function renderWeekCard(week) {
    const weekCamps = currentChildSchedule[week.weekNum] || [];
    const blocked = getBlockedWeek(week.weekNum);
    const weekCost = weekCostBreakdown.find(w => w.weekNum === week.weekNum)?.cost || 0;

    return (
      <WeekColumn
        key={week.weekNum}
        week={week}
        weekCamps={weekCamps}
        gaps={gaps}
        dragOverWeek={dragOverWeek}
        blocked={blocked}
        showBlockMenu={showBlockMenu}
        weekCost={weekCost}
        profile={profile}
        campLookup={campLookup}
        conflicts={conflicts}
        movingCamp={movingCamp}
        draggingBlock={draggingBlock}
        groupPosition={blockGroupPositions[week.weekNum] || null}
        selectedChildData={selectedChildData}
        isLookingForFriends={isLookingForFriends}
        hasSquads={hasSquads}
        moveMenuCamp={moveMenuCamp}
        setMoveMenuCamp={setMoveMenuCamp}
        setShowBlockMenu={setShowBlockMenu}
        setShowAddCamp={setShowAddCamp}
        setDragOverWeek={setDragOverWeek}
        setMovingCamp={setMovingCamp}
        onWeekDrop={handleWeekDrop}
        onBlockWeek={handleBlockWeek}
        onEditBlock={handleEditBlock}
        onUnblockWeek={handleUnblockWeek}
        onBlockDragStart={handleBlockDragStart}
        onBlockDragEnd={handleBlockDragEnd}
        onStartMoveCamp={handleStartMoveCamp}
        onMoveCamp={handleMoveCamp}
        onRemoveCamp={handleRemoveCamp}
        onToggleLookingForFriends={handleToggleLookingForFriends}
        onTouchStartCamp={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { setTouchDragState(null); setDragOverWeek(null); }}
        touchStartRef={touchStartRef}
        touchDragState={touchDragState}
      />
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

      {/* Custom Block Modal */}
      {showCustomBlockModal && (
        <BlockedWeekManager
          weekNum={showCustomBlockModal.weekNum}
          editExisting={showCustomBlockModal.editExisting}
          initialWeekNums={showCustomBlockModal.initialWeekNums}
          summerWeeks={summerWeeks}
          blockedWeeks={blockedWeeks[selectedChild] || {}}
          scheduledCamps={scheduledCamps.filter(sc => sc.child_id === selectedChild)}
          onSave={handleSaveCustomBlock}
          onClose={() => setShowCustomBlockModal(null)}
        />
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
              aria-label={previewMode ? 'Exit What-If Mode' : 'What-If Planning'}
              aria-pressed={previewMode}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="planner-preview-label">What-If</span>
            </button>
            <button
              onClick={() => setShowShareCard(true)}
              className="planner-share-btn"
              aria-label="Share your summer plan"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
              <span className="planner-share-label">Share</span>
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
        <button
          onClick={() => setActiveTab('achievements')}
          className={`planner-tab ${activeTab === 'achievements' ? 'active' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Badges
        </button>
      </div>

      {/* Preview Mode Banner */}
      {previewMode && (
        <div className="planner-preview-banner">
          <div className="planner-preview-content">
            <span className="planner-preview-icon"><BrandIcon name="crystal-ball" size={20} /></span>
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
        <div key="squads" className="planner-main tab-content-enter" style={{ padding: 0 }}>
          <SquadsPanel onClose={onClose} />
        </div>
      ) : activeTab === 'achievements' ? (
        <div key="achievements" className="planner-main tab-content-enter" style={{ padding: '1rem' }}>
          <AchievementBadges variant="grid" showFilters={true} />
        </div>
      ) : activeTab === 'status' ? (
        <main key="status" className="planner-main tab-content-enter">
          {/* Status Board View */}
          {children.length === 0 ? (
            <div className="planner-empty">
              <div className="planner-empty-icon"><BrandIcon name="family" size={32} /></div>
              <h2 className="planner-empty-title">Add your children first</h2>
              <p className="planner-empty-text">Add children to plan each schedule separately.</p>
              <button
                onClick={() => navigate('/children')}
                className="btn-primary"
              >
                Add Children
              </button>
            </div>
          ) : (
            <div className="status-board">
              {/* Status columns: planned, registered, confirmed, waitlisted, cancelled */}
              {[
                { status: 'planned', label: 'Planned', color: '#94a3b8', icon: 'clipboard' },
                { status: 'registered', label: 'Registered', color: '#3b82f6', icon: 'pencil' },
                { status: 'confirmed', label: 'Confirmed', color: '#22c55e', icon: 'check-square' },
                { status: 'waitlisted', label: 'Waitlisted', color: '#f59e0b', icon: 'hourglass' },
                { status: 'cancelled', label: 'Cancelled', color: '#ef4444', icon: 'x-circle' }
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
                      <span className="status-column-icon"><BrandIcon name={column.icon} size={14} /></span>
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
      <main key="schedule" className="planner-main tab-content-enter">
        {/* Sample Data Banner */}
        {hasSampleData && !previewMode && (
          <div className="planner-sample-banner" role="status" aria-live="polite">
            <div className="planner-sample-content">
              <span className="planner-sample-badge">DEMO</span>
              <div>
                <p className="planner-sample-title">You're viewing sample data</p>
                <p className="planner-sample-text">This is a demo. Clear sample data to start planning your own summer.</p>
              </div>
            </div>
            <button
              onClick={handleClearSampleData}
              disabled={clearingSampleData}
              className="planner-sample-clear"
            >
              {clearingSampleData ? 'Clearing...' : 'Clear Sample Data'}
            </button>
          </div>
        )}

        {children.length === 0 ? (
          <div className="planner-empty">
            <div className="planner-empty-icon"><BrandIcon name="family" size={32} /></div>
            <h2 className="planner-empty-title">Add your children first</h2>
            <p className="planner-empty-text">Add children to plan each schedule separately.</p>
            <button
              onClick={() => navigate('/children')}
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
                {/* Work Schedule Overlay Indicator */}
                {profile?.work_hours_start && profile?.work_hours_end && (
                  <>
                    <span className="summer-strip-divider" />
                    <span className="summer-strip-work-hours" title="Configured work hours - camps should cover this time">
                      <ClockIcon className="work-hours-icon" />
                      <span className="work-hours-label">Work:</span>
                      <strong>{formatWorkTime(profile.work_hours_start)}-{formatWorkTime(profile.work_hours_end)}</strong>
                    </span>
                  </>
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

            {/* Planning Progress & Tips */}
            <div className="planner-gamification-strip">
              <ProgressTracker variant="compact" className="planner-progress" />
              <PlanningTipsContainer variant="inline" className="planner-tips" excludeTips={['check_gaps']} />
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
                      aria-label="Search camp library"
                    />
                    {sidebarSearch && (
                      <button
                        onClick={() => setSidebarSearch('')}
                        className="planner-sidebar-clear"
                        aria-label="Clear search"
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
                        <span className="sidebar-empty-icon"><BrandIcon name="search" size={24} /></span>
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
              <WeekSelector
                currentWeekIndex={currentWeekIndex}
                onSwipe={handleSwipe}
              />
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
        <div className="planner-drawer-overlay" onClick={() => { setShowCampDrawer(false); setShowAddCamp(null); }} role="dialog" aria-modal="true" aria-label={showAddCamp ? 'Add camp to schedule' : 'Camp Library'}>
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
                aria-label="Close drawer"
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
                aria-label="Search camps"
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
                    <div className="planner-drawer-camp-placeholder"><BrandIcon name="overnight" size={20} /></div>
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
          {/* Visual Coverage Indicator */}
          <div className="planner-bottom-coverage">
            <div className="planner-coverage-bar-mini">
              {summerWeeks.map(week => {
                const hasCamp = (currentChildSchedule[week.weekNum] || []).length > 0;
                const hasBlock = !!blockedWeeks[selectedChild]?.[week.weekNum];
                return (
                  <div
                    key={week.weekNum}
                    className={`coverage-segment ${hasCamp ? 'filled' : ''} ${hasBlock ? 'blocked' : ''}`}
                    style={hasCamp ? { '--segment-color': selectedChildData?.color } : {}}
                    title={`Week ${week.weekNum}: ${hasCamp ? 'Covered' : hasBlock ? 'Blocked' : 'Gap'}`}
                  />
                );
              })}
            </div>
            <span className="planner-coverage-text">{coverageStats.percentage}% covered</span>
          </div>

          {/* Stats */}
          <div className="planner-bottom-stats">
            <button
              className={`planner-bottom-stat clickable ${profile?.summer_budget && totalCost > profile.summer_budget ? 'over-budget' : ''} ${profile?.summer_budget && totalCost >= profile.summer_budget * budgetWarningThreshold && totalCost <= profile.summer_budget ? 'approaching-budget' : ''}`}
              onClick={() => setShowCostBreakdown(!showCostBreakdown)}
              title={profile?.summer_budget ? `Budget: $${profile.summer_budget.toLocaleString()} (${Math.round((totalCost / profile.summer_budget) * 100)}% used)` : 'View cost breakdown'}
            >
              <span className={`planner-bottom-stat-value ${profile?.summer_budget && totalCost > profile.summer_budget ? 'budget-warning' : ''} ${profile?.summer_budget && totalCost >= profile.summer_budget * budgetWarningThreshold && totalCost <= profile.summer_budget ? 'budget-approaching' : ''}`}>
                ${totalCost.toLocaleString()}
                {profile?.summer_budget && (
                  <span className="budget-indicator">
                    {totalCost > profile.summer_budget ? ' ⚠' : totalCost >= profile.summer_budget * budgetWarningThreshold ? ' ⚡' : ` / $${profile.summer_budget.toLocaleString()}`}
                  </span>
                )}
              </span>
              <span className="planner-bottom-stat-label">{profile?.summer_budget && totalCost > profile.summer_budget ? 'Over Budget!' : profile?.summer_budget && totalCost >= profile.summer_budget * budgetWarningThreshold ? 'Approaching Budget' : 'Total'}</span>
            </button>
            <div className="planner-bottom-stat-divider" />
            <button
              className={`planner-bottom-stat clickable ${gaps.length > 0 ? 'has-gaps-btn' : ''}`}
              onClick={generateAutoFillSuggestions}
              title={gaps.length > 0 ? 'Auto-fill gaps' : 'No gaps'}
              disabled={gaps.length === 0}
            >
              <span className={`planner-bottom-stat-value ${gaps.length > 0 ? 'has-gaps' : 'no-gaps'}`}>
                {gaps.length}
              </span>
              <span className="planner-bottom-stat-label">Gaps</span>
            </button>
            {conflicts.length > 0 && (
              <>
                <div className="planner-bottom-stat-divider" />
                <div className="planner-bottom-stat conflict-stat">
                  <span className="planner-bottom-stat-value has-conflicts">{conflicts.length}</span>
                  <span className="planner-bottom-stat-label">Conflicts</span>
                </div>
              </>
            )}
          </div>

          {/* Export Actions */}
          <div className="planner-bottom-actions">
            {(scheduledCamps.filter(sc => sc.child_id === selectedChild).length > 0 || Object.keys(blockedWeeks[selectedChild] || {}).length > 0) && (
              <>
                <button
                  onClick={() => {
                    const child = children.find(c => c.id === selectedChild);
                    const childSchedules = scheduledCamps.filter(sc => sc.child_id === selectedChild);
                    // Include blocked weeks as all-day events
                    const childBlocks = blockedWeeks[selectedChild] || {};
                    const blockEvents = Object.entries(childBlocks).map(([weekNum, block]) =>
                      formatBlockedWeekForCalendar(block, parseInt(weekNum), summerWeeks)
                    ).filter(Boolean);
                    exportAllToICal(camps, childSchedules, child?.name, blockEvents);
                  }}
                  className="planner-bottom-action-btn"
                  title="Download .ics file (includes blocked weeks)"
                >
                  <DownloadIcon />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => {
                    const childSchedules = scheduledCamps.filter(sc => sc.child_id === selectedChild);
                    const childBlocks = blockedWeeks[selectedChild] || {};

                    // Collect camp events
                    const campEvents = childSchedules.map(schedule => {
                      const camp = campLookup.get(schedule.camp_id);
                      if (!camp) return null;
                      return formatCampForCalendar(camp, schedule);
                    }).filter(Boolean);

                    // Collect blocked week events
                    const blockEvents = Object.entries(childBlocks).map(([weekNum, block]) =>
                      formatBlockedWeekForCalendar(block, parseInt(weekNum), summerWeeks)
                    ).filter(Boolean);

                    const allEvents = [...campEvents, ...blockEvents];

                    if (allEvents.length > 0) {
                      // Open each event with staggered timing (max 5 to avoid popup blocking)
                      const maxTabs = 5;
                      allEvents.slice(0, maxTabs).forEach((event, index) => {
                        setTimeout(() => {
                          window.open(createGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
                        }, index * 500);
                      });

                      if (allEvents.length > maxTabs) {
                        showStatus(`Opened first ${maxTabs} events. Use Export to download all ${allEvents.length} as .ics file.`);
                      }
                    }
                  }}
                  className="planner-bottom-action-btn"
                  title="Add all camps and blocked weeks to Google Calendar"
                >
                  <CalendarExportIcon />
                  <span>Calendar</span>
                </button>
                <button
                  onClick={handleShareSchedule}
                  className="planner-bottom-action-btn"
                  title="Share schedule"
                >
                  <ShareIcon />
                  <span>Share</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="planner-bottom-action-btn"
                  title="Print schedule"
                >
                  <PrintIcon />
                  <span>Print</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Cost Breakdown Modal */}
      {showCostBreakdown && (
        <CostSummary
          costStats={costStats}
          selectedChildData={selectedChildData}
          onClose={() => setShowCostBreakdown(false)}
        />
      )}

      {/* Share Schedule Modal */}
      {showShareModal && (
        <div className="planner-modal-overlay" onClick={() => setShowShareModal(false)} role="dialog" aria-modal="true" aria-label="Share Schedule">
          <div className="planner-modal share-modal" onClick={e => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h2 className="planner-modal-title">Share Schedule</h2>
              <button onClick={() => setShowShareModal(false)} className="planner-modal-close" aria-label="Close">
                <XIcon />
              </button>
            </div>
            <div className="planner-modal-content">
              <p className="share-modal-description">
                Share {selectedChildData?.name}'s summer schedule with family members.
              </p>
              <div className="share-link-container">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="share-link-input"
                  aria-label="Shareable link"
                />
                <button onClick={copyShareLink} className="share-copy-btn">
                  Copy
                </button>
              </div>
              <div className="share-options">
                <button
                  onClick={() => {
                    const text = `Check out ${selectedChildData?.name}'s summer camp schedule: ${shareLink}`;
                    window.open(`mailto:?subject=${encodeURIComponent(`${selectedChildData?.name}'s Summer Camps 2026`)}&body=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="share-option-btn"
                >
                  <EmailIcon />
                  <span>Email</span>
                </button>
                <button
                  onClick={() => {
                    const text = `Check out ${selectedChildData?.name}'s summer camp schedule!`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareLink)}`, '_blank');
                  }}
                  className="share-option-btn"
                >
                  <MessageIcon />
                  <span>Message</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shareable Summer Card Modal */}
      {showShareCard && (
        <ShareableSummerCard onClose={() => setShowShareCard(false)} />
      )}

      {/* Auto-Fill Suggestions Modal */}
      {showAutoFillSuggestions && autoFillSuggestions.length > 0 && (
        <div className="planner-modal-overlay" onClick={() => setShowAutoFillSuggestions(false)} role="dialog" aria-modal="true" aria-label="Fill Coverage Gaps">
          <div className="planner-modal autofill-modal" onClick={e => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h2 className="planner-modal-title">Fill Coverage Gaps</h2>
              <button onClick={() => setShowAutoFillSuggestions(false)} className="planner-modal-close" aria-label="Close">
                <XIcon />
              </button>
            </div>
            <div className="planner-modal-content">
              <p className="autofill-description">
                Suggestions to fill {autoFillSuggestions.length} gap{autoFillSuggestions.length > 1 ? 's' : ''} in {selectedChildData?.name}'s schedule.
              </p>
              <div className="autofill-suggestions">
                {autoFillSuggestions.map(suggestion => (
                  <div key={suggestion.gap.weekNum} className="autofill-gap">
                    <div className="autofill-gap-header">
                      <span className="autofill-gap-label">{suggestion.gap.label}</span>
                      <span className="autofill-gap-dates">{suggestion.gap.display}</span>
                    </div>
                    <div className="autofill-camp-options">
                      {suggestion.camps.map(camp => (
                        <button
                          key={camp.id}
                          onClick={() => handleApplyAutoFill(suggestion.gap, camp)}
                          className="autofill-camp-btn"
                        >
                          <span className="autofill-camp-name">{camp.camp_name}</span>
                          <span className="autofill-camp-meta">
                            {camp.category} • {camp.min_price ? `$${camp.min_price}` : 'TBD'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="autofill-actions">
                <button
                  onClick={handleApplyAllAutoFill}
                  className="autofill-apply-all-btn"
                >
                  Fill All Gaps
                </button>
                <button
                  onClick={() => setShowAutoFillSuggestions(false)}
                  className="autofill-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Picker Modal */}
      {showSessionPicker && (
        <div className="planner-modal-overlay" onClick={() => setShowSessionPicker(null)} role="dialog" aria-modal="true" aria-label="Select Session">
          <div className="planner-modal session-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h2 className="planner-modal-title">Select Session</h2>
              <button onClick={() => setShowSessionPicker(null)} className="planner-modal-close" aria-label="Close">
                <XIcon />
              </button>
            </div>
            <div className="planner-modal-content">
              <p className="session-picker-camp-name">{showSessionPicker.camp.camp_name}</p>
              {campSessions[showSessionPicker.camp.id] ? (
                campSessions[showSessionPicker.camp.id].length > 0 ? (
                  <div className="session-picker-list">
                    {campSessions[showSessionPicker.camp.id].map(session => (
                      <button
                        key={session.id}
                        onClick={() => handleSelectSession(session)}
                        className="session-picker-item"
                      >
                        <span className="session-name">{session.name || 'Session'}</span>
                        <span className="session-dates">
                          {session.start_date && session.end_date ? (
                            <>
                              {new Date(session.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' - '}
                              {new Date(session.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </>
                          ) : session.raw ? (
                            <span className="session-raw-text">{session.raw}</span>
                          ) : (
                            <span className="session-dates-tbd">Dates TBD</span>
                          )}
                        </span>
                        {session.price && (
                          <span className="session-price">${session.price}</span>
                        )}
                        {!session.is_available && (
                          <span className="session-unavailable">Full</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="session-picker-empty">
                    <span>No specific sessions available for this camp.</span>
                  </div>
                )
              ) : (
                <div className="session-picker-loading">
                  <span>Loading sessions...</span>
                </div>
              )}
              <button
                onClick={() => {
                  handleAddCamp(showSessionPicker.camp, showSessionPicker.weekNum);
                  setShowSessionPicker(null);
                }}
                className="session-picker-default-btn"
              >
                Use default week dates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print View */}
      {showPrintView && (
        <div className="print-view">
          <div className="print-header">
            <h1>{selectedChildData?.name}'s Summer 2026</h1>
            <p>Generated {new Date().toLocaleDateString()}</p>
          </div>
          <table className="print-schedule-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Dates</th>
                <th>Camp</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {weekCostBreakdown.map(week => {
                const weekCamps = week.camps;
                if (weekCamps.length === 0 && !week.isBlocked) {
                  return (
                    <tr key={week.weekNum} className="print-gap-row">
                      <td>{week.label}</td>
                      <td>{week.display}</td>
                      <td colSpan="3" className="print-gap">Gap - No camp scheduled</td>
                    </tr>
                  );
                }
                if (week.isBlocked) {
                  return (
                    <tr key={week.weekNum} className="print-blocked-row">
                      <td>{week.label}</td>
                      <td>{week.display}</td>
                      <td colSpan="3">{week.blockType?.label}</td>
                    </tr>
                  );
                }
                return weekCamps.map((sc, idx) => {
                  const campInfo = campLookup.get(sc.camp_id);
                  return (
                    <tr key={`${week.weekNum}-${idx}`}>
                      {idx === 0 && <td rowSpan={weekCamps.length}>{week.label}</td>}
                      {idx === 0 && <td rowSpan={weekCamps.length}>{week.display}</td>}
                      <td>{campInfo?.camp_name || 'Camp'}</td>
                      <td>{sc.price ? `$${sc.price}` : 'TBD'}</td>
                      <td>{sc.status}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3"><strong>Total</strong></td>
                <td colSpan="2"><strong>${totalCost.toLocaleString()}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Touch Drag Ghost */}
      {touchDragState && (
        <div
          className="touch-drag-ghost"
          style={{
            left: touchDragState.x - 50,
            top: touchDragState.y - 25
          }}
        >
          {touchDragState.camp.camp_name || campLookup.get(touchDragState.camp.camp_id)?.camp_name || 'Camp'}
        </div>
      )}

      {/* Styles are in SchedulePlanner.css */}
    </div>
  );
}


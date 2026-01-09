import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSummerWeeks2026, addScheduledCamp, deleteScheduledCamp, updateScheduledCamp, clearSampleData, toggleLookingForFriends } from '../lib/supabase';
import { createGoogleCalendarUrl, exportAllToICal, formatCampForCalendar } from '../lib/googleCalendar';
import { GuidedTour } from './GuidedTour';
import SquadsPanel from './SquadsPanel';
import SquadNotificationBell from './SquadNotificationBell';

const summerWeeks = getSummerWeeks2026();

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

  // Group scheduled camps by child and week
  const scheduleByChildAndWeek = useMemo(() => {
    const result = {};

    children.forEach(child => {
      result[child.id] = {};
      summerWeeks.forEach(week => {
        result[child.id][week.weekNum] = [];
      });
    });

    scheduledCamps.forEach(sc => {
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
  }, [children, scheduledCamps]);

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
    const week = summerWeeks.find(w => w.weekNum === weekNum);
    if (!week || !selectedChild) return;

    const campData = camps.find(c => c.id === camp.id);

    await addScheduledCamp({
      camp_id: camp.id,
      child_id: selectedChild,
      start_date: week.startDate,
      end_date: week.endDate,
      price: campData?.min_price || null,
      status: 'planned'
    });

    await refreshSchedule();
    setShowAddCamp(null);
    setSearchQuery('');
    setShowCampDrawer(false);
  }

  async function handleRemoveCamp(scheduleId, e) {
    e?.stopPropagation();
    if (confirm('Remove this camp from your schedule?')) {
      await deleteScheduledCamp(scheduleId);
      await refreshSchedule();
    }
  }

  async function handleStatusChange(scheduleId, newStatus) {
    await updateScheduledCamp(scheduleId, { status: newStatus });
    await refreshSchedule();
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
    if (!confirm('Clear sample data? Your real children and camps will remain.')) return;

    setClearingSampleData(true);
    try {
      await clearSampleData();
      await refreshChildren();
      await refreshSchedule();
    } catch (error) {
      console.error('Error clearing sample data:', error);
      alert('Failed to clear sample data. Please try again.');
    } finally {
      setClearingSampleData(false);
    }
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
    const campId = e.dataTransfer.getData('campId');
    if (campId) {
      const camp = camps.find(c => c.id === campId);
      if (camp) {
        handleAddCamp(camp, weekNum);
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
    const currentlyLooking = isLookingForFriends(campId, childId, weekNum);
    await toggleLookingForFriends(campId, childId, weekNum, !currentlyLooking);
    await refreshCampInterests();
  }

  // Check if user has any squads (to show the toggle)
  const hasSquads = squads.length > 0;

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

          {/* Right: Stats & Actions */}
          <div className="planner-header-right">
            {/* Squad Notifications */}
            <SquadNotificationBell />

            <div className="planner-stats">
              <div className="planner-stat">
                <span className="planner-stat-value">${totalCost.toLocaleString()}</span>
                <span className="planner-stat-label">Total</span>
              </div>
              <div className="planner-stat-divider" />
              <div className="planner-stat">
                <span className={`planner-stat-value ${gaps.length > 0 ? 'has-gaps' : 'no-gaps'}`}>
                  {gaps.length}
                </span>
                <span className="planner-stat-label">Gaps</span>
              </div>
            </div>

            {/* Export Menu */}
            {scheduledCamps.length > 0 && (
              <div className="planner-export-group">
                <button
                  onClick={() => {
                    const child = children.find(c => c.id === selectedChild);
                    const childSchedules = scheduledCamps.filter(sc => sc.child_id === selectedChild);
                    exportAllToICal(camps, childSchedules, child?.name);
                  }}
                  className="planner-export-btn"
                  title="Download .ics file"
                >
                  <DownloadIcon />
                </button>
                <button
                  onClick={() => {
                    const childSchedules = scheduledCamps.filter(sc => sc.child_id === selectedChild);
                    if (childSchedules.length > 0) {
                      const firstSchedule = childSchedules[0];
                      const camp = camps.find(c => c.id === firstSchedule.camp_id);
                      if (camp) {
                        const event = formatCampForCalendar(camp, firstSchedule);
                        window.open(createGoogleCalendarUrl(event), '_blank');
                      }
                    }
                  }}
                  className="planner-export-btn"
                  title="Add to Google Calendar"
                >
                  <CalendarExportIcon />
                </button>
              </div>
            )}
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
          onClick={() => setActiveTab('squads')}
          className={`planner-tab ${activeTab === 'squads' ? 'active' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Squads
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'squads' ? (
        <div className="planner-main" style={{ padding: 0 }}>
          <SquadsPanel onClose={onClose} />
        </div>
      ) : (
      <main className="planner-main">
        {/* Sample Data Banner */}
        {hasSampleData && (
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
            {/* Camp Sidebar */}
            <aside className={`planner-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
              <div className="planner-sidebar-header">
                <h3 className="planner-sidebar-title">Camps</h3>
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
                    <span>Drag camps to weeks →</span>
                  </div>

                  <div className="planner-sidebar-list">
                    {sidebarCamps.map(camp => (
                      <div
                        key={camp.id}
                        draggable
                        onDragStart={(e) => handleDragStart(camp, e)}
                        onDragEnd={handleDragEnd}
                        className={`planner-sidebar-camp ${draggedCamp?.id === camp.id ? 'dragging' : ''}`}
                      >
                        <div className="planner-sidebar-camp-name">{camp.camp_name}</div>
                        <div className="planner-sidebar-camp-meta">
                          <span className="planner-sidebar-camp-category">{camp.category}</span>
                          <span className="planner-sidebar-camp-price">
                            {camp.min_price ? `$${camp.min_price}` : 'TBD'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {sidebarCamps.length === 0 && (
                      <div className="planner-sidebar-empty">
                        No camps found
                      </div>
                    )}
                  </div>
                </>
              )}
            </aside>

            {/* Timeline View */}
            <div className="planner-timeline">
              {/* Month Labels */}
              <div className="planner-months">
                <div className="planner-month-label" style={{ gridColumn: '1 / 5' }}>June</div>
                <div className="planner-month-label" style={{ gridColumn: '5 / 9' }}>July</div>
                <div className="planner-month-label" style={{ gridColumn: '9 / 12' }}>August</div>
              </div>

              {/* Week Grid */}
              <div className="planner-weeks-container" ref={weekScrollRef}>
                <div className="planner-weeks">
                  {summerWeeks.map((week) => {
                    const weekCamps = currentChildSchedule[week.weekNum] || [];
                    const isGap = gaps.some(g => g.weekNum === week.weekNum);
                    const isDragOver = dragOverWeek === week.weekNum;
                    const blocked = getBlockedWeek(week.weekNum);
                    const isBlockMenuOpen = showBlockMenu?.weekNum === week.weekNum;

                    return (
                      <div
                        key={week.weekNum}
                        className={`planner-week ${weekCamps.length > 0 ? 'has-camps' : ''} ${isGap && !blocked ? 'is-gap' : ''} ${isDragOver ? 'drag-over' : ''} ${blocked ? 'is-blocked' : ''}`}
                        style={blocked ? { '--block-color': blocked.color } : {}}
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
                      >
                        {/* Week Header */}
                        <div className="planner-week-header">
                          <span className="planner-week-label">{week.label}</span>
                          <span className="planner-week-dates">{week.display}</span>
                        </div>

                        {/* Week Content */}
                        <div className="planner-week-content">
                          {blocked ? (
                            // Blocked week display
                            <div className="planner-block-card" style={{ '--block-color': blocked.color }}>
                              <span className="planner-block-icon">{blocked.icon}</span>
                              <span className="planner-block-label">{blocked.label}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnblockWeek(week.weekNum);
                                }}
                                className="planner-block-remove"
                                aria-label="Remove block"
                              >
                                <XIcon />
                              </button>
                            </div>
                          ) : weekCamps.length > 0 ? (
                            weekCamps.map(sc => {
                              const campInfo = camps.find(c => c.id === sc.camp_id);
                              const lookingForFriends = isLookingForFriends(sc.camp_id, sc.child_id, week.weekNum);
                              return (
                                <div
                                  key={sc.id}
                                  className={`planner-camp-card ${lookingForFriends ? 'looking-for-friends' : ''}`}
                                  style={{ '--child-color': selectedChildData?.color || 'var(--ocean-500)' }}
                                >
                                  <div className="planner-camp-header">
                                    <span className="planner-camp-name">{campInfo?.camp_name || 'Unknown'}</span>
                                    <button
                                      onClick={(e) => handleRemoveCamp(sc.id, e)}
                                      className="planner-camp-remove"
                                      aria-label="Remove camp"
                                    >
                                      <XIcon />
                                    </button>
                                  </div>
                                  <div className="planner-camp-meta">
                                    <span className="planner-camp-price">
                                      {sc.price ? `$${sc.price}` : 'TBD'}
                                    </span>
                                    <span className={`planner-camp-status status-${sc.status}`}>
                                      {sc.status}
                                    </span>
                                  </div>
                                  {/* Looking for friends toggle - only show if user has squads */}
                                  {hasSquads && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleLookingForFriends(sc.camp_id, sc.child_id, week.weekNum);
                                      }}
                                      className={`planner-camp-friends-toggle ${lookingForFriends ? 'active' : ''}`}
                                      title={lookingForFriends ? 'Looking for friends' : 'Find friends for this camp'}
                                    >
                                      <span className="friends-icon">👥</span>
                                      <span className="friends-text">{lookingForFriends ? 'Looking' : 'Find friends'}</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="planner-week-empty">
                              <PlusIcon />
                              <span>Add</span>
                            </div>
                          )}
                        </div>

                        {/* Gap indicator */}
                        {isGap && weekCamps.length === 0 && !blocked && (
                          <div className="planner-gap-badge">Gap</div>
                        )}

                        {/* Block Menu Popup */}
                        {isBlockMenuOpen && (
                          <div className="planner-block-menu" onClick={(e) => e.stopPropagation()}>
                            <div className="planner-block-menu-header">
                              <span>What's happening?</span>
                              <button onClick={() => setShowBlockMenu(null)} className="planner-block-menu-close">
                                <XIcon />
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                setShowBlockMenu(null);
                                setShowAddCamp({ weekNum: week.weekNum });
                              }}
                              className="planner-block-option planner-block-option-camp"
                            >
                              <span className="planner-block-option-icon">🏕️</span>
                              <span>Add a Camp</span>
                            </button>
                            <div className="planner-block-divider">
                              <span>or mark as...</span>
                            </div>
                            {BLOCK_TYPES.map(block => (
                              <button
                                key={block.id}
                                onClick={() => handleBlockWeek(week.weekNum, block)}
                                className="planner-block-option"
                                style={{ '--block-color': block.color }}
                              >
                                <span className="planner-block-option-icon">{block.icon}</span>
                                <span>{block.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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

            {/* Coverage Summary */}
            <div className="planner-coverage">
              <div className="planner-coverage-bar">
                {summerWeeks.map((week) => {
                  const weekCamps = currentChildSchedule[week.weekNum] || [];
                  const blocked = getBlockedWeek(week.weekNum);
                  const isGap = gaps.some(g => g.weekNum === week.weekNum) && !blocked;
                  return (
                    <div
                      key={week.weekNum}
                      className={`planner-coverage-segment ${weekCamps.length > 0 ? 'filled' : ''} ${blocked ? 'blocked' : ''} ${isGap ? 'gap' : ''}`}
                      style={weekCamps.length > 0 ? { background: selectedChildData?.color } : blocked ? { background: blocked.color } : {}}
                      title={`${week.label}: ${weekCamps.length > 0 ? 'Scheduled' : blocked ? blocked.label : isGap ? 'Gap' : 'Open'}`}
                    />
                  );
                })}
              </div>
              <div className="planner-coverage-labels">
                <span>June</span>
                <span>July</span>
                <span>August</span>
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
                    if (showAddCamp) {
                      handleAddCamp(camp, showAddCamp.weekNum);
                    }
                  }}
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
                    <span className="planner-drawer-camp-add">Add</span>
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

      <style>{`
        /* ═══════════════════════════════════════════════════════════════════════
           SCHEDULE PLANNER - Editorial California Aesthetic
           ═══════════════════════════════════════════════════════════════════════ */

        .planner-container {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: var(--sand-50);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ─────────────────────────────────────────────────────────────────────
           HEADER
           ───────────────────────────────────────────────────────────────────── */

        .planner-header {
          background: white;
          border-bottom: 1px solid var(--sand-200);
          position: relative;
          z-index: 10;
        }

        /* ─────────────────────────────────────────────────────────────────────
           TAB NAVIGATION
           ───────────────────────────────────────────────────────────────────── */

        .planner-tabs {
          display: flex;
          gap: 4px;
          padding: 8px 20px;
          background: white;
          border-bottom: 1px solid var(--sand-200);
        }

        .planner-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--earth-600);
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .planner-tab:hover {
          background: var(--sand-100);
          color: var(--earth-800);
        }

        .planner-tab.active {
          background: var(--ocean-50);
          color: var(--ocean-600);
        }

        .planner-tab svg {
          flex-shrink: 0;
        }

        .planner-header-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .planner-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .planner-close-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--sand-50);
          border: 1px solid var(--sand-200);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .planner-close-btn:hover {
          background: var(--sand-100);
          border-color: var(--sand-300);
        }

        .planner-close-btn svg {
          width: 20px;
          height: 20px;
          color: var(--earth-700);
        }

        .planner-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--earth-800);
          line-height: 1.2;
        }

        .planner-subtitle {
          font-size: 0.875rem;
          color: var(--sand-400);
          margin-top: 2px;
        }

        /* Child Pills - Desktop */
        .planner-children-desktop {
          display: none;
          gap: 8px;
        }

        @media (min-width: 768px) {
          .planner-children-desktop {
            display: flex;
          }
        }

        .planner-child-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 0.875rem;
          font-weight: 500;
          background: var(--sand-50);
          color: var(--earth-700);
          border: 1px solid var(--sand-200);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .planner-child-pill:hover {
          background: var(--child-color-light);
          border-color: var(--child-color);
        }

        .planner-child-pill.active {
          background: var(--child-color);
          color: white;
          border-color: var(--child-color);
          box-shadow: 0 4px 12px -2px var(--child-color-light);
        }

        .planner-child-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--child-color);
        }

        .planner-child-pill.active .planner-child-dot {
          background: white;
        }

        /* Stats */
        .planner-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .planner-stats {
          display: flex;
          align-items: center;
          gap: 0;
          background: white;
          border: 1px solid var(--sand-200);
          border-radius: 10px;
          overflow: hidden;
        }

        .planner-stat {
          padding: 10px 18px;
          text-align: center;
          position: relative;
        }

        .planner-stat:first-child {
          background: var(--sand-50);
        }

        .planner-stat-value {
          display: block;
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--earth-800);
          line-height: 1.2;
        }

        .planner-stat-value.has-gaps {
          color: var(--sun-600);
        }

        .planner-stat-value.no-gaps {
          color: var(--sage-600);
        }

        .planner-stat-label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--sand-400);
          margin-top: 2px;
        }

        .planner-stat-divider {
          width: 1px;
          height: 36px;
          background: var(--sand-200);
        }

        .planner-export-group {
          display: none;
          gap: 4px;
        }

        @media (min-width: 640px) {
          .planner-export-group {
            display: flex;
          }
        }

        .planner-export-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: white;
          border: 1px solid var(--sand-200);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .planner-export-btn:hover {
          background: var(--sand-50);
          border-color: var(--sand-300);
        }

        .planner-export-btn svg {
          width: 18px;
          height: 18px;
          color: var(--earth-700);
        }

        /* Mobile Child Selector */
        .planner-children-mobile {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          border-top: 1px solid var(--sand-100);
        }

        .planner-children-mobile::-webkit-scrollbar {
          display: none;
        }

        @media (min-width: 768px) {
          .planner-children-mobile {
            display: none;
          }
        }

        .planner-child-pill-mobile {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 500;
          background: white;
          color: var(--earth-700);
          border: 1.5px solid var(--sand-200);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .planner-child-pill-mobile.active {
          background: var(--child-color);
          color: white;
          border-color: var(--child-color);
        }

        .planner-child-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--child-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .planner-child-pill-mobile.active .planner-child-avatar {
          background: white;
          color: var(--child-color);
        }

        /* ─────────────────────────────────────────────────────────────────────
           MAIN CONTENT
           ───────────────────────────────────────────────────────────────────── */

        .planner-main {
          flex: 1;
          overflow: auto;
          padding: 20px;
        }

        @media (min-width: 768px) {
          .planner-main {
            padding: 32px;
          }
        }

        /* ─────────────────────────────────────────────────────────────────────
           SIDEBAR + LAYOUT
           ───────────────────────────────────────────────────────────────────── */

        .planner-layout {
          display: flex;
          gap: 0;
          height: 100%;
          min-height: 0;
        }

        .planner-sidebar {
          width: 280px;
          flex-shrink: 0;
          background: var(--sand-50);
          border-right: 1px solid var(--sand-200);
          display: flex;
          flex-direction: column;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .planner-sidebar.collapsed {
          width: 48px;
        }

        .planner-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--sand-200);
          min-height: 56px;
        }

        .planner-sidebar-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--earth-700);
          white-space: nowrap;
        }

        .planner-sidebar.collapsed .planner-sidebar-title {
          display: none;
        }

        .planner-sidebar-toggle {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: var(--sand-100);
          border: 1px solid var(--sand-200);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .planner-sidebar-toggle:hover {
          background: var(--sand-200);
        }

        .planner-sidebar-toggle svg {
          width: 14px;
          height: 14px;
          color: var(--earth-600);
        }

        .planner-sidebar-search {
          position: relative;
          padding: 12px 16px;
          border-bottom: 1px solid var(--sand-200);
        }

        .planner-sidebar-search svg {
          position: absolute;
          left: 28px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: var(--sand-400);
          pointer-events: none;
        }

        .planner-sidebar-input {
          width: 100%;
          padding: 10px 32px 10px 36px;
          border-radius: 8px;
          border: 1px solid var(--sand-200);
          background: #fff;
          font-size: 0.875rem;
          color: var(--earth-800);
          outline: none;
          transition: all 0.2s;
        }

        .planner-sidebar-input:focus {
          border-color: var(--ocean-400);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .planner-sidebar-input::placeholder {
          color: var(--sand-400);
        }

        .planner-sidebar-clear {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--sand-200);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .planner-sidebar-clear:hover {
          background: var(--sand-300);
        }

        .planner-sidebar-clear svg {
          position: static;
          transform: none;
          width: 12px;
          height: 12px;
          color: var(--earth-600);
        }

        .planner-sidebar-hint {
          padding: 8px 16px;
          background: var(--ocean-50);
          border-bottom: 1px solid var(--sand-200);
        }

        .planner-sidebar-hint span {
          font-size: 0.75rem;
          color: var(--ocean-600);
          font-weight: 500;
        }

        .planner-sidebar-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .planner-sidebar-camp {
          padding: 12px;
          margin-bottom: 6px;
          background: #fff;
          border: 1px solid var(--sand-200);
          border-radius: 10px;
          cursor: grab;
          transition: all 0.2s;
        }

        .planner-sidebar-camp:hover {
          border-color: var(--ocean-300);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transform: translateY(-1px);
        }

        .planner-sidebar-camp:active,
        .planner-sidebar-camp.dragging {
          cursor: grabbing;
          opacity: 0.7;
          transform: scale(0.98);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .planner-sidebar-camp-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--earth-800);
          margin-bottom: 4px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .planner-sidebar-camp-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .planner-sidebar-camp-category {
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--sand-500);
          font-weight: 500;
        }

        .planner-sidebar-camp-price {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--ocean-600);
        }

        .planner-sidebar-empty {
          padding: 32px 16px;
          text-align: center;
          color: var(--sand-500);
          font-size: 0.875rem;
        }

        /* Hide sidebar on mobile */
        @media (max-width: 1023px) {
          .planner-sidebar {
            display: none;
          }

          .planner-layout {
            display: block;
          }
        }

        /* Sample Banner */
        .planner-sample-banner {
          max-width: 1200px;
          margin: 0 auto 20px;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--sun-100) 0%, var(--sun-50) 100%);
          border: 1px solid var(--sun-200);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .planner-sample-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .planner-sample-icon {
          font-size: 1.25rem;
        }

        .planner-sample-title {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--earth-800);
        }

        .planner-sample-text {
          font-size: 0.8rem;
          color: var(--earth-700);
        }

        .planner-sample-clear {
          padding: 6px 14px;
          font-size: 0.8rem;
          font-weight: 500;
          background: white;
          border: 1px solid var(--sun-300);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .planner-sample-clear:hover {
          background: var(--sun-50);
        }

        /* Empty State */
        .planner-empty {
          max-width: 400px;
          margin: 80px auto;
          text-align: center;
        }

        .planner-empty-icon {
          font-size: 4rem;
          margin-bottom: 24px;
        }

        .planner-empty-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--earth-800);
          margin-bottom: 12px;
        }

        .planner-empty-text {
          color: var(--earth-700);
          margin-bottom: 24px;
          line-height: 1.6;
        }

        /* ─────────────────────────────────────────────────────────────────────
           TIMELINE VIEW
           ───────────────────────────────────────────────────────────────────── */

        .planner-timeline {
          flex: 1;
          min-width: 0;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        @media (max-width: 1023px) {
          .planner-timeline {
            padding: 0;
          }
        }

        /* Month Labels */
        .planner-months {
          display: none;
          grid-template-columns: repeat(11, 1fr);
          gap: 8px;
          margin-bottom: 16px;
          padding: 0;
        }

        @media (min-width: 768px) {
          .planner-months {
            display: grid;
          }
        }

        .planner-month-label {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--earth-800);
          padding: 12px 0 8px;
          border-bottom: 2px solid var(--earth-800);
        }

        .planner-month-label:nth-child(2) {
          border-color: var(--ocean-500);
        }

        .planner-month-label:nth-child(3) {
          border-color: var(--terra-500);
        }

        /* Week Grid */
        .planner-weeks-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          margin: 0 -20px;
          padding: 0 20px;
        }

        .planner-weeks-container::-webkit-scrollbar {
          display: none;
        }

        @media (min-width: 768px) {
          .planner-weeks-container {
            overflow-x: visible;
            margin: 0;
            padding: 0;
          }
        }

        .planner-weeks {
          display: grid;
          grid-template-columns: repeat(11, minmax(140px, 1fr));
          gap: 8px;
        }

        @media (min-width: 768px) {
          .planner-weeks {
            grid-template-columns: repeat(11, 1fr);
          }
        }

        .planner-week {
          background: var(--sand-50);
          border: 1px solid transparent;
          border-radius: 16px;
          padding: 14px;
          min-height: 130px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .planner-week:hover {
          background: white;
          border-color: var(--sand-200);
          box-shadow: 0 4px 16px -4px rgba(31, 26, 22, 0.08);
        }

        .planner-week.has-camps {
          background: white;
          border-color: var(--sand-200);
          box-shadow: 0 2px 8px -2px rgba(31, 26, 22, 0.06);
        }

        .planner-week.is-gap {
          background: linear-gradient(135deg, var(--sun-50) 0%, var(--terra-50) 100%);
          border: 1px solid var(--sun-200);
        }

        .planner-week.is-gap:hover {
          border-color: var(--terra-300);
        }

        .planner-week.drag-over {
          border-color: var(--ocean-400);
          background: var(--ocean-50);
          box-shadow: 0 0 0 4px var(--ocean-100);
          transform: scale(1.02);
        }

        .planner-week-header {
          margin-bottom: 8px;
        }

        .planner-week-label {
          display: block;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--sand-500);
          margin-bottom: 2px;
        }

        .planner-week-dates {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--earth-800);
        }

        .planner-week-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .planner-week-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: var(--sand-300);
          font-size: 0.75rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .planner-week:hover .planner-week-empty {
          opacity: 1;
        }

        .planner-week-empty svg {
          width: 20px;
          height: 20px;
          opacity: 0.6;
        }

        .planner-week-empty span {
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .planner-gap-badge {
          position: absolute;
          top: -6px;
          right: 12px;
          padding: 3px 8px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: var(--sun-400);
          color: var(--earth-800);
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* Blocked Week Styles */
        .planner-week.is-blocked {
          background: color-mix(in srgb, var(--block-color) 10%, white);
          border-color: var(--block-color);
          border-style: solid;
        }

        .planner-block-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 12px 8px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--block-color) 15%, white) 0%, color-mix(in srgb, var(--block-color) 25%, white) 100%);
          border-radius: 8px;
          position: relative;
          animation: cardAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .planner-block-icon {
          font-size: 1.5rem;
        }

        .planner-block-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: color-mix(in srgb, var(--block-color) 70%, black);
          text-align: center;
        }

        .planner-block-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 1px solid var(--sand-200);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.2s;
        }

        .planner-block-card:hover .planner-block-remove {
          opacity: 1;
        }

        .planner-block-remove:hover {
          background: var(--terra-50);
          border-color: var(--terra-300);
        }

        .planner-block-remove svg {
          width: 10px;
          height: 10px;
          color: var(--earth-600);
        }

        /* Block Menu Popup */
        .planner-block-menu {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px -10px rgba(31, 26, 22, 0.3);
          border: 1px solid var(--sand-200);
          padding: 8px;
          min-width: 180px;
          animation: menuAppear 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes menuAppear {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        .planner-block-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 8px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--earth-800);
        }

        .planner-block-menu-close {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--sand-50);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .planner-block-menu-close:hover {
          background: var(--sand-100);
        }

        .planner-block-menu-close svg {
          width: 12px;
          height: 12px;
          color: var(--earth-600);
        }

        .planner-block-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: none;
          border-radius: 8px;
          font-size: 0.85rem;
          color: var(--earth-700);
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .planner-block-option:hover {
          background: color-mix(in srgb, var(--block-color, var(--sand-100)) 15%, white);
        }

        .planner-block-option-camp {
          --block-color: var(--ocean-500);
          background: var(--ocean-50);
          font-weight: 500;
        }

        .planner-block-option-camp:hover {
          background: var(--ocean-100);
        }

        .planner-block-option-icon {
          font-size: 1.1rem;
        }

        .planner-block-divider {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          margin: 4px 0;
        }

        .planner-block-divider::before,
        .planner-block-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--sand-200);
        }

        .planner-block-divider span {
          font-size: 0.7rem;
          color: var(--sand-400);
          white-space: nowrap;
        }

        /* Camp Card in Week */
        .planner-camp-card {
          background: var(--child-color, var(--ocean-500));
          background: linear-gradient(135deg, var(--child-color) 0%, color-mix(in srgb, var(--child-color) 80%, black) 100%);
          border-radius: 8px;
          padding: 10px;
          color: white;
          position: relative;
          animation: cardAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes cardAppear {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .planner-camp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .planner-camp-name {
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.3;
          flex: 1;
        }

        .planner-camp-remove {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .planner-camp-card:hover .planner-camp-remove {
          opacity: 1;
        }

        .planner-camp-remove:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        .planner-camp-remove svg {
          width: 12px;
          height: 12px;
        }

        .planner-camp-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 0.7rem;
        }

        .planner-camp-price {
          font-weight: 600;
          opacity: 0.9;
        }

        .planner-camp-status {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          background: rgba(255, 255, 255, 0.2);
        }

        .planner-camp-status.status-registered {
          background: var(--sun-400);
          color: var(--earth-800);
        }

        .planner-camp-status.status-confirmed {
          background: white;
          color: var(--ocean-600);
        }

        .planner-camp-status.status-waitlisted {
          background: var(--terra-400);
        }

        /* Looking for Friends Toggle */
        .planner-camp-friends-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.2s;
        }

        .planner-camp-friends-toggle:hover {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }

        .planner-camp-friends-toggle.active {
          background: rgba(255, 255, 255, 0.9);
          color: var(--ocean-600);
          border-color: transparent;
        }

        .planner-camp-friends-toggle .friends-icon {
          font-size: 0.75rem;
        }

        .planner-camp-friends-toggle .friends-text {
          font-weight: 500;
        }

        .planner-camp-card.looking-for-friends {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Mobile Week Navigator */
        .planner-mobile-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 16px 0;
        }

        @media (min-width: 768px) {
          .planner-mobile-nav {
            display: none;
          }
        }

        .planner-nav-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: white;
          border: 1px solid var(--sand-200);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .planner-nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .planner-nav-btn:not(:disabled):hover {
          background: var(--sand-50);
          border-color: var(--sand-300);
        }

        .planner-nav-btn svg {
          width: 20px;
          height: 20px;
          color: var(--earth-700);
        }

        .planner-nav-indicator {
          text-align: center;
        }

        .planner-nav-current {
          display: block;
          font-weight: 600;
          color: var(--earth-800);
        }

        .planner-nav-dates {
          font-size: 0.8rem;
          color: var(--sand-400);
        }

        /* ─────────────────────────────────────────────────────────────────────
           COVERAGE BAR
           ───────────────────────────────────────────────────────────────────── */

        .planner-coverage {
          max-width: 1200px;
          margin: 24px auto 0;
          padding: 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid var(--sand-200);
        }

        .planner-coverage-bar {
          display: flex;
          gap: 3px;
          height: 12px;
          border-radius: 6px;
          overflow: hidden;
          background: var(--sand-100);
        }

        .planner-coverage-segment {
          flex: 1;
          background: var(--sand-200);
          transition: all 0.3s ease;
        }

        .planner-coverage-segment.filled {
          background: var(--ocean-500);
        }

        .planner-coverage-segment.gap {
          background: var(--terra-200);
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 4px,
            var(--terra-300) 4px,
            var(--terra-300) 8px
          );
        }

        .planner-coverage-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 0.7rem;
          color: var(--sand-400);
        }

        /* ─────────────────────────────────────────────────────────────────────
           FLOATING ACTION BUTTON
           ───────────────────────────────────────────────────────────────────── */

        .planner-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--terra-500);
          color: white;
          border: none;
          box-shadow: 0 4px 20px -4px rgba(232, 90, 53, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 40;
        }

        .planner-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 28px -4px rgba(232, 90, 53, 0.6);
        }

        .planner-fab:active {
          transform: scale(0.95);
        }

        .planner-fab svg {
          width: 24px;
          height: 24px;
        }

        @media (min-width: 768px) {
          .planner-fab {
            display: none;
          }
        }

        /* ─────────────────────────────────────────────────────────────────────
           CAMP DRAWER
           ───────────────────────────────────────────────────────────────────── */

        .planner-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 60;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .planner-drawer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 85vh;
          background: white;
          border-radius: 24px 24px 0 0;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (min-width: 768px) {
          .planner-drawer {
            top: 0;
            bottom: 0;
            left: auto;
            right: 0;
            width: 420px;
            max-height: none;
            border-radius: 0;
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .planner-drawer-handle {
          width: 40px;
          height: 4px;
          background: var(--sand-300);
          border-radius: 2px;
          margin: 12px auto;
        }

        @media (min-width: 768px) {
          .planner-drawer-handle {
            display: none;
          }
        }

        .planner-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 20px 16px;
        }

        @media (min-width: 768px) {
          .planner-drawer-header {
            padding: 20px;
            border-bottom: 1px solid var(--sand-200);
          }
        }

        .planner-drawer-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--earth-800);
        }

        .planner-drawer-close {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--sand-50);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .planner-drawer-close:hover {
          background: var(--sand-100);
        }

        .planner-drawer-close svg {
          width: 18px;
          height: 18px;
          color: var(--earth-700);
        }

        .planner-drawer-search {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 20px 16px;
          padding: 12px 16px;
          background: var(--sand-50);
          border: 1px solid var(--sand-200);
          border-radius: 12px;
        }

        .planner-drawer-search svg {
          width: 18px;
          height: 18px;
          color: var(--sand-400);
          flex-shrink: 0;
        }

        .planner-drawer-search input {
          flex: 1;
          border: none;
          background: none;
          font-size: 0.9rem;
          color: var(--earth-800);
          outline: none;
        }

        .planner-drawer-search input::placeholder {
          color: var(--sand-400);
        }

        .planner-drawer-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 12px 20px;
        }

        .planner-drawer-camp {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          margin-bottom: 4px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .planner-drawer-camp:hover {
          background: var(--sand-50);
        }

        .planner-drawer-camp:active {
          background: var(--ocean-50);
        }

        .planner-drawer-camp-img {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .planner-drawer-camp-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          background: var(--sand-100);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .planner-drawer-camp-info {
          flex: 1;
          min-width: 0;
        }

        .planner-drawer-camp-name {
          display: block;
          font-weight: 500;
          font-size: 0.9rem;
          color: var(--earth-800);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .planner-drawer-camp-meta {
          font-size: 0.75rem;
          color: var(--sand-400);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .planner-drawer-camp-add {
          padding: 6px 14px;
          font-size: 0.75rem;
          font-weight: 600;
          background: var(--ocean-500);
          color: white;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .planner-drawer-camp-drag {
          color: var(--sand-300);
        }

        .planner-drawer-camp-drag svg {
          width: 20px;
          height: 20px;
        }

        .planner-drawer-empty {
          text-align: center;
          padding: 40px 20px;
          color: var(--sand-400);
        }

        /* ─────────────────────────────────────────────────────────────────────
           REDUCED MOTION
           ───────────────────────────────────────────────────────────────────── */

        @media (prefers-reduced-motion: reduce) {
          .planner-camp-card,
          .planner-drawer,
          .planner-drawer-overlay,
          .planner-week.drag-over {
            animation: none;
            transition: none;
          }
        }
      `}</style>
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

function GripIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
    </svg>
  );
}

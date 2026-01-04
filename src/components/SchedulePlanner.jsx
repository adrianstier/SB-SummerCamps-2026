import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSummerWeeks2026, addScheduledCamp, deleteScheduledCamp, updateScheduledCamp } from '../lib/supabase';
import { createGoogleCalendarUrl, exportAllToICal, formatCampForCalendar } from '../lib/googleCalendar';

const summerWeeks = getSummerWeeks2026();

export function SchedulePlanner({ camps, onClose }) {
  const {
    user,
    isConfigured,
    signIn,
    children,
    scheduledCamps,
    refreshSchedule,
    getTotalCost,
    getCoverageGaps
  } = useAuth();

  const [selectedChild, setSelectedChild] = useState(children[0]?.id || null);
  const [showAddCamp, setShowAddCamp] = useState(null); // { weekNum, childId }
  const [searchQuery, setSearchQuery] = useState('');

  // Filter camps for add modal
  const filteredCamps = useMemo(() => {
    if (!searchQuery) return camps.slice(0, 20);
    const query = searchQuery.toLowerCase();
    return camps.filter(c =>
      c.camp_name.toLowerCase().includes(query) ||
      c.category?.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [camps, searchQuery]);

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

  if (!isConfigured) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <h2 className="font-serif text-2xl font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
            Schedule Planner Coming Soon
          </h2>
          <p className="mb-6" style={{ color: 'var(--earth-700)' }}>
            Connect to Supabase to enable the schedule planner with saved favorites, family profiles, and Google Calendar sync.
          </p>
          <button onClick={onClose} className="btn-primary">Got it</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--ocean-100)' }}>
            <CalendarIcon className="w-8 h-8" style={{ color: 'var(--ocean-500)' }} />
          </div>
          <h2 className="font-serif text-2xl font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
            Plan Your Summer
          </h2>
          <p className="mb-6" style={{ color: 'var(--earth-700)' }}>
            Sign in to create your family's summer schedule, save favorites, and export to Google Calendar.
          </p>
          <button onClick={signIn} className="btn-primary w-full mb-3">
            Sign in with Google
          </button>
          <button onClick={onClose} className="btn-secondary w-full">
            Maybe Later
          </button>
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
  }

  async function handleRemoveCamp(scheduleId) {
    if (confirm('Remove this camp from your schedule?')) {
      await deleteScheduledCamp(scheduleId);
      await refreshSchedule();
    }
  }

  async function handleStatusChange(scheduleId, newStatus) {
    await updateScheduledCamp(scheduleId, { status: newStatus });
    await refreshSchedule();
  }

  const totalCost = getTotalCost();
  const gaps = selectedChild ? getCoverageGaps(selectedChild, summerWeeks) : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: 'var(--sand-50)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4" style={{ background: 'white', borderBottom: '1px solid var(--sand-200)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--earth-800)' }}>
              Summer Schedule Planner
            </h1>
            <p className="text-sm" style={{ color: 'var(--earth-700)' }}>
              Drag camps to weeks or click to add
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Child selector */}
            {children.length > 0 && (
              <div className="flex items-center gap-2">
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedChild === child.id ? 'text-white' : ''
                    }`}
                    style={{
                      background: selectedChild === child.id ? child.color : 'var(--sand-100)',
                      color: selectedChild === child.id ? 'white' : 'var(--earth-700)'
                    }}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 px-4 py-2 rounded-xl" style={{ background: 'var(--sand-50)' }}>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--sand-400)' }}>Total</p>
                <p className="font-semibold" style={{ color: 'var(--terra-500)' }}>
                  ${totalCost.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--sand-400)' }}>Gaps</p>
                <p className="font-semibold" style={{ color: gaps.length > 0 ? 'var(--terra-500)' : 'var(--ocean-500)' }}>
                  {gaps.length} weeks
                </p>
              </div>
            </div>

            {/* Export buttons */}
            {scheduledCamps.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const child = children.find(c => c.id === selectedChild);
                    const childSchedules = scheduledCamps.filter(sc => sc.child_id === selectedChild);
                    exportAllToICal(camps, childSchedules, child?.name);
                  }}
                  className="btn-secondary"
                  title="Download .ics file for calendar apps"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Export .ics</span>
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
                  className="btn-secondary"
                  title="Add to Google Calendar"
                >
                  <GoogleCalendarIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Google Cal</span>
                </button>
              </div>
            )}

            <button onClick={onClose} className="btn-secondary">
              <XIcon className="w-5 h-5" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6 overflow-auto" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="max-w-7xl mx-auto">
          {children.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sand-100)' }}>
                <ChildIcon className="w-10 h-10" style={{ color: 'var(--sand-400)' }} />
              </div>
              <h2 className="font-serif text-xl font-semibold mb-3" style={{ color: 'var(--earth-800)' }}>
                Add Your Children First
              </h2>
              <p className="mb-6" style={{ color: 'var(--earth-700)' }}>
                Add your children to start building their summer schedules.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'children' }))}
                className="btn-primary"
              >
                Add Children
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-2">
              {/* Week labels */}
              <div className="col-span-12 grid grid-cols-11 gap-2 mb-2">
                {summerWeeks.map(week => (
                  <div key={week.weekNum} className="text-center">
                    <p className="font-semibold text-sm" style={{ color: 'var(--earth-800)' }}>
                      {week.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--sand-400)' }}>
                      {week.display}
                    </p>
                  </div>
                ))}
              </div>

              {/* Schedule rows per child */}
              {children.map(child => (
                <React.Fragment key={child.id}>
                  {/* Child name */}
                  <div
                    className="col-span-12 flex items-center gap-2 py-2 mt-4"
                    style={{ borderBottom: `3px solid ${child.color}` }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: child.color }}
                    />
                    <span className="font-semibold" style={{ color: 'var(--earth-800)' }}>
                      {child.name}
                    </span>
                    {child.age_as_of_summer && (
                      <span className="text-sm" style={{ color: 'var(--sand-400)' }}>
                        (age {child.age_as_of_summer})
                      </span>
                    )}
                  </div>

                  {/* Week cells */}
                  <div className="col-span-12 grid grid-cols-11 gap-2">
                    {summerWeeks.map(week => {
                      const weekCamps = scheduleByChildAndWeek[child.id]?.[week.weekNum] || [];
                      const isGap = selectedChild === child.id && gaps.some(g => g.weekNum === week.weekNum);

                      return (
                        <div
                          key={week.weekNum}
                          className={`
                            min-h-[100px] rounded-xl p-2 transition-all cursor-pointer
                            ${isGap ? 'border-2 border-dashed' : 'border'}
                          `}
                          style={{
                            background: weekCamps.length > 0 ? 'white' : 'var(--sand-50)',
                            borderColor: isGap ? 'var(--terra-300)' : 'var(--sand-200)'
                          }}
                          onClick={() => {
                            if (weekCamps.length === 0) {
                              setSelectedChild(child.id);
                              setShowAddCamp({ weekNum: week.weekNum, childId: child.id });
                            }
                          }}
                        >
                          {weekCamps.length > 0 ? (
                            weekCamps.map(sc => {
                              const campInfo = camps.find(c => c.id === sc.camp_id);
                              return (
                                <div
                                  key={sc.id}
                                  className="rounded-lg p-2 mb-1 text-xs relative group"
                                  style={{
                                    background: child.color + '20',
                                    borderLeft: `3px solid ${child.color}`
                                  }}
                                >
                                  <p className="font-medium truncate" style={{ color: 'var(--earth-800)' }}>
                                    {campInfo?.camp_name || 'Unknown Camp'}
                                  </p>
                                  <p style={{ color: 'var(--sand-400)' }}>
                                    {sc.price ? `$${sc.price}` : 'TBD'}
                                  </p>

                                  {/* Status badge */}
                                  <span
                                    className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                      background: getStatusColor(sc.status).bg,
                                      color: getStatusColor(sc.status).text
                                    }}
                                  >
                                    {sc.status}
                                  </span>

                                  {/* Remove button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveCamp(sc.id);
                                    }}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full flex items-center justify-center transition-opacity"
                                    style={{ background: 'var(--terra-100)', color: 'var(--terra-500)' }}
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <PlusIcon className="w-6 h-6" style={{ color: 'var(--sand-300)' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Camp Modal */}
      {showAddCamp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4" style={{ borderBottom: '1px solid var(--sand-200)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--earth-800)' }}>
                  Add Camp - {summerWeeks.find(w => w.weekNum === showAddCamp.weekNum)?.display}
                </h3>
                <button
                  onClick={() => {
                    setShowAddCamp(null);
                    setSearchQuery('');
                  }}
                  className="p-1 rounded-full"
                  style={{ color: 'var(--sand-400)' }}
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Search camps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: 'var(--sand-200)' }}
                autoFocus
              />
            </div>

            <div className="overflow-y-auto max-h-[400px] p-2">
              {filteredCamps.map(camp => (
                <button
                  key={camp.id}
                  onClick={() => handleAddCamp(camp, showAddCamp.weekNum)}
                  className="w-full text-left p-3 rounded-lg mb-1 transition-colors"
                  style={{ background: 'var(--sand-50)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ocean-50)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--sand-50)'}
                >
                  <p className="font-medium" style={{ color: 'var(--earth-800)' }}>
                    {camp.camp_name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--sand-400)' }}>
                    {camp.category} • {camp.ages} • {camp.min_price ? `$${camp.min_price}` : 'TBD'}
                  </p>
                </button>
              ))}

              {filteredCamps.length === 0 && (
                <p className="text-center py-8" style={{ color: 'var(--sand-400)' }}>
                  No camps found
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    planned: { bg: 'var(--sand-100)', text: 'var(--earth-700)' },
    registered: { bg: 'var(--sun-100)', text: 'var(--sun-500)' },
    confirmed: { bg: 'var(--ocean-100)', text: 'var(--ocean-600)' },
    waitlisted: { bg: 'var(--terra-100)', text: 'var(--terra-500)' },
    cancelled: { bg: 'var(--sand-200)', text: 'var(--sand-400)' }
  };
  return colors[status] || colors.planned;
}

// Icons
function CalendarIcon({ className, style }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon({ className, style }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChildIcon({ className, style }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1H15" />
    </svg>
  );
}

function DownloadIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function GoogleCalendarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.5 4h-15A2.5 2.5 0 002 6.5v11A2.5 2.5 0 004.5 20h15a2.5 2.5 0 002.5-2.5v-11A2.5 2.5 0 0019.5 4zM4 8h16v9.5a.5.5 0 01-.5.5h-15a.5.5 0 01-.5-.5V8zm2 3h4v4H6v-4zm6 0h4v4h-4v-4z"/>
    </svg>
  );
}

import { memo } from 'react';
import BrandIcon from '../BrandIcon';
import CampSlot from './CampSlot';
import { CATEGORY_COLORS, BLOCK_TYPES, XIcon, PlusIcon, WarningIcon, ClockIcon, GripIcon, summerWeeks } from './utils';

const WeekColumn = memo(function WeekColumn({
  week,
  weekCamps,
  gaps,
  dragOverWeek,
  blocked,
  showBlockMenu,
  weekCost,
  profile,
  campLookup,
  conflicts,
  movingCamp,
  draggingBlock,
  groupPosition,
  selectedChildData,
  isLookingForFriends,
  hasSquads,
  moveMenuCamp,
  setMoveMenuCamp,
  setShowBlockMenu,
  setShowAddCamp,
  setDragOverWeek,
  setMovingCamp,
  onWeekDrop,
  onBlockWeek,
  onEditBlock,
  onUnblockWeek,
  onBlockDragStart,
  onBlockDragEnd,
  onStartMoveCamp,
  onMoveCamp,
  onRemoveCamp,
  onToggleLookingForFriends,
  onTouchStartCamp,
  onTouchMove,
  onTouchEnd,
  touchStartRef,
  touchDragState,
}) {
  const isGap = gaps.some(g => g.weekNum === week.weekNum);
  const isDragOver = dragOverWeek === week.weekNum;
  const isBlockMenuOpen = showBlockMenu?.weekNum === week.weekNum;

  // Highlight current week
  const today = new Date();
  const weekStartDate = new Date(week.startDate);
  const weekEndDate = new Date(week.endDate);
  weekEndDate.setHours(23, 59, 59); // Include the full end day
  const isCurrentWeek = today >= weekStartDate && today <= weekEndDate;

  // Check work schedule coverage for camps in this week
  const workStart = profile?.work_hours_start;
  const workEnd = profile?.work_hours_end;
  const hasWorkHoursCoverage = !workStart || !workEnd || weekCamps.length === 0 || weekCamps.some(sc => {
    const campInfo = campLookup.get(sc.camp_id);
    if (!campInfo) return false;
    const campHoursStart = campInfo.drop_off || campInfo.hours?.split('-')[0]?.trim();
    const campHoursEnd = campInfo.pick_up || campInfo.hours?.split('-')[1]?.trim();
    if (!campHoursStart || !campHoursEnd) return true;
    const normalizeTime = (t) => {
      if (!t) return null;
      const match = t.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (!match) return t;
      let h = parseInt(match[1]);
      const m = match[2] || '00';
      const ampm = match[3]?.toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return `${h.toString().padStart(2, '0')}:${m}`;
    };
    const normCampStart = normalizeTime(campHoursStart);
    const normCampEnd = normalizeTime(campHoursEnd);
    return normCampStart && normCampEnd && normCampStart <= workStart && normCampEnd >= workEnd;
  });
  const showWorkHoursWarning = workStart && workEnd && weekCamps.length > 0 && !hasWorkHoursCoverage;

  // Check for conflicts on this week
  const weekConflicts = conflicts.filter(c =>
    c.camps.some(camp => {
      const campStart = new Date(camp.start_date);
      const wkStart = new Date(week.startDate);
      const wkEnd = new Date(week.endDate);
      return campStart >= wkStart && campStart <= wkEnd;
    })
  );
  const hasConflict = weekConflicts.length > 0;

  // Group position class for connected blocks (solo = normal single block, no special class)
  const groupClass = blocked && groupPosition && groupPosition !== 'solo' ? `group-${groupPosition}` : '';

  // Build accessible label for the week
  const weekStatus = blocked
    ? `blocked for ${blocked.label}`
    : weekCamps.length > 0
      ? `${weekCamps.length} camp${weekCamps.length > 1 ? 's' : ''} scheduled${hasConflict ? ', has scheduling conflict' : ''}`
      : isGap
        ? 'empty, coverage gap'
        : 'empty';
  const ariaLabel = `Week ${week.weekNum}, ${week.display}, ${weekStatus}. ${weekCamps.length === 0 && !blocked ? 'Press Enter to add a camp or block this week.' : ''}`;

  // Allow drops on blocked weeks when dragging a block (to enable moving blocks)
  const allowBlockDrop = !!draggingBlock;

  return (
    <div
      data-week-num={week.weekNum}
      className={`week-card ${weekCamps.length > 0 ? 'has-camps' : ''} ${isGap && !blocked ? 'is-gap' : ''} ${isDragOver ? 'drag-over' : ''} ${blocked ? 'is-blocked' : ''} ${groupClass} ${hasConflict ? 'has-conflict' : ''} ${movingCamp ? 'move-target' : ''} ${isCurrentWeek ? 'is-current-week' : ''} ${showWorkHoursWarning ? 'work-hours-warning' : ''} ${isDragOver && draggingBlock ? 'block-drag-over' : ''}`}
      style={blocked ? { '--block-color': blocked.color } : { '--child-color': selectedChildData?.color || 'var(--ocean-500)' }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onDragOver={(e) => {
        e.preventDefault();
        if (!blocked || allowBlockDrop) setDragOverWeek(week.weekNum);
      }}
      onDragLeave={() => setDragOverWeek(null)}
      onDrop={(e) => {
        if (!blocked || allowBlockDrop) onWeekDrop(week.weekNum, e);
      }}
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
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevWeekNum = week.weekNum - 1;
          if (prevWeekNum >= 1) {
            document.querySelector(`[data-week-num="${prevWeekNum}"]`)?.focus();
          }
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextWeekNum = week.weekNum + 1;
          if (nextWeekNum <= summerWeeks.length) {
            document.querySelector(`[data-week-num="${nextWeekNum}"]`)?.focus();
          }
        }
      }}
      onTouchStart={(e) => {
        if (weekCamps.length === 0 && !blocked) {
          // Prepare for potential drag
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
        {weekCost > 0 && (
          <span className="week-card-cost">${weekCost}</span>
        )}
      </div>

      {/* Conflict Warning */}
      {hasConflict && (
        <div className="week-conflict-badge">
          <WarningIcon />
          <span>Conflict</span>
        </div>
      )}

      {/* Work Hours Warning */}
      {showWorkHoursWarning && (
        <div className="week-work-hours-badge">
          <ClockIcon />
          <span>Hours</span>
        </div>
      )}

      {/* Week Content */}
      <div className="week-card-content">
        {blocked ? (
          <div
            className="week-blocked"
            style={{ '--block-color': blocked.color }}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              onBlockDragStart?.(week.weekNum, e);
            }}
            onDragEnd={() => onBlockDragEnd?.()}
            onClick={(e) => {
              e.stopPropagation();
              onEditBlock(week.weekNum);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onEditBlock(week.weekNum);
              }
            }}
            title={blocked.note ? `${blocked.label}: ${blocked.note}` : blocked.label}
          >
            <span className="week-blocked-grip" aria-hidden="true" onClick={(e) => e.stopPropagation()}>
              <GripIcon className="grip-icon-small" />
            </span>
            <span className="week-blocked-icon"><BrandIcon name={blocked.icon} size={24} /></span>
            <span className="week-blocked-label">{blocked.label}</span>
            {blocked.note && (
              <span className="week-blocked-note">{blocked.note}</span>
            )}
            <div className="week-blocked-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBlock(week.weekNum);
                }}
                className="week-blocked-edit"
                aria-label={`Edit ${blocked.label}`}
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnblockWeek(week.weekNum);
                }}
                className="week-blocked-remove"
                aria-label={`Remove ${blocked.label} block`}
              >
                <XIcon />
              </button>
            </div>
          </div>
        ) : weekCamps.length > 0 ? (
          weekCamps.map(sc => {
            const campInfo = campLookup.get(sc.camp_id);
            const lookingForFriends = isLookingForFriends(sc.camp_id, sc.child_id, week.weekNum);
            const isPreviewCamp = sc.isPreview === true;
            const campHasConflict = weekConflicts.some(c => c.camps.some(cc => cc.id === sc.id));
            const isBeingMoved = movingCamp?.id === sc.id;
            return (
              <CampSlot
                key={sc.id}
                sc={sc}
                week={week}
                campInfo={campInfo}
                lookingForFriends={lookingForFriends}
                isPreviewCamp={isPreviewCamp}
                campHasConflict={campHasConflict}
                weekConflicts={weekConflicts}
                isBeingMoved={isBeingMoved}
                selectedChildData={selectedChildData}
                hasSquads={hasSquads}
                moveMenuCamp={moveMenuCamp}
                setMoveMenuCamp={setMoveMenuCamp}
                onStartMoveCamp={onStartMoveCamp}
                onMoveCampEnd={() => setMovingCamp(null)}
                onMoveCamp={onMoveCamp}
                onRemoveCamp={onRemoveCamp}
                onToggleLookingForFriends={onToggleLookingForFriends}
                onTouchStart={(sc, e) => {
                  const touch = e.touches[0];
                  touchStartRef.current = { x: touch.clientX, y: touch.clientY, camp: sc, isMove: true, startTime: Date.now() };
                }}
                onTouchMove={onTouchMove}
                onTouchEnd={(e) => {
                  if (touchDragState && dragOverWeek && touchStartRef.current?.isMove) {
                    onMoveCamp(touchStartRef.current.camp.id, dragOverWeek);
                  }
                  touchStartRef.current = null;
                  onTouchEnd();
                }}
              />
            );
          })
        ) : (
          <div className="week-empty">
            <div className="week-empty-icon" aria-hidden="true">
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
            <button onClick={() => setShowBlockMenu(null)} className="block-menu-close" aria-label="Close menu">
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
            <span className="block-menu-icon"><BrandIcon name="overnight" size={16} /></span>
            <span>Add a Camp</span>
          </button>
          <div className="block-menu-divider">
            <span>or mark as...</span>
          </div>
          {BLOCK_TYPES.map(block => (
            <button
              key={block.id}
              onClick={() => onBlockWeek(week.weekNum, block)}
              className="block-menu-option"
              style={{ '--block-color': block.color }}
            >
              <span className="block-menu-icon"><BrandIcon name={block.icon} size={16} /></span>
              <span>{block.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default WeekColumn;

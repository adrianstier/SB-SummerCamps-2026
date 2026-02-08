import { memo, useState } from 'react';
import BrandIcon from '../BrandIcon';
import { CATEGORY_COLORS, XIcon, GripIcon, WarningIcon, summerWeeks } from './utils';

const CampSlot = memo(function CampSlot({
  sc,
  week,
  campInfo,
  lookingForFriends,
  isPreviewCamp,
  campHasConflict,
  weekConflicts,
  isBeingMoved,
  selectedChildData,
  hasSquads,
  moveMenuCamp,
  setMoveMenuCamp,
  onStartMoveCamp,
  onMoveCampEnd,
  onMoveCamp,
  onRemoveCamp,
  onToggleLookingForFriends,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) {
  const catColor = CATEGORY_COLORS[campInfo?.category] || 'var(--ocean-500)';

  return (
    <div
      draggable={!isPreviewCamp}
      onDragStart={(e) => !isPreviewCamp && onStartMoveCamp(sc, e)}
      onDragEnd={() => onMoveCampEnd()}
      onTouchStart={(e) => {
        if (!isPreviewCamp) {
          onTouchStart(sc, e);
        }
      }}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`camp-card-enhanced ${lookingForFriends ? 'looking-for-friends' : ''} ${isPreviewCamp ? 'preview-camp-card' : ''} ${campHasConflict ? 'has-conflict' : ''} ${isBeingMoved ? 'is-moving' : ''}`}
      style={{ '--child-color': selectedChildData?.color || 'var(--ocean-500)', '--cat-color': catColor }}
    >
      <div className="camp-card-accent" />
      <div className="camp-card-body">
        <div className="camp-card-top">
          <span className="camp-card-category">{campInfo?.category}</span>
          <div className="camp-card-actions">
            {!isPreviewCamp && (
              <div className="camp-card-move-container" style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoveMenuCamp(moveMenuCamp?.id === sc.id ? null : { id: sc.id, currentWeek: week.weekNum });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setMoveMenuCamp(null);
                  }}
                  className="camp-card-move"
                  aria-label={`Move ${campInfo?.camp_name || 'camp'} to another week`}
                  aria-haspopup="menu"
                  aria-expanded={moveMenuCamp?.id === sc.id}
                  title="Move to another week"
                >
                  <GripIcon />
                </button>
                {moveMenuCamp?.id === sc.id && (
                  <div
                    className="camp-move-menu"
                    role="menu"
                    aria-label="Select week to move camp to"
                    ref={(el) => {
                      // Auto-focus first menu item when menu opens
                      if (el) {
                        const firstItem = el.querySelector('[role="menuitem"]');
                        if (firstItem) firstItem.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      // Keyboard navigation for move menu
                      const items = e.currentTarget.querySelectorAll('[role="menuitem"]');
                      const currentIndex = Array.from(items).indexOf(document.activeElement);

                      switch (e.key) {
                        case 'ArrowDown':
                          e.preventDefault();
                          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                          items[nextIndex]?.focus();
                          break;
                        case 'ArrowUp':
                          e.preventDefault();
                          const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                          items[prevIndex]?.focus();
                          break;
                        case 'Home':
                          e.preventDefault();
                          items[0]?.focus();
                          break;
                        case 'End':
                          e.preventDefault();
                          items[items.length - 1]?.focus();
                          break;
                        case 'Escape':
                          e.preventDefault();
                          setMoveMenuCamp(null);
                          break;
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      zIndex: 100,
                      background: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '4px 0',
                      minWidth: '140px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}
                  >
                    {summerWeeks.filter(w => w.weekNum !== week.weekNum).map(targetWeek => (
                      <button
                        key={targetWeek.weekNum}
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveCamp(sc.id, targetWeek.weekNum);
                          setMoveMenuCamp(null);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 12px',
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: 'var(--earth-700)'
                        }}
                        className="camp-move-menu-item"
                      >
                        Week {targetWeek.weekNum}: {targetWeek.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={(e) => onRemoveCamp(sc.id, e)}
              className="camp-card-remove"
              aria-label={`Remove ${campInfo?.camp_name || 'camp'} from schedule`}
            >
              <XIcon />
            </button>
          </div>
        </div>
        <h4 className="camp-card-name">{campInfo?.camp_name || 'Unknown'}</h4>
        {sc.session_name && (
          <span className="camp-card-session">{sc.session_name}</span>
        )}
        <div className="camp-card-details">
          <span className="camp-card-price">
            {sc.price ? `$${sc.price}` : 'TBD'}
          </span>
          <span className={`camp-card-status status-${sc.status}`}>
            {sc.status}
          </span>
          {sc.is_sample && (
            <span className="camp-card-sample-badge" title="Sample data from guided tour">
              sample
            </span>
          )}
        </div>
        {campHasConflict && (
          <div className="camp-card-conflict-badge" aria-label={weekConflicts.find(c => c.camps.some(cc => cc.id === sc.id))?.message} role="status">
            <WarningIcon />
            <span>Conflict</span>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLookingForFriends(sc.camp_id, sc.child_id, week.weekNum);
          }}
          className={`camp-card-friends ${lookingForFriends ? 'active' : ''}`}
          aria-label={lookingForFriends
            ? 'Looking for friends at this camp' + (!hasSquads ? ' (join a squad to connect)' : '')
            : (hasSquads ? 'Let squad members know you want friends here' : 'Mark as looking for friends (join a squad to connect)')}
          aria-pressed={lookingForFriends}
        >
          <BrandIcon name="people" size={16} />
          <span>{lookingForFriends ? 'Looking for friends' : 'Find friends'}</span>
        </button>
      </div>
    </div>
  );
});

export default CampSlot;

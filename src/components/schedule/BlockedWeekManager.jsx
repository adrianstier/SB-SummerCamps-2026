import { memo, useState, useMemo } from 'react';
import BrandIcon from '../BrandIcon';
import { BLOCK_COLORS, BLOCK_ICONS, XIcon, generateGroupId } from './utils';

// Parse date string as local time to avoid timezone shifts
function parseLocal(s) {
  if (!s) return null;
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

const BlockedWeekManager = memo(function BlockedWeekManager({
  weekNum,
  editExisting,
  summerWeeks,
  blockedWeeks,       // Current child's blocked weeks object { [weekNum]: block }
  scheduledCamps,     // Camps scheduled for current child (to disable occupied weeks)
  initialWeekNums,    // Array of week nums when editing a grouped block
  onSave,
  onClose
}) {
  const [label, setLabel] = useState(editExisting?.label || '');
  const [note, setNote] = useState(editExisting?.note || '');
  const [selectedColor, setSelectedColor] = useState(editExisting?.color || BLOCK_COLORS[0].color);
  const [selectedIcon, setSelectedIcon] = useState(editExisting?.icon || 'beach-surf');
  const [selectedWeeks, setSelectedWeeks] = useState(() =>
    initialWeekNums?.length ? [...initialWeekNums].sort((a, b) => a - b) : [weekNum]
  );

  // Determine which weeks are available (no camps, no other blocks)
  const weekAvailability = useMemo(() => {
    const editingGroupId = editExisting?.groupId;
    return summerWeeks.map(w => {
      const block = blockedWeeks?.[w.weekNum];
      const hasCamps = scheduledCamps?.some(sc => {
        const scStart = parseLocal(sc.start_date);
        const scEnd = sc.end_date ? parseLocal(sc.end_date) : scStart;
        const wStart = parseLocal(w.startDate);
        const wEnd = parseLocal(w.endDate);
        if (!scStart || !wStart || !wEnd) return false;
        wEnd.setHours(23, 59, 59);
        if (scEnd) scEnd.setHours(23, 59, 59);
        // True overlap: camp starts before week ends AND camp ends after week starts
        return scStart <= wEnd && (scEnd || scStart) >= wStart;
      });
      // Available if: no camps AND (no block OR block is part of the group we're editing)
      const isOccupiedByOtherBlock = block && (!editingGroupId || block.groupId !== editingGroupId);
      return {
        weekNum: w.weekNum,
        display: w.display,
        available: !hasCamps && !isOccupiedByOtherBlock,
        isSelected: selectedWeeks.includes(w.weekNum),
        hasCamps,
      };
    });
  }, [summerWeeks, blockedWeeks, scheduledCamps, editExisting?.groupId, selectedWeeks]);

  function handleWeekToggle(wNum) {
    setSelectedWeeks(prev => {
      if (prev.includes(wNum)) {
        // Can't deselect the last week
        if (prev.length <= 1) return prev;
        const next = prev.filter(n => n !== wNum);
        // Ensure remaining weeks are consecutive
        next.sort((a, b) => a - b);
        for (let i = 1; i < next.length; i++) {
          if (next[i] !== next[i - 1] + 1) {
            // Removing this week would create a gap — don't allow
            return prev;
          }
        }
        return next;
      } else {
        const next = [...prev, wNum].sort((a, b) => a - b);
        // Ensure consecutive
        for (let i = 1; i < next.length; i++) {
          if (next[i] !== next[i - 1] + 1) return prev;
        }
        return next;
      }
    });
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;

    const groupId = editExisting?.groupId || generateGroupId();
    onSave(selectedWeeks, {
      id: 'custom',
      label: label.trim(),
      note: note.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor,
      groupId,
    });
  };

  const firstWeek = summerWeeks.find(w => w.weekNum === selectedWeeks[0]);
  const lastWeek = summerWeeks.find(w => w.weekNum === selectedWeeks[selectedWeeks.length - 1]);
  const weekRangeLabel = selectedWeeks.length === 1
    ? `Week ${selectedWeeks[0]}`
    : `Weeks ${selectedWeeks[0]}-${selectedWeeks[selectedWeeks.length - 1]}`;

  return (
    <div className="custom-block-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={editExisting ? 'Edit blocked week' : 'Block this week'}>
      <div className="custom-block-modal" onClick={(e) => e.stopPropagation()}>
        <div className="custom-block-header">
          <h3>{editExisting ? 'Edit Block' : 'Block Weeks'}</h3>
          <button onClick={onClose} className="custom-block-close" aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="custom-block-week-info">
          <span className="custom-block-week-dates">
            {firstWeek && lastWeek
              ? `${weekRangeLabel}: ${firstWeek.display.split(' - ')[0]} - ${lastWeek.display.split(' - ')[1]}`
              : weekRangeLabel}
          </span>
        </div>

        {/* Week Range Picker */}
        <div className="custom-block-field">
          <label>Select weeks</label>
          <div className="custom-block-week-picker">
            {weekAvailability.map(w => (
              <button
                key={w.weekNum}
                type="button"
                disabled={!w.available && !w.isSelected}
                className={`week-picker-chip ${w.isSelected ? 'selected' : ''} ${!w.available && !w.isSelected ? 'disabled' : ''}`}
                onClick={() => (w.available || w.isSelected) && handleWeekToggle(w.weekNum)}
                title={w.hasCamps ? 'Has camps scheduled' : !w.available ? 'Already blocked' : w.display}
                style={w.isSelected ? { '--chip-color': selectedColor } : undefined}
              >
                <span className="week-picker-num">{w.weekNum}</span>
                <span className="week-picker-dates">{w.display.split(' - ')[0]}</span>
              </button>
            ))}
          </div>
          {selectedWeeks.length > 1 && (
            <span className="custom-block-week-hint">{selectedWeeks.length} weeks selected</span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="custom-block-form">
          <div className="custom-block-field">
            <label htmlFor="block-label">What's happening?</label>
            <input
              id="block-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Beach vacation, Grandparents visiting..."
              autoFocus
              maxLength={50}
            />
          </div>

          <div className="custom-block-field">
            <label htmlFor="block-note">Notes (optional)</label>
            <textarea
              id="block-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any details..."
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="custom-block-field">
            <label>Choose an icon</label>
            <div className="custom-block-icons">
              {BLOCK_ICONS.map(icon => (
                <button
                  key={icon.id}
                  type="button"
                  className={`custom-block-icon-btn ${selectedIcon === icon.id ? 'selected' : ''}`}
                  onClick={() => setSelectedIcon(icon.id)}
                  aria-label={icon.label}
                  aria-pressed={selectedIcon === icon.id}
                  style={{ '--icon-color': selectedColor }}
                >
                  <BrandIcon name={icon.id} size={20} />
                </button>
              ))}
            </div>
          </div>

          <div className="custom-block-field">
            <label>Choose a color</label>
            <div className="custom-block-colors">
              {BLOCK_COLORS.map(color => (
                <button
                  key={color.id}
                  type="button"
                  className={`custom-block-color-btn ${selectedColor === color.color ? 'selected' : ''}`}
                  onClick={() => setSelectedColor(color.color)}
                  aria-label={color.label}
                  aria-pressed={selectedColor === color.color}
                  style={{ '--swatch-color': color.color }}
                >
                  {selectedColor === color.color && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="custom-block-preview">
            <span className="custom-block-preview-label">Preview:</span>
            <div className="custom-block-preview-card" style={{ '--block-color': selectedColor }}>
              <span className="preview-icon"><BrandIcon name={selectedIcon} size={16} /></span>
              <span className="preview-label">{label || 'Your event'}</span>
              {selectedWeeks.length > 1 && (
                <span className="preview-weeks">{selectedWeeks.length} weeks</span>
              )}
            </div>
          </div>

          <div className="custom-block-actions">
            <button type="button" onClick={onClose} className="custom-block-cancel">
              Cancel
            </button>
            <button type="submit" disabled={!label.trim()} className="custom-block-save">
              {editExisting ? 'Save Changes' : `Block ${selectedWeeks.length === 1 ? 'Week' : `${selectedWeeks.length} Weeks`}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default BlockedWeekManager;

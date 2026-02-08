import { memo, useState } from 'react';
import BrandIcon from '../BrandIcon';
import { BLOCK_COLORS, BLOCK_ICONS, XIcon } from './utils';

const BlockedWeekManager = memo(function BlockedWeekManager({ weekNum, editExisting, summerWeeks, onSave, onClose }) {
  const week = summerWeeks.find(w => w.weekNum === weekNum);
  const [label, setLabel] = useState(editExisting?.label || '');
  const [note, setNote] = useState(editExisting?.note || '');
  const [selectedColor, setSelectedColor] = useState(editExisting?.color || BLOCK_COLORS[0].color);
  const [selectedIcon, setSelectedIcon] = useState(editExisting?.icon || 'beach-surf');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;

    onSave(weekNum, {
      id: 'custom',
      label: label.trim(),
      note: note.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor
    });
  };

  return (
    <div className="custom-block-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={editExisting ? 'Edit blocked week' : 'Block this week'}>
      <div className="custom-block-modal" onClick={(e) => e.stopPropagation()}>
        <div className="custom-block-header">
          <h3>{editExisting ? 'Edit Block' : 'Block This Week'}</h3>
          <button onClick={onClose} className="custom-block-close" aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="custom-block-week-info">
          <span className="custom-block-week-dates">
            {week ? `Week ${weekNum}: ${new Date(week.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(week.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : `Week ${weekNum}`}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="custom-block-form">
          <div className="custom-block-field">
            <label htmlFor="block-label">What's happening this week?</label>
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
            </div>
          </div>

          <div className="custom-block-actions">
            <button type="button" onClick={onClose} className="custom-block-cancel">
              Cancel
            </button>
            <button type="submit" disabled={!label.trim()} className="custom-block-save">
              {editExisting ? 'Save Changes' : 'Block Week'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default BlockedWeekManager;

import { memo } from 'react';

const WORK_PRESETS = [
  { label: '8am-5pm', start: '08:00', end: '17:00' },
  { label: '8:30am-5:30pm', start: '08:30', end: '17:30' },
  { label: '9am-6pm', start: '09:00', end: '18:00' },
  { label: '7am-4pm', start: '07:00', end: '16:00' }
];

/**
 * Work schedule configuration panel.
 *
 * @param {Object} props
 * @param {string} props.workStart - Work start time (HH:MM)
 * @param {string} props.workEnd - Work end time (HH:MM)
 * @param {function} props.onWorkStartChange - Called with new start time string
 * @param {function} props.onWorkEndChange - Called with new end time string
 */
function WorkScheduleSettings({ workStart, workEnd, onWorkStartChange, onWorkEndChange }) {
  return (
    <div role="tabpanel" id="panel-work" aria-labelledby="tab-work" className="space-y-6">
      <div>
        <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>Work Schedule</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
          Filter camps that cover your workday hours.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="work-start-time" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              Work Starts
            </label>
            <input
              id="work-start-time"
              type="time"
              value={workStart}
              onChange={(e) => onWorkStartChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
              style={{ borderColor: 'var(--earth-300)' }}
            />
          </div>
          <div>
            <label htmlFor="work-end-time" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              Work Ends
            </label>
            <input
              id="work-end-time"
              type="time"
              value={workEnd}
              onChange={(e) => onWorkEndChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
              style={{ borderColor: 'var(--earth-300)' }}
            />
          </div>
        </div>

        {/* Quick presets */}
        <div className="mt-4">
          <p className="text-sm mb-2" style={{ color: 'var(--earth-600)' }}>Quick presets:</p>
          <div className="flex gap-2">
            {WORK_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  onWorkStartChange(preset.start);
                  onWorkEndChange(preset.end);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  workStart === preset.start && workEnd === preset.end
                    ? ''
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                style={workStart === preset.start && workEnd === preset.end ? {
                  backgroundColor: 'var(--accent-100)',
                  color: 'var(--accent-700)'
                } : {}}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--earth-50)' }}>
          <p className="text-sm" style={{ color: 'var(--earth-600)' }}>
            Filters show camps with direct coverage or extended care.
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(WorkScheduleSettings);

import { memo } from 'react';
import { SANTA_BARBARA_SCHOOLS, formatDate, getSummerWeeksCount } from './utils';

/**
 * School dates configuration panel.
 *
 * @param {Object} props
 * @param {string} props.schoolEndDate - Last day of school (YYYY-MM-DD)
 * @param {string} props.schoolStartDate - First day of school (YYYY-MM-DD)
 * @param {string} props.selectedSchool - Currently selected school preset name
 * @param {function} props.onSchoolSelect - Called with school name when a preset is clicked
 * @param {function} props.onEndDateChange - Called with new end date string
 * @param {function} props.onStartDateChange - Called with new start date string
 */
function SchoolDatesSettings({
  schoolEndDate,
  schoolStartDate,
  selectedSchool,
  onSchoolSelect,
  onEndDateChange,
  onStartDateChange
}) {
  return (
    <div role="tabpanel" id="panel-school" aria-labelledby="tab-school" className="space-y-6">
      <div>
        <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>School Calendar</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
          Set school dates to calculate summer coverage.
        </p>

        {/* School preset selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {SANTA_BARBARA_SCHOOLS.map(school => (
            <button
              key={school.name}
              onClick={() => onSchoolSelect(school.name)}
              className={`px-3 py-2 rounded-lg text-sm text-left transition-all ${
                selectedSchool === school.name
                  ? 'ring-2'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
              style={selectedSchool === school.name ? {
                backgroundColor: 'var(--accent-50)',
                ringColor: 'var(--accent-500)'
              } : {}}
            >
              {school.name}
            </button>
          ))}
        </div>

        {/* Date inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="school-end-date" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              Last Day of School
            </label>
            <input
              id="school-end-date"
              type="date"
              value={schoolEndDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
              style={{ borderColor: 'var(--earth-300)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--earth-500)' }}>
              {formatDate(schoolEndDate)}
            </p>
          </div>
          <div>
            <label htmlFor="school-start-date" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              First Day of School
            </label>
            <input
              id="school-start-date"
              type="date"
              value={schoolStartDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
              style={{ borderColor: 'var(--earth-300)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--earth-500)' }}>
              {formatDate(schoolStartDate)}
            </p>
          </div>
        </div>

        {/* Summer preview */}
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--sage-50)' }}>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" style={{ color: 'var(--sage-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium" style={{ color: 'var(--sage-700)' }}>Your Summer</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--sage-600)' }}>
            {formatDate(schoolEndDate)} to {formatDate(schoolStartDate)}
          </p>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--sage-700)' }}>
            {getSummerWeeksCount(schoolEndDate, schoolStartDate)} weeks to plan
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(SchoolDatesSettings);

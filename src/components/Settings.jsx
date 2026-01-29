import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, DEFAULT_SCHOOL_END, DEFAULT_SCHOOL_START } from '../lib/supabase';

const SANTA_BARBARA_SCHOOLS = [
  { name: 'SB Unified (Default)', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Hope Elementary', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Goleta Union', endDate: '2026-06-04', startDate: '2026-08-18' },
  { name: 'Montecito Union', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Cold Spring', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Custom Dates', endDate: null, startDate: null }
];

export function Settings({ onClose }) {
  const { profile, refreshProfile, children } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('school');

  // School dates
  const [selectedSchool, setSelectedSchool] = useState('SB Unified (Default)');
  const [schoolEndDate, setSchoolEndDate] = useState(profile?.school_year_end || DEFAULT_SCHOOL_END);
  const [schoolStartDate, setSchoolStartDate] = useState(profile?.school_year_start || DEFAULT_SCHOOL_START);

  // Work hours
  const [workStart, setWorkStart] = useState(profile?.work_hours_start || '08:00');
  const [workEnd, setWorkEnd] = useState(profile?.work_hours_end || '17:30');

  // Budget
  const [budget, setBudget] = useState(profile?.summer_budget || '');

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState(profile?.notification_preferences || {
    email_notifications: true,
    registration_open: true,
    price_drop: true,
    spots_available: true,
    weekly_digest: true
  });

  useEffect(() => {
    // Detect which school preset matches current dates
    const match = SANTA_BARBARA_SCHOOLS.find(s =>
      s.endDate === schoolEndDate && s.startDate === schoolStartDate
    );
    if (match) {
      setSelectedSchool(match.name);
    } else if (schoolEndDate !== DEFAULT_SCHOOL_END || schoolStartDate !== DEFAULT_SCHOOL_START) {
      setSelectedSchool('Custom Dates');
    }
  }, [schoolEndDate, schoolStartDate]);

  function handleSchoolSelect(schoolName) {
    setSelectedSchool(schoolName);
    const school = SANTA_BARBARA_SCHOOLS.find(s => s.name === schoolName);
    if (school && school.endDate) {
      setSchoolEndDate(school.endDate);
      setSchoolStartDate(school.startDate);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      await updateProfile({
        school_year_end: schoolEndDate,
        school_year_start: schoolStartDate,
        work_hours_start: workStart,
        work_hours_end: workEnd,
        summer_budget: budget ? parseFloat(budget) : null,
        notification_preferences: notificationPrefs
      });

      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Calculate summer weeks count
  function getSummerWeeksCount() {
    const start = new Date(schoolEndDate);
    const end = new Date(schoolStartDate);
    const weeks = Math.floor((end - start) / (1000 * 60 * 60 * 24 * 7));
    return weeks;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--earth-200)' }}>
          <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--earth-800)' }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--earth-200)' }} role="tablist">
          {[
            { id: 'school', label: 'School Dates' },
            { id: 'work', label: 'Work Hours' },
            { id: 'budget', label: 'Budget' },
            { id: 'notifications', label: 'Notifications' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab.id ? {
                borderColor: 'var(--accent-500)',
                color: 'var(--accent-600)'
              } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* School Dates Tab */}
          {activeTab === 'school' && (
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
                      onClick={() => handleSchoolSelect(school.name)}
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
                      onChange={(e) => {
                        setSchoolEndDate(e.target.value);
                        setSelectedSchool('Custom Dates');
                      }}
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
                      onChange={(e) => {
                        setSchoolStartDate(e.target.value);
                        setSelectedSchool('Custom Dates');
                      }}
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
                    {getSummerWeeksCount()} weeks to plan
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Work Hours Tab */}
          {activeTab === 'work' && (
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
                      onChange={(e) => setWorkStart(e.target.value)}
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
                      onChange={(e) => setWorkEnd(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ borderColor: 'var(--earth-300)' }}
                    />
                  </div>
                </div>

                {/* Quick presets */}
                <div className="mt-4">
                  <p className="text-sm mb-2" style={{ color: 'var(--earth-600)' }}>Quick presets:</p>
                  <div className="flex gap-2">
                    {[
                      { label: '8am-5pm', start: '08:00', end: '17:00' },
                      { label: '8:30am-5:30pm', start: '08:30', end: '17:30' },
                      { label: '9am-6pm', start: '09:00', end: '18:00' },
                      { label: '7am-4pm', start: '07:00', end: '16:00' }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setWorkStart(preset.start);
                          setWorkEnd(preset.end);
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
          )}

          {/* Budget Tab */}
          {activeTab === 'budget' && (
            <div role="tabpanel" id="panel-budget" aria-labelledby="tab-budget" className="space-y-6">
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>Summer Budget</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
                  Track your total summer spend.
                </p>

                <div>
                  <label htmlFor="summer-budget" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
                    Total Summer Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">$</span>
                    <input
                      id="summer-budget"
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g., 5000"
                      className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:outline-none"
                      style={{ borderColor: 'var(--earth-300)' }}
                    />
                  </div>
                </div>

                {/* Budget presets */}
                <div className="mt-4">
                  <p className="text-sm mb-2" style={{ color: 'var(--earth-600)' }}>Common budgets:</p>
                  <div className="flex gap-2">
                    {[2500, 5000, 7500, 10000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBudget(amount.toString())}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          budget === amount.toString()
                            ? ''
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        style={budget === amount.toString() ? {
                          backgroundColor: 'var(--accent-100)',
                          color: 'var(--accent-700)'
                        } : {}}
                      >
                        ${amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {children.length > 0 && budget && (
                  <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--sage-50)' }}>
                    <p className="text-sm" style={{ color: 'var(--sage-700)' }}>
                      For {children.length} child{children.length > 1 ? 'ren' : ''}, that's roughly{' '}
                      <strong>${Math.round(parseFloat(budget) / children.length).toLocaleString()}</strong> per child
                      {' '}or <strong>${Math.round(parseFloat(budget) / children.length / 10).toLocaleString()}</strong> per week each.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div role="tabpanel" id="panel-notifications" aria-labelledby="tab-notifications" className="space-y-6">
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>Notification Preferences</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
                  Choose what updates you receive.
                </p>

                <div className="space-y-3">
                  {[
                    { key: 'email_notifications', label: 'Email notifications', desc: 'Receive updates via email' },
                    { key: 'registration_open', label: 'Registration alerts', desc: 'When camp registration opens' },
                    { key: 'price_drop', label: 'Price drops', desc: 'When a watched camp lowers prices' },
                    { key: 'spots_available', label: 'Spots available', desc: 'When waitlisted camps have openings' },
                    { key: 'weekly_digest', label: 'Weekly digest', desc: 'Summary of upcoming registrations' }
                  ].map(pref => (
                    <label key={pref.key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs[pref.key] || false}
                        onChange={(e) => setNotificationPrefs(prev => ({
                          ...prev,
                          [pref.key]: e.target.checked
                        }))}
                        className="mt-0.5 w-4 h-4 rounded"
                        style={{ accentColor: 'var(--accent-500)' }}
                      />
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--earth-800)' }}>{pref.label}</p>
                        <p className="text-sm" style={{ color: 'var(--earth-500)' }}>{pref.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--earth-200)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--earth-600)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: saving ? 'var(--earth-400)' : 'var(--accent-500)' }}
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : saved ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;

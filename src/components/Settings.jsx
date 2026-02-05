import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  updateProfile,
  DEFAULT_SCHOOL_END,
  DEFAULT_SCHOOL_START,
  getNotificationPreferences,
  updateNotificationPreferences,
  getDefaultNotificationPreferences,
  clearSampleData
} from '../lib/supabase';
import BrandIcon from './BrandIcon';

const CAMP_CATEGORIES = [
  { id: 'Beach/Surf', label: 'Beach & Surf', icon: 'beach-surf' },
  { id: 'Sports', label: 'Sports', icon: 'sports' },
  { id: 'Art', label: 'Art & Creativity', icon: 'art' },
  { id: 'Science/STEM', label: 'Science & STEM', icon: 'science-stem' },
  { id: 'Nature/Outdoor', label: 'Nature & Outdoors', icon: 'nature-outdoor' },
  { id: 'Music', label: 'Music', icon: 'music' },
  { id: 'Theater', label: 'Theater & Drama', icon: 'theater' },
  { id: 'Dance', label: 'Dance', icon: 'dance' },
  { id: 'Animals/Zoo', label: 'Animals', icon: 'animals-zoo' },
  { id: 'Cooking', label: 'Cooking', icon: 'cooking' },
  { id: 'Multi-Activity', label: 'Multi-Activity', icon: 'multi-activity' },
  { id: 'Faith-Based', label: 'Faith-Based', icon: 'faith-based' }
];

const SANTA_BARBARA_SCHOOLS = [
  { name: 'SB Unified (Default)', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Hope Elementary', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Goleta Union', endDate: '2026-06-04', startDate: '2026-08-18' },
  { name: 'Montecito Union', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Cold Spring', endDate: '2026-06-05', startDate: '2026-08-19' },
  { name: 'Custom Dates', endDate: null, startDate: null }
];

export function Settings({ onClose }) {
  const { profile, refreshProfile, refreshChildren, refreshSchedule, children } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeTab, setActiveTab] = useState('school');
  const [clearingSample, setClearingSample] = useState(false);
  const [sampleCleared, setSampleCleared] = useState(false);

  // School dates
  const [selectedSchool, setSelectedSchool] = useState('SB Unified (Default)');
  const [schoolEndDate, setSchoolEndDate] = useState(profile?.school_year_end || DEFAULT_SCHOOL_END);
  const [schoolStartDate, setSchoolStartDate] = useState(profile?.school_year_start || DEFAULT_SCHOOL_START);

  // Work hours
  const [workStart, setWorkStart] = useState(profile?.work_hours_start || '08:00');
  const [workEnd, setWorkEnd] = useState(profile?.work_hours_end || '17:30');

  // Budget
  const [budget, setBudget] = useState(profile?.summer_budget || '');

  // Notification preferences - load from dedicated table
  const [notificationPrefs, setNotificationPrefs] = useState(null);
  const [notificationPrefsLoading, setNotificationPrefsLoading] = useState(true);

  // Category preferences
  const [selectedCategories, setSelectedCategories] = useState(profile?.preferred_categories || []);

  // Load notification preferences
  useEffect(() => {
    async function loadNotificationPrefs() {
      setNotificationPrefsLoading(true);
      try {
        const prefs = await getNotificationPreferences();
        setNotificationPrefs(prefs || getDefaultNotificationPreferences());
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        setNotificationPrefs(getDefaultNotificationPreferences());
      } finally {
        setNotificationPrefsLoading(false);
      }
    }
    loadNotificationPrefs();
  }, []);

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

  // Sync selectedCategories when profile loads
  useEffect(() => {
    if (profile?.preferred_categories) {
      setSelectedCategories(profile.preferred_categories);
    }
  }, [profile]);

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
      // Save profile settings
      await updateProfile({
        school_year_end: schoolEndDate,
        school_year_start: schoolStartDate,
        work_hours_start: workStart,
        work_hours_end: workEnd,
        summer_budget: budget ? parseFloat(budget) : null,
        preferred_categories: selectedCategories,
      });

      // Save notification preferences to dedicated table
      if (notificationPrefs) {
        await updateNotificationPreferences(notificationPrefs);
      }

      await refreshProfile();
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Helper function to update notification preference
  function updateNotifPref(key, value) {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: value
    }));
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
    // Return 0 for invalid configurations (end date before start date)
    return weeks > 0 ? weeks : 0;
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
            { id: 'notifications', label: 'Notifications' },
            { id: 'preferences', label: 'Preferences' }
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
              {notificationPrefsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--earth-400)' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : notificationPrefs && (
                <>
                  {/* Global Settings */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--earth-50)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium" style={{ color: 'var(--earth-800)' }}>All Notifications</h4>
                        <p className="text-sm" style={{ color: 'var(--earth-500)' }}>Master switch for all notifications</p>
                      </div>
                      <button
                        onClick={() => updateNotifPref('notifications_enabled', !notificationPrefs.notifications_enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notificationPrefs.notifications_enabled ? '' : 'bg-gray-300'
                        }`}
                        style={notificationPrefs.notifications_enabled ? { backgroundColor: 'var(--accent-500)' } : {}}
                        role="switch"
                        aria-checked={notificationPrefs.notifications_enabled}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationPrefs.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {notificationPrefs.notifications_enabled && (
                    <>
                      {/* Registration Alerts */}
                      <div>
                        <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--terra-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Registration Alerts
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
                          Get notified before registration opens
                        </p>

                        <div className="space-y-3 pl-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.registration_alerts_enabled}
                              onChange={(e) => updateNotifPref('registration_alerts_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable registration alerts</span>
                          </label>

                          {notificationPrefs.registration_alerts_enabled && (
                            <>
                              <div className="flex items-center gap-3">
                                <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Alert me</span>
                                <select
                                  value={notificationPrefs.registration_alert_days}
                                  onChange={(e) => updateNotifPref('registration_alert_days', parseInt(e.target.value))}
                                  className="px-2 py-1 text-sm border rounded-lg"
                                  style={{ borderColor: 'var(--earth-300)' }}
                                >
                                  <option value={3}>3 days</option>
                                  <option value={5}>5 days</option>
                                  <option value={7}>1 week</option>
                                  <option value={14}>2 weeks</option>
                                  <option value={30}>1 month</option>
                                </select>
                                <span className="text-sm" style={{ color: 'var(--earth-600)' }}>before registration opens</span>
                              </div>

                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.registration_opening_email}
                                  onChange={(e) => updateNotifPref('registration_opening_email', e.target.checked)}
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: 'var(--accent-500)' }}
                                />
                                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for registration alerts</span>
                              </label>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

                      {/* Price Notifications */}
                      <div>
                        <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--sage-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Price Notifications
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
                          Track price changes on watched camps
                        </p>

                        <div className="space-y-3 pl-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.price_drop_enabled}
                              onChange={(e) => updateNotifPref('price_drop_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Price drop alerts</span>
                          </label>

                          {notificationPrefs.price_drop_enabled && (
                            <>
                              <div className="flex items-center gap-3">
                                <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Alert when price drops by at least</span>
                                <select
                                  value={notificationPrefs.price_drop_threshold}
                                  onChange={(e) => updateNotifPref('price_drop_threshold', parseInt(e.target.value))}
                                  className="px-2 py-1 text-sm border rounded-lg"
                                  style={{ borderColor: 'var(--earth-300)' }}
                                >
                                  <option value={5}>5%</option>
                                  <option value={10}>10%</option>
                                  <option value={15}>15%</option>
                                  <option value={20}>20%</option>
                                </select>
                              </div>

                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.price_drop_email}
                                  onChange={(e) => updateNotifPref('price_drop_email', e.target.checked)}
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: 'var(--accent-500)' }}
                                />
                                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for price drops</span>
                              </label>
                            </>
                          )}

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.early_bird_reminder_enabled}
                              onChange={(e) => updateNotifPref('early_bird_reminder_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Early bird deadline reminders</span>
                          </label>

                          {notificationPrefs.early_bird_reminder_enabled && (
                            <div className="flex items-center gap-3">
                              <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Remind me</span>
                              <select
                                value={notificationPrefs.early_bird_days_before}
                                onChange={(e) => updateNotifPref('early_bird_days_before', parseInt(e.target.value))}
                                className="px-2 py-1 text-sm border rounded-lg"
                                style={{ borderColor: 'var(--earth-300)' }}
                              >
                                <option value={1}>1 day</option>
                                <option value={3}>3 days</option>
                                <option value={5}>5 days</option>
                                <option value={7}>1 week</option>
                              </select>
                              <span className="text-sm" style={{ color: 'var(--earth-600)' }}>before early bird ends</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

                      {/* Waitlist Notifications */}
                      <div>
                        <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--ocean-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Waitlist Updates
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
                          Track waitlist status and spot availability
                        </p>

                        <div className="space-y-3 pl-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.waitlist_updates_enabled}
                              onChange={(e) => updateNotifPref('waitlist_updates_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable waitlist updates</span>
                          </label>

                          {notificationPrefs.waitlist_updates_enabled && (
                            <>
                              <label className="flex items-center gap-3 cursor-pointer ml-4">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.waitlist_spot_available}
                                  onChange={(e) => updateNotifPref('waitlist_spot_available', e.target.checked)}
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: 'var(--accent-500)' }}
                                />
                                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Spot becomes available</span>
                              </label>

                              <label className="flex items-center gap-3 cursor-pointer ml-4">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.waitlist_position_change}
                                  onChange={(e) => updateNotifPref('waitlist_position_change', e.target.checked)}
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: 'var(--accent-500)' }}
                                />
                                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Position changed</span>
                              </label>

                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.waitlist_email}
                                  onChange={(e) => updateNotifPref('waitlist_email', e.target.checked)}
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: 'var(--accent-500)' }}
                                />
                                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for waitlist updates</span>
                              </label>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

                      {/* New Camps Matching Preferences */}
                      <div>
                        <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--sun-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          New Camp Matches
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
                          Get notified when new camps match your preferences
                        </p>

                        <div className="space-y-3 pl-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.new_camp_match_enabled}
                              onChange={(e) => updateNotifPref('new_camp_match_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable new camp match alerts</span>
                          </label>

                          {notificationPrefs.new_camp_match_enabled && (
                            <>
                              <div className="ml-4 space-y-2">
                                <p className="text-xs font-medium" style={{ color: 'var(--earth-600)' }}>Match based on:</p>
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs.match_by_category}
                                    onChange={(e) => updateNotifPref('match_by_category', e.target.checked)}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--accent-500)' }}
                                  />
                                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Preferred categories</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs.match_by_age}
                                    onChange={(e) => updateNotifPref('match_by_age', e.target.checked)}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--accent-500)' }}
                                  />
                                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Child ages</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs.match_by_price}
                                    onChange={(e) => updateNotifPref('match_by_price', e.target.checked)}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--accent-500)' }}
                                  />
                                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Budget range</span>
                                </label>
                              </div>

                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.new_camp_email}
                                  onChange={(e) => updateNotifPref('new_camp_email', e.target.checked)}
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: 'var(--accent-500)' }}
                                />
                                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for new camp matches</span>
                              </label>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

                      {/* Schedule Notifications */}
                      <div>
                        <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--earth-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Schedule Alerts
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
                          Conflicts and coverage gap reminders
                        </p>

                        <div className="space-y-3 pl-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.schedule_conflict_enabled}
                              onChange={(e) => updateNotifPref('schedule_conflict_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Schedule conflict warnings</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.coverage_gap_enabled}
                              onChange={(e) => updateNotifPref('coverage_gap_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Coverage gap reminders</span>
                          </label>

                          {notificationPrefs.coverage_gap_enabled && (
                            <div className="flex items-center gap-3 ml-4">
                              <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Remind me on</span>
                              <select
                                value={notificationPrefs.coverage_reminder_day}
                                onChange={(e) => updateNotifPref('coverage_reminder_day', e.target.value)}
                                className="px-2 py-1 text-sm border rounded-lg"
                                style={{ borderColor: 'var(--earth-300)' }}
                              >
                                <option value="sunday">Sunday</option>
                                <option value="monday">Monday</option>
                                <option value="tuesday">Tuesday</option>
                                <option value="wednesday">Wednesday</option>
                                <option value="thursday">Thursday</option>
                                <option value="friday">Friday</option>
                                <option value="saturday">Saturday</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

                      {/* Friend/Squad Notifications
                          BUG-F-022: Squad notification category preferences are implemented here.
                          - friend_match: Covered by friend_match_enabled (same camp notifications)
                          - looking_for_friends: Covered by friend_activity_enabled (friend coordination)
                          - new_member/schedule_change: Covered by squad_updates_enabled
                      */}
                      <div>
                        <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--ocean-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Friend Activity (Squads)
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
                          Notifications about squad members and friend matches
                        </p>

                        <div className="space-y-3 pl-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.friend_match_enabled}
                              onChange={(e) => updateNotifPref('friend_match_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Friend will be at the same camp</span>
                          </label>

                          {notificationPrefs.friend_match_enabled && (
                            <label className="flex items-center gap-3 cursor-pointer ml-4">
                              <input
                                type="checkbox"
                                checked={notificationPrefs.friend_match_email}
                                onChange={(e) => updateNotifPref('friend_match_email', e.target.checked)}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: 'var(--accent-500)' }}
                              />
                              <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email for friend matches</span>
                            </label>
                          )}

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.friend_activity_enabled}
                              onChange={(e) => updateNotifPref('friend_activity_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Friend scheduled a camp</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.squad_updates_enabled}
                              onChange={(e) => updateNotifPref('squad_updates_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Squad member updates (joins, leaves)</span>
                          </label>
                        </div>
                      </div>

                      <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

                      {/* Weekly Digest */}
                      <div>
                        <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--earth-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Weekly Planning Digest
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
                          Summary email with upcoming registrations and reminders
                        </p>

                        <div className="space-y-3 pl-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.weekly_digest_enabled}
                              onChange={(e) => updateNotifPref('weekly_digest_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable weekly digest email</span>
                          </label>

                          {notificationPrefs.weekly_digest_enabled && (
                            <>
                              <div className="flex items-center gap-3">
                                <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Send on</span>
                                <select
                                  value={notificationPrefs.weekly_digest_day}
                                  onChange={(e) => updateNotifPref('weekly_digest_day', e.target.value)}
                                  className="px-2 py-1 text-sm border rounded-lg"
                                  style={{ borderColor: 'var(--earth-300)' }}
                                >
                                  <option value="sunday">Sunday</option>
                                  <option value="monday">Monday</option>
                                  <option value="tuesday">Tuesday</option>
                                  <option value="wednesday">Wednesday</option>
                                  <option value="thursday">Thursday</option>
                                  <option value="friday">Friday</option>
                                  <option value="saturday">Saturday</option>
                                </select>
                                <span className="text-sm" style={{ color: 'var(--earth-600)' }}>at</span>
                                <input
                                  type="time"
                                  value={notificationPrefs.weekly_digest_time || '09:00'}
                                  onChange={(e) => {
                                    // Validate time format (HH:MM)
                                    const timeValue = e.target.value;
                                    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue) || timeValue === '') {
                                      updateNotifPref('weekly_digest_time', timeValue || '09:00');
                                    }
                                  }}
                                  className="px-2 py-1 text-sm border rounded-lg"
                                  style={{ borderColor: 'var(--earth-300)' }}
                                />
                              </div>

                              <div className="ml-4 space-y-2">
                                <p className="text-xs font-medium" style={{ color: 'var(--earth-600)' }}>Include in digest:</p>
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs.digest_include_registration_dates}
                                    onChange={(e) => updateNotifPref('digest_include_registration_dates', e.target.checked)}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--accent-500)' }}
                                  />
                                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Upcoming registration dates</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs.digest_include_coverage_status}
                                    onChange={(e) => updateNotifPref('digest_include_coverage_status', e.target.checked)}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--accent-500)' }}
                                  />
                                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Summer coverage status</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs.digest_include_price_changes}
                                    onChange={(e) => updateNotifPref('digest_include_price_changes', e.target.checked)}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--accent-500)' }}
                                  />
                                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Price changes on watched camps</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs.digest_include_recommendations}
                                    onChange={(e) => updateNotifPref('digest_include_recommendations', e.target.checked)}
                                    className="w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--accent-500)' }}
                                  />
                                  <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Camp recommendations</span>
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="border-t" style={{ borderColor: 'var(--earth-200)' }} />

                      {/* Budget Alerts */}
                      <div>
                        <h3 className="font-medium mb-1 flex items-center gap-2" style={{ color: 'var(--earth-800)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--terra-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Budget Alerts
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--earth-600)' }}>
                          Get notified when approaching or exceeding budget
                        </p>

                        <div className="space-y-3 pl-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs.budget_alerts_enabled}
                              onChange={(e) => updateNotifPref('budget_alerts_enabled', e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent-500)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Enable budget alerts</span>
                          </label>

                          {notificationPrefs.budget_alerts_enabled && (
                            <>
                              <div className="flex items-center gap-3">
                                <span className="text-sm" style={{ color: 'var(--earth-600)' }}>Warn me at</span>
                                <select
                                  value={notificationPrefs.budget_warning_threshold}
                                  onChange={(e) => updateNotifPref('budget_warning_threshold', parseInt(e.target.value))}
                                  className="px-2 py-1 text-sm border rounded-lg"
                                  style={{ borderColor: 'var(--earth-300)' }}
                                >
                                  <option value={50}>50%</option>
                                  <option value={75}>75%</option>
                                  <option value={80}>80%</option>
                                  <option value={90}>90%</option>
                                  <option value={100}>100%</option>
                                </select>
                                <span className="text-sm" style={{ color: 'var(--earth-600)' }}>of budget</span>
                              </div>

                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.budget_exceeded_email}
                                  onChange={(e) => updateNotifPref('budget_exceeded_email', e.target.checked)}
                                  className="w-4 h-4 rounded"
                                  style={{ accentColor: 'var(--accent-500)' }}
                                />
                                <span className="text-sm" style={{ color: 'var(--earth-700)' }}>Send email when budget exceeded</span>
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div role="tabpanel" id="panel-preferences" aria-labelledby="tab-preferences" className="space-y-6">
              <div>
                <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>Camp Categories</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
                  Select the types of camps that interest your family.
                </p>

                {/* Category grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CAMP_CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategories(prev =>
                            isSelected
                              ? prev.filter(c => c !== category.id)
                              : [...prev, category.id]
                          );
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-transparent'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        style={isSelected ? {
                          backgroundColor: 'var(--accent-50)',
                          borderColor: 'var(--accent-500)'
                        } : {}}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? '' : 'bg-gray-100'
                          }`}
                          style={isSelected ? { backgroundColor: 'var(--accent-100)' } : {}}
                        >
                          <BrandIcon
                            name={category.icon}
                            className="w-5 h-5"
                            style={{ color: isSelected ? 'var(--accent-600)' : 'var(--earth-500)' }}
                          />
                        </div>
                        <span
                          className="text-sm font-medium"
                          style={{ color: isSelected ? 'var(--accent-700)' : 'var(--earth-700)' }}
                        >
                          {category.label}
                        </span>
                        {isSelected && (
                          <svg
                            className="w-5 h-5 ml-auto flex-shrink-0"
                            style={{ color: 'var(--accent-500)' }}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected count */}
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--sage-50)' }}>
                  <p className="text-sm" style={{ color: 'var(--sage-700)' }}>
                    {selectedCategories.length === 0 ? (
                      'No categories selected. All camp types will be shown.'
                    ) : (
                      <>
                        <strong>{selectedCategories.length}</strong> {selectedCategories.length === 1 ? 'category' : 'categories'} selected.
                        Camps matching these will be highlighted.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Clear Sample Data Section */}
              <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--earth-200)' }}>
                <h3 className="font-medium mb-1" style={{ color: 'var(--earth-800)' }}>Sample Data</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--earth-600)' }}>
                  Remove sample children and scheduled camps added during the guided tour.
                </p>
                <button
                  onClick={async () => {
                    setClearingSample(true);
                    setSampleCleared(false);
                    try {
                      await clearSampleData();
                      await refreshChildren();
                      await refreshSchedule();
                      setSampleCleared(true);
                      setTimeout(() => setSampleCleared(false), 3000);
                    } catch (error) {
                      console.error('Failed to clear sample data:', error);
                      setSaveError('Failed to clear sample data. Please try again.');
                    } finally {
                      setClearingSample(false);
                    }
                  }}
                  disabled={clearingSample}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  style={{
                    backgroundColor: sampleCleared ? 'var(--sage-100)' : 'var(--terra-50)',
                    color: sampleCleared ? 'var(--sage-700)' : 'var(--terra-700)',
                    border: `1px solid ${sampleCleared ? 'var(--sage-300)' : 'var(--terra-200)'}`
                  }}
                >
                  {clearingSample ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Clearing...
                    </>
                  ) : sampleCleared ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Cleared
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear Sample Data
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--earth-200)' }}>
          {saveError && (
            <div className="mb-3 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--terra-50)', color: 'var(--terra-700)' }}>
              {saveError}
            </div>
          )}
          <div className="flex items-center justify-between">
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
    </div>
  );
}

export default Settings;

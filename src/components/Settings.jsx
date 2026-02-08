import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSchedule } from '../contexts/ScheduleContext';
import {
  updateProfile,
  DEFAULT_SCHOOL_END,
  DEFAULT_SCHOOL_START,
  getNotificationPreferences,
  updateNotificationPreferences,
  getDefaultNotificationPreferences,
  clearSampleData
} from '../lib/supabase';
import { SANTA_BARBARA_SCHOOLS } from './settings/utils';
import SchoolDatesSettings from './settings/SchoolDatesSettings';
import WorkScheduleSettings from './settings/WorkScheduleSettings';
import BudgetSettings from './settings/BudgetSettings';
import NotificationSettings from './settings/NotificationSettings';
import CategoryPreferences from './settings/CategoryPreferences';

const TABS = [
  { id: 'school', label: 'School Dates' },
  { id: 'work', label: 'Work Hours' },
  { id: 'budget', label: 'Budget' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'preferences', label: 'Preferences' }
];

export function Settings({ onClose }) {
  const { profile, refreshProfile, refreshChildren, children } = useAuth();
  const { refreshSchedule } = useSchedule();
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

  const handleSchoolSelect = useCallback((schoolName) => {
    setSelectedSchool(schoolName);
    const school = SANTA_BARBARA_SCHOOLS.find(s => s.name === schoolName);
    if (school && school.endDate) {
      setSchoolEndDate(school.endDate);
      setSchoolStartDate(school.startDate);
    }
  }, []);

  const handleEndDateChange = useCallback((value) => {
    setSchoolEndDate(value);
    setSelectedSchool('Custom Dates');
  }, []);

  const handleStartDateChange = useCallback((value) => {
    setSchoolStartDate(value);
    setSelectedSchool('Custom Dates');
  }, []);

  const handleUpdateNotifPref = useCallback((key, value) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleCategoryToggle = useCallback((categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleClearSample = useCallback(async () => {
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
  }, [refreshChildren, refreshSchedule]);

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
          {TABS.map(tab => (
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
          {activeTab === 'school' && (
            <SchoolDatesSettings
              schoolEndDate={schoolEndDate}
              schoolStartDate={schoolStartDate}
              selectedSchool={selectedSchool}
              onSchoolSelect={handleSchoolSelect}
              onEndDateChange={handleEndDateChange}
              onStartDateChange={handleStartDateChange}
            />
          )}

          {activeTab === 'work' && (
            <WorkScheduleSettings
              workStart={workStart}
              workEnd={workEnd}
              onWorkStartChange={setWorkStart}
              onWorkEndChange={setWorkEnd}
            />
          )}

          {activeTab === 'budget' && (
            <BudgetSettings
              budget={budget}
              onBudgetChange={setBudget}
              childrenCount={children.length}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings
              notificationPrefs={notificationPrefs}
              notificationPrefsLoading={notificationPrefsLoading}
              onUpdatePref={handleUpdateNotifPref}
            />
          )}

          {activeTab === 'preferences' && (
            <CategoryPreferences
              selectedCategories={selectedCategories}
              onCategoryToggle={handleCategoryToggle}
              clearingSample={clearingSample}
              sampleCleared={sampleCleared}
              onClearSample={handleClearSample}
            />
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

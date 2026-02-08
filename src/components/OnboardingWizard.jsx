import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addChild, updateProfile, completeOnboarding, addScheduledCamp, supabase } from '../lib/supabase';
import { generateSampleChildren, generateSampleSchedule } from '../lib/sampleData';
import { PLANNING_YEAR_LABEL } from '../lib/config';
import BrandIcon from './BrandIcon';
import { CelebrationBurst } from './Confetti';
import './OnboardingWizard.css';

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'children', title: 'Your Children' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'notifications', title: 'Notifications' },
  { id: 'complete', title: 'All Set!' }
];

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

const CHILD_EMOJIS = ['👧', '👦', '🧒', '👶', '🧒🏻', '👧🏻', '👦🏻', '🧒🏽', '👧🏽', '👦🏽', '🧒🏿', '👧🏿', '👦🏿'];

const CHILD_COLORS = [
  { hex: '#3b82f6', name: 'blue' },
  { hex: '#8b5cf6', name: 'purple' },
  { hex: '#ec4899', name: 'pink' },
  { hex: '#ef4444', name: 'red' },
  { hex: '#f97316', name: 'orange' },
  { hex: '#eab308', name: 'yellow' },
  { hex: '#22c55e', name: 'green' },
  { hex: '#14b8a6', name: 'teal' },
  { hex: '#06b6d4', name: 'cyan' },
  { hex: '#6366f1', name: 'indigo' }
];

export function OnboardingWizard({ onComplete }) {
  const navigate = useNavigate();
  const { profile, refreshChildren } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [slideDirection, setSlideDirection] = useState('forward');
  const [animationKey, setAnimationKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const handleCelebrationComplete = useCallback(() => setShowCelebration(false), []);

  // Children state
  const [children, setChildren] = useState([]);
  const [currentChild, setCurrentChild] = useState({
    name: '',
    age_as_of_summer: '',
    interests: [],
    avatar_emoji: '👧',
    color: '#3b82f6'
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    preferred_categories: [],
    zip_code: '',
    email_notifications: true
  });

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    registration_alerts: true,
    price_notifications: true,
    schedule_reminders: true,
    social_notifications: false
  });

  // Tour choice state
  const [tourChoice, setTourChoice] = useState(null); // 'tour' | 'skip'

  // Skip warning state
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setSlideDirection('forward');
      setAnimationKey(prev => prev + 1);
      setCurrentStep(nextStep);
      setError(null);
      if (STEPS[nextStep].id === 'complete') {
        setShowCelebration(true);
      }
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setSlideDirection('backward');
      setAnimationKey(prev => prev + 1);
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const addCurrentChild = () => {
    if (!currentChild.name.trim()) {
      setError('Please enter a name for your child');
      return;
    }
    if (!currentChild.age_as_of_summer) {
      setError('Please select an age');
      return;
    }

    setChildren([...children, { ...currentChild, id: Date.now() }]);
    setCurrentChild({
      name: '',
      age_as_of_summer: '',
      interests: [],
      avatar_emoji: CHILD_EMOJIS[Math.floor(Math.random() * CHILD_EMOJIS.length)],
      color: CHILD_COLORS[(children.length + 1) % CHILD_COLORS.length].hex
    });
    setError(null);
  };

  const removeChild = (id) => {
    setChildren(children.filter(c => c.id !== id));
  };

  const toggleCategory = (categoryId) => {
    setPreferences(prev => ({
      ...prev,
      preferred_categories: prev.preferred_categories.includes(categoryId)
        ? prev.preferred_categories.filter(c => c !== categoryId)
        : [...prev.preferred_categories, categoryId]
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      if (tourChoice === 'tour') {
        // Create sample children and camps for tour
        const sampleChildren = generateSampleChildren();
        const createdChildren = [];

        // Add sample children to database
        for (const child of sampleChildren) {
          const { data, error } = await addChild(child);
          if (error) throw new Error(error.message || 'Failed to add child');
          if (!data || data.length === 0) {
            throw new Error('Failed to create sample child. Please try again.');
          }
          createdChildren.push(data[0]);
        }

        // Fetch camps for schedule generation
        const { data: camps } = await supabase.from('camps').select('*').limit(100);

        // Generate and add sample schedule
        const sampleSchedule = generateSampleSchedule(createdChildren, camps || []);
        for (const schedule of sampleSchedule) {
          await addScheduledCamp(schedule);
        }

        // Mark tour as shown and save notification preferences
        await updateProfile({
          preferred_categories: preferences.preferred_categories,
          zip_code: preferences.zip_code || null,
          email_notifications: preferences.email_notifications,
          registration_alerts: notificationPrefs.registration_alerts,
          price_notifications: notificationPrefs.price_notifications,
          schedule_reminders: notificationPrefs.schedule_reminders,
          social_notifications: notificationPrefs.social_notifications,
          tour_shown: true
        });
      } else {
        // Normal completion: Add real children
        for (const child of children) {
          const { id, ...childData } = child;
          await addChild(childData);
        }

        // Update profile with preferences and notification settings
        await updateProfile({
          preferred_categories: preferences.preferred_categories,
          zip_code: preferences.zip_code || null,
          email_notifications: preferences.email_notifications,
          registration_alerts: notificationPrefs.registration_alerts,
          price_notifications: notificationPrefs.price_notifications,
          schedule_reminders: notificationPrefs.schedule_reminders,
          social_notifications: notificationPrefs.social_notifications
        });
      }

      // Mark onboarding as complete
      await completeOnboarding();

      // Refresh children in context
      await refreshChildren();

      // Open planner if tour was chosen
      if (tourChoice === 'tour') {
        setTimeout(() => {
          navigate('/schedule');
        }, 500);
      }

      // Call the onComplete callback
      onComplete?.();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return <WelcomeStep profile={profile} />;
      case 'children':
        return (
          <ChildrenStep
            children={children}
            currentChild={currentChild}
            setCurrentChild={setCurrentChild}
            addChild={addCurrentChild}
            removeChild={removeChild}
            error={error}
          />
        );
      case 'preferences':
        return (
          <PreferencesStep
            preferences={preferences}
            setPreferences={setPreferences}
            toggleCategory={toggleCategory}
          />
        );
      case 'notifications':
        return (
          <NotificationsStep
            notificationPrefs={notificationPrefs}
            setNotificationPrefs={setNotificationPrefs}
          />
        );
      case 'complete':
        return <CompleteStep children={children} preferences={preferences} tourChoice={tourChoice} setTourChoice={setTourChoice} />;
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'children':
        return true; // Allow proceeding with or without children
      case 'complete':
        return tourChoice !== null; // Must choose tour option
      default:
        return true;
    }
  };

  const handleSkipChildren = () => {
    setShowSkipWarning(true);
  };

  const confirmSkipChildren = () => {
    setChildren([]);
    setShowSkipWarning(false);
    goNext();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      {/* Skip Warning Modal */}
      {showSkipWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--sun-100)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--sun-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2" style={{ color: 'var(--earth-800)' }}>
                Limited experience without children
              </h3>
              <p className="text-sm" style={{ color: 'var(--earth-600)' }}>
                Without children added, you will not be able to:
              </p>
              <ul className="text-sm text-left mt-3 space-y-2 mx-auto max-w-xs" style={{ color: 'var(--earth-700)' }}>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--terra-500)' }}>•</span>
                  Get age-appropriate camp recommendations
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--terra-500)' }}>•</span>
                  Create schedules in the planner
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--terra-500)' }}>•</span>
                  Track coverage for your family
                </li>
              </ul>
              <p className="text-xs mt-4" style={{ color: 'var(--sand-500)' }}>
                You can add children later in Settings.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSkipWarning(false)}
                className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                style={{ background: 'var(--ocean-500)', color: 'white' }}
              >
                Add a Child
              </button>
              <button
                onClick={confirmSkipChildren}
                className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                style={{ background: 'var(--sand-100)', color: 'var(--earth-700)' }}
              >
                Skip Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration burst on completion step */}
      <CelebrationBurst
        active={showCelebration}
        onComplete={handleCelebrationComplete}
      />

      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Progress bar */}
        <div className="onboarding-progress-track">
          <div
            className="onboarding-progress-fill"
            style={{
              width: `${((currentStep + 1) / STEPS.length) * 100}%`
            }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 pt-6 pb-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              aria-current={index === currentStep ? 'step' : undefined}
              aria-label={`Step ${index + 1} of ${STEPS.length}: ${step.title}`}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-ocean-500'
                  : index < currentStep
                    ? 'bg-ocean-400'
                    : 'bg-sand-200'
              }`}
              style={{
                background: index === currentStep
                  ? 'var(--ocean-500)'
                  : index < currentStep
                    ? 'var(--ocean-400)'
                    : 'var(--sand-200)'
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div
            key={animationKey}
            className={slideDirection === 'forward' ? 'onboarding-step-forward' : 'onboarding-step-backward'}
          >
            {renderStep()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 flex justify-between items-center" style={{ borderTop: '1px solid var(--sand-200)' }}>
          {currentStep > 0 ? (
            <button
              onClick={goBack}
              className="onboarding-btn-back"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep === STEPS.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="onboarding-btn-primary"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Setting up...
                </span>
              ) : (
                'Start Exploring'
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {STEPS[currentStep].id === 'children' && children.length === 0 && (
                <button
                  onClick={handleSkipChildren}
                  className="onboarding-btn-skip"
                >
                  Skip
                </button>
              )}
              <button
                onClick={goNext}
                disabled={STEPS[currentStep].id === 'children' && children.length === 0}
                className="onboarding-btn-primary"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components

function WelcomeStep({ profile }) {
  return (
    <div className="text-center">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center text-5xl" style={{ background: 'var(--ocean-100)' }}>
        🌴
      </div>
      <h2 className="font-serif text-3xl font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
        Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
      </h2>
      <p className="text-lg mb-6" style={{ color: 'var(--earth-700)' }}>
        Quick setup for personalized recommendations.
      </p>
      <div className="flex flex-col gap-4 text-left max-w-md mx-auto p-6 rounded-2xl" style={{ background: 'var(--sand-50)' }}>
        <div className="flex items-start gap-3">
          <span className="text-xl">1.</span>
          <div>
            <p className="font-medium" style={{ color: 'var(--earth-800)' }}>Add your children</p>
            <p className="text-sm" style={{ color: 'var(--earth-600)' }}>We match camps to their ages</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xl">2.</span>
          <div>
            <p className="font-medium" style={{ color: 'var(--earth-800)' }}>Set your preferences</p>
            <p className="text-sm" style={{ color: 'var(--earth-600)' }}>Pick categories you like</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xl">3.</span>
          <div>
            <p className="font-medium" style={{ color: 'var(--earth-800)' }}>Get personalized picks</p>
            <p className="text-sm" style={{ color: 'var(--earth-600)' }}>See camps that fit</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChildrenStep({ children, currentChild, setCurrentChild, addChild, removeChild, error }) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--earth-800)' }}>
          Your children
        </h2>
        <p style={{ color: 'var(--earth-600)' }}>
          Ages and interests help match camps.
        </p>
      </div>

      {/* Added children list */}
      {children.length > 0 && (
        <div className="mb-6 space-y-3">
          {children.map(child => (
            <div
              key={child.id}
              className="onboarding-child-card"
              style={{ borderColor: child.color + '40' }}
            >
              <div
                className="onboarding-child-avatar"
                style={{ background: child.color + '15', borderColor: child.color }}
              >
                {child.avatar_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ color: 'var(--earth-800)' }}>{child.name}</p>
                <p className="text-sm" style={{ color: 'var(--earth-600)' }}>
                  {child.age_as_of_summer} years old
                  {child.interests.length > 0 && ` • Likes ${child.interests.join(', ')}`}
                </p>
              </div>
              <button
                onClick={() => removeChild(child.id)}
                aria-label={`Remove ${child.name}`}
                className="onboarding-child-remove"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new child form */}
      <div className="p-6 rounded-2xl" style={{ background: 'var(--ocean-50)', border: '1px solid var(--ocean-200)' }}>
        <h3 className="font-medium mb-4" style={{ color: 'var(--earth-800)' }}>
          {children.length === 0 ? 'Add your first child' : 'Add another child'}
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'var(--terra-100)', color: 'var(--terra-600)' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Name */}
          <div>
            <label htmlFor="child-name" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              Name
            </label>
            <input
              id="child-name"
              type="text"
              value={currentChild.name}
              onChange={(e) => setCurrentChild({ ...currentChild, name: e.target.value })}
              placeholder="Child's name"
              className="onboarding-input"
            />
          </div>

          {/* Age */}
          <div>
            <label htmlFor="child-age" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              Age (as of {PLANNING_YEAR_LABEL})
            </label>
            <select
              id="child-age"
              value={currentChild.age_as_of_summer}
              onChange={(e) => setCurrentChild({ ...currentChild, age_as_of_summer: parseInt(e.target.value) })}
              className="onboarding-input"
            >
              <option value="">Select age</option>
              {[...Array(16)].map((_, i) => (
                <option key={i + 3} value={i + 3}>{i + 3} years old</option>
              ))}
            </select>
          </div>
        </div>

        {/* Emoji picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
            Pick an avatar
          </label>
          <div className="flex flex-wrap gap-2">
            {CHILD_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setCurrentChild({ ...currentChild, avatar_emoji: emoji })}
                aria-label={`Select ${emoji} avatar`}
                className={`w-10 h-10 rounded-lg text-xl transition-all ${
                  currentChild.avatar_emoji === emoji ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  background: currentChild.avatar_emoji === emoji ? 'var(--ocean-100)' : 'white',
                  ringColor: 'var(--ocean-500)'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--earth-700)' }}>
            Pick a color (for calendar)
          </label>
          <div className="flex flex-wrap gap-2">
            {CHILD_COLORS.map(({ hex, name }) => (
              <button
                key={hex}
                onClick={() => setCurrentChild({ ...currentChild, color: hex })}
                aria-label={`Select ${name} color`}
                className={`w-8 h-8 rounded-full transition-all ${
                  currentChild.color === hex ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{ background: hex, ringColor: hex }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={addChild}
          className="onboarding-add-child-btn"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Child
        </button>
      </div>

      {children.length === 0 && (
        <p className="text-center text-sm mt-4" style={{ color: 'var(--sand-400)' }}>
          Add a child for personalized recommendations, or skip for now
        </p>
      )}
    </div>
  );
}

function PreferencesStep({ preferences, setPreferences, toggleCategory }) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--earth-800)' }}>
          What types of camps interest you?
        </h2>
        <p style={{ color: 'var(--earth-600)' }}>
          Select all that apply for personalized picks.
        </p>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {CAMP_CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            className={`p-4 rounded-xl text-left transition-all ${
              preferences.preferred_categories.includes(category.id)
                ? 'ring-2'
                : ''
            }`}
            style={{
              background: preferences.preferred_categories.includes(category.id)
                ? 'var(--ocean-50)'
                : 'var(--sand-50)',
              borderColor: preferences.preferred_categories.includes(category.id)
                ? 'var(--ocean-400)'
                : 'var(--sand-200)',
              ringColor: 'var(--ocean-400)',
              border: '1px solid'
            }}
          >
            <span className="block mb-1" style={{ color: 'var(--ocean-500)' }}><BrandIcon name={category.icon} size={28} /></span>
            <span className="text-sm font-medium" style={{ color: 'var(--earth-800)' }}>
              {category.label}
            </span>
          </button>
        ))}
      </div>

      {/* Additional preferences */}
      <div className="space-y-4">
        {/* Zip code */}
        <div>
          <label htmlFor="zip-code" className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
            Your zip code (optional)
          </label>
          <input
            id="zip-code"
            type="text"
            value={preferences.zip_code}
            onChange={(e) => setPreferences({ ...preferences, zip_code: e.target.value })}
            placeholder="e.g., 93101"
            maxLength={5}
            className="onboarding-input"
            style={{ maxWidth: '16rem' }}
          />
          <p className="text-sm mt-1" style={{ color: 'var(--sand-400)' }}>
            For sorting by distance
          </p>
        </div>

        {/* Email notifications */}
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--sand-50)' }}>
          <input
            type="checkbox"
            id="email_notifications"
            checked={preferences.email_notifications}
            onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked })}
            className="w-5 h-5 rounded"
          />
          <label htmlFor="email_notifications" className="flex-1">
            <p className="font-medium" style={{ color: 'var(--earth-800)' }}>
              Email me about registration openings
            </p>
            <p className="text-sm" style={{ color: 'var(--earth-600)' }}>
              Get notified when camps open for registration
            </p>
          </label>
        </div>
      </div>
    </div>
  );
}

function NotificationsStep({ notificationPrefs, setNotificationPrefs }) {
  const toggleNotification = (key) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const notifications = [
    {
      key: 'registration_alerts',
      title: 'Registration alerts',
      description: 'Get notified when camps open for registration',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      key: 'price_notifications',
      title: 'Price notifications',
      description: 'Price drops, early bird deadlines, and discounts',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      key: 'schedule_reminders',
      title: 'Schedule reminders',
      description: 'Upcoming camps and schedule changes',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      key: 'social_notifications',
      title: 'Social notifications',
      description: 'Squad activity and friend matches',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--earth-800)' }}>
          Stay in the loop
        </h2>
        <p style={{ color: 'var(--earth-600)' }}>
          Choose what updates you want to receive.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {notifications.map(({ key, title, description, icon }) => (
          <button
            key={key}
            onClick={() => toggleNotification(key)}
            className="w-full p-4 rounded-xl text-left transition-all flex items-start gap-4"
            style={{
              background: notificationPrefs[key] ? 'var(--ocean-50)' : 'var(--sand-50)',
              border: notificationPrefs[key] ? '2px solid var(--ocean-400)' : '2px solid var(--sand-200)'
            }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: notificationPrefs[key] ? 'var(--ocean-100)' : 'var(--sand-100)',
                color: notificationPrefs[key] ? 'var(--ocean-600)' : 'var(--earth-500)'
              }}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium" style={{ color: 'var(--earth-800)' }}>
                {title}
              </p>
              <p className="text-sm" style={{ color: 'var(--earth-600)' }}>
                {description}
              </p>
            </div>
            <div className="flex-shrink-0 self-center">
              <div
                className="w-12 h-7 rounded-full relative transition-colors"
                style={{
                  background: notificationPrefs[key] ? 'var(--ocean-500)' : 'var(--sand-300)'
                }}
              >
                <div
                  className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all"
                  style={{
                    left: notificationPrefs[key] ? '22px' : '2px'
                  }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--sand-400)' }}>
        You can change these anytime in settings.
      </p>
    </div>
  );
}

function CompleteStep({ children, preferences, tourChoice, setTourChoice }) {
  return (
    <div className="text-center">
      <div className="onboarding-complete-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            className="onboarding-checkmark"
            d="M14 24l8 8 12-16"
            stroke="var(--ocean-500)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <h2 className="font-serif text-3xl font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
        You're all set!
      </h2>

      {tourChoice === null ? (
        <>
          <p className="text-lg mb-8" style={{ color: 'var(--earth-700)' }}>
            How would you like to start?
          </p>

          <div className="max-w-md mx-auto space-y-3 mb-6">
            <button
              onClick={() => setTourChoice('tour')}
              className="w-full p-6 rounded-2xl border-2 transition-all text-left hover:shadow-lg"
              style={{
                borderColor: 'var(--ocean-400)',
                background: 'var(--ocean-50)'
              }}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl" style={{ color: 'var(--ocean-500)' }}><BrandIcon name="search" size={32} /></span>
                <div>
                  <p className="font-semibold text-lg mb-1" style={{ color: 'var(--earth-800)' }}>
                    Quick Tour with Sample Data <span style={{ color: 'var(--ocean-500)' }}>(Recommended)</span>
                  </p>
                  <p className="text-sm" style={{ color: 'var(--earth-700)' }}>
                    See how planning works with sample data. Clear when ready.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setTourChoice('skip')}
              className="w-full p-6 rounded-2xl border-2 transition-all text-left hover:shadow-md"
              style={{
                borderColor: 'var(--sand-200)',
                background: 'white'
              }}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl" style={{ color: 'var(--earth-600)' }}><BrandIcon name="rocket" size={32} /></span>
                <div>
                  <p className="font-semibold text-lg mb-1" style={{ color: 'var(--earth-800)' }}>
                    Skip Tour, Start Planning
                  </p>
                  <p className="text-sm" style={{ color: 'var(--earth-700)' }}>
                    Go straight to an empty planner.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-lg mb-8" style={{ color: 'var(--earth-700)' }}>
            Your family at a glance:
          </p>

      <div className="max-w-md mx-auto space-y-4 text-left">
        {/* Children summary */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--ocean-50)', border: '1px solid var(--ocean-200)' }}>
          <p className="font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--ocean-600)' }}>
            <BrandIcon name="family" size={18} /> Your Children
          </p>
          <div className="flex flex-wrap gap-2">
            {children.map(child => (
              <span
                key={child.id}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                style={{ background: 'white', color: 'var(--earth-800)' }}
              >
                {child.avatar_emoji} {child.name}, {child.age_as_of_summer}
              </span>
            ))}
          </div>
        </div>

        {/* Preferences summary */}
        {preferences.preferred_categories.length > 0 && (
          <div className="p-4 rounded-xl" style={{ background: 'var(--sage-50)', border: '1px solid var(--sage-200)' }}>
            <p className="font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--sage-600)' }}>
              <BrandIcon name="target" size={18} /> Interested In
            </p>
            <div className="flex flex-wrap gap-2">
              {preferences.preferred_categories.map(cat => {
                const category = CAMP_CATEGORIES.find(c => c.id === cat);
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                    style={{ background: 'white', color: 'var(--earth-800)' }}
                  >
                    {category?.icon && <BrandIcon name={category.icon} size={16} />} {category?.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

          <p className="text-sm mt-8" style={{ color: 'var(--sand-400)' }}>
            Click "Start Exploring" to {tourChoice === 'tour' ? 'begin the tour' : 'see your picks'}
          </p>
        </>
      )}
    </div>
  );
}

export default OnboardingWizard;

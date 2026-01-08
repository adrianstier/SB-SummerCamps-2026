import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addChild, updateProfile, completeOnboarding, addScheduledCamp, supabase } from '../lib/supabase';
import { generateSampleChildren, generateSampleSchedule } from '../lib/sampleData';

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'children', title: 'Your Children' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'complete', title: 'All Set!' }
];

const CAMP_CATEGORIES = [
  { id: 'Beach/Surf', label: 'Beach & Surf', icon: '🏄' },
  { id: 'Sports', label: 'Sports', icon: '⚽' },
  { id: 'Art', label: 'Art & Creativity', icon: '🎨' },
  { id: 'Science/STEM', label: 'Science & STEM', icon: '🔬' },
  { id: 'Nature/Outdoor', label: 'Nature & Outdoors', icon: '🌲' },
  { id: 'Music', label: 'Music', icon: '🎵' },
  { id: 'Theater', label: 'Theater & Drama', icon: '🎭' },
  { id: 'Dance', label: 'Dance', icon: '💃' },
  { id: 'Animals/Zoo', label: 'Animals', icon: '🐴' },
  { id: 'Cooking', label: 'Cooking', icon: '👨‍🍳' },
  { id: 'Multi-Activity', label: 'Multi-Activity', icon: '🎪' },
  { id: 'Faith-Based', label: 'Faith-Based', icon: '✝️' }
];

const CHILD_EMOJIS = ['👧', '👦', '🧒', '👶', '🧒🏻', '👧🏻', '👦🏻', '🧒🏽', '👧🏽', '👦🏽', '🧒🏿', '👧🏿', '👦🏿'];

const CHILD_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1'
];

export function OnboardingWizard({ onComplete }) {
  const { profile, refreshChildren } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Tour choice state
  const [tourChoice, setTourChoice] = useState(null); // 'tour' | 'skip'

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
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
      color: CHILD_COLORS[(children.length + 1) % CHILD_COLORS.length]
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
          const addedChild = await addChild(child);
          createdChildren.push(addedChild);
        }

        // Fetch camps for schedule generation
        const { data: camps } = await supabase.from('camps').select('*').limit(100);

        // Generate and add sample schedule
        const sampleSchedule = generateSampleSchedule(createdChildren, camps || []);
        for (const schedule of sampleSchedule) {
          await addScheduledCamp(schedule);
        }

        // Mark tour as shown
        await updateProfile({
          preferred_categories: preferences.preferred_categories,
          zip_code: preferences.zip_code || null,
          email_notifications: preferences.email_notifications,
          tour_shown: true
        });
      } else {
        // Normal completion: Add real children
        for (const child of children) {
          const { id, ...childData } = child;
          await addChild(childData);
        }

        // Update profile with preferences
        await updateProfile({
          preferred_categories: preferences.preferred_categories,
          zip_code: preferences.zip_code || null,
          email_notifications: preferences.email_notifications
        });
      }

      // Mark onboarding as complete
      await completeOnboarding();

      // Refresh children in context
      await refreshChildren();

      // Open planner if tour was chosen
      if (tourChoice === 'tour') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate', { detail: 'planner' }));
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
      case 'complete':
        return <CompleteStep children={children} preferences={preferences} tourChoice={tourChoice} setTourChoice={setTourChoice} />;
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'children':
        return children.length > 0;
      case 'complete':
        return tourChoice !== null; // Must choose tour option
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Progress bar */}
        <div className="h-2" style={{ background: 'var(--sand-100)' }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / STEPS.length) * 100}%`,
              background: 'linear-gradient(90deg, var(--ocean-400), var(--ocean-500))'
            }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 pt-6 pb-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
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
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 flex justify-between items-center" style={{ borderTop: '1px solid var(--sand-200)' }}>
          {currentStep > 0 ? (
            <button
              onClick={goBack}
              className="px-6 py-2.5 rounded-xl font-medium transition-colors"
              style={{ color: 'var(--earth-700)' }}
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
              className="btn-primary"
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
                'Start Exploring!'
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
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
        Set up your family profile.
      </p>
      <div className="flex flex-col gap-4 text-left max-w-md mx-auto p-6 rounded-2xl" style={{ background: 'var(--sand-50)' }}>
        <div className="flex items-start gap-3">
          <span className="text-xl">1.</span>
          <div>
            <p className="font-medium" style={{ color: 'var(--earth-800)' }}>Add your children</p>
            <p className="text-sm" style={{ color: 'var(--earth-600)' }}>We'll match camps to their ages and interests</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xl">2.</span>
          <div>
            <p className="font-medium" style={{ color: 'var(--earth-800)' }}>Set your preferences</p>
            <p className="text-sm" style={{ color: 'var(--earth-600)' }}>Tell us what types of camps interest you</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xl">3.</span>
          <div>
            <p className="font-medium" style={{ color: 'var(--earth-800)' }}>Get personalized recommendations</p>
            <p className="text-sm" style={{ color: 'var(--earth-600)' }}>Find and plan the perfect summer</p>
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
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: 'var(--sand-50)', border: '1px solid var(--sand-200)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ background: child.color + '20', border: `2px solid ${child.color}` }}
              >
                {child.avatar_emoji}
              </div>
              <div className="flex-1">
                <p className="font-medium" style={{ color: 'var(--earth-800)' }}>{child.name}</p>
                <p className="text-sm" style={{ color: 'var(--earth-600)' }}>
                  {child.age_as_of_summer} years old
                  {child.interests.length > 0 && ` • Likes ${child.interests.join(', ')}`}
                </p>
              </div>
              <button
                onClick={() => removeChild(child.id)}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                style={{ color: 'var(--terra-500)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              Name
            </label>
            <input
              type="text"
              value={currentChild.name}
              onChange={(e) => setCurrentChild({ ...currentChild, name: e.target.value })}
              placeholder="Child's name"
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
              style={{ borderColor: 'var(--sand-200)' }}
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
              Age (as of Summer 2026)
            </label>
            <select
              value={currentChild.age_as_of_summer}
              onChange={(e) => setCurrentChild({ ...currentChild, age_as_of_summer: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
              style={{ borderColor: 'var(--sand-200)' }}
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
            {CHILD_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setCurrentChild({ ...currentChild, color })}
                className={`w-8 h-8 rounded-full transition-all ${
                  currentChild.color === color ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{ background: color, ringColor: color }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={addChild}
          className="w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            background: 'var(--ocean-500)',
            color: 'white'
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Child
        </button>
      </div>

      {children.length === 0 && (
        <p className="text-center text-sm mt-4" style={{ color: 'var(--sand-400)' }}>
          Add at least one child to continue
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
          Select all that apply. We'll use these to personalize your recommendations.
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
            <span className="text-2xl block mb-1">{category.icon}</span>
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
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--earth-700)' }}>
            Your zip code (optional)
          </label>
          <input
            type="text"
            value={preferences.zip_code}
            onChange={(e) => setPreferences({ ...preferences, zip_code: e.target.value })}
            placeholder="e.g., 93101"
            maxLength={5}
            className="w-full max-w-xs px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: 'var(--sand-200)' }}
          />
          <p className="text-sm mt-1" style={{ color: 'var(--sand-400)' }}>
            Helps us show camps closest to you
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

function CompleteStep({ children, preferences, tourChoice, setTourChoice }) {
  return (
    <div className="text-center">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center text-5xl" style={{ background: 'var(--sage-100)' }}>
        🎉
      </div>
      <h2 className="font-serif text-3xl font-semibold mb-4" style={{ color: 'var(--earth-800)' }}>
        You're all set!
      </h2>

      {tourChoice === null ? (
        <>
          <p className="text-lg mb-8" style={{ color: 'var(--earth-700)' }}>
            Want a quick tour to see how planning works?
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
                <span className="text-3xl">🗺️</span>
                <div>
                  <p className="font-semibold text-lg mb-1" style={{ color: 'var(--earth-800)' }}>
                    Quick Tour with Sample Data <span style={{ color: 'var(--ocean-500)' }}>(Recommended)</span>
                  </p>
                  <p className="text-sm" style={{ color: 'var(--earth-700)' }}>
                    See how the planner works with example kids and camps. Clear it when ready.
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
                <span className="text-3xl">🚀</span>
                <div>
                  <p className="font-semibold text-lg mb-1" style={{ color: 'var(--earth-800)' }}>
                    Skip Tour, Start Planning
                  </p>
                  <p className="text-sm" style={{ color: 'var(--earth-700)' }}>
                    Jump straight to your empty planner. Explore on your own.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-lg mb-8" style={{ color: 'var(--earth-700)' }}>
            Here's what we learned about your family:
          </p>

      <div className="max-w-md mx-auto space-y-4 text-left">
        {/* Children summary */}
        <div className="p-4 rounded-xl" style={{ background: 'var(--ocean-50)', border: '1px solid var(--ocean-200)' }}>
          <p className="font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--ocean-600)' }}>
            <span>👨‍👩‍👧‍👦</span> Your Children
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
              <span>🎯</span> Interested In
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
                    {category?.icon} {category?.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

          <p className="text-sm mt-8" style={{ color: 'var(--sand-400)' }}>
            Click "Start Exploring!" to {tourChoice === 'tour' ? 'begin your guided tour' : 'see personalized camp recommendations'}
          </p>
        </>
      )}
    </div>
  );
}

export default OnboardingWizard;

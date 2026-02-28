import React, { useState, useEffect } from 'react';
import { updateProfile } from '../lib/supabase';

/**
 * GuidedTour Component
 * Interactive tour that explains planner features with spotlight overlay
 * Designed for busy moms who need to learn quickly
 */

const TOUR_STEPS = [
  {
    id: 'calendar',
    title: 'Your summer calendar',
    description: 'Each column is a week from June to August. 11 weeks total.',
    position: 'center',
    highlightSelector: '.calendar-grid'
  },
  {
    id: 'add-camp',
    title: 'Add camps',
    description: 'Click empty cells to add camps to that week.',
    position: 'center',
    highlightSelector: '.week-cell'
  },
  {
    id: 'cost',
    title: 'Track your budget',
    description: 'Total summer cost updates in real-time.',
    position: 'top-right',
    highlightSelector: '.cost-tracker'
  },
  {
    id: 'gaps',
    title: 'Coverage gaps',
    description: 'Dashed borders show weeks with no camps scheduled.',
    position: 'center',
    highlightSelector: '.week-card.is-gap'
  },
  {
    id: 'children',
    title: 'Switch between kids',
    description: 'View each child schedule or see everyone at once.',
    position: 'top',
    highlightSelector: '.child-selector'
  },
  {
    id: 'export',
    title: 'Export when ready',
    description: 'Add to Google Calendar or download .ics file. This is sample data—clear it to plan for real.',
    position: 'top-right',
    highlightSelector: '.export-buttons'
  }
];

export function GuidedTour({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const [elementMissing, setElementMissing] = useState(false);

  const currentTourStep = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  useEffect(() => {
    // Find and highlight the current element
    const selector = currentTourStep?.highlightSelector;

    // Skip if no selector defined for this step
    if (!selector) {
      // Try to find next step with a valid element
      const nextValidStep = findNextValidStep(currentStep);
      if (nextValidStep !== null && nextValidStep !== currentStep) {
        setTimeout(() => setCurrentStep(nextValidStep), 100);
        return;
      }
      setHighlightedElement(null);
      setElementMissing(true);
      return;
    }

    const element = document.querySelector(selector);

    if (element) {
      setHighlightedElement(element);
      setElementMissing(false);
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Element not found - try to skip to next step with a valid element
      const nextValidStep = findNextValidStep(currentStep);
      if (nextValidStep !== null && nextValidStep !== currentStep) {
        // Auto-skip to next valid step
        setTimeout(() => setCurrentStep(nextValidStep), 100);
      } else {
        // No more valid steps - show centered tooltip with helpful message
        setHighlightedElement(null);
        setElementMissing(true);
      }
    }
  }, [currentStep, currentTourStep?.highlightSelector]);

  // Helper function to find the next step with a valid DOM element
  function findNextValidStep(fromStep) {
    for (let i = fromStep + 1; i < TOUR_STEPS.length; i++) {
      const selector = TOUR_STEPS[i].highlightSelector;
      if (selector && document.querySelector(selector)) {
        return i;
      }
    }
    // If no forward steps are valid, check if any steps are valid (for fallback)
    for (let i = 0; i < TOUR_STEPS.length; i++) {
      const selector = TOUR_STEPS[i].highlightSelector;
      if (selector && document.querySelector(selector)) {
        return i;
      }
    }
    return null;
  }

  async function handleNext() {
    if (isLastStep) {
      await handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function handleComplete() {
    // Mark tour as completed in profile
    try {
      await updateProfile({ tour_completed: true });
    } catch (error) {
      console.error('Error marking tour complete:', error);
    }
    onComplete?.();
  }

  async function handleSkip() {
    // Mark tour as skipped
    try {
      await updateProfile({ tour_completed: true });
    } catch (error) {
      console.error('Error marking tour skipped:', error);
    }
    onSkip?.();
  }

  // Get highlighted element's bounding box
  const getHighlightStyle = () => {
    if (!highlightedElement) return {};

    const rect = highlightedElement.getBoundingClientRect();
    return {
      top: `${rect.top - 8}px`,
      left: `${rect.left - 8}px`,
      width: `${rect.width + 16}px`,
      height: `${rect.height + 16}px`
    };
  };

  // Get tooltip position based on step position preference
  const getTooltipStyle = () => {
    if (!highlightedElement) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const rect = highlightedElement.getBoundingClientRect();
    const tooltipWidth = 400;
    const tooltipHeight = 200;

    switch (currentTourStep.position) {
      case 'top':
        return {
          top: `${rect.top - tooltipHeight - 20}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'top-right':
        return {
          top: `${rect.bottom + 20}px`,
          left: `${rect.right - tooltipWidth}px`
        };
      case 'center':
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dark overlay with cutout for highlighted element */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          pointerEvents: 'none'
        }}
      />

      {/* Highlight box around element */}
      {highlightedElement && (
        <div
          className="absolute rounded-xl pointer-events-none transition-all duration-300"
          style={{
            ...getHighlightStyle(),
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 20px rgba(255, 255, 255, 0.3)',
            border: '3px solid var(--ocean-400)',
            zIndex: 101
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute bg-white rounded-2xl p-6 shadow-2xl max-w-md transition-all duration-300"
        style={{
          ...getTooltipStyle(),
          zIndex: 102
        }}
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-1 mb-4">
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              className="h-1 flex-1 rounded-full transition-all"
              style={{
                background: index <= currentStep ? 'var(--ocean-500)' : 'var(--sand-200)'
              }}
            />
          ))}
        </div>

        {/* Step indicator */}
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--sand-400)' }}>
          Step {currentStep + 1} of {TOUR_STEPS.length}
        </p>

        {/* Title */}
        <h3 className="font-serif text-xl font-semibold mb-2" style={{ color: 'var(--earth-800)' }}>
          {currentTourStep.title}
        </h3>

        {/* Description */}
        <p className="mb-2" style={{ color: 'var(--earth-700)' }}>
          {currentTourStep.description}
        </p>

        {/* Element missing notice */}
        {elementMissing && (
          <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--sand-100)', color: 'var(--sand-600)' }}>
            Navigate to the Schedule Planner to see this feature highlighted.
          </p>
        )}

        {!elementMissing && <div className="mb-4" />}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm"
            style={{ color: 'var(--sand-400)' }}
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="btn-secondary"
              >
                <BackIcon className="w-4 h-4" />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="btn-primary"
            >
              {isLastStep ? 'Got it' : 'Next'}
              {!isLastStep && <NextIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function NextIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function BackIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

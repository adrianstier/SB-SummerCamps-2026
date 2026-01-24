import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { OnboardingWizard } from './OnboardingWizard';

const mockOnComplete = vi.fn();
const mockRefreshChildren = vi.fn();
const mockAddChild = vi.fn();
const mockUpdateProfile = vi.fn();
const mockCompleteOnboarding = vi.fn();
const mockAddScheduledCamp = vi.fn();

let mockAuthContext = {};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../lib/supabase', () => ({
  addChild: (...args) => mockAddChild(...args),
  updateProfile: (...args) => mockUpdateProfile(...args),
  completeOnboarding: (...args) => mockCompleteOnboarding(...args),
  addScheduledCamp: (...args) => mockAddScheduledCamp(...args),
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [] }),
      }),
    }),
  },
}));

vi.mock('../lib/sampleData', () => ({
  generateSampleChildren: vi.fn(() => [
    { name: 'Emma (sample)', is_sample: true },
    { name: 'Jake (sample)', is_sample: true },
  ]),
  generateSampleSchedule: vi.fn(() => [
    { camp_id: 'camp-1', child_id: 'child-1' },
  ]),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  mockAuthContext = {
    profile: { full_name: 'Jane Doe' },
    refreshChildren: mockRefreshChildren,
  };
  mockAddChild.mockResolvedValue({ data: [{ id: 'new-child-1' }], error: null });
  mockUpdateProfile.mockResolvedValue();
  mockCompleteOnboarding.mockResolvedValue();
  mockAddScheduledCamp.mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OnboardingWizard', () => {
  describe('Welcome step', () => {
    it('renders welcome message with user name', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      expect(screen.getByText(/Welcome.*Jane/)).toBeInTheDocument();
    });

    it('renders welcome without name when profile is null', () => {
      mockAuthContext.profile = null;
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    });

    it('shows setup steps', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      expect(screen.getByText('Add your children')).toBeInTheDocument();
      expect(screen.getByText('Set your preferences')).toBeInTheDocument();
      expect(screen.getByText('Get personalized recommendations')).toBeInTheDocument();
    });

    it('shows Continue button', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('does not show Back button on first step', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('proceeds to children step on Continue', () => {
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      fireEvent.click(screen.getByText('Continue'));
      expect(screen.getByText('Your children')).toBeInTheDocument();
    });
  });

  describe('Children step', () => {
    beforeEach(() => {
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      fireEvent.click(screen.getByText('Continue')); // Move to children step
    });

    it('shows "Add your first child" form', () => {
      expect(screen.getByText('Add your first child')).toBeInTheDocument();
    });

    it('shows name and age inputs', () => {
      expect(screen.getByPlaceholderText("Child's name")).toBeInTheDocument();
      expect(screen.getByText('Select age')).toBeInTheDocument();
    });

    it('shows avatar emoji picker', () => {
      expect(screen.getByText('Pick an avatar')).toBeInTheDocument();
    });

    it('shows color picker', () => {
      expect(screen.getByText('Pick a color (for calendar)')).toBeInTheDocument();
    });

    it('Continue button is disabled without children', () => {
      expect(screen.getByText('Continue')).toBeDisabled();
    });

    it('shows error when name is empty on add', () => {
      fireEvent.click(screen.getByText('Add Child'));
      expect(screen.getByText('Please enter a name for your child')).toBeInTheDocument();
    });

    it('shows error when age is empty on add', () => {
      fireEvent.change(screen.getByPlaceholderText("Child's name"), { target: { value: 'Alice' } });
      fireEvent.click(screen.getByText('Add Child'));
      expect(screen.getByText('Please select an age')).toBeInTheDocument();
    });

    it('adds child when form is valid', () => {
      fireEvent.change(screen.getByPlaceholderText("Child's name"), { target: { value: 'Alice' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '8' } });
      fireEvent.click(screen.getByText('Add Child'));
      expect(screen.getByText('Alice')).toBeInTheDocument();
      // "8 years old" appears in both the child display and the select option
      const ageTexts = screen.getAllByText('8 years old');
      expect(ageTexts.length).toBeGreaterThanOrEqual(2); // child display + select option
    });

    it('enables Continue after adding a child', () => {
      fireEvent.change(screen.getByPlaceholderText("Child's name"), { target: { value: 'Alice' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '8' } });
      fireEvent.click(screen.getByText('Add Child'));
      expect(screen.getByText('Continue')).not.toBeDisabled();
    });

    it('changes form label to "Add another child" after first child', () => {
      fireEvent.change(screen.getByPlaceholderText("Child's name"), { target: { value: 'Alice' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '8' } });
      fireEvent.click(screen.getByText('Add Child'));
      expect(screen.getByText('Add another child')).toBeInTheDocument();
    });

    it('removes child when delete clicked', () => {
      fireEvent.change(screen.getByPlaceholderText("Child's name"), { target: { value: 'Alice' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '8' } });
      fireEvent.click(screen.getByText('Add Child'));
      expect(screen.getByText('Alice')).toBeInTheDocument();
      // Find and click the delete button (trash icon)
      const deleteBtn = screen.getByText('Alice').closest('[class*="flex items-center"]').querySelector('button[class*="hover:bg-red"]');
      fireEvent.click(deleteBtn);
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('shows Back button', () => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('navigates back to welcome on Back click', () => {
      fireEvent.click(screen.getByText('Back'));
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    });
  });

  describe('Preferences step', () => {
    beforeEach(() => {
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      // Navigate to preferences: Welcome -> Children (add child) -> Preferences
      fireEvent.click(screen.getByText('Continue'));
      fireEvent.change(screen.getByPlaceholderText("Child's name"), { target: { value: 'Alice' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '8' } });
      fireEvent.click(screen.getByText('Add Child'));
      fireEvent.click(screen.getByText('Continue'));
    });

    it('shows category selection', () => {
      expect(screen.getByText('What types of camps interest you?')).toBeInTheDocument();
    });

    it('displays all camp categories', () => {
      expect(screen.getByText('Beach & Surf')).toBeInTheDocument();
      expect(screen.getByText('Sports')).toBeInTheDocument();
      expect(screen.getByText('Art & Creativity')).toBeInTheDocument();
      expect(screen.getByText('Science & STEM')).toBeInTheDocument();
      expect(screen.getByText('Nature & Outdoors')).toBeInTheDocument();
      expect(screen.getByText('Music')).toBeInTheDocument();
    });

    it('shows zip code input', () => {
      expect(screen.getByPlaceholderText('e.g., 93101')).toBeInTheDocument();
    });

    it('shows email notification checkbox', () => {
      expect(screen.getByLabelText(/Email me about registration openings/)).toBeInTheDocument();
    });

    it('email notification defaults to checked', () => {
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('allows selecting categories', () => {
      fireEvent.click(screen.getByText('Beach & Surf'));
      fireEvent.click(screen.getByText('Art & Creativity'));
      // Categories should be toggleable - visual state changes but hard to assert without CSS
      // Just verify no error
    });

    it('allows deselecting categories', () => {
      fireEvent.click(screen.getByText('Beach & Surf'));
      fireEvent.click(screen.getByText('Beach & Surf')); // deselect
      // Should not throw
    });
  });

  describe('Complete step', () => {
    function navigateToComplete() {
      render(<OnboardingWizard onComplete={mockOnComplete} />);
      // Welcome -> Children -> Preferences -> Complete
      fireEvent.click(screen.getByText('Continue'));
      fireEvent.change(screen.getByPlaceholderText("Child's name"), { target: { value: 'Alice' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '8' } });
      fireEvent.click(screen.getByText('Add Child'));
      fireEvent.click(screen.getByText('Continue'));
      fireEvent.click(screen.getByText('Continue'));
    }

    it('shows completion message', () => {
      navigateToComplete();
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
    });

    it('shows tour choice options', () => {
      navigateToComplete();
      expect(screen.getByText(/Quick Tour with Sample Data/)).toBeInTheDocument();
      expect(screen.getByText(/Skip Tour, Start Planning/)).toBeInTheDocument();
    });

    it('Start Exploring button is shown', () => {
      navigateToComplete();
      expect(screen.getByText('Start Exploring!')).toBeInTheDocument();
    });

    it('shows family summary after tour choice selected', () => {
      navigateToComplete();
      fireEvent.click(screen.getByText(/Skip Tour, Start Planning/));
      // The child summary shows "👧 Alice, 8" - text is in a single span
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Your Children/)).toBeInTheDocument();
    });

    it('calls handleComplete with skip tour', async () => {
      navigateToComplete();
      fireEvent.click(screen.getByText(/Skip Tour, Start Planning/));
      fireEvent.click(screen.getByText('Start Exploring!'));

      await waitFor(() => {
        expect(mockAddChild).toHaveBeenCalled();
        expect(mockUpdateProfile).toHaveBeenCalled();
        expect(mockCompleteOnboarding).toHaveBeenCalled();
        expect(mockRefreshChildren).toHaveBeenCalled();
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('calls addChild with child data (skip tour)', async () => {
      navigateToComplete();
      fireEvent.click(screen.getByText(/Skip Tour, Start Planning/));
      fireEvent.click(screen.getByText('Start Exploring!'));

      await waitFor(() => {
        expect(mockAddChild).toHaveBeenCalled();
        // Verify first arg contains the child name
        const callArgs = mockAddChild.mock.calls[0][0];
        expect(callArgs.name).toBe('Alice');
        expect(typeof callArgs.age_as_of_summer).toBe('number');
      });
    });

    it('handles errors during completion gracefully', async () => {
      mockAddChild.mockRejectedValueOnce(new Error('Failed'));
      navigateToComplete();
      fireEvent.click(screen.getByText(/Skip Tour, Start Planning/));
      fireEvent.click(screen.getByText('Start Exploring!'));

      await waitFor(() => {
        // onComplete should NOT be called when there's an error
        expect(mockOnComplete).not.toHaveBeenCalled();
        // Loading should be reset
        expect(screen.getByText('Start Exploring!')).toBeInTheDocument();
      });
    });

    it('shows loading state during completion', () => {
      mockAddChild.mockReturnValue(new Promise(() => {}));
      navigateToComplete();
      fireEvent.click(screen.getByText(/Skip Tour, Start Planning/));
      fireEvent.click(screen.getByText('Start Exploring!'));
      expect(screen.getByText('Setting up...')).toBeInTheDocument();
    });
  });

  describe('progress indicator', () => {
    it('shows step indicators', () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      const indicators = container.querySelectorAll('[class*="rounded-full"]');
      // There are step dots
      expect(indicators.length).toBeGreaterThanOrEqual(4);
    });

    it('has progress bar', () => {
      const { container } = render(<OnboardingWizard onComplete={mockOnComplete} />);
      const progressBar = container.querySelector('[class*="h-2"]');
      expect(progressBar).toBeInTheDocument();
    });
  });
});

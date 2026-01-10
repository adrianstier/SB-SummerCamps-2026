/**
 * Test Scenarios - All features each persona should test
 */

export const testScenarios = {
  // ============================================================================
  // AUTHENTICATION & PROFILE
  // ============================================================================
  auth: {
    id: 'auth',
    name: 'Authentication & Profile',
    tests: [
      {
        id: 'auth-01',
        action: 'Sign in with Google',
        steps: ['Click Sign In button', 'Complete Google OAuth flow', 'Verify redirect back'],
        expectedOutcome: 'User is signed in and sees personalized dashboard',
        issueIf: 'OAuth fails, redirects incorrectly, or session not persisted'
      },
      {
        id: 'auth-02',
        action: 'Complete onboarding',
        steps: ['Add children with ages', 'Set preferred categories', 'Skip or complete'],
        expectedOutcome: 'Children appear in sidebar, filters reflect preferences',
        issueIf: 'Onboarding reappears, data not saved, or crashes'
      },
      {
        id: 'auth-03',
        action: 'Edit profile',
        steps: ['Navigate to profile', 'Change name or preferences', 'Save'],
        expectedOutcome: 'Changes persist after refresh',
        issueIf: 'Save fails, changes lost, or forbidden field errors'
      },
      {
        id: 'auth-04',
        action: 'Sign out and back in',
        steps: ['Sign out', 'Verify public state', 'Sign back in'],
        expectedOutcome: 'All data restored correctly',
        issueIf: 'Data missing or corrupted after re-auth'
      }
    ]
  },

  // ============================================================================
  // CAMP DISCOVERY
  // ============================================================================
  discovery: {
    id: 'discovery',
    name: 'Camp Discovery',
    tests: [
      {
        id: 'disc-01',
        action: 'Browse all camps',
        steps: ['Load main page', 'Scroll through camps', 'Check card info displays'],
        expectedOutcome: 'All camps load with correct info (name, price, ages, features)',
        issueIf: 'Missing data, broken images, or load failures'
      },
      {
        id: 'disc-02',
        action: 'Search by keyword',
        steps: ['Type camp name in search', 'Type activity in search', 'Clear search'],
        expectedOutcome: 'Relevant results appear quickly, clear works',
        issueIf: 'Search too slow, wrong results, or doesnt clear'
      },
      {
        id: 'disc-03',
        action: 'Filter by age',
        steps: ['Set min age filter', 'Set max age filter', 'Check results match'],
        expectedOutcome: 'Only age-appropriate camps shown',
        issueIf: 'Wrong camps shown or filter not applied'
      },
      {
        id: 'disc-04',
        action: 'Filter by price',
        steps: ['Set max price filter', 'Verify results under budget'],
        expectedOutcome: 'Only affordable camps shown',
        issueIf: 'Expensive camps slip through or filter broken'
      },
      {
        id: 'disc-05',
        action: 'Filter by category',
        steps: ['Select category pill', 'Verify filtering', 'Select multiple categories'],
        expectedOutcome: 'Category filter works correctly',
        issueIf: 'Wrong categories or multi-select broken'
      },
      {
        id: 'disc-06',
        action: 'Filter by features',
        steps: ['Toggle extended care', 'Toggle meals included', 'Toggle transport'],
        expectedOutcome: 'Feature filters work independently',
        issueIf: 'Features not filtering correctly'
      },
      {
        id: 'disc-07',
        action: 'Combine multiple filters',
        steps: ['Set age + price + category + feature', 'Verify intersection'],
        expectedOutcome: 'All filters apply together (AND logic)',
        issueIf: 'Filters conflict or dont combine properly'
      },
      {
        id: 'disc-08',
        action: 'Clear all filters',
        steps: ['Apply multiple filters', 'Click clear all', 'Verify reset'],
        expectedOutcome: 'All filters cleared, all camps shown',
        issueIf: 'Some filters stick or clear doesnt work'
      },
      {
        id: 'disc-09',
        action: 'Sort camps',
        steps: ['Sort by name', 'Sort by price low-high', 'Sort by price high-low'],
        expectedOutcome: 'Sorting works correctly',
        issueIf: 'Sort order wrong or doesnt change'
      },
      {
        id: 'disc-10',
        action: 'View empty state',
        steps: ['Apply impossible filter combination'],
        expectedOutcome: 'Friendly empty state message shown',
        issueIf: 'Confusing error or blank screen'
      }
    ]
  },

  // ============================================================================
  // CAMP DETAILS
  // ============================================================================
  details: {
    id: 'details',
    name: 'Camp Detail View',
    tests: [
      {
        id: 'det-01',
        action: 'Open camp modal',
        steps: ['Click on camp card', 'View modal loads'],
        expectedOutcome: 'Modal shows full camp details',
        issueIf: 'Modal doesnt open, blank, or missing info'
      },
      {
        id: 'det-02',
        action: 'View all camp info',
        steps: ['Check description', 'Check ages', 'Check prices', 'Check features'],
        expectedOutcome: 'All information visible and accurate',
        issueIf: 'Missing fields or wrong data'
      },
      {
        id: 'det-03',
        action: 'View registration info',
        steps: ['Check reg date', 'Check reg status', 'Check reg link'],
        expectedOutcome: 'Registration info visible and link works',
        issueIf: 'Missing reg info or broken links'
      },
      {
        id: 'det-04',
        action: 'Visit camp website',
        steps: ['Click website link', 'Verify opens in new tab'],
        expectedOutcome: 'External link works correctly',
        issueIf: 'Broken link or no website shown'
      },
      {
        id: 'det-05',
        action: 'Close modal',
        steps: ['Click X button', 'Click outside modal', 'Press Escape key'],
        expectedOutcome: 'All close methods work',
        issueIf: 'Modal stuck open or close broken'
      }
    ]
  },

  // ============================================================================
  // FAVORITES
  // ============================================================================
  favorites: {
    id: 'favorites',
    name: 'Favorites Management',
    tests: [
      {
        id: 'fav-01',
        action: 'Add camp to favorites',
        steps: ['Click heart icon on camp card', 'Verify visual feedback'],
        expectedOutcome: 'Heart fills, camp added to favorites',
        issueIf: 'No feedback or save fails'
      },
      {
        id: 'fav-02',
        action: 'View favorites list',
        steps: ['Open favorites panel/modal', 'Verify saved camps appear'],
        expectedOutcome: 'All favorited camps shown',
        issueIf: 'Favorites missing or duplicated'
      },
      {
        id: 'fav-03',
        action: 'Remove from favorites',
        steps: ['Click filled heart', 'Verify removed from list'],
        expectedOutcome: 'Camp removed from favorites',
        issueIf: 'Toggle not working or still shows'
      },
      {
        id: 'fav-04',
        action: 'Favorites persist',
        steps: ['Add favorites', 'Refresh page', 'Check favorites'],
        expectedOutcome: 'Favorites retained after refresh',
        issueIf: 'Favorites lost on refresh'
      }
    ]
  },

  // ============================================================================
  // SCHEDULE PLANNER
  // ============================================================================
  scheduler: {
    id: 'scheduler',
    name: 'Schedule Planner',
    tests: [
      {
        id: 'sch-01',
        action: 'Open schedule planner',
        steps: ['Navigate to planner', 'View calendar loads'],
        expectedOutcome: 'Summer calendar visible with all weeks',
        issueIf: 'Planner doesnt load or weeks missing'
      },
      {
        id: 'sch-02',
        action: 'View by child',
        steps: ['Select specific child', 'View their schedule', 'Switch children'],
        expectedOutcome: 'Per-child view works correctly',
        issueIf: 'Wrong childs schedule or switching broken'
      },
      {
        id: 'sch-03',
        action: 'Add camp to week',
        steps: ['Click + on empty week', 'Select camp', 'Assign to child'],
        expectedOutcome: 'Camp appears in calendar week',
        issueIf: 'Add fails or wrong week'
      },
      {
        id: 'sch-04',
        action: 'Drag camp from sidebar',
        steps: ['Find camp in sidebar', 'Drag to week', 'Drop on calendar'],
        expectedOutcome: 'Camp scheduled via drag-drop',
        issueIf: 'Drag doesnt work or drops in wrong place'
      },
      {
        id: 'sch-05',
        action: 'Move scheduled camp',
        steps: ['Drag existing camp to different week'],
        expectedOutcome: 'Camp moves to new week',
        issueIf: 'Move fails or duplicates camp'
      },
      {
        id: 'sch-06',
        action: 'Remove scheduled camp',
        steps: ['Click remove on scheduled camp', 'Confirm removal'],
        expectedOutcome: 'Camp removed from schedule',
        issueIf: 'Removal fails or no confirmation'
      },
      {
        id: 'sch-07',
        action: 'View coverage gaps',
        steps: ['Leave some weeks empty', 'Check gap indicators'],
        expectedOutcome: 'Gaps clearly highlighted',
        issueIf: 'Gaps not shown or wrong weeks flagged'
      },
      {
        id: 'sch-08',
        action: 'Block vacation weeks',
        steps: ['Mark weeks as vacation', 'Verify they show blocked'],
        expectedOutcome: 'Vacation weeks clearly marked',
        issueIf: 'Blocking not working'
      },
      {
        id: 'sch-09',
        action: 'View total cost',
        steps: ['Add multiple camps', 'Check cost summary'],
        expectedOutcome: 'Accurate running total shown',
        issueIf: 'Cost wrong or missing'
      },
      {
        id: 'sch-10',
        action: 'Schedule persists',
        steps: ['Create schedule', 'Refresh page', 'Verify schedule intact'],
        expectedOutcome: 'Schedule saved and restored',
        issueIf: 'Schedule lost on refresh'
      }
    ]
  },

  // ============================================================================
  // CHILDREN MANAGEMENT
  // ============================================================================
  children: {
    id: 'children',
    name: 'Children Management',
    tests: [
      {
        id: 'kid-01',
        action: 'Add a child',
        steps: ['Open add child form', 'Enter name and age', 'Select interests', 'Save'],
        expectedOutcome: 'Child appears in list with correct info',
        issueIf: 'Save fails or data wrong'
      },
      {
        id: 'kid-02',
        action: 'Edit child info',
        steps: ['Select child', 'Update age or interests', 'Save changes'],
        expectedOutcome: 'Changes saved and reflected',
        issueIf: 'Edit fails or doesnt persist'
      },
      {
        id: 'kid-03',
        action: 'Delete a child',
        steps: ['Select child', 'Click delete', 'Confirm deletion'],
        expectedOutcome: 'Child removed along with their schedules/favorites',
        issueIf: 'Deletion fails or orphaned data remains'
      },
      {
        id: 'kid-04',
        action: 'Child color coding',
        steps: ['Check child has color', 'Verify color used in calendar'],
        expectedOutcome: 'Child consistently color-coded throughout',
        issueIf: 'Colors missing or inconsistent'
      },
      {
        id: 'kid-05',
        action: 'Age-based filtering',
        steps: ['Add child age', 'Check if camps filter based on child'],
        expectedOutcome: 'Age-appropriate camps recommended',
        issueIf: 'Wrong age filtering or no personalization'
      }
    ]
  },

  // ============================================================================
  // REVIEWS
  // ============================================================================
  reviews: {
    id: 'reviews',
    name: 'Reviews & Ratings',
    tests: [
      {
        id: 'rev-01',
        action: 'View camp reviews',
        steps: ['Open camp detail', 'Find reviews section', 'Read existing reviews'],
        expectedOutcome: 'Reviews visible with ratings and text',
        issueIf: 'Reviews missing or not loading'
      },
      {
        id: 'rev-02',
        action: 'Write a review',
        steps: ['Click write review', 'Select rating', 'Add text', 'Submit'],
        expectedOutcome: 'Review submitted (may be pending moderation)',
        issueIf: 'Submit fails or no confirmation'
      },
      {
        id: 'rev-03',
        action: 'Review validation',
        steps: ['Try submitting empty review', 'Try very short review'],
        expectedOutcome: 'Validation messages shown',
        issueIf: 'Invalid reviews accepted or poor error messages'
      },
      {
        id: 'rev-04',
        action: 'Mark review helpful',
        steps: ['Click helpful on a review', 'Verify count updates'],
        expectedOutcome: 'Helpful count increases',
        issueIf: 'Vote not registered'
      }
    ]
  },

  // ============================================================================
  // QUESTIONS
  // ============================================================================
  questions: {
    id: 'questions',
    name: 'Q&A',
    tests: [
      {
        id: 'qna-01',
        action: 'View camp questions',
        steps: ['Open camp detail', 'Find Q&A section', 'Read existing questions'],
        expectedOutcome: 'Questions and answers visible',
        issueIf: 'Q&A not loading'
      },
      {
        id: 'qna-02',
        action: 'Ask a question',
        steps: ['Click ask question', 'Type question', 'Submit'],
        expectedOutcome: 'Question appears in list',
        issueIf: 'Submit fails or question missing'
      },
      {
        id: 'qna-03',
        action: 'Question validation',
        steps: ['Try empty question', 'Try very short question'],
        expectedOutcome: 'Validation enforced',
        issueIf: 'Invalid questions accepted'
      }
    ]
  },

  // ============================================================================
  // COMPARISON
  // ============================================================================
  comparison: {
    id: 'comparison',
    name: 'Camp Comparison',
    tests: [
      {
        id: 'cmp-01',
        action: 'Add camps to compare',
        steps: ['Select multiple camps for comparison', 'View comparison list'],
        expectedOutcome: 'Selected camps ready for comparison',
        issueIf: 'Selection not working'
      },
      {
        id: 'cmp-02',
        action: 'View side-by-side comparison',
        steps: ['Open comparison view', 'See camps side by side'],
        expectedOutcome: 'Clear comparison of key attributes',
        issueIf: 'Comparison view broken or incomplete'
      },
      {
        id: 'cmp-03',
        action: 'Share comparison list',
        steps: ['Click share', 'Copy share link', 'Open in incognito'],
        expectedOutcome: 'Shared list viewable by others',
        issueIf: 'Share fails or link broken'
      }
    ]
  },

  // ============================================================================
  // SQUADS (Friend Coordination)
  // ============================================================================
  squads: {
    id: 'squads',
    name: 'Squads (Friend Coordination)',
    tests: [
      {
        id: 'sqd-01',
        action: 'Create a squad',
        steps: ['Click create squad', 'Name the squad', 'Get invite code'],
        expectedOutcome: 'Squad created with shareable invite code',
        issueIf: 'Creation fails or no code generated'
      },
      {
        id: 'sqd-02',
        action: 'Invite friends to squad',
        steps: ['Copy invite code', 'Share with friend'],
        expectedOutcome: 'Invite code is shareable',
        issueIf: 'Code not copyable or invalid'
      },
      {
        id: 'sqd-03',
        action: 'Join a squad',
        steps: ['Enter invite code', 'Join squad', 'See squad members'],
        expectedOutcome: 'Joined squad, can see other members',
        issueIf: 'Join fails or code invalid'
      },
      {
        id: 'sqd-04',
        action: 'Toggle identity reveal',
        steps: ['Change reveal_identity setting', 'Verify others see/dont see name'],
        expectedOutcome: 'Privacy setting respected',
        issueIf: 'Identity leaked when set to hidden'
      },
      {
        id: 'sqd-05',
        action: 'View friend camp interests',
        steps: ['See which camps friends are interested in', 'See friend counts on camps'],
        expectedOutcome: 'Friend interest visible on relevant camps',
        issueIf: 'Friend interests not showing'
      },
      {
        id: 'sqd-06',
        action: 'Leave squad',
        steps: ['Click leave squad', 'Confirm', 'Verify removed'],
        expectedOutcome: 'Successfully leave squad',
        issueIf: 'Leave fails or data remains'
      }
    ]
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  notifications: {
    id: 'notifications',
    name: 'Notifications',
    tests: [
      {
        id: 'not-01',
        action: 'View notifications',
        steps: ['Click notification icon', 'See notification list'],
        expectedOutcome: 'Notifications panel opens with items',
        issueIf: 'Panel doesnt open or empty when shouldnt be'
      },
      {
        id: 'not-02',
        action: 'Mark notification read',
        steps: ['Click on notification', 'Verify marked as read'],
        expectedOutcome: 'Notification marked read, count updates',
        issueIf: 'Still shows as unread'
      },
      {
        id: 'not-03',
        action: 'Mark all read',
        steps: ['Click mark all read', 'Verify all cleared'],
        expectedOutcome: 'All notifications marked read',
        issueIf: 'Some remain unread'
      },
      {
        id: 'not-04',
        action: 'Unread count badge',
        steps: ['Create unread notifications', 'Check badge shows count'],
        expectedOutcome: 'Accurate unread count displayed',
        issueIf: 'Count wrong or missing'
      }
    ]
  },

  // ============================================================================
  // DASHBOARD
  // ============================================================================
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    tests: [
      {
        id: 'dash-01',
        action: 'View dashboard',
        steps: ['Open dashboard', 'See personalized content'],
        expectedOutcome: 'Dashboard shows user-specific info',
        issueIf: 'Dashboard empty or generic'
      },
      {
        id: 'dash-02',
        action: 'See schedule summary',
        steps: ['Check upcoming scheduled camps', 'Verify accuracy'],
        expectedOutcome: 'Correct scheduled camps shown',
        issueIf: 'Wrong or missing scheduled camps'
      },
      {
        id: 'dash-03',
        action: 'See recommendations',
        steps: ['Check recommended camps', 'Verify relevance to children/preferences'],
        expectedOutcome: 'Relevant recommendations based on profile',
        issueIf: 'Irrelevant recommendations or none shown'
      },
      {
        id: 'dash-04',
        action: 'See cost summary',
        steps: ['Check total cost display', 'Verify calculation'],
        expectedOutcome: 'Accurate total cost shown',
        issueIf: 'Cost wrong or missing'
      }
    ]
  },

  // ============================================================================
  // RESPONSIVE DESIGN
  // ============================================================================
  responsive: {
    id: 'responsive',
    name: 'Responsive Design',
    tests: [
      {
        id: 'rsp-01',
        action: 'Mobile view',
        steps: ['Resize to mobile width', 'Navigate site', 'Use key features'],
        expectedOutcome: 'All features accessible on mobile',
        issueIf: 'Broken layout or unusable features'
      },
      {
        id: 'rsp-02',
        action: 'Tablet view',
        steps: ['Resize to tablet width', 'Navigate site'],
        expectedOutcome: 'Tablet layout works correctly',
        issueIf: 'Layout issues at tablet size'
      },
      {
        id: 'rsp-03',
        action: 'Mobile modal',
        steps: ['Open camp modal on mobile', 'Scroll through', 'Close'],
        expectedOutcome: 'Modal usable on mobile',
        issueIf: 'Modal too big or cant close'
      }
    ]
  },

  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================
  accessibility: {
    id: 'accessibility',
    name: 'Accessibility',
    tests: [
      {
        id: 'a11y-01',
        action: 'Keyboard navigation',
        steps: ['Navigate using only Tab key', 'Activate buttons with Enter'],
        expectedOutcome: 'Full keyboard accessibility',
        issueIf: 'Focus traps or unreachable elements'
      },
      {
        id: 'a11y-02',
        action: 'Screen reader basics',
        steps: ['Check for alt text on images', 'Check ARIA labels on buttons'],
        expectedOutcome: 'Key elements have accessible names',
        issueIf: 'Missing labels or confusing structure'
      },
      {
        id: 'a11y-03',
        action: 'Color contrast',
        steps: ['Check text readability', 'Verify status colors distinguishable'],
        expectedOutcome: 'Sufficient color contrast',
        issueIf: 'Hard to read text or indistinguishable colors'
      }
    ]
  },

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  errors: {
    id: 'errors',
    name: 'Error Handling',
    tests: [
      {
        id: 'err-01',
        action: 'Handle network error',
        steps: ['Simulate offline', 'Try to load data'],
        expectedOutcome: 'Clear error message shown',
        issueIf: 'Blank screen or cryptic error'
      },
      {
        id: 'err-02',
        action: 'Handle invalid input',
        steps: ['Enter invalid data in forms', 'Try to submit'],
        expectedOutcome: 'Validation messages guide user',
        issueIf: 'Errors accepted or poor messages'
      },
      {
        id: 'err-03',
        action: 'Handle 404 camp',
        steps: ['Navigate to non-existent camp ID'],
        expectedOutcome: 'Friendly not found message',
        issueIf: 'Crash or confusing error'
      }
    ]
  }
};

export default testScenarios;

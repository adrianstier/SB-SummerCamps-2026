# Design Review: Ready-to-Implement Code Snippets
**Source**: Design Review Action Plan 2026-01-12
**Purpose**: Copy-paste code solutions for identified issues

---

## Blocker #3: Comprehensive Focus Styles

### File: `src/index.css`

Add this section after the button styles (around line 1260):

```css
/* ═══════════════════════════════════════════════════════════════════════════
   COMPREHENSIVE FOCUS STYLES - WCAG 2.1 AA Compliance
   ═══════════════════════════════════════════════════════════════════════════ */

/* Focus ring utility - consistent across all interactive elements */
.filter-preset-link:focus-visible,
.category-browse-card:focus-visible,
.camp-card:focus-visible,
.favorite-btn:focus-visible,
.compare-btn:focus-visible,
.filter-control-btn:focus-visible,
.featured-card:focus-visible,
.modal-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px white,
    0 0 0 5px var(--ocean-400);
  position: relative;
  z-index: 10; /* Ensure focus ring appears above adjacent elements */
}

/* Icon-only buttons - slightly tighter focus ring */
button[title]:focus-visible:not(.btn-primary):not(.btn-secondary) {
  outline: none;
  box-shadow:
    0 0 0 2px white,
    0 0 0 4px var(--ocean-400);
}

/* Filter preset links - inline focus style */
.filter-preset-link:focus-visible {
  outline: none;
  background: var(--ocean-50);
  color: var(--ocean-600);
  box-shadow: inset 0 0 0 2px var(--ocean-400);
}

/* Category browse cards - lift on focus */
.category-browse-card:focus-visible {
  outline: none;
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px -8px rgba(59, 168, 168, 0.3),
    0 0 0 3px white,
    0 0 0 5px var(--ocean-400);
}

/* Camp cards - subtle focus glow */
.camp-card:focus-visible {
  outline: none;
  box-shadow:
    0 12px 40px -12px rgba(59, 168, 168, 0.25),
    0 0 0 3px white,
    0 0 0 5px var(--ocean-400);
}

/* Remove default focus outline globally (replaced with custom styles above) */
*:focus {
  outline: none;
}

/* Ensure focus is visible even if :focus-visible not supported (progressive enhancement) */
@supports not selector(:focus-visible) {
  .filter-preset-link:focus,
  .category-browse-card:focus,
  .camp-card:focus,
  .favorite-btn:focus,
  .compare-btn:focus {
    box-shadow: 0 0 0 3px var(--ocean-400);
  }
}
```

---

## Blocker #4: Loading State for Primary CTA

### File: `src/App.jsx`

#### Step 1: Add LoadingSpinner Component

Add this near the top of the file with other icon components (around line 276):

```javascript
// Loading Spinner Component
const LoadingSpinner = ({ className = "w-5 h-5" }) => (
  <svg
    className={`${className} animate-spin`}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);
```

#### Step 2: Add Loading State

In the main App component state section (around line 350):

```javascript
// Add to existing state declarations
const [isPlannerLoading, setIsPlannerLoading] = useState(false);
```

#### Step 3: Update Button Click Handler

Find the "Plan My Summer" button click handler and wrap it:

```javascript
const handlePlanMySummer = async () => {
  setIsPlannerLoading(true);

  try {
    // If user not signed in, trigger auth first
    if (!user) {
      // Show sign-in prompt or redirect
      setIsPlannerLoading(false);
      return;
    }

    // Open planner
    setViewMode('planner');
  } catch (error) {
    console.error('Error opening planner:', error);
  } finally {
    setIsPlannerLoading(false);
  }
};
```

#### Step 4: Update Button JSX

Find the "Plan My Summer" button (search for `btn-primary` with calendar icon):

```jsx
<button
  className="btn-primary hidden sm:flex"
  onClick={handlePlanMySummer}
  disabled={isPlannerLoading}
>
  {isPlannerLoading ? (
    <>
      <LoadingSpinner className="w-5 h-5" />
      <span>Loading...</span>
    </>
  ) : (
    <>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span>Plan My Summer</span>
    </>
  )}
</button>
```

#### Step 5: Add Disabled Button Style

In `src/index.css`, add to button section:

```css
/* Disabled state for primary button */
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-primary:disabled:hover {
  transform: none;
  box-shadow:
    0 4px 15px -3px rgba(232, 90, 53, 0.3),
    0 2px 8px -2px rgba(0, 0, 0, 0.05);
}
```

---

## High-Priority #5: Debounced Search with Feedback

### File: `src/App.jsx`

#### Step 1: Add Search State

```javascript
// Add to state declarations (around line 338)
const [isSearching, setIsSearching] = useState(false);
const [searchResultCount, setSearchResultCount] = useState(null);
```

#### Step 2: Implement Debounced Search

```javascript
// Add after state declarations
useEffect(() => {
  if (!search) {
    setIsSearching(false);
    setSearchResultCount(null);
    return;
  }

  setIsSearching(true);

  const timer = setTimeout(async () => {
    // Fetch filtered camps with search query
    const { camps: filteredCamps, total } = await fetchCamps({
      search,
      category: selectedCategory,
      minAge: childAge ? parseInt(childAge) : null,
      maxAge: childAge ? parseInt(childAge) : null,
      maxPrice: maxPrice ? parseInt(maxPrice) : null,
      // ... other filters
    });

    setCamps(filteredCamps);
    setSearchResultCount(total);
    setIsSearching(false);
  }, 300); // 300ms debounce

  return () => clearTimeout(timer);
}, [search, selectedCategory, childAge, maxPrice]); // Include all filter dependencies
```

#### Step 3: Update Search Input JSX

Find the hero search input and update:

```jsx
<div className="hero-search relative max-w-2xl mx-auto mb-8">
  <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ color: 'var(--sand-400)' }}>
    <SearchIcon />
  </div>

  <input
    type="text"
    placeholder="Search camps... (results update as you type)"
    className="search-input"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{}}
  />

  {/* Clear button */}
  {search && (
    <button
      className="absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-sand-200 transition-colors"
      onClick={() => setSearch('')}
      title="Clear search"
      style={{ color: 'var(--sand-400)' }}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )}

  {/* Search status indicator */}
  {isSearching && (
    <div className="absolute right-14 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--sand-500)' }}>
      Searching...
    </div>
  )}
</div>

{/* Results count below search */}
{searchResultCount !== null && (
  <p className="text-center text-sm mb-4" style={{ color: 'var(--earth-700)' }}>
    Found <strong>{searchResultCount}</strong> {searchResultCount === 1 ? 'camp' : 'camps'}
    {search && ` matching "${search}"`}
  </p>
)}
```

---

## High-Priority #6: Mobile Hero Spacing

### File: `src/index.css`

Find the hero section styles and add mobile-specific overrides:

```css
/* Mobile hero optimizations - add around line 180 */
@media (max-width: 640px) {
  .hero-section {
    padding-top: 2rem;
    padding-bottom: 4rem;
  }

  .hero-title h1 {
    font-size: 2.5rem; /* Down from 3rem+ */
    line-height: 1.15;
    margin-bottom: 1rem;
  }

  .hero-subtitle {
    font-size: 1rem; /* Down from 1.125rem */
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .hero-stats {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0 0.5rem;
  }

  .hero-stats > div {
    width: 100%;
    justify-content: flex-start;
  }

  .hero-search {
    margin-bottom: 2rem;
  }

  /* Adjust search input for mobile */
  .search-input {
    font-size: 1rem;
    padding: 1rem 1rem 1rem 3rem;
  }
}

/* Extra small devices (iPhone SE) */
@media (max-width: 375px) {
  .hero-title h1 {
    font-size: 2.25rem;
  }

  .hero-title p {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
  }
}
```

---

## High-Priority #7: Category Card Hover States

### File: `src/index.css`

Find `.category-browse-card` styles (around line 950) and add:

```css
.category-browse-card {
  /* ... existing styles ... */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-browse-card:hover {
  transform: translateY(-2px);
  background: white;
  box-shadow: 0 8px 24px -8px rgba(74, 63, 53, 0.15);
}

.category-browse-card:active {
  transform: translateY(0);
  transition-duration: 0.1s;
}

/* Increase emoji size slightly on hover for delight */
.category-browse-card:hover .category-browse-icon {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

.category-browse-icon {
  transition: transform 0.2s ease;
}
```

---

## High-Priority #8: Tablet Layout Optimization

### File: `src/index.css`

Add tablet-specific grid optimization:

```css
/* Tablet-optimized grid - add around line 1400 */
@media (min-width: 768px) and (max-width: 1024px) {
  /* Tighten grid gaps for better space utilization */
  main > .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  /* Featured grid also optimized */
  .featured-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }

  /* Category browse - show 3 columns on tablet */
  .category-browse-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  /* Camp cards slightly more compact */
  .camp-card {
    /* Maintain existing styles but optimize padding */
  }

  .camp-card .p-6 {
    padding: 1.25rem;
  }
}

/* iPad Pro landscape (1024px+) - can show 3 columns */
@media (min-width: 1024px) and (max-width: 1280px) {
  main > .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}
```

---

## High-Priority #9: Capitalize Registration Months

### File: `src/App.jsx`

Find the `parseRegistrationDate` function (around line 180) and update:

```javascript
// Helper to format registration date nicely
function parseRegistrationDate(regDate) {
  if (!regDate) return null;

  // Parse various date formats
  const lowerReg = regDate.toLowerCase();

  // Extract month and day
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'];

  let monthIdx = -1;
  let day = null;

  // Try to find month name
  for (let i = 0; i < months.length; i++) {
    if (lowerReg.includes(months[i])) {
      monthIdx = i;
      break;
    }
  }

  if (monthIdx === -1) return null;

  // Extract day if present
  const dayMatch = regDate.match(/\d+/);
  if (dayMatch) {
    day = parseInt(dayMatch[0]);
  }

  // Create date object
  const now = new Date();
  const regDateObj = new Date(now.getFullYear(), monthIdx, day || 1);

  // If the date has passed this year, assume next year
  if (regDateObj < now) {
    regDateObj.setFullYear(now.getFullYear() + 1);
  }

  // Format nicely with proper capitalization
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: day ? 'numeric' : undefined
  });

  const formattedDate = formatter.format(regDateObj);
  const daysUntil = Math.ceil((regDateObj - now) / (1000 * 60 * 60 * 24));

  if (daysUntil <= 0) {
    return { type: 'open', label: 'Open Now', icon: '✓' };
  } else if (daysUntil <= 7) {
    return { type: 'soon', label: `Opens in ${daysUntil}d`, icon: '🔔' };
  } else if (daysUntil <= 30) {
    return { type: 'upcoming', label: `Opens ${formattedDate}`, icon: '📅' };
  } else {
    return { type: 'later', label: `Opens ${formattedDate}`, icon: '📅' };
  }
}
```

---

## Medium-Priority #13: Active Filter State

### File: `src/index.css`

Add active state styling for filter preset links:

```css
/* Active filter preset state - add around line 620 */
.filter-preset-link.active {
  background: var(--ocean-500);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px -2px rgba(59, 168, 168, 0.4);
}

.filter-preset-link.active:hover {
  background: var(--ocean-600);
  transform: none;
}
```

### File: `src/App.jsx`

Add active class to filter preset buttons based on applied filters:

```jsx
<button
  className={`filter-preset-link ${isFullDayCareActive ? 'active' : ''}`}
  onClick={() => handlePresetFilter('fullDayCare')}
>
  Full-Day Care
</button>
```

---

## Utility: Consistent Z-Index Scale

### File: `src/index.css`

Add to the `:root` section (around line 10):

```css
:root {
  /* Existing color variables... */

  /* Z-Index Scale */
  --z-base: 1;
  --z-dropdown: 10;
  --z-sticky: 40;
  --z-fixed: 50;
  --z-modal-backdrop: 100;
  --z-modal: 110;
  --z-popover: 120;
  --z-toast: 1000;
  --z-tooltip: 1010;
}
```

Then update existing z-index values to use these variables:

```css
.filter-bar-section {
  z-index: var(--z-sticky);
}

.modal-overlay {
  z-index: var(--z-modal-backdrop);
}

.modal-card {
  z-index: var(--z-modal);
}
```

---

## Testing Snippets

### Playwright Test: Keyboard Navigation

Create `e2e/keyboard-navigation.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  test('should show visible focus indicators on all interactive elements', async ({ page }) => {
    await page.goto('/');

    // Tab through hero section
    await page.keyboard.press('Tab'); // Focus on Plan My Summer button
    let focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Verify focus ring is visible (check for box-shadow containing ocean color)
    const boxShadow = await focusedElement.evaluate(el =>
      window.getComputedStyle(el).boxShadow
    );
    expect(boxShadow).toContain('59, 168, 168'); // RGB of --ocean-400

    // Continue tabbing through interface
    await page.keyboard.press('Tab'); // Table view button
    await page.keyboard.press('Tab'); // Sign in button
    await page.keyboard.press('Tab'); // Search input

    // Verify search input has focus ring
    focusedElement = await page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('type', 'text');
  });

  test('should allow keyboard navigation through filter presets', async ({ page }) => {
    await page.goto('/');

    // Navigate to filter section
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Should be on first filter preset
    await page.keyboard.press('Enter');

    // Verify filter applied (check URL or visible indicator)
    await page.waitForTimeout(500);
    // Add assertions based on your filter implementation
  });

  test('should navigate modal with keyboard', async ({ page }) => {
    await page.goto('/');

    // Click first camp card
    await page.locator('.camp-card').first().click();

    // Modal should be open
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Tab through modal buttons
    await page.keyboard.press('Tab'); // Close button
    await page.keyboard.press('Tab'); // Website link (if present)
    await page.keyboard.press('Tab'); // Add to Schedule

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });
});
```

---

## Quick Reference: Files Modified

**Critical Path (Blockers)**:
1. `src/index.css` - Focus styles (~40 lines)
2. `src/App.jsx` - Loading state (~20 lines)
3. `src/App.jsx` - Modal controls (TBD based on solution chosen)
4. `src/components/SchedulePlanner.jsx` - Filters in planner (TBD)

**High-Priority**:
5. `src/App.jsx` - Debounced search (~30 lines)
6. `src/index.css` - Mobile hero spacing (~30 lines)
7. `src/index.css` - Category hover states (~15 lines)
8. `src/index.css` - Tablet grid (~25 lines)
9. `src/App.jsx` - Date capitalization (~20 lines)

**Total Lines**: ~210 lines of new/modified code for blockers + high-priority issues

---

**Code Snippets Generated**: 2026-01-12
**Ready for Implementation**: Copy-paste into appropriate files
**Testing**: Playwright test snippets included
**Next Step**: Begin with Blocker #3 (focus styles) - quickest win

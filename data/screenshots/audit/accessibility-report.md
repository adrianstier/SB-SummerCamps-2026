# Accessibility Audit Report

**Date**: 2026-02-09
**URL**: http://localhost:5173
**Page**: Homepage (Browse Camps)
**Standard**: WCAG 2.1 Level AA
**Tool**: Playwright + axe-core + custom checks

---

## Executive Summary

| Category | Issues Found |
|----------|-------------|
| axe-core violations (critical) | 0 |
| axe-core violations (serious) | 1 (86 affected elements) |
| axe-core violations (moderate) | 2 (3 affected elements) |
| Keyboard navigation issues | 6 |
| Color contrast failures | 315 (6 unique patterns) |
| ARIA/semantics issues | 13 |
| Screen reader / live region issues | 1 |

**Overall Assessment**: The homepage has solid structural accessibility (landmarks, heading hierarchy, skip link, ARIA labels on most controls) but has significant issues in three areas: (1) nested interactive controls inside camp cards, (2) pervasive color contrast failures on informational labels, and (3) undersized touch targets on filter controls. These must be resolved to meet WCAG 2.1 AA compliance.

---

## A. axe-core Automated Violations

### Serious: nested-interactive (86 elements)

**Rule**: `nested-interactive` -- Interactive controls must not be nested
**WCAG**: 4.1.2 Name, Role, Value (Level A)
**Reference**: https://dequeuniversity.com/rules/axe/4.11/nested-interactive

**Problem**: Every camp card uses a `<div role="button" tabindex="0">` (the `.camp-card-button`) as the clickable wrapper, but inside it contains additional interactive elements:
- Compare button (`<button>` with `aria-label="Add to compare"`)
- Favorite button (`<FavoriteButton>`)
- Chevron icon

Screen readers may not correctly announce or allow navigation to the nested interactive elements. Keyboard users may experience confusing focus behavior.

**Affected selector**: `.camp-card-button[role="button"]` -- all 86 camp cards

**Fix**: Restructure the camp card so that:
1. The card wrapper is NOT `role="button"` -- instead, make it a plain `<article>`.
2. Use a primary `<a>` or `<button>` for the "View details" action (e.g., link on the camp name).
3. Keep Compare and Favorite as separate, non-nested buttons outside the click region, or use `event.stopPropagation()` with proper DOM structure (not nested inside a role="button").

**Example fix**:
```html
<article class="camp-card">
  <a href="/camp/camp-id" class="camp-card-link">
    <!-- Image, title, description (all non-interactive content) -->
  </a>
  <div class="camp-card-actions">
    <button aria-label="Add to compare">...</button>
    <button aria-label="Add to favorites">...</button>
  </div>
</article>
```

---

### Moderate: meta-viewport (1 element)

**Rule**: `meta-viewport` -- Zooming and scaling must not be disabled
**WCAG**: 1.4.4 Resize Text (Level AA)

**Problem**: The `<meta name="viewport">` tag includes `user-scalable=no`, which prevents users from zooming in on mobile devices. This is a barrier for low-vision users.

**Affected element**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
```

**Fix**: Remove `user-scalable=no` from the viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

**File**: `/Users/adrianstier/SB-SummerCamps-2026/index.html`

---

### Moderate: region (2 elements)

**Rule**: `region` -- All page content should be contained by landmarks
**WCAG**: Best practice (not a strict WCAG criterion)

**Problem**: Two sections of content are not inside any landmark region:

1. **"Browse by Interest" section** (`<section class="category-browse">`)
   - The `<h2>` and category grid sit between the filter bar (`role="search"`) and the `<main>` element.
   - Fix: Move this section inside `<main>`, or add `role="region"` with `aria-label="Browse by category"`.

2. **Testimonial banner** (`<section class="testimonial-banner">`)
   - Sits between the category grid and `<main>`.
   - Fix: Move inside `<main>`, or add `role="complementary"` with `aria-label="Testimonial"`.

---

## B. Keyboard Navigation Audit

### Tab Order Summary

The page has a skip-to-content link as the first focusable element (good). The general tab order is:

| # | Element | Text/Label | Focus Visible |
|---|---------|-----------|--------------|
| 1 | `a.skip-to-content` | Skip to content | Yes (box-shadow) |
| 2 | `button.btn-primary` | Plan My Summer | Yes (outline) |
| 3 | `button.btn-secondary` | Table | Yes (outline + ring) |
| 4 | `button` (AuthButton) | Sign In | Yes (outline) |
| 5 | `input.search-input` | Search camps... | Yes (box-shadow) |
| 6 | `button.filter-preset-link` | Extended Care | Yes (outline + shadow) |
| 7 | `button.filter-preset-link` | Under $300 | Yes |
| 8 | `button.filter-preset-link` | Sports | Yes |
| 9 | `button.filter-preset-link` | Art & Creative | Yes |
| 10 | `button.filter-preset-link` | STEM | Yes |
| 11 | `button.filter-preset-link` | Outdoors | Yes |
| 12 | `button.filter-control-btn` | Filters | Yes |
| 13 | `select.filter-sort-select` | Sort (A-Z) | Yes |
| 14+ | Category browse buttons, then camp cards | ... | Yes |

**All elements have visible focus indicators.** The focus ring styles use `outline: 3px solid rgb(45, 149, 153)` (ocean teal) with a white offset ring, which provides good visibility.

### Tab Order Issues (6 found)

All 6 issues are **tab-order-jump** type -- the focus moves upward visually when tabbing forward:

1. **Sort select -> Category browse grid**: After the sort dropdown (y: 750px), focus jumps upward to the "Browse by Interest" category buttons (y: 539px). This is because the category section is placed in the DOM between the filter bar and main content, but the filter bar is `sticky top-0`, making it visually lower than the category grid after scrolling.

2. **Camp card nested buttons -> next camp card**: Within each camp card, after tabbing through the Compare and Favorite buttons (which are at y: ~407px), focus jumps up to the next camp card's main button (y: ~180px). This is a consequence of the nested-interactive pattern -- the inner buttons are further down the card, but the next card's top starts higher.

**WCAG**: 2.4.3 Focus Order (Level A) -- These jumps are minor since the DOM order is logical; the visual discrepancy comes from sticky positioning and card layout. This is not a strict violation but may be disorienting.

**Recommendation**: Consider restructuring the DOM to match visual order more closely, particularly for the category grid vs. filter bar.

---

## C. Color Contrast Audit

WCAG 2.1 AA requires:
- Normal text (< 24px, or < 18.66px bold): **4.5:1** minimum contrast ratio
- Large text (>= 24px, or >= 18.66px bold): **3:1** minimum contrast ratio

### Summary of Unique Failures

| Pattern | Affected Elements | Contrast Ratio | Required | FG Color | BG Color |
|---------|------------------|----------------|----------|----------|----------|
| Camp card info labels ("Ages", "Price", "Hours") | 258 (86 cards x 3) | 2.75:1 | 4.5:1 | `rgb(167, 160, 151)` (--sand-400) | `rgb(255, 255, 255)` |
| Category badges (Sports, Beach, Art, etc.) | 35 | 2.98-4.41:1 | 4.5:1 | Category color | `rgb(255, 255, 255)` |
| Category browse counts ("7 camps", "8 camps") | 13 | 2.75:1 | 4.5:1 | `rgb(167, 160, 151)` (--sand-400) | `rgb(255, 255, 255)` |
| Hero stats text | 2 | 3.21-3.86:1 | 4.5:1 | `rgb(100, 93, 84)` (--earth-700) | gradient bg |
| Primary button text ("Plan My Summer") | 1 | 1.06:1 | 4.5:1 | white text | white bg (!) |
| Footer text | 3 | 1.07-3.67:1 | 4.5:1 | `rgb(238, 237, 236)` / `rgb(167, 160, 151)` | `rgb(45, 38, 30)` (--earth-800) |
| Testimonial text | 2 | 1.07-3.67:1 | 3:1 (large) | `rgb(238, 237, 236)` | `rgb(224, 219, 213)` |

### Detailed Analysis

#### 1. Camp Card Info Labels (Critical - 258 elements)

**Selector**: `.camp-quick-info-label`
**Current**: `color: var(--sand-400)` = `rgb(167, 160, 151)` on white background
**Ratio**: 2.75:1 (needs 4.5:1)
**Impact**: Affects every camp card on the page. The "Ages", "Price", and "Hours" labels are very hard to read for users with low vision.

**Fix**: Change `--sand-400` to `--sand-600` or darker. Minimum color needed: approximately `rgb(113, 106, 97)` for 4.5:1 on white.

**File**: `/Users/adrianstier/SB-SummerCamps-2026/src/App.jsx` line 663
```jsx
<p className="camp-quick-info-label">Ages</p>
```
Also check the CSS class `.camp-quick-info-label` in the stylesheet.

#### 2. Category Badges (Moderate - 35 elements)

**Selector**: `.category-badge`
**Current**: Various category colors on white backgrounds. Worst offenders:
- Animals/Zoo: 2.98:1 (green `#84cc16` tones)
- Art: 3.07:1 (amber `#f59e0b` tones)
- Nature/Outdoor: 3.15:1 (green `#22c55e` tones)
- Sports: 3.35:1 (orange `#f97316` tones)
- Beach/Surf: 3.54:1 (cyan `#06b6d4` tones)

**Fix**: Darken the badge text colors or use a darker background/pill behind them. Many of these are near-passing (3.0-3.5:1) and could pass with minor darkening.

#### 3. Primary Button "Plan My Summer" (Critical - 1 element)

**Selector**: `.btn-primary`
**Current**: Ratio of 1.06:1 -- this appears to be a measurement artifact where the computed foreground and background are both resolving to near-white.
**Note**: This is likely a CSS custom property issue where the contrast computation picked up the wrong inherited background. Visually the button uses `--terra-500` (orange-red) background with white text. Verify manually -- if the actual rendered contrast is acceptable (white on terra-500), this is a false positive from the background-walking algorithm.

**Action**: Manually verify this button's contrast. If the gradient/custom-property background is not being detected, the actual ratio is likely around 4.0-5.0:1. If below 4.5:1, darken the button background.

#### 4. Footer Text (Moderate - 3 elements)

**Selector**: `.site-footer span`, `.site-footer p`
- "Santa Barbara Summer Camps": 1.07:1 -- light sand text on dark earth background. The `--sand-100` color on `--earth-800` should actually provide good contrast; this may be a background detection issue.
- "Data from camp websites": 1.23:1 -- similar issue.
- "Verify prices": 3.67:1 -- `--sand-400` on `--earth-800`, genuine marginal failure.

**Action**: Manually verify. If the footer has a dark background (which it does from `site-footer` class), the algorithm may have walked up to a white ancestor. The actual contrast is likely fine for the first two, but check `--sand-400` on `--earth-800` (3.67:1 < 4.5:1).

#### 5. Testimonial Text (Moderate - 2 elements)

**Selector**: `.testimonial-quote`, `.testimonial-author`
- Quote text: 1.07:1 -- likely background detection issue (testimonial has a distinct background).
- Author text: 3.67:1 -- may be genuine.

**Action**: The testimonial banner uses `--sand-100` background with `--earth-700` text. Manually verify; if genuine, darken the text.

#### 6. Category Browse Counts (Moderate - 13 elements)

**Selector**: `.category-browse-count`
**Current**: `color: var(--sand-400)` on white = 2.75:1
**Fix**: Same fix as camp card info labels -- darken to `--sand-600` or darker.

---

## D. ARIA and Semantics Audit

### Landmark Regions -- PASS

| Landmark | Count | Status |
|----------|-------|--------|
| `<header>` | 1 | Present |
| `<nav>` | 1 | Present |
| `<main>` | 1 | Present (`id="main-content"`) |
| `<footer>` | 1 | Present |
| `[role="search"]` | 1 | Present (filter bar section) |

All five expected landmarks are present.

### Heading Hierarchy -- PASS

| Level | Text |
|-------|------|
| h1 | Your summer, sorted. |
| h2 | Browse by Interest |
| h3 | 805 Beach Volleyball Club |
| h3 | A-Frame Surf Camp |
| h3 | Adventure Lab @ Crane |
| ... | (86 camp name h3 headings) |

- Single h1: Yes
- No skipped levels: h1 -> h2 -> h3, correct hierarchy
- Each camp card uses h3, which is appropriate under the implicit h2 grouping

### SVG Accessibility (3 issues)

Three SVGs are missing `aria-hidden="true"`:

1. **AppLogo SVG** (header, 32x32px): Decorative logo icon inside a div with text label "Santa Barbara". Should have `aria-hidden="true"` since it's decorative.
   - Selector: `.hero-section svg[viewBox="0 0 32 32"]`

2. **Wave decoration SVG** (hero section bottom): Purely decorative wave shape. Should have `aria-hidden="true"`.
   - Selector: `.wave-decoration svg`

3. **Footer AppLogo SVG** (28x28px): Same logo repeated in footer. Should have `aria-hidden="true"`.
   - Selector: `.site-footer svg[viewBox="0 0 32 32"]`

**WCAG**: 1.1.1 Non-text Content (Level A)
**Fix**: Add `aria-hidden="true"` to all three SVGs, or add `role="img"` with `aria-label` if they convey meaning.

### Touch Target Size (10 elements)

WCAG 2.5.8 Target Size Minimum (Level AA) requires interactive targets be at least 24x24px. WCAG 2.5.5 (Level AAA) recommends 44x44px.

Undersized elements (below 44px height):

| Element | Text | Size | Issue |
|---------|------|------|-------|
| `a.skip-to-content` | Skip to content | 48x32px | Height 32px < 44px |
| `button` | Sign In | 104x40px | Height 40px < 44px |
| `button.filter-preset-link` | Extended Care | 133x37px | Height 37px < 44px |
| `button.filter-preset-link` | Under $300 | 118x37px | Height 37px < 44px |
| `button.filter-preset-link` | Sports | 86x37px | Height 37px < 44px |
| `button.filter-preset-link` | Art & Creative | 129x37px | Height 37px < 44px |
| `button.filter-preset-link` | STEM | 82x37px | Height 37px < 44px |
| `button.filter-preset-link` | Outdoors | 102x37px | Height 37px < 44px |
| `button.filter-control-btn` | Filters | 89x40px | Height 40px < 44px |
| `select.filter-sort-select` | Sort | 114x40px | Height 40px < 44px |

**Fix**: Set `min-height: 44px` on these elements. The filter preset buttons at 37px height are the most concerning for touch users. CSS changes needed in the filter bar styles:

```css
.filter-preset-link {
  min-height: 44px;
}
.filter-control-btn, .filter-sort-select {
  min-height: 44px;
}
```

---

## E. Screen Reader & Dynamic Content

### Live Regions

The page has **one** `aria-live` region:

```html
<div aria-live="polite" aria-atomic="true">
  <p class="results-count">Showing <strong>86</strong> camps</p>
</div>
```

This is correctly implemented to announce filter result changes. Located in `<main>` at `/Users/adrianstier/SB-SummerCamps-2026/src/App.jsx` line 498.

**Good**: Filter count changes and search result counts will be announced to screen readers.

**Gap**: The search bar in the hero section also shows a result count ("Found X camps matching...") at line 355, but this is NOT inside an `aria-live` region. If a user searches from the hero search bar, the count update won't be announced.

**Fix**: Wrap the hero search result count in `aria-live="polite"` or connect it to the existing live region.

### Loading State

The loading skeleton uses `aria-busy="true"` and `aria-label="Finding camps"` (line 511), which is correct.

### Skip Link

A "Skip to content" link is present and targets `#main-content`. It appears on focus and uses a visible box-shadow indicator. This is correctly implemented.

---

## WCAG 2.1 AA Criteria Summary

| Criterion | Status | Details |
|-----------|--------|---------|
| 1.1.1 Non-text Content (A) | **FAIL** | 3 decorative SVGs missing `aria-hidden="true"` |
| 1.3.1 Info and Relationships (A) | **PASS** | Proper landmarks, headings, form labels |
| 1.4.3 Contrast Minimum (AA) | **FAIL** | 315 elements fail contrast (6 unique patterns) |
| 1.4.4 Resize Text (AA) | **FAIL** | `user-scalable=no` in viewport meta |
| 1.4.11 Non-text Contrast (AA) | PASS (limited check) | Focus indicators meet contrast requirements |
| 2.1.1 Keyboard (A) | **PASS** | All interactive elements are keyboard accessible |
| 2.4.1 Bypass Blocks (A) | **PASS** | Skip-to-content link present |
| 2.4.3 Focus Order (A) | **MINOR** | 6 backward focus jumps (structural, not severe) |
| 2.4.7 Focus Visible (AA) | **PASS** | All focusable elements have visible focus indicators |
| 2.5.8 Target Size Minimum (AA) | **FAIL** | 10 elements below 44px minimum |
| 3.1.1 Language of Page (A) | PASS (limited check) | Requires manual verification of `lang` attribute |
| 4.1.2 Name, Role, Value (A) | **FAIL** | 86 nested-interactive violations in camp cards |
| 4.1.3 Status Messages (AA) | **PASS** | aria-live region for filter results |

---

## Prioritized Fix List

### P0 -- Critical (fix immediately)

| # | Issue | WCAG | Elements | Fix |
|---|-------|------|----------|-----|
| 1 | Nested interactive controls in camp cards | 4.1.2 (A) | 86 | Restructure camp cards: remove `role="button"` from wrapper, use `<a>` for camp detail link, place Compare/Favorite buttons outside the clickable region |
| 2 | `user-scalable=no` prevents mobile zoom | 1.4.4 (AA) | 1 | Remove `user-scalable=no` from `<meta name="viewport">` in `index.html` |

### P1 -- Serious (fix before launch)

| # | Issue | WCAG | Elements | Fix |
|---|-------|------|----------|-----|
| 3 | Camp card info labels fail contrast (2.75:1) | 1.4.3 (AA) | 258 | Change `.camp-quick-info-label` color from `--sand-400` to `--sand-600` or darker (`rgb(113, 106, 97)` minimum) |
| 4 | Category badges fail contrast (2.98-4.41:1) | 1.4.3 (AA) | 35 | Darken badge text colors for Art, Sports, Beach/Surf, Nature/Outdoor, Animals/Zoo, Education, Dance, Cooking categories |
| 5 | Category browse counts fail contrast (2.75:1) | 1.4.3 (AA) | 13 | Same fix as #3 -- darken `.category-browse-count` color |
| 6 | Decorative SVGs missing `aria-hidden` | 1.1.1 (A) | 3 | Add `aria-hidden="true"` to AppLogo SVGs (header + footer) and wave decoration SVG |

### P2 -- Moderate (fix in next sprint)

| # | Issue | WCAG | Elements | Fix |
|---|-------|------|----------|-----|
| 7 | Filter bar touch targets too small (37-40px) | 2.5.8 (AA) | 10 | Set `min-height: 44px` on `.filter-preset-link`, `.filter-control-btn`, `.filter-sort-select`, Sign In button |
| 8 | Content outside landmarks | Best practice | 2 | Move category browse grid and testimonial banner inside `<main>` |
| 9 | Hero search result count not in live region | 4.1.3 (AA) | 1 | Add `aria-live="polite"` to the hero search result count paragraph |
| 10 | Testimonial text contrast | 1.4.3 (AA) | 2 | Verify and fix contrast of `.testimonial-quote` and `.testimonial-author` text against their actual backgrounds |

### P3 -- Minor (fix when convenient)

| # | Issue | WCAG | Elements | Fix |
|---|-------|------|----------|-----|
| 11 | Tab order visual jumps | 2.4.3 (A) | 6 | Consider reordering DOM so category grid appears after filter bar in the visual flow, or move it inside `<main>` |
| 12 | Footer small text contrast | 1.4.3 (AA) | 1 | Verify `--sand-400` on `--earth-800` in footer; lighten if needed |
| 13 | Hero stats text contrast on gradient | 1.4.3 (AA) | 2 | Darken hero stats text or add a solid background behind stat items |

---

## Screenshots

All screenshots saved to: `/Users/adrianstier/SB-SummerCamps-2026/data/screenshots/audit/a11y/`

- `00-full-page.png` -- Full homepage screenshot
- `01-focus-stop-00-a.png` through `01-focus-stop-24-*.png` -- Focus state at each tab stop
- `accessible-tree.json` -- Full accessible tree snapshot (JSON)

---

## Files Requiring Changes

| File | Changes Needed |
|------|---------------|
| `index.html` | Remove `user-scalable=no` from viewport meta |
| `src/App.jsx` | Restructure `CampCard` component to eliminate nested interactive controls; add `aria-hidden="true"` to `AppLogo` SVG and wave SVG; move category browse and testimonial inside `<main>`; add `aria-live` to hero search results |
| CSS (stylesheet) | Darken `.camp-quick-info-label` color; darken `.category-browse-count` color; darken category badge colors; set `min-height: 44px` on filter buttons and controls |
| `src/components/FilterBar.jsx` | Increase touch target height on filter chips |

---

*Raw audit data saved to: `/Users/adrianstier/SB-SummerCamps-2026/data/screenshots/audit/accessibility-results.json`*

# Mobile UX/UI Audit Report

**Date**: 2026-02-09
**Auditor**: Automated Playwright + Visual Inspection
**Breakpoints Tested**: 375px (iPhone SE), 390px (iPhone 14), 768px (iPad)
**Page**: Homepage (`/`)

---

## Executive Summary

The homepage is generally well-designed for mobile with good visual hierarchy, clear branding, and functional navigation. The main areas of concern are **text readability** (497 elements below 14px on phones), **filter chip visibility on iPad** (37px height, below 44px touch target), and the **expanded card view overlapping the bottom nav**. No horizontal overflow was detected at any breakpoint, which is excellent.

**Total Issues Found**: 28
- Critical: 3
- Major: 10
- Minor: 15

---

## Critical Issues

### C1. Massive text readability problem -- 497 elements below 14px minimum (All Devices)

**Devices**: iPhone SE (375px), iPhone 14 (390px), iPad (768px)

Nearly half of all measured text elements fall below the recommended 14px minimum for mobile readability. Breakdown:

| Font Size | Count (Phone) | Count (iPad) | Elements Affected |
|-----------|--------------|--------------|-------------------|
| 10.9px | 36 | 36 | `.feature-badge` (Extended Care, Meals, Transport, Sibling $) |
| 11px | 11 | 0 | `.hero-year-badge`, `.mobile-nav-label` |
| 11.2px | 258 | 258 | `.camp-quick-info-label` (Ages, Price, Hours labels on every card) |
| 12px | 173 | 169 | `.category-badge` (Sports, Art, etc.), hero stats, Registration badges |
| 13px | 19 | 20 | `.filter-preset-link` text, `.category-browse-count` |

**Most impactful**: The `.camp-quick-info-label` at 11.2px appears on every single camp card (258 instances), making the "AGES", "PRICE", and "HOURS" labels hard to read. The `.feature-badge` elements at 10.9px are the smallest text on the page.

**CSS Root Cause**:
- `.camp-quick-info-label`: `font-size: 0.7rem` (= 11.2px)
- `.feature-badge`: `font-size: 0.68rem` (= 10.9px)
- `.mobile-nav-label`: `font-size: 0.6875rem` (= 11px, via `.mobile-nav-tab`)

**Recommendation**: Increase to at least `0.75rem` (12px) for labels, `0.8125rem` (13px) for badges, and `0.875rem` (14px) where possible. Use font-weight and letter-spacing to maintain visual distinction at larger sizes.

---

### C2. iPad filter bar chips are too small -- 37px height, below 44px touch target (iPad)

**Device**: iPad (768px)

All 6 filter preset chips and 2 controls fail the 44px minimum touch target on iPad:

| Element | Size | Shortfall |
|---------|------|-----------|
| "Extended Care" chip | 133x37px | 7px short |
| "Under $300" chip | 118x37px | 7px short |
| "Sports" chip | 86x37px | 7px short |
| "Art & Creative" chip | 129x37px | 7px short |
| "STEM" chip | 82x37px | 7px short |
| "Outdoors" chip | 102x37px | 7px short |
| "Filters" button | 42x34px | 10px short (height) + 2px short (width) |
| Sort select | 114x40px | 4px short |
| "Sign In" button | 104x40px | 4px short |

**CSS Root Cause**: The mobile `@media (max-width: 767px)` rule sets `min-height: 44px` on `.filter-preset-link`, but this does not apply at 768px (the iPad breakpoint is `>=768px`), so iPad uses the default padding of `7px 14px` which produces only 37px height.

**Recommendation**: Change the media query to `@media (max-width: 1023px)` or add a separate iPad rule ensuring `min-height: 44px` on all interactive filter elements.

---

### C3. Expanded card content is obscured by bottom nav (iPhone SE, iPhone 14)

**Devices**: iPhone SE (375px), iPhone 14 (390px)

When a camp card is tapped and expanded in-place, the expanded details (Location, Indoor/Outdoor, Extended Care, Activities, Notes, "Visit Website" button) extend below the viewport. The bottom navigation bar (fixed at `z-index: 250`) overlays the last portion of the expanded content. Specifically:
- The "Visit Website" CTA button at the bottom of the expanded card can be partially hidden behind the nav bar
- The Notes section is partially obscured
- Users must scroll down to see all expanded content, but the bottom nav covers the last ~70px

The `body` has `padding-bottom: 70px` but the expanded card content within `.expanded-details` does not account for this.

**Recommendation**: Add `padding-bottom: 80px` to `.expanded-details` on mobile, or make the bottom nav transparent/semi-transparent when content extends beneath it.

---

## Major Issues

### M1. Filter bar chips are scrolled off-screen with no visual scroll indicator (iPhone SE, iPhone 14)

**Devices**: 375px, 390px

On both phone sizes, the filter presets row (`Extended Care`, `Under $300`, `Sports`, `Art & Creative`, `STEM`, `Outdoors`) is a horizontally scrollable container. However:
- Only the first 2-3 chips are visible initially ("Art & Creative", "STEM", "Outdoors" are off-screen to the right on iPhone SE)
- There is no fade/gradient scroll hint at the right edge
- There is no visual cue (such as a partial chip peek) that more filters exist
- The scroll position after our test's forced `scrollLeft = scrollWidth` shows identical screenshots to the starting position, suggesting the scroll happened within the hero section before the sticky state took effect

**Measured Chip Positions** (iPhone SE):
- "Extended Care": starts at x=-361 (completely off-screen left of viewport when sticky)
- "Under $300": starts at x=-221
- "Sports": starts at x=-96
- "Art & Creative": starts at x=-4 (barely visible)
- "STEM": starts at x=133 (visible)
- "Outdoors": starts at x=222 (visible)

**Recommendation**: Add a gradient fade mask on the right edge of `.filter-presets` when `scrollLeft < scrollWidth - containerWidth`, and ensure at least a half-chip is visible at the scroll boundary to hint at more content.

---

### M2. Mobile nav label font size too small -- 11px (iPhone SE, iPhone 14)

**Devices**: 375px, 390px

The bottom navigation labels ("BROWSE", "SCHEDULE", "MY PLAN", "WISHLIST", "MORE") render at 11px (`0.6875rem`). While the icons are clear at 24x24px, the text labels are at the edge of legibility, especially for users with any visual impairment.

The nav tab overall dimensions (66-76px wide x 79px tall) meet the 44px touch target requirement, so the hit area is fine. But the text itself is too small for comfortable reading.

**Recommendation**: Increase to 0.75rem (12px) minimum. Consider whether uppercase + letter-spacing compensates enough at 11px -- visually it still looks strained.

---

### M3. "Showing 86 camps" results count is missing from initial mobile view (All Devices)

**Devices**: All

When the page first loads, the "Showing **86** camps" text appears below the category browse grid, far down the page. Users see the filter bar but get no immediate feedback on how many results match. On the phones, this text only appears after scrolling past the entire category grid, testimonial banner, and reaching the camp cards section.

**Recommendation**: Add a compact results count to the filter bar area (e.g., "86 camps" badge) that updates as filters are applied.

---

### M4. Category grid obscures camp cards on initial view (iPhone SE, iPhone 14)

**Devices**: 375px, 390px

After scrolling past the hero and filter bar, users must scroll through the entire "Browse by Interest" category grid (13 category cards in 7 rows, approximately 1000px tall) before seeing any actual camp cards. This is a significant amount of content between the search/filter intent and the search results.

The category grid measures:
- iPhone SE: 7 rows x (162px cards + 20px gap) = ~1260px of category browsing
- iPad: 4 rows x (151px cards + 20px gap) = ~684px

**Recommendation**: Consider collapsing the category grid by default on mobile (show first 4-6 categories with a "Show all" button), or move it to a secondary section/tab. Alternatively, make it a horizontally scrollable row of chips.

---

### M5. Hero section takes up entire first viewport on phones (iPhone SE, iPhone 14)

**Devices**: 375px, 390px

The hero section measures 600px tall, which is 90% of the iPhone SE viewport (667px) and 71% of the iPhone 14 viewport (844px). Combined with the bottom nav bar (79px), users can only see the very top of the filter bar on the iPhone 14, and nothing beyond the hero on the iPhone SE, without scrolling.

**Breakdown of hero height**:
- Top bar (logo + buttons): ~60px
- Summer 2026 badge: ~30px
- Title ("Your summer, sorted."): ~120px at 44px font
- Subtitle text: ~50px
- Search input: 56px tall + margins
- Stats row: ~40px
- Wave decoration + padding: ~100px
- Total: ~600px

**Recommendation**: On mobile, reduce hero vertical padding (currently `pt-4 pb-16`). The `pb-16` (64px) and wave decoration consume significant space. Consider `pb-8` on mobile to recover ~32px.

---

### M6. Camp card quick info "Hours" column wraps awkwardly (iPad, iPhone SE)

**Devices**: 375px, 768px

The three-column quick info section (Ages | Price | Hours) wraps poorly when the hours text is long. For example:
- "Monday-Friday all summer" wraps across 3 lines in the Hours column on iPad two-column grid (326px card width)
- "9am-12pm" fits fine, but "$400-550/wk" in the Price column takes 2 lines

Each column gets `flex: 1` with 12px padding, but long values like multi-line hours create uneven row heights and reduce scannability.

**Recommendation**: Truncate long hour values on cards (e.g., "Mon-Fri, all...") and show full text in the expanded view. Or increase the minimum card width to prevent excessive wrapping.

---

### M7. Filter bar controls row has excessive empty space on mobile (iPhone SE, iPhone 14)

**Devices**: 375px, 390px

The second row of the filter bar contains only the filter icon (44px) on the left and the sort dropdown (114px) on the right, with ~180px of empty space between them. This wastes valuable vertical space and creates visual imbalance.

**Recommendation**: Move the sort dropdown inline with the filter chips row, or add the "Clear filters" and "Share" buttons to this row when active filters exist to better utilize the space.

---

### M8. Chevron expand icon on camp cards is small and close to favorite/compare buttons (All Devices)

**Devices**: All

The chevron (expand/collapse) icon sits inline with the camp title, directly adjacent to the compare and favorite buttons. The visual grouping makes it unclear whether the chevron is a separate interactive element or part of the title area. The entire card is clickable, so the chevron is decorative, but users may try to tap just the chevron.

The compare button (44x44px) and favorite button (44x44px) are correctly sized, but they sit very close to the chevron with only 1-2px visual gap.

**Recommendation**: Move the chevron to a more visually distinct position (e.g., bottom-center of the card, or as a "Show details" text link).

---

### M9. iPad shows mobile nav as hidden (0x0px) but still renders in DOM (iPad)

**Device**: 768px

The iPad audit shows all 5 nav tabs with dimensions 0x0px and the nav was not captured in the screenshot. The CSS hides `.mobile-nav` above 767px (`display: none`), but the component still renders in the DOM. At 768px, users have no visible navigation beyond the hero's "Plan My Summer" and "Sign In" buttons. There is no desktop-style top navigation either.

**Recommendation**: Either show the mobile nav at 768px (change breakpoint to `max-width: 1023px`) or add a desktop/tablet header navigation for viewports >= 768px.

---

### M10. "Sign In" button on iPad is only 40px tall (iPad)

**Device**: 768px

The "Sign In" button in the hero header measures 104x40px on iPad, falling 4px short of the 44px minimum touch target. This is the primary authentication entry point.

**Recommendation**: Add `min-height: 44px` to the auth button component.

---

## Minor Issues

### m1. Feature badges use 10.9px text with uppercase (All Devices)

The badges for "Extended Care", "Meals", "Transport", and "Sibling $" use `font-size: 0.68rem` (10.9px) with `text-transform: uppercase`. While uppercase helps with scanability, 10.9px is the smallest text on the entire page. The badges are not interactive, but they convey important decision-making information.

**Recommendation**: Increase to at least `0.75rem` (12px).

---

### m2. Camp card image aspect ratio varies between camps (All Devices)

The "805 Beach Volleyball Club" logo-style image is a square graphic with significant whitespace, while "A-Frame Surf Camp" uses a wide landscape banner. The `camp-card-image` container crops images via CSS but the visual quality varies significantly between logo-type and photo-type images.

**Recommendation**: Standardize image aspect ratio in the card (e.g., 16:9 or 3:2) and use `object-fit: cover` with `object-position: center`. Consider a fallback gradient for logo-only camps.

---

### m3. Category badge text at 12px (All Devices)

The colored category badges ("SPORTS", "BEACH/SURF", "ART", etc.) render at 12px. While the colored dot and background help distinguish them, the text itself is below the 14px mobile minimum.

**Recommendation**: Increase to `0.8125rem` (13px) or `0.875rem` (14px).

---

### m4. Hero stats text at 12px on phones (iPhone SE, iPhone 14)

The stats row ("86 local camps", "31 categories", "Ages 3-18", "Updated Jan 2026") renders at ~12px. This is supplementary information but still deserves legibility.

**Recommendation**: Increase to 13-14px or make the `<strong>` numbers larger.

---

### m5. No loading skeleton visible during initial load (Observation)

The page loaded quickly in our test (localhost), but the skeleton card system (`skeleton-card`) exists in code. It was not triggered during audit. This is positive -- the loading state is implemented -- but untested in this audit due to fast local loading.

---

### m6. Filter bar has no visual separation between preset chips and controls (iPad)

**Device**: 768px

On iPad, all filter chips, the filter icon button, and the sort dropdown appear on a single horizontal row. There is no visual divider between the "quick filter" chips and the "controls" section. The filter icon (42x34px) looks like another chip rather than a distinct action.

**Recommendation**: Add a subtle vertical divider or spacing increase before the controls section on wider viewports.

---

### m7. Category browse grid bottom row has orphan on odd count (All Devices)

When there are 13 categories (odd number), the last row contains a single "Faith-Based" card on the left, with empty space on the right. This looks intentional but visually unbalanced on the 2-column phone layout.

**Recommendation**: Consider making the orphan card full-width, or re-order to put a popular category last.

---

### m8. "Browse by Interest" title uses serif font while filter chips use sans-serif (All Devices)

This is a minor typographic inconsistency. The section heading "Browse by Interest" uses the serif font (`font-serif`), while the category card names use sans-serif. Both are correct per the design system, but the transition feels abrupt.

---

### m9. Mobile nav hides on scroll down -- may confuse new users (iPhone SE, iPhone 14)

**Devices**: 375px, 390px

The mobile nav auto-hides when scrolling down (>5px delta when past 100px), then reappears on scroll up. This is a common pattern (iOS Safari, Instagram) but new users may not discover the navigation until they scroll back up. The initial view shows the nav at the bottom.

**Recommendation**: Consider keeping the nav always visible, or at minimum showing it for the first 3 seconds after initial page load.

---

### m10. Testimonial banner is not visible in initial viewport (All Devices)

The testimonial quote ("Found the right STEM camp for my 10-year-old in under 5 minutes." -- Sarah M., Goleta) appears between the category grid and the camp cards list. On mobile, this is very far down the page and may never be seen by users who filter immediately.

**Recommendation**: Consider moving the testimonial to the hero section or making it a floating/rotating element.

---

### m11. Footer has excessive bottom padding on mobile (iPhone SE, iPhone 14)

**Devices**: 375px, 390px

The footer has `padding-bottom: 70px` (to clear the mobile nav), plus the CSS rule `.site-footer` likely adds its own padding. The footer screenshot shows significant empty space below the footer content and above the nav bar.

---

### m12. iPad two-column camp grid shows tight card spacing (iPad)

**Device**: 768px

On iPad, camp cards display in a 2-column grid with `gap: 24px` (gap-6). The cards are 326px wide with 48px left margin. The spacing is adequate but the cards feel somewhat cramped compared to the generous whitespace in the hero section above.

---

### m13. "Plan My Summer" button in hero could be more prominent (iPhone SE)

**Device**: 375px

The primary CTA "Plan My Summer" button is the most important action on the page. It measures 150x48px on iPhone SE with the text split across two lines ("Plan My" / "Summer"). The line break reduces scannability.

**Recommendation**: Use a shorter label like "Plan Summer" to avoid the line break, or increase the button width slightly.

---

### m14. Filter chip icons are 13-14px (All Devices)

The `.chip-icon` inside filter preset links measures 13px on mobile (14px default). While these are decorative SVG icons accompanying text, they are small enough to be indistinct at a glance.

**Recommendation**: Increase to 16px on mobile.

---

### m15. No visible focus indicators for keyboard/switch navigation (Observation)

While `:focus-visible` styles exist in the CSS, the visual audit could not verify their appearance. This is a testability limitation of the automated screenshot approach, not necessarily a bug.

---

## Measurements Summary

### Hero Section
| Measurement | iPhone SE | iPhone 14 | iPad |
|------------|-----------|-----------|------|
| Hero height | 600px | 600px | 703px |
| Title font size | 44px | 44px | 56px |
| Search input height | 56px | 56px | 67px |
| Search font size | 15.2px | 15.2px | 16.8px |

### Filter Bar
| Measurement | iPhone SE | iPhone 14 | iPad |
|------------|-----------|-----------|------|
| Chip height | 44px | 44px | 37px |
| Chip spacing | 8px | 8px | 8px |
| Position | sticky, top:0 | sticky, top:0 | sticky, top:0 |
| Filter icon | 44x44px | 44x44px | 42x34px |

### Camp Cards
| Measurement | iPhone SE | iPhone 14 | iPad |
|------------|-----------|-----------|------|
| Card width | 343px | 358px | 326px (2-col) |
| Card gap | 24px | 24px | 24px |
| Left/right padding | 16px | 16px | 48px |
| Grid columns | 1 | 1 | 2 |

### Category Browse Cards
| Measurement | iPhone SE | iPhone 14 | iPad |
|------------|-----------|-----------|------|
| Card size | 162x119px | 169x119px | 229x151px |
| Grid columns | 2 | 2 | 3 |

### Bottom Navigation
| Measurement | iPhone SE | iPhone 14 | iPad |
|------------|-----------|-----------|------|
| Tab width | 64-76px | 64-81px | 0 (hidden) |
| Tab height | 79px | 79px | 0 (hidden) |
| Label font size | 11px | 11px | 11px |
| Icon size | 24x24px | 24x24px | 24x24px |

### Horizontal Overflow
| Device | Document Scroll Width | Viewport Width | Overflow |
|--------|----------------------|----------------|----------|
| iPhone SE | 375px | 375px | None |
| iPhone 14 | 390px | 390px | None |
| iPad | 768px | 768px | None |

---

## Touch Target Summary

| Device | Total Interactive | Below 44px | Pass Rate |
|--------|------------------|-----------|-----------|
| iPhone SE | 289 | 0 | 100% |
| iPhone 14 | 289 | 0 | 100% |
| iPad | 284 | 10 | 96.5% |

All phone-size touch targets pass the 44px minimum. iPad has 10 failures, primarily in the filter bar area where the mobile-specific `min-height: 44px` override does not apply.

---

## Text Readability Summary

| Device | Total Text Elements | Below 14px | Pass Rate |
|--------|-------------------|-----------|-----------|
| iPhone SE | 969 | 497 | 48.7% |
| iPhone 14 | 969 | 497 | 48.7% |
| iPad | 960 | 483 | 49.7% |

Only ~50% of text elements meet the 14px mobile minimum. The majority of failures come from `.camp-quick-info-label` (258 elements at 11.2px) and `.category-badge` (173 elements at 12px), both of which appear on every camp card.

---

## Positive Findings

1. **No horizontal overflow** at any breakpoint -- excellent responsive implementation
2. **Touch targets on phones are 100% compliant** (44px minimum)
3. **Sticky filter bar works correctly** -- verified at 500px scroll
4. **Search input is well-sized** at 56px height (phones) and 67px (iPad)
5. **Camp card layout is clean and scannable** with clear visual hierarchy (image, title, category, description, quick info)
6. **Loading skeletons are implemented** for the loading state
7. **Semantic HTML** with proper ARIA labels on navigation, search, and interactive elements
8. **Compare and favorite buttons** are correctly sized at 44x44px with proper `min-w-[44px] min-h-[44px]`
9. **Category browse grid** has clear, touch-friendly cards (119-151px tall)
10. **Bottom nav has proper safe-area-inset-bottom** padding for notched devices

---

## Priority Recommendations

1. **[Critical]** Increase all text below 14px -- especially `.camp-quick-info-label` (11.2px -> 13px+), `.feature-badge` (10.9px -> 12px+), and `.category-badge` (12px -> 13px+)
2. **[Critical]** Add `min-height: 44px` to filter chips on iPad (extend mobile media query to 1023px or add tablet-specific rule)
3. **[Critical]** Add bottom padding to `.expanded-details` on mobile to clear the bottom nav
4. **[Major]** Add a scroll hint (gradient fade or partial chip visibility) to the filter chips row on phones
5. **[Major]** Collapse or reduce the category browse grid on mobile to get users to camp results faster
6. **[Major]** Reduce hero section bottom padding on mobile to free up viewport space
7. **[Major]** Add navigation for iPad/tablet (768px+) since mobile nav is hidden
8. **[Major]** Increase mobile nav label font from 11px to at least 12px

---

## Screenshots Index

All screenshots are saved in `/Users/adrianstier/SB-SummerCamps-2026/data/screenshots/audit/mobile/`:

### iPhone SE (375px)
- `iphone-se-full-page.png` - Full page scroll capture
- `iphone-se-hero.png` - Hero section viewport
- `iphone-se-filter-bar.png` - Filter bar in context
- `iphone-se-filter-bar-element.png` - Filter bar isolated
- `iphone-se-filter-chips-start.png` - Chips at scroll start
- `iphone-se-filter-chips-scrolled.png` - Chips after scroll
- `iphone-se-camp-cards.png` - Camp card section
- `iphone-se-camp-card-single.png` - Individual card
- `iphone-se-camp-card-second.png` - Second card
- `iphone-se-camp-card-tapped.png` - Card after tap
- `iphone-se-camp-card-expanded.png` - Expanded card
- `iphone-se-bottom-nav.png` - Bottom navigation isolated
- `iphone-se-bottom-nav-viewport.png` - Bottom nav in viewport
- `iphone-se-scrolled-500px.png` - After 500px scroll
- `iphone-se-category-grid.png` - Category browse in context
- `iphone-se-category-grid-element.png` - Category grid isolated
- `iphone-se-footer.png` - Footer section

### iPhone 14 (390px)
- Same file naming pattern with `iphone-14-` prefix

### iPad (768px)
- Same file naming pattern with `ipad-` prefix

### Data
- `audit-results.json` - Full JSON with all measurements

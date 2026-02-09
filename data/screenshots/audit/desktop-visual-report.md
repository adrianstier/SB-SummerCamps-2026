# Desktop Visual UX Audit Report

**Date**: 2026-02-09
**Breakpoints audited**: 1400px, 1280px, 1024px (all at 800px viewport height)
**Page**: Homepage (Browse camps)
**Screenshots**: `/data/screenshots/audit/desktop/resized/`

---

## Executive Summary

The homepage has a polished, premium aesthetic with a cohesive sand/earth color palette and thoughtful card design. However, there are several significant issues that undermine the experience, most critically an **invisible testimonial section** (text same color as background), **inconsistent card heights** caused by variable-length content, and **missing images on a majority of camp cards** that make the page feel unfinished. The filter bar and category browse sections work well across breakpoints, but the overall page length (~4,600px) with 86 camp cards creates a scrolling endurance challenge.

---

## Critical Issues

### C1. Testimonial text is invisible -- text color matches background
- **Breakpoints**: All (1400, 1280, 1024)
- **Location**: Testimonial banner between category browse and camp grid
- **Details**: `.testimonial-quote` has `color: var(--sand-100)` which is `#f5f0e8`. The background is `linear-gradient(180deg, var(--sand-50) 0%, var(--sand-100) 100%)` which ranges from `#faf8f4` to `#f5f0e8`. The text is virtually identical to the background color, rendering it completely unreadable. The `.testimonial-author` uses `color: var(--sand-400)` (#8f7f65) which is also low-contrast against this background.
- **Evidence**: All testimonial screenshots render as blank off-white rectangles (file sizes 1.6-2.6KB confirming near-empty image content).
- **Impact**: The social proof quote "Found the right STEM camp for my 10-year-old in under 5 minutes" and attribution are completely invisible. This wastes ~130px of vertical space with what appears to be dead whitespace.
- **Fix**: Change `.testimonial-quote` color to `var(--earth-700)` or `var(--earth-800)` for readable contrast.

### C2. AHA! Summer Program card image shows raw website text instead of a camp photo
- **Breakpoints**: All
- **Location**: Camp card grid, card #4 alphabetically
- **Details**: The card image area displays what appears to be a scraped webpage screenshot showing dense paragraphs of text about "Zoom meetings", "AHA! For Adults Zoom group", phone numbers, and enrollment information. The text is small, illegible, and visually jarring against the other cards.
- **Impact**: This card looks broken and unprofessional. It creates a strong negative impression and undermines trust in the data.
- **Fix**: Either replace with a curated image in `camp-images.json` or fall back to the category gradient placeholder (which other camps without images use successfully).

### C3. Majority of camp cards use generic gradient placeholder instead of actual images
- **Breakpoints**: All
- **Location**: Camp card grid
- **Details**: Out of the 8 cards examined in detail, 4 (50%) use the category-colored gradient with a small icon instead of an actual camp photo. Cards for "Adventure Lab @ Crane", "American Sign Language Camp", "Apples to Zucchini Cooking School", and "805 Beach Volleyball Club" all show gradient placeholders with a muted icon. Based on the grid screenshots, this pattern continues throughout.
- **Impact**: The homepage feels like a prototype rather than a finished product. Cards with real photos (like "Anacapa School Arts & Exploration" with kids holding a parachute, or "A-Frame Surf Camp" with their logo) are significantly more compelling and clickable.
- **Fix**: Prioritize sourcing hero images for the most prominent/popular camps and updating `camp-images.json`.

---

## Major Issues

### M1. Card height inconsistency within rows creates ragged grid
- **Breakpoints**: All, most noticeable at 1024px
- **Measurements**:
  - At 1400px/1280px: Row 1 cards are 641px tall, Row 2 cards are 657px tall (16px difference)
  - At 1024px: Row 1 cards are 641px, Row 2 cards are 668px (27px difference)
- **Cause**: Variable content length in the description, price format ("$180-198/wk" vs "$550/wk"), hours format ("Monday-Friday all summer" vs "9am-3pm"), camp name length (single line vs two lines), and presence/absence of feature badges (Extended Care, Sibling $, Meals, Transport).
- **Details**: Cards within the same row are height-matched by CSS grid, but different rows have different heights. Cards like "Apples to Zucchini" have a "MEALS" badge at the bottom adding height, while "Adventure Lab @ Crane" has none. Cards with "Contact for price" or long hour strings ("Monday-Friday all summer") expand the quick-info area.
- **Impact**: Creates a slightly uneven rhythm when scrolling. Not broken, but not as polished as it could be.
- **Fix**: Consider setting a fixed min-height on `.camp-card`, or truncating hours to a standard format, or aligning bottom elements with flexbox `margin-top: auto`.

### M2. Hours field shows long freeform text that breaks layout rhythm
- **Breakpoints**: All, worst at 1024px (narrower cards)
- **Location**: `.camp-quick-info-value` in the Ages/Price/Hours row
- **Examples**:
  - "Monday-Friday all summer" (A-Frame Surf Camp) -- wraps to 3 lines in the Hours column
  - "1pm-4pm (camps);" (Momentum Dance) -- includes semicolons and parenthetical
  - "8:15am-5:15pm" (some camps) -- reasonable but takes more space than "9am-3pm"
  - "TBD" (Anacapa School, Montessori) -- very short, creates visual imbalance
  - "(extended hours)" appended to some entries
- **Impact**: The three-column Ages/Price/Hours row works beautifully when all values are short (e.g., "5-14 | $299/wk | 9am-3pm") but degrades significantly with long text. The uneven column heights make the row look broken.
- **Fix**: Truncate or normalize hours display. Consider showing just "9am-3pm" and relegating details like "Monday-Friday" to the expanded card view or a tooltip.

### M3. Filter bar "Outdoors" chip partially masked at 1024px width
- **Breakpoints**: 1024px
- **Location**: Sticky filter bar
- **Details**: At 1024px, the filter preset chips ("Extended Care", "Under $300", "Sports", "Art & Creative", "STEM", "Outdoors") fill most of the horizontal space. The "Outdoors" chip appears right at the edge of the mask gradient that fades to transparent. The mask CSS (`mask-image: linear-gradient(to right, black 0, black calc(100% - 36px), transparent 100%)`) creates a 36px fade zone that can obscure the last visible chip.
- **Impact**: Users may not realize "Outdoors" is a clickable filter since it partially fades out. There is no scroll indicator or overflow affordance to suggest more filters exist to the right.
- **Fix**: Add a subtle scroll indicator (chevron or fade + "more" text) when chips overflow, or reduce chip padding at narrower breakpoints.

### M4. Grid does not adapt to viewport width efficiently -- fixed 3-column with large gutters
- **Breakpoints**: 1400px specifically
- **Measurements**:
  - At 1400px: Grid is 1104px wide (3 x 352px cards + 2 x 24px gaps) in a 1400px viewport
  - That leaves 296px of padding/margins (148px per side)
  - At 1280px: Same 1104px grid in 1280px viewport (176px unused, 88px per side)
  - At 1024px: Grid adapts to 976px (3 x 309px + 2 x 24px gaps) with 48px margins
- **Impact**: At 1400px, the camp cards appear slightly lost in the extra side space. The grid doesn't grow to fill available width. Cards are 352px wide when they could comfortably be 400px+.
- **Fix**: Consider using `grid-template-columns: repeat(3, minmax(300px, 1fr))` instead of the current Tailwind `lg:grid-cols-3` to let cards expand proportionally with viewport width. Alternatively, consider a 4-column layout at 1400px+.

### M5. "Showing 86 camps" results count text lacks visual weight and context
- **Breakpoints**: All
- **Location**: Between testimonial/category section and camp grid
- **Details**: The "Showing 86 camps" text appears as a small, understated line of text. When filters are active, it updates to "Showing 14 camps" with an "Active: Extended Care" pill and "Clear all" link. The unfiltered state has no visual anchor between the categories and the massive card grid.
- **Impact**: Users scrolling from the hero through categories suddenly encounter a wall of 86 cards with minimal orientation. There is no visual transition or guidance about how to narrow results.
- **Fix**: Consider making the results count more prominent, or adding a summary bar that shows "86 camps across 31 categories" with clearer visual hierarchy.

### M6. Page is extremely long (4,600px) requiring extensive scrolling with no pagination or virtual scrolling
- **Breakpoints**: All
- **Measurements**: Page height is ~4,600px at all breakpoints (4,596 at 1400px, 4,588 at 1280px, 4,602 at 1024px)
- **Details**: All 86 camp cards render at once in a 3-column grid. At ~657px per card row, that is roughly 29 rows visible on the page. With 86 cards / 3 columns = ~29 rows, and each row ~160px tall (card + gap), the camp grid alone is ~4,640px.
- **Impact**: Initial page load renders 720 DOM elements. Users must scroll through 5+ viewport heights to see all camps. Late-alphabet camps (WinShape, YMCA) may never be seen. No "back to top" button exists.
- **Fix**: Implement lazy loading (render 12-18 cards initially, load more on scroll), add a "Back to top" floating button, or consider pagination (e.g., 24 per page). The sort dropdown (A-Z) somewhat mitigates this but doesn't solve the scroll fatigue.

---

## Minor Issues

### m1. Camp card name truncation inconsistency
- **Breakpoints**: 1024px, 1280px
- **Location**: Camp card title area
- **Examples**:
  - "Cliff Drive Care Center..." truncated with ellipsis at 1024px
  - "Santa Barbara Soccer Club..." truncated at 1024px footer view
  - "Montessori Center Scho..." truncated mid-word
  - Most names fit on 1-2 lines without truncation
- **Impact**: Truncated names lose important identifying information. "Cliff Drive Care Center Summer..." could be "Cliff Drive Care Center Summer Camp" or "Summer Programs".
- **Fix**: Allow card titles to wrap to 3 lines before truncating, or use a smaller font size when the name exceeds a certain character count.

### m2. Category browse grid has orphan card at certain widths
- **Breakpoints**: 1400px, 1280px
- **Location**: "Browse by Interest" section
- **Details**: There are 13 category cards. At 1400px width with `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))`, the grid renders as 6 columns + 6 columns + 1 orphan "Faith-Based" card alone on the last row. This single card is the same size as others but sits alone at the far left.
- **Impact**: The lonely orphan card looks intentionally isolated, as if it's less important. With the category cards being action buttons (filtering), visual parity matters.
- **Fix**: Consider limiting to a grid that divides more evenly (e.g., rows of 7+6, or 5+5+3), or use a flex-wrap layout that centers the last row.

### m3. "Register Now" link style is inconsistent with other CTAs
- **Breakpoints**: All
- **Location**: Camp cards, below the Ages/Price/Hours row
- **Details**: "Register Now" appears as small green text with a checkmark icon. It looks like a status indicator ("registration is open") rather than a call-to-action button. It does not have a button appearance, hover state affordance, or padding that invites clicking.
- **Impact**: Users may not realize this is clickable. The brand guidelines call for action-oriented labels ("Register Now" is good text, but the visual treatment undersells it).
- **Fix**: Either style it as a small button/link with underline, or make the entire card clickable with the registration CTA more prominent in the detail view.

### m4. Feature badges at card bottom have inconsistent presence
- **Breakpoints**: All
- **Location**: Bottom of camp cards
- **Details**: Some cards show feature badges ("EXTENDED CARE", "SIBLING $", "MEALS", "TRANSPORT"), others show none. When present, they add 30-40px of height to the card. The badges use different colored pill styles (teal for Extended Care, amber for Sibling $, etc.).
- **Impact**: Creates the card height inconsistency noted in M1. Also, the absence of badges on most cards means users cannot use visual scanning to find camps with specific features -- they must click or use filters.
- **Fix**: Consider moving feature badges to a fixed-height area, or showing them only in the expanded/detail view, or showing all possible badges dimmed/greyed when not applicable.

### m5. Header nav has large gap between logo and right-side buttons
- **Breakpoints**: All, most pronounced at 1400px
- **Location**: Top navigation bar
- **Details**: The logo (sun/wave icon) sits at the far left, while "Plan My Summer", "Table", and "Sign In" buttons sit at the far right. The vast middle area is completely empty.
- **Impact**: The header feels sparse and wastes prime navigation real estate. The logo-to-CTA distance is approximately 800px at 1400px width.
- **Fix**: Consider centering the navigation items, adding inline navigation links (Schedule, Compare, etc.), or adding the search bar to the header on scroll.

### m6. Price display inconsistency across cards
- **Breakpoints**: All
- **Location**: Camp card Price column
- **Examples**:
  - "$550/wk" -- clean, clear
  - "$180-198/wk" -- range with dash
  - "$299-350/wk" -- range
  - "$400-550/wk" -- wider range
  - "$1400-3600/wk" -- very large numbers, likely per session not per week
  - "Contact for price" -- wraps to 2-3 lines
  - "$200-400/wk" -- standard range
- **Impact**: Prices are not consistently formatted. The "$1400-3600/wk" figure for Camp New Heights is likely a per-session or full-program price being displayed as weekly, which is misleading. "Contact for price" breaks the visual rhythm.
- **Fix**: Normalize all prices to per-week format. For "Contact for price", consider showing just "Contact" or a "--" with a tooltip. Validate that ranges like $1400-3600 are actually weekly.

### m7. Grain texture overlay on body may reduce perceived sharpness
- **Breakpoints**: All
- **Location**: Entire page
- **Details**: `body::before` applies a fractal noise SVG texture at `opacity: 0.025` with `z-index: 9999`. While barely perceptible, it sits above all content.
- **Impact**: On some displays, this can cause a very subtle softness to text and images. The `z-index: 9999` means it's above even modal overlays.
- **Fix**: Lower the z-index to be above the background but below interactive content, or remove if performance matters more than the subtle texture effect.

### m8. Footer is minimal and lacks utility links
- **Breakpoints**: All
- **Location**: Page bottom (last 136px)
- **Details**: Footer contains only: "Santa Barbara Summer Camps" with the logo, "Data from camp websites - Updated Jan 2026", and "Verify prices and availability directly with camps before enrolling." It has a simple dark background with light text.
- **Impact**: The footer is functional but minimal. There are no links to About, Privacy, Contact, FAQ, or other standard footer content. For a community tool, this is acceptable but could be improved.
- **Fix**: Low priority. Consider adding a feedback link or contact email.

### m9. Search bar placeholder text could be more action-oriented
- **Breakpoints**: All
- **Location**: Hero section search bar
- **Details**: Placeholder reads "Search camps by name or activity". The search bar is 672px wide across all breakpoints, centered in the hero.
- **Impact**: The placeholder is functional but generic. Per brand guidelines, copy should be "direct, confident, efficient."
- **Fix**: Consider "Find a camp..." or "Search 86 camps by name, activity, or location" for more brand-aligned copy.

### m10. Stats bar dot separators are small and low-contrast
- **Breakpoints**: All
- **Location**: Below the search bar in the hero: "86 local camps - 31 categories - Ages 3-18 - Updated Jan 2026"
- **Details**: The colored dots separating stats items are small (~6px) and use varied colors (blue, green, yellow, etc.). The text itself is reasonably legible.
- **Impact**: Minor visual clutter. The dots add color but the information could be presented more cleanly.
- **Fix**: Consider using pipe separators or bullet characters for cleaner typography.

---

## Positive Observations

These elements work well and should be preserved:

1. **Hero section**: Clean, compelling headline "Your summer, sorted." with good typography hierarchy (Fraunces serif for headline, Outfit sans-serif for body). The "sorted" in terra/rust color provides visual interest.

2. **Color palette**: The sand/earth/ocean palette is cohesive and warm. Category colors (orange for sports, teal for beach/surf, etc.) provide good differentiation.

3. **Camp card structure**: The Ages/Price/Hours row is an excellent design pattern -- scannable, information-dense, and well-organized. The highlighted Price column with the subtle teal background draws the eye appropriately.

4. **Category browse cards**: Clean, well-spaced cards with icons that clearly communicate each category. The hover states and click-to-filter functionality is intuitive.

5. **Filter bar**: The sticky filter bar with preset chips is effective. The chip design is clean, the active state (filled teal) is clear, and the "Active: X" pills with dismiss buttons work well.

6. **Card hover effect**: The `translateY(-4px)` lift with enhanced shadow creates a premium, tactile feel. The gradient border reveal on hover is a nice touch.

7. **Responsive consistency**: The 3-column grid works well at all three breakpoints. Card content adapts reasonably across 352px (1400) to 309px (1024) widths.

8. **Typography**: Font pairing of Fraunces (serif headings) and Outfit (sans-serif body) is distinctive and readable. Letter-spacing adjustments are appropriate.

---

## Measurements Summary

| Metric | 1400px | 1280px | 1024px |
|--------|--------|--------|--------|
| Page height | 4,596px | 4,588px | 4,602px |
| Has horizontal scroll | No | No | No |
| Base font size | 16px | 16px | 16px |
| DOM elements | 720 | 720 | 720 |
| Grid width | 1,104px | 1,104px | 976px |
| Card width | 352px | 352px | 309px |
| Card height (row 1) | 641px | 641px | 641px |
| Card height (row 2) | 657px | 657px | 668px |
| Grid columns | 3 | 3 | 3 |
| Grid gap | 24px | 24px | 24px |
| Search bar width | 672px | 672px | 672px |
| Filter chip count | 18 | 18 | 18 |
| Footer height | 136px | 136px | 136px |
| Camp card count | 86 total, 14 shown when filtered | -- | -- |
| Side margin (approx) | 148px | 88px | 24px |

---

## Priority Recommendations

### Immediate (before launch)
1. **Fix testimonial text color** (C1) -- currently invisible, wasting space and losing social proof
2. **Replace AHA! Program card image** (C2) -- showing raw webpage text
3. **Fix hours text overflow** (M2) -- normalize to standard format

### Short-term (next sprint)
4. **Add camp images** (C3) -- even 20 more real photos would dramatically improve the page
5. **Add lazy loading or pagination** (M6) -- 86 cards is too many to render at once
6. **Add scroll/overflow indicator to filter bar** (M3) -- users at 1024px may miss the last filter chip

### Medium-term (next 2-3 sprints)
7. **Normalize card heights** (M1) -- standardize quick-info row and feature badge area
8. **Make grid responsive to viewport** (M4) -- use fluid column sizing
9. **Improve price display consistency** (m6) -- validate and normalize price data

---

## Screenshots Reference

All screenshots are in `/data/screenshots/audit/desktop/resized/`:

- `w{width}-02-hero.png` -- Hero sections
- `w{width}-03-filter-bar.png` -- Filter bar
- `w{width}-04-categories.png` -- Category browse grid
- `w{width}-05-camp-cards-row1.png` -- First card row
- `w{width}-06-camp-cards-row2.png` -- Second card row
- `w{width}-07-footer-fixed.png` -- Footer area
- `w{width}-08-mid-cards.png` -- Mid-page cards
- `w{width}-09-testimonial.png` -- Testimonial (renders blank due to C1)
- `w{width}-10-filter-active.png` -- Active filter state
- `card-{n}.png` -- Individual card details (1-8)
- `w{width}-measurements.json` -- Detailed DOM measurements

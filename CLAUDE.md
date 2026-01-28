# Santa Barbara Summer Camps 2026

## Project Overview
A summer camp planning tool for busy moms in Santa Barbara. Built with React + Vite frontend, Supabase backend (PostgreSQL + Auth), deployed on Vercel.

**Live Site**: https://sb-summer-camps.vercel.app

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Row Level Security, Google OAuth)
- **Deployment**: Vercel
- **Auth**: Google OAuth via Supabase

## Key Files
- `src/App.jsx` - Main application component with camp listing, filters, search
- `src/lib/supabase.js` - Supabase client and all database helper functions
- `src/contexts/AuthContext.jsx` - Auth state management, user data loading
- `src/components/SchedulePlanner.jsx` - Drag-and-drop calendar planning
- `backend/uploadCamps.js` - Script to upload camp data to Supabase
- `backend/scraper.js` - Playwright-based web scraper for camp websites

## Environment Variables
```
VITE_SUPABASE_URL=https://oucayiltlhweenngsauk.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_CLIENT_ID=<google-client-id>
SUPABASE_SERVICE_KEY=<service-role-key> # For backend scripts only
```

## Supabase Project
- **Project ID**: oucayiltlhweenngsauk
- **Tables**: camps, profiles, children, favorites, scheduled_camps, notifications, reviews, etc.
- **RLS**: Enabled with `is_admin()` security definer function to prevent policy recursion

---

# Brand Voice Guidelines

## Brand Essence
**Tagline**: *"Summer planning, simplified."*

Built for moms who don't have time to waste. They're juggling careers, households, and a hundred other responsibilities—summer camp planning should be one less thing to stress about.

## Core Voice Attributes

### Tone: Confident & Direct
- No fluff, no filler
- Get to the point fast
- Respect the user's time
- Speak like a trusted friend who has all the answers

### Personality: Capable & Calm
- We've done the research so you don't have to
- Organized but not rigid
- Supportive without being preachy
- Smart, not smug

### Values
1. **Efficiency** - Every feature saves time
2. **Clarity** - Information is scannable and actionable
3. **Reliability** - Accurate, up-to-date camp data you can trust
4. **Empowerment** - You're in control of your summer

### Emotional Connection
The feeling users should have: **"I've got this."** Relief, confidence, and control.

## Voice Do's and Don'ts

### DO Say:
- "Compare camps side-by-side"
- "Drag to schedule. Done."
- "10 camps match your criteria"
- "Ages 5-12 | $350/week | Extended care available"
- "Your summer at a glance"
- "Coverage gaps? We'll flag them."

### DON'T Say:
- "Welcome to the ULTIMATE summer camp experience!!!"
- "Hey mama! Ready to make magical memories?"
- "We know how hard it is being a mom..."
- "Click here to learn more about our amazing features!"
- Excessive exclamation points
- Mommy-blog speak
- Patronizing language

## Content Hierarchy Principles

1. **Scannable first** - Assume users are skimming
2. **Numbers over words** - "$350" not "three hundred fifty dollars"
3. **Labels over sentences** - "Ages: 5-12" not "This camp is for children ages 5 to 12"
4. **Actions over descriptions** - "Compare" "Schedule" "Save"

## Button & CTA Language

| Instead of... | Use... |
|---------------|--------|
| Submit | Save |
| Click here to view | View Camp |
| Learn more | Details |
| Get started now! | Plan My Summer |
| Sign up for free | Sign In |
| Add to your favorites | (heart icon) |

## Sample Rewrites

**Before**: "We're so excited to help you find the perfect summer camp for your little ones!"
**After**: "90+ Santa Barbara camps. Find the right fit."

**Before**: "Click the heart icon to add this camp to your favorites so you can easily find it later!"
**After**: (heart icon) Save

**Before**: "Oops! Something went wrong. We're so sorry for the inconvenience!"
**After**: "Something went wrong. Refresh to try again."

## Feature-Specific Copy

### Calendar/Planner
- "Drag camps to weeks"
- "Fill gaps" or "Coverage check"
- "Total: $2,400 for 8 weeks"
- Per-child view: "Emma's Summer" / "Jake's Summer"

### Empty States (helpful, not sad)
- "No camps match these filters. Try adjusting age or price."
- "No favorites yet. Heart camps to save them here."
- "Your calendar is empty. Start by browsing camps."

### Error States (calm and clear)
- "Something went wrong. Refresh to try again."
- "Couldn't load camps. Check your connection."

## Brand Voice Summary

| Attribute | Description |
|-----------|-------------|
| **Primary Tone** | Direct, confident, efficient |
| **Secondary Tone** | Warm but not gushy, helpful but not hovering |
| **Vocabulary** | Simple, scannable, action-oriented |
| **Avoid** | Exclamation points, mommy-blog tone, corporate jargon |
| **Goal Feeling** | "I've got this handled." |

---

## Development Notes

### Deploying
```bash
npm run build
npx vercel --yes --prod
```

### Uploading Camps to Supabase
```bash
SUPABASE_SERVICE_KEY=<key> node backend/uploadCamps.js
```

### Local Development
```bash
npm run dev  # Runs on localhost:5173
```

---

## Scraping & Data Pipeline

### Data Flow
```
data/summer-camps-2026-enhanced.csv  (source of truth for camp metadata)
        ↓
backend/scraper.js                   (scrapes websites, writes extracted data)
        ↓
data/camps.json                      (flat fields from CSV + scraped extracted data)
data/scrape-cache.json               (cached scrape results, 24h TTL)
        ↓
backend/uploadCamps.js               (merges camp-images.json, uploads to Supabase)
        ↓
Supabase `camps` table               (frontend reads with .select('*'))
```

### Data Files
| File | Purpose |
|------|---------|
| `data/summer-camps-2026-enhanced.csv` | Master camp list (46 camps). Flat fields: name, ages, price, hours, contact, etc. |
| `data/camps.json` | Generated by scraper. Combines CSV fields + scraped `extracted` object. |
| `data/camp-images.json` | Curated image URLs per camp (id → image_url). Merged during upload. |
| `data/scrape-cache.json` | Scraper cache keyed by camp ID. Avoids re-scraping within 24 hours. |
| `data/scrape-log.json` | Last scrape run stats (success/fail counts, errors). |

### Image Handling
Images are stored separately from scraped data because the scraper detects page images heuristically and often picks logos or icons. `data/camp-images.json` contains manually curated hero images per camp.

**The upload script merges images automatically**: `uploadCamps.js` reads `camp-images.json` and applies `image_url` to any camp that doesn't already have one set in `camps.json`. This means:
- Re-running the scraper won't lose images (scraper doesn't overwrite `camp-images.json`)
- To add/change an image, edit `camp-images.json` and re-upload
- Format: `[{ "id": "camp-id", "camp_name": "Camp Name", "image_url": "https://..." }]`

### Running the Scraper
```bash
# Full scrape using cache (skips camps scraped in last 24h)
node backend/scraper.js

# Force fresh scrape of all camps (ignore cache)
node backend/scraper.js --fresh

# Scrape specific camp
node backend/scraper.js --single "UCSB"

# Limit to N camps (useful for testing)
node backend/scraper.js --limit 5

# Adjust concurrency (default: 3)
node backend/scraper.js --concurrency 5

# Disable caching entirely
node backend/scraper.js --no-cache
```

### What the Scraper Extracts
Each camp gets an `extracted` JSONB object containing:
- `pricing_tiers` - earlyBird, regular, late, halfDay, fullDay, weekly, perSession
- `sessions` - Array of `{ raw, parsed }` with session dates/themes
- `activities` - Array of activity strings
- `availability` - `{ isOpen, hasWaitlist, soldOutSessions, openingDate }`
- `testimonials` - Array of quote strings
- `staff_ratio` - String like "1:8"
- `certifications` - Array of cert names
- `age_groups`, `food_info`, `cancellation_policy`
- `special_needs_friendly`, `has_health_protocols`, `setting`

Plus top-level fields: `pdf_links`, `social_media`, `pages_scraped`, `has_2026`

### Updating Camp Data After a Scrape
```bash
# 1. Run the scraper (generates camps.json from CSV + live scrape)
node backend/scraper.js

# 2. Upload to Supabase (merges camp-images.json automatically)
export $(grep -v '^#' .env | xargs) && node backend/uploadCamps.js

# 3. Verify
# Frontend fetches with .select('*') so new data appears immediately
```

### Adding a New Camp
1. Add a row to `data/summer-camps-2026-enhanced.csv` with an `id` and `website_url`
2. Run the scraper: `node backend/scraper.js --single "new-camp-name"`
3. Add an image to `data/camp-images.json` if desired
4. Upload: `export $(grep -v '^#' .env | xargs) && node backend/uploadCamps.js`

### Updating Flat Camp Values
To update values like price, hours, ages, or contact info that come from the CSV:
1. Edit the row in `data/summer-camps-2026-enhanced.csv`
2. Re-run the scraper (it rebuilds camps.json from CSV + cache): `node backend/scraper.js`
3. Re-upload to Supabase

### Common Scrape Failures
- **ERR_CONNECTION_CLOSED / ERR_ADDRESS_UNREACHABLE**: Website is down. Camp keeps CSV data.
- **ERR_CERT_COMMON_NAME_INVALID**: SSL certificate issue. Camp keeps CSV data.
- **Timeout**: Site too slow. Increase timeout in `CONFIG.timeout` or retry later.
- Sites that fail still appear in the app with their CSV-sourced flat data (no extracted enrichment).

### Supabase Schema for Scraped Data
These columns store the rich scraped data (added via migration `20260124160000`):
```sql
extracted       JSONB DEFAULT '{}'    -- Nested extracted data object
pdf_links       JSONB DEFAULT '[]'    -- Array of {url, text, type}
social_media    JSONB DEFAULT '{}'    -- {facebook, instagram, youtube, twitter}
image_url       TEXT                  -- Hero image URL (from camp-images.json)
has_2026        BOOLEAN DEFAULT false -- Whether 2026 info was found
pages_scraped   JSONB DEFAULT '[]'    -- URLs the scraper visited
```

---

## Weekly Multi-Strategy Scraping Pipeline

The enhanced pipeline runs multiple extraction strategies for maximum accuracy:

### Strategies
1. **WebFetch** - Fast HTML parsing for simple sites
2. **Playwright** - Full JS rendering for SPAs/dynamic content
3. **Accessibility** - Semantic page structure analysis
4. **Screenshot** - Visual capture for Claude Vision analysis

### Running the Weekly Pipeline
```bash
# Full weekly scrape (all strategies)
npm run scrape:weekly

# With verbose output
npm run scrape:weekly:verbose

# Single camp
node backend/weekly-scraper.js --camp "zoo" -v

# Specific strategy only
node backend/weekly-scraper.js --strategy playwright

# Generate report from existing data
npm run scrape:report
```

### Screenshot-Based Extraction (Claude Session)
For camps where automated extraction fails, capture screenshots and analyze them in a Claude session:

```bash
# Capture screenshots for camps needing work
npm run scrape:capture -- --needs-work

# Capture specific camp
npm run scrape:capture -- "zoo"

# List all camps with quality scores
npm run scrape:capture -- --list
```

Then in Claude:
1. Read the screenshot: `Read tool with data/screenshots/<camp>_<hash>.png`
2. Ask Claude to extract camp data from the visual
3. Update camps.json with the extracted data

### Data Quality Scoring
Each extraction is scored 0-100 based on fields extracted:
- **Pricing** (25 pts): Weekly rates, early bird, member pricing
- **Sessions** (20 pts): Session dates and themes
- **Hours** (15 pts): Operating hours, drop-off/pick-up
- **Extended Care** (15 pts): Before/after care availability
- **Ages** (10 pts): Age groups and requirements
- **Activities** (10 pts): Activities offered
- **Registration** (5 pts): Open/closed status

### Weekly Reports
Reports are generated in `data/reports/report-YYYY-MM-DD.json` with:
- Summary stats (total, successful, needs review, failed)
- Strategy effectiveness comparison
- Camps needing attention (quality < 60)
- Detected changes from previous week

### Change Detection
The pipeline tracks changes between runs in `data/change-log.json`:
- Price changes (high significance)
- Registration status changes (high significance)
- Hours changes (medium significance)
- Session count changes (medium significance)

### Scheduling Weekly Runs
The scheduler runs weekly by default (Sunday 3am):
```bash
# Start scheduler daemon
npm run schedule

# Run immediately (for testing)
npm run schedule:now

# Custom schedule (via environment variable)
SCRAPE_SCHEDULE="0 3 * * 0" npm run schedule
```

### Pipeline Files
| File | Purpose |
|------|---------|
| `backend/weekly-scraper.js` | Main multi-strategy orchestrator |
| `backend/capture-for-vision.js` | Screenshot capture for Claude Vision |
| `backend/lib/pipeline.js` | Quality scoring, merging, validation |
| `backend/lib/screenshot-extractor.js` | Playwright screenshot capture |
| `backend/lib/claude-extractor.js` | Claude API extraction (optional) |
| `backend/lib/smart-extractor.js` | Enhanced page discovery and parsing |
| `data/camp-configs/` | Per-camp site maps (20 configs) |
| `data/reports/` | Weekly report JSON files |
| `data/screenshots/` | Captured screenshots for vision analysis |
| `data/change-log.json` | Detected changes between runs |
| `data/review-queue.json` | Camps needing manual review |

---

## Camp URLs & Scraping Reference

### Verified URLs (Updated Jan 2026)

| Camp ID | Correct URL | Notes |
|---------|-------------|-------|
| `ymca-summer-camp` | https://www.ciymca.org/summer-camp | Channel Islands YMCA, register via RecLique |
| `safety-town` | https://www.sbsafetytown.org/ | Redirects from safetytown.org |
| `united-boys-girls-club` | https://www.unitedbg.org/ | NOT unitedboysandgirlsclub.org |
| `moxi-museum-camp` | https://moxi.org/programs/for-families/camps/ | Wix site, JS-heavy |
| `laguna-blanca-summer-programs` | https://www.lagunablanca.org/summer/summer-laguna | Multiple sub-pages for arts/sports/academic |
| `peak2pacific` | https://www.peak2pacific.com/p2p-summer-camp-programs | Wix site, registration on Active.com |
| `page-youth-center` | https://www.pageyouthcenter.org/summer-camps | Sports camps |
| `santa-barbara-soccer-club-camp` | https://santabarbarasc.org/recreational-programs/clinics-2/ | NOT sbsoccer.org |
| `sea-league-excursion-camp` | https://www.thesealeague.org/summer-camps | Sliding scale pricing |
| `twin-lakes-junior-golf` | https://www.twinlakesgolf.com/junior-golf | Don Parsons Golf |
| `octobots-robotics-camp` | https://www.teamoctobots.org/ | NOT octobots.org |
| `sb-rock-gym-camp` | https://www.sbrockgym.com/ | Blocks scrapers |
| `montessori-center-school-camp` | https://www.mcssb.org/summer-camp | Limited details online |
| `boxtales-theatre-camp` | https://boxtales.org/education/summer-camp/ | 15 spots only |
| `nature-rangers` | https://naturerangers.org/camp/ | Wix site |
| `sb-botanic-garden` | https://sbbotanicgarden.org/visit/youth-programs/summer-camp/ | UltraCamp registration |

### Registration Platforms by Camp

| Platform | Camps Using It |
|----------|---------------|
| **Active.com/CampsCUI** | Peak2Pacific, Camp Elings, SB Parks & Recreation |
| **RecLique** | YMCA |
| **UltraCamp** | SB Botanic Garden |
| **PerfectMind** | Lobster Jo's (via City of SB) |
| **Website Direct** | Most others |

### Wix/JS-Heavy Sites (Require Playwright)

These sites don't work with WebFetch - use Playwright strategy:
- Peak2Pacific (peak2pacific.com)
- Nature Rangers (naturerangers.org)
- Lobster Jo's (lobsterjosbeachcamp.com)
- MOXI Museum (moxi.org)
- Next Level Sports (nextlevelsportscamp.com)
- A-Frame Surf (aframesurf.com)
- Momentum Dance (momentumdancesb.com)

### Known Issues & Workarounds

| Camp | Issue | Workaround |
|------|-------|------------|
| **Lobster Jo's** | City permit dispute (Jan 2026) | Status uncertain for summer 2026 |
| **SB Rock Gym** | Blocks automated requests | Manual data entry or screenshot |
| **South Coast Railroad Museum** | No summer camp program found | May not offer camps |
| **WinShape Camps** | SB location not confirmed for 2026 | Check camps.winshape.org closer to summer |
| **Fairview Gardens** | 404 on camp pages | Contact directly or check fairviewgardens.org |

### Camp Config Files

Per-camp site maps are stored in `data/camp-configs/`. Each JSON file contains:
- Correct URLs for main, pricing, schedule, FAQ, registration pages
- Data hints (where to find pricing, hours, sessions)
- Scraping challenges and notes
- Registration platform info
- Last verified date

To add/update a config:
```bash
# Create new config
cat > data/camp-configs/new-camp.json << 'EOF'
{
  "id": "new-camp",
  "name": "New Camp Name",
  "website": "https://example.com",
  "pages": {
    "main": "https://example.com",
    "pricing": "https://example.com/pricing",
    "schedule": "https://example.com/schedule"
  },
  "data_hints": {
    "pricing_location": "Table on pricing page",
    "hours_location": "FAQ section"
  },
  "last_verified": "2026-01-28"
}
EOF
```

### Semantic Extraction with Claude Session

For camps where automated scraping fails, use Claude Code for semantic extraction:

1. **Fetch the page**: `WebFetch` with extraction prompt
2. **Extract structured data**: Ask for pricing, hours, sessions, ages, activities
3. **Update camps.json**: Add to `extracted` object with `"_strategy": "claude-session"`

Example prompt for WebFetch:
```
Extract ALL summer camp information including:
1. Pricing (weekly, daily, member/non-member)
2. Hours (start/end, drop-off/pick-up windows)
3. Extended care (availability, hours, cost)
4. Session dates (with themes if any)
5. Ages accepted
6. Activities offered
7. Registration info (opens date, platform)
Return structured data.
```

### Quality Benchmarks

Current data quality (as of Jan 2026):
- **Average Score**: 72%
- **60+ Score**: 34/46 camps (74%)
- **100 Score**: 6 camps (UCSB, WYP, SB Botanic, Art Explorers, Camp Elings, Anacapa)

Target for next scrape:
- **Average Score**: 80%+
- **60+ Score**: 40/46 camps (87%)

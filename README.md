# Santa Barbara Summer Camps 2026

A full-stack application for browsing, filtering, and maintaining an up-to-date database of Santa Barbara area summer camps.

## Features

### Frontend
- **Search**: Full-text search across camp names, descriptions, and notes
- **Filter by Age**: Select your child's age to see matching camps
- **Filter by Category**: Beach/Surf, Sports, Art, Science/STEM, Theater, etc.
- **Filter by Price**: Set maximum weekly price
- **Filter by Features**: Extended care, food included, transportation, sibling discounts
- **Keyword Tags**: Quick filter by activities (surfing, hiking, robotics, etc.)
- **Two Views**: Card grid or sortable table
- **Responsive**: Works on desktop, tablet, and mobile

### Backend
- **Automated Scraping**: Playwright-based scraper visits each camp's website
- **Monthly Updates**: Cron-scheduled re-scraping to keep data fresh
- **Smart Extraction**: Automatically detects prices, ages, hours, registration dates
- **REST API**: Full API for camps, categories, keywords, and statistics

## Quick Start

### 1. Install Dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Run the Development Server

Start both frontend and backend:

```bash
# Terminal 1: Start the API server
npm run server

# Terminal 2: Start the frontend dev server
npm run dev
```

Then open http://localhost:5173

### 3. Build for Production

```bash
npm run build
npm run server
```

The server will serve both the API and the built frontend on http://localhost:3001

## Scraping

### Run a Full Scrape

Scrape all camp websites:

```bash
npm run scrape
```

### Scrape a Single Camp

Test scraping for one camp:

```bash
npm run scrape:single -- "UCSB"
```

### Scheduled Scraping

Run the scheduler for automatic monthly updates:

```bash
npm run schedule
```

The scheduler uses cron format. Default is monthly on the 1st at 3am Pacific.

Change schedule with environment variable:

```bash
# Weekly on Sundays at 3am
SCRAPE_SCHEDULE="0 3 * * 0" npm run schedule

# Daily at 3am
SCRAPE_SCHEDULE="0 3 * * *" npm run schedule
```

Run immediately with `--now`:

```bash
npm run schedule -- --now
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/camps` | GET | List camps with filters |
| `/api/camps/:id` | GET | Get single camp |
| `/api/categories` | GET | List all categories |
| `/api/keywords` | GET | List all activity keywords |
| `/api/stats` | GET | Get camp statistics |
| `/api/scrape/status` | GET | Get last scrape info |
| `/api/scrape/run` | POST | Trigger a new scrape |

### Query Parameters for `/api/camps`

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Full-text search |
| `category` | string | Filter by category |
| `age` | number | Child's age (shows camps that include this age) |
| `minAge` | number | Minimum age range |
| `maxAge` | number | Maximum age range |
| `maxPrice` | number | Maximum weekly price |
| `keywords` | string | Comma-separated keywords |
| `extendedCare` | boolean | Has extended care |
| `transport` | boolean | Has transportation |
| `siblingDiscount` | boolean | Has sibling discount |
| `foodIncluded` | boolean | Food is included |
| `sortBy` | string | Field to sort by |
| `sortDir` | string | `asc` or `desc` |

## Project Structure

```
SB-SummerCamps-2026/
├── backend/
│   ├── scraper.js      # Playwright-based web scraper
│   ├── scheduler.js    # Cron-based scheduling
│   ├── dataStore.js    # Data loading and filtering
│   └── server.js       # Express API server
├── src/
│   ├── App.jsx         # Main React application
│   ├── main.jsx        # React entry point
│   └── index.css       # Tailwind CSS
├── data/
│   ├── summer-camps-2026-full-45.csv  # Source data
│   ├── camps.json      # Scraped/processed data
│   └── scrape-log.json # Scrape history
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Data Fields

Each camp includes:

| Field | Description |
|-------|-------------|
| `camp_name` | Name of the camp |
| `description` | Full description |
| `ages` | Age range (e.g., "5-13") |
| `min_age` / `max_age` | Parsed numeric ages |
| `price_week` | Price per week |
| `min_price` / `max_price` | Parsed numeric prices |
| `hours` | Operating hours |
| `category` | Camp category |
| `indoor_outdoor` | Indoor, Outdoor, or Both |
| `food_provided` | Food/lunch policy |
| `extended_care` | Before/after care availability |
| `sibling_discount` | Sibling discount policy |
| `transport` | Transportation availability |
| `refund_policy` | Refund/cancellation policy |
| `contact_phone` | Phone number |
| `contact_email` | Email address |
| `address` | Physical address |
| `website` | Camp website |
| `2025_reg_date` | Registration date/info |
| `notes` | Additional notes |
| `keywords` | Extracted activity keywords |
| `is_closed` | Whether camp is closed |

## Scraper Details

The scraper uses Playwright to:

1. Load each camp's website
2. Wait for content to stabilize
3. Extract visible text content
4. Parse for key information:
   - Prices (using regex patterns)
   - Age ranges
   - Operating hours
   - Registration dates
   - Extended care availability
   - Food policies

The scraper respects websites with:
- 1-second delays between requests
- 15-second page timeouts
- Graceful error handling

## Customization

### Adding New Fields

1. Add field to CSV header
2. Update `loadCampsFromCSV()` in `dataStore.js`
3. Update `extractCampInfo()` in `scraper.js` for auto-extraction
4. Add field display in `App.jsx`

### Changing Categories

Edit `inferCategory()` in `dataStore.js` to customize category detection rules.

### Styling

The app uses Tailwind CSS. Edit `tailwind.config.js` or `src/index.css` for styling changes.

## License

MIT

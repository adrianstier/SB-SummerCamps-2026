import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CAMPS_FILE = path.join(DATA_DIR, 'camps.json');
const CSV_FILE = path.join(DATA_DIR, 'summer-camps-2026-enhanced.csv');

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse age string to min/max values
function parseAgeRange(ageStr) {
  if (!ageStr || ageStr === 'N/A' || ageStr === 'Various') {
    return { minAge: null, maxAge: null };
  }

  // Handle grade-based ages
  const gradeMap = {
    'K': 5, 'TK': 4, 'Pre-K': 4,
    '1': 6, '2': 7, '3': 8, '4': 9, '5': 10, '6': 11,
    '7': 12, '8': 13, '9': 14, '10': 15, '11': 16, '12': 17
  };

  // Try numeric patterns first: "5-13", "3-18"
  const numericMatch = ageStr.match(/(\d+)\s*(?:to|-|–)\s*(\d+)/);
  if (numericMatch) {
    return {
      minAge: parseInt(numericMatch[1]),
      maxAge: parseInt(numericMatch[2])
    };
  }

  // Grade patterns: "K-6", "TK-6", "Grades 1-8"
  const gradeMatch = ageStr.match(/(TK|Pre-K|K|\d+)\s*(?:to|-|–)\s*(TK|Pre-K|K|\d+)/i);
  if (gradeMatch) {
    const minGrade = gradeMatch[1].toUpperCase();
    const maxGrade = gradeMatch[2].toUpperCase();
    return {
      minAge: gradeMap[minGrade] || parseInt(minGrade) + 5,
      maxAge: gradeMap[maxGrade] || parseInt(maxGrade) + 5
    };
  }

  // Single age: "9-13" already handled, try single number
  const singleMatch = ageStr.match(/(\d+)/);
  if (singleMatch) {
    const age = parseInt(singleMatch[1]);
    return { minAge: age, maxAge: age + 5 };
  }

  return { minAge: null, maxAge: null };
}

// Parse price string to numeric value
function parsePrice(priceStr) {
  if (!priceStr || priceStr === 'N/A' || priceStr === 'CLOSED' || priceStr === '$TBD') {
    return { minPrice: null, maxPrice: null };
  }

  // Handle "Free" or similar
  if (/free/i.test(priceStr)) {
    return { minPrice: 0, maxPrice: 0 };
  }

  // Extract all dollar amounts
  const prices = [...priceStr.matchAll(/\$(\d+(?:,\d{3})?)/g)].map(m =>
    parseInt(m[1].replace(',', ''))
  );

  if (prices.length === 0) {
    return { minPrice: null, maxPrice: null };
  }

  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices)
  };
}

// Load camps from enhanced CSV
async function loadCampsFromCSV() {
  const content = await fs.readFile(CSV_FILE, 'utf-8');
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);

  const camps = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const camp = {};

    headers.forEach((header, idx) => {
      const key = header.toLowerCase().replace(/[\s\/]/g, '_');
      camp[key] = values[idx] || '';
    });

    // Generate ID
    camp.id = camp.camp_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    // Normalize website
    if (camp.website && camp.website !== 'N/A' && !camp.website.startsWith('http')) {
      camp.website_url = `https://${camp.website}`;
    } else {
      camp.website_url = camp.website;
    }

    // Use pre-parsed numeric fields from enhanced CSV if available
    if (camp.min_age && !isNaN(parseInt(camp.min_age))) {
      camp.min_age = parseInt(camp.min_age);
    } else {
      const { minAge } = parseAgeRange(camp.ages);
      camp.min_age = minAge;
    }

    if (camp.max_age && !isNaN(parseInt(camp.max_age))) {
      camp.max_age = parseInt(camp.max_age);
    } else {
      const { maxAge } = parseAgeRange(camp.ages);
      camp.max_age = maxAge;
    }

    // Use pre-parsed price fields from enhanced CSV if available
    if (camp.price_min && !isNaN(parseInt(camp.price_min))) {
      camp.min_price = parseInt(camp.price_min);
    } else {
      const { minPrice } = parsePrice(camp.price_week);
      camp.min_price = minPrice;
    }

    if (camp.price_max && !isNaN(parseInt(camp.price_max))) {
      camp.max_price = parseInt(camp.price_max);
    } else {
      const { maxPrice } = parsePrice(camp.price_week);
      camp.max_price = maxPrice;
    }

    // Use category from CSV if present, otherwise infer
    if (!camp.category || camp.category === '') {
      camp.category = inferCategory(camp);
    }

    // Parse boolean fields
    camp.has_extended_care = /yes/i.test(camp.extended_care) && !/no/i.test(camp.extended_care);
    camp.has_transport = /yes/i.test(camp.transport) && !/no/i.test(camp.transport);
    camp.has_sibling_discount = /yes/i.test(camp.sibling_discount) && !/no/i.test(camp.sibling_discount);
    camp.food_included = /yes|included|provided/i.test(camp.food_provided) && !/no|bring/i.test(camp.food_provided);

    // Status flags
    camp.is_closed = camp.category === 'CLOSED' || camp.category === 'NO CAMP' || /closed/i.test(camp.price_week);
    camp.is_active = !camp.is_closed;

    // Extract keywords for search
    camp.keywords = extractKeywords(camp);

    camps.push(camp);
  }

  return camps;
}

// Infer category from camp data
function inferCategory(camp) {
  const text = `${camp.camp_name} ${camp.description} ${camp.notes}`.toLowerCase();

  if (/surf|beach|ocean|lifeguard/i.test(text)) return 'Beach/Surf';
  if (/theater|theatre|drama|acting/i.test(text)) return 'Theater';
  if (/dance|ballet|hip hop/i.test(text)) return 'Dance';
  if (/art|painting|drawing|museum/i.test(text)) return 'Art';
  if (/stem|science|robot|engineer|tech/i.test(text)) return 'Science/STEM';
  if (/nature|outdoor|wilderness|hiking/i.test(text)) return 'Nature/Outdoor';
  if (/sport|soccer|basketball|baseball|golf|tennis|volleyball|hockey/i.test(text)) return 'Sports';
  if (/music|band|instrument/i.test(text)) return 'Music';
  if (/cook|culinary|kitchen/i.test(text)) return 'Cooking';
  if (/faith|christian|jewish|religious/i.test(text)) return 'Faith-Based';
  if (/zoo|animal/i.test(text)) return 'Animals/Zoo';
  if (/overnight|sleepaway/i.test(text)) return 'Overnight';
  if (/closed/i.test(text)) return 'CLOSED';

  return 'Multi-Activity';
}

// Extract searchable keywords
function extractKeywords(camp) {
  const text = `${camp.camp_name} ${camp.description} ${camp.notes} ${camp.indoor_outdoor}`.toLowerCase();
  const keywords = new Set();

  // Activity keywords
  const activities = [
    'surfing', 'swimming', 'hiking', 'climbing', 'kayaking', 'sailing',
    'art', 'painting', 'drawing', 'crafts', 'music', 'dance', 'theater',
    'acting', 'sports', 'soccer', 'basketball', 'baseball', 'volleyball',
    'tennis', 'golf', 'skating', 'robotics', 'coding', 'science', 'stem',
    'cooking', 'nature', 'animals', 'horses', 'gymnastics'
  ];

  activities.forEach(activity => {
    if (text.includes(activity)) keywords.add(activity);
  });

  // Environment keywords
  if (/outdoor|outside|beach|park|forest|nature/i.test(text)) keywords.add('outdoor');
  if (/indoor|inside|museum|studio|gym/i.test(text)) keywords.add('indoor');

  // Special features
  if (/scholarship|financial aid|sliding scale/i.test(text)) keywords.add('scholarships');
  if (/extended care|aftercare|before care/i.test(text)) keywords.add('extended-care');
  if (/lunch included|snacks provided|meals/i.test(text)) keywords.add('food-provided');
  if (/transport|bus|van/i.test(text)) keywords.add('transportation');
  if (/sibling/i.test(text)) keywords.add('sibling-discount');

  return Array.from(keywords);
}

// Load camps from enhanced CSV (preferred) or scraped data
async function loadCamps() {
  // Always prefer the enhanced CSV as it has curated data
  try {
    const camps = await loadCampsFromCSV();
    console.log(`Loaded ${camps.length} camps from enhanced CSV`);
    return camps;
  } catch (csvError) {
    console.log('Error loading CSV, trying scraped data...', csvError.message);
    try {
      const scrapedData = await fs.readFile(CAMPS_FILE, 'utf-8');
      const camps = JSON.parse(scrapedData);
      console.log(`Loaded ${camps.length} camps from scraped data`);
      return camps;
    } catch {
      console.error('No data sources available');
      return [];
    }
  }
}

// Get scrape log
async function getScrapeLog() {
  try {
    const logPath = path.join(DATA_DIR, 'scrape-log.json');
    const data = await fs.readFile(logPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Get all unique categories
async function getCategories() {
  const camps = await loadCamps();
  const categories = [...new Set(camps.map(c => c.category))].filter(c => c !== 'CLOSED');
  return categories.sort();
}

// Get all unique keywords
async function getAllKeywords() {
  const camps = await loadCamps();
  const keywords = new Set();
  camps.forEach(c => c.keywords?.forEach(k => keywords.add(k)));
  return Array.from(keywords).sort();
}

// Filter camps
function filterCamps(camps, filters) {
  return camps.filter(camp => {
    // Skip closed camps unless explicitly requested
    if (camp.is_closed && !filters.includeClosed) {
      return false;
    }

    // Age filter
    if (filters.age) {
      const age = parseInt(filters.age);
      if (camp.min_age !== null && camp.max_age !== null) {
        if (age < camp.min_age || age > camp.max_age) {
          return false;
        }
      }
    }

    // Age range filter
    if (filters.minAge && camp.max_age !== null && camp.max_age < parseInt(filters.minAge)) {
      return false;
    }
    if (filters.maxAge && camp.min_age !== null && camp.min_age > parseInt(filters.maxAge)) {
      return false;
    }

    // Category filter
    if (filters.category && filters.category !== 'All') {
      if (camp.category !== filters.category) {
        return false;
      }
    }

    // Price filter
    if (filters.maxPrice && camp.min_price !== null) {
      if (camp.min_price > parseInt(filters.maxPrice)) {
        return false;
      }
    }

    // Keywords filter
    if (filters.keywords && filters.keywords.length > 0) {
      const campKeywords = camp.keywords || [];
      const hasKeyword = filters.keywords.some(k => campKeywords.includes(k));
      if (!hasKeyword) return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchText = `${camp.camp_name} ${camp.description} ${camp.notes} ${camp.category}`.toLowerCase();
      if (!searchText.includes(searchLower)) {
        return false;
      }
    }

    // Feature filters
    if (filters.hasExtendedCare && !camp.has_extended_care) return false;
    if (filters.hasTransport && !camp.has_transport) return false;
    if (filters.hasSiblingDiscount && !camp.has_sibling_discount) return false;
    if (filters.foodIncluded && !camp.food_included) return false;

    return true;
  });
}

export {
  loadCamps,
  loadCampsFromCSV,
  getScrapeLog,
  getCategories,
  getAllKeywords,
  filterCamps
};

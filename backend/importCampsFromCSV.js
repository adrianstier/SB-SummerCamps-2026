import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Use service role key for admin operations, fall back to anon key
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_KEY !== 'your-service-role-key-here'
  ? process.env.SUPABASE_SERVICE_KEY
  : process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase configuration required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

// Parse price string to extract min/max
function parsePrice(priceStr) {
  if (!priceStr || priceStr === 'N/A' || priceStr.includes('CLOSED') || priceStr.includes('Free')) {
    return { min: null, max: null, display: priceStr };
  }

  const prices = priceStr.match(/\$?([\d,]+)/g);
  if (prices && prices.length > 0) {
    const nums = prices.map(p => parseInt(p.replace(/[$,]/g, '')));
    return {
      min: Math.min(...nums),
      max: Math.max(...nums),
      display: priceStr
    };
  }
  return { min: null, max: null, display: priceStr };
}

// Parse age string to extract min/max
function parseAge(ageStr) {
  if (!ageStr || ageStr === 'N/A') {
    return { min: null, max: null, display: ageStr };
  }

  // Handle grade-based ages
  if (ageStr.includes('K-') || ageStr.includes('TK-')) {
    const match = ageStr.match(/(\d+)/g);
    if (match) {
      return { min: 5, max: parseInt(match[match.length - 1]) + 5, display: ageStr };
    }
  }

  // Handle age ranges
  const ages = ageStr.match(/(\d+)/g);
  if (ages && ages.length > 0) {
    const nums = ages.map(a => parseInt(a)).filter(a => a <= 25);
    if (nums.length > 0) {
      return {
        min: Math.min(...nums),
        max: Math.max(...nums),
        display: ageStr
      };
    }
  }
  return { min: null, max: null, display: ageStr };
}

// Generate unique ID from camp name
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

async function importCamps() {
  console.log('Loading camps from CSV...');

  const csvPath = path.join(__dirname, '..', 'data', 'summer-camps-2026-full-45.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);

  console.log(`Found ${lines.length - 1} camps in CSV`);
  console.log('Headers:', headers.join(', '));

  const camps = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    // Skip closed camps
    if (row['Camp Name']?.includes('CLOSED') || row['Price/Week']?.includes('CLOSED') || row['Notes']?.includes('PERMANENTLY CLOSED')) {
      console.log(`  Skipping closed: ${row['Camp Name']}`);
      continue;
    }

    // Skip non-camp entries
    if (row['Ages'] === 'N/A' && row['Price/Week'] === 'N/A') {
      console.log(`  Skipping non-camp: ${row['Camp Name']}`);
      continue;
    }

    const price = parsePrice(row['Price/Week']);
    const age = parseAge(row['Ages']);

    // Determine category from description and notes
    let category = 'General';
    const desc = (row['Description'] || '').toLowerCase();
    const name = (row['Camp Name'] || '').toLowerCase();

    if (desc.includes('surf') || desc.includes('beach') || name.includes('surf') || name.includes('beach')) {
      category = 'Beach & Water';
    } else if (desc.includes('art') || desc.includes('paint') || name.includes('art')) {
      category = 'Arts';
    } else if (desc.includes('stem') || desc.includes('science') || desc.includes('robot') || name.includes('science')) {
      category = 'STEM';
    } else if (desc.includes('theater') || desc.includes('theatre') || desc.includes('drama') || desc.includes('acting')) {
      category = 'Performing Arts';
    } else if (desc.includes('dance') || name.includes('dance')) {
      category = 'Dance';
    } else if (desc.includes('sport') || desc.includes('soccer') || desc.includes('basketball') || desc.includes('golf')) {
      category = 'Sports';
    } else if (desc.includes('nature') || desc.includes('outdoor') || desc.includes('wilderness') || desc.includes('hiking')) {
      category = 'Nature & Outdoor';
    } else if (desc.includes('cook') || name.includes('cook')) {
      category = 'Cooking';
    } else if (desc.includes('music') || desc.includes('band')) {
      category = 'Music';
    } else if (desc.includes('animal') || desc.includes('zoo')) {
      category = 'Animals';
    }

    // Normalize website
    let website = row['Website'] || '';
    if (website && !website.startsWith('http')) {
      website = `https://${website}`;
    }

    const camp = {
      id: generateId(row['Camp Name']),
      camp_name: row['Camp Name'],
      organization: null,
      description: row['Description'] || null,
      category: category,
      ages: age.display || null,
      min_age: age.min,
      max_age: age.max,
      price_week: price.display || null,
      min_price: price.min,
      max_price: price.max,
      hours: row['Hours'] || null,
      drop_off: null,
      pick_up: null,
      indoor_outdoor: row['Indoor/Outdoor'] || null,
      food_provided: row['Food Provided'] || null,
      food_included: row['Food Provided']?.toLowerCase().includes('yes') || row['Food Provided']?.toLowerCase().includes('included') || false,
      extended_care: row['Extended Care'] || null,
      extended_care_cost: null,
      has_extended_care: row['Extended Care']?.toLowerCase().includes('yes') || false,
      sibling_discount: row['Sibling Discount'] || null,
      has_sibling_discount: row['Sibling Discount']?.toLowerCase().includes('yes') || false,
      multi_week_discount: row['Multi-Week Discount'] || null,
      swim_requirement: row['Swim Requirement'] || null,
      transport: row['Transport'] || null,
      has_transport: row['Transport']?.toLowerCase().includes('yes') || row['Transport']?.toLowerCase().includes('bus') || false,
      refund_policy: row['Refund Policy'] || null,
      contact_phone: row['Contact Phone'] || null,
      contact_email: row['Contact Email'] || null,
      address: row['Address'] || null,
      website: row['Website'] || null,
      website_url: website || null,
      reg_date_2026: row['2025 Reg Date'] || null, // Using 2025 as reference
      reg_status: null,
      summer_dates: null,
      weeks_available: null,
      staff_ratio: null,
      scholarships_available: row['Notes']?.toLowerCase().includes('scholarship') || false,
      certifications: null,
      notes: row['Notes'] || null,
      keywords: [],
      is_closed: false,
      last_updated: new Date().toISOString(),
      scrape_timestamp: null,
      scrape_status: null,
      image_url: null
    };

    camps.push(camp);
  }

  console.log(`\nPrepared ${camps.length} camps for upload`);

  // Upload in batches
  const batchSize = 10;
  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < camps.length; i += batchSize) {
    const batch = camps.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('camps')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error uploading batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      // Try one by one to find the problematic record
      for (const camp of batch) {
        const { error: singleError } = await supabase
          .from('camps')
          .upsert(camp, { onConflict: 'id' });
        if (singleError) {
          console.error(`  Failed: ${camp.camp_name} - ${singleError.message}`);
          errors++;
        } else {
          uploaded++;
        }
      }
    } else {
      uploaded += batch.length;
      console.log(`Uploaded ${uploaded}/${camps.length} camps`);
    }
  }

  console.log(`\n--- Upload Complete ---`);
  console.log(`Successfully uploaded: ${uploaded}`);
  console.log(`Errors: ${errors}`);
}

importCamps().catch(console.error);

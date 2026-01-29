import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'your-service-role-key-here') {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  console.error('Get the service role key from Supabase Dashboard > Settings > API > Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadCamps() {
  console.log('Loading camps data...');

  const campsPath = path.join(__dirname, '..', 'data', 'camps.json');
  const campsData = JSON.parse(fs.readFileSync(campsPath, 'utf-8'));

  // Merge image URLs from camp-images.json
  const imagesPath = path.join(__dirname, '..', 'data', 'camp-images.json');
  if (fs.existsSync(imagesPath)) {
    const imagesData = JSON.parse(fs.readFileSync(imagesPath, 'utf-8'));
    const imageMap = new Map(imagesData.map(img => [img.id, img.image_url]));
    campsData.forEach(camp => {
      if (!camp.image_url && imageMap.has(camp.id)) {
        camp.image_url = imageMap.get(camp.id);
      }
    });
    console.log(`Merged ${imageMap.size} image URLs from camp-images.json`);
  }

  console.log(`Found ${campsData.length} camps to upload`);

  // Transform data to match table schema
  const camps = campsData.map(camp => ({
    id: camp.id,
    camp_name: camp.camp_name,
    organization: camp.organization || null,
    description: camp.description || null,
    category: camp.category || null,
    ages: camp.ages || null,
    min_age: camp.min_age ? parseInt(camp.min_age) : null,
    max_age: camp.max_age ? parseInt(camp.max_age) : null,
    price_week: camp.price_week || null,
    min_price: camp.price_min || camp.min_price ? parseFloat(camp.price_min || camp.min_price) : null,
    max_price: camp.price_max || camp.max_price ? parseFloat(camp.price_max || camp.max_price) : null,
    hours: camp.hours || null,
    drop_off: camp.drop_off || null,
    pick_up: camp.pick_up || null,
    indoor_outdoor: camp.indoor_outdoor || null,
    food_provided: camp.food_provided || null,
    food_included: camp.food_included || false,
    extended_care: camp.extended_care || null,
    extended_care_cost: camp.extended_care_cost || null,
    has_extended_care: camp.has_extended_care || false,
    sibling_discount: camp.sibling_discount || null,
    has_sibling_discount: camp.has_sibling_discount || false,
    multi_week_discount: camp['multi-week_discount'] || camp.multi_week_discount || null,
    swim_requirement: camp.swim_requirement || null,
    transport: camp.transport || null,
    has_transport: camp.has_transport || false,
    refund_policy: camp.refund_policy || null,
    contact_phone: camp.contact_phone || null,
    contact_email: camp.contact_email || null,
    address: camp.address || null,
    website: camp.website || null,
    website_url: camp.website_url || null,
    reg_date_2026: camp['2026_reg_date'] || null,
    reg_status: camp.reg_status || null,
    summer_dates: camp.summer_dates || null,
    weeks_available: camp.weeks_available || null,
    staff_ratio: camp.staff_ratio || null,
    scholarships_available: camp.scholarships_available || null,
    certifications: camp.certifications || null,
    notes: camp.notes || null,
    keywords: camp.keywords || [],
    is_closed: camp.is_closed || false,
    last_updated: camp.last_updated ? new Date(camp.last_updated).toISOString() : null,
    scrape_timestamp: camp.scrape_timestamp || null,
    scrape_status: camp.scrape_status || null,
    extracted: camp.extracted || {},
    pdf_links: camp.pdf_links || [],
    social_media: camp.social_media || {},
    image_url: camp.image_url || null,
    has_2026: camp.has_2026 || false,
    pages_scraped: camp.pages_scraped || []
  }));

  console.log('Uploading to Supabase...');

  // Upsert in batches
  const batchSize = 20;
  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < camps.length; i += batchSize) {
    const batch = camps.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('camps')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Error uploading batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      uploaded += batch.length;
      console.log(`Uploaded ${uploaded}/${camps.length} camps`);
    }
  }

  console.log(`\nUpload complete!`);
  console.log(`  Successfully uploaded: ${uploaded}`);
  console.log(`  Errors: ${errors}`);
}

uploadCamps().catch(console.error);

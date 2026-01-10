import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadCamps,
  getScrapeLog,
  getCategories,
  getAllKeywords,
  filterCamps
} from './dataStore.js';
import { runScraper } from './scraper.js';
import { emailService } from './emailService.js';
import {
  authenticate,
  authorize,
  rateLimit,
  apiKeyAuth,
  requestLogger,
  errorHandler
} from './authMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// SECURITY: Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for third-party images
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// SECURITY: Configure CORS with explicit allowed origins
const ALLOWED_ORIGINS = [
  'https://sb-summer-camps.vercel.app',
  'https://sb-summercamps.vercel.app',
  // Development origins (only active in non-production)
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400 // Cache preflight for 24 hours
}));

app.use(express.json());

// Add request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger());
}

// SECURITY: Apply tiered rate limiting
// Global rate limit - standard for most endpoints
const isProduction = process.env.NODE_ENV === 'production';
app.use('/api', rateLimit({
  windowMs: 60000,    // 1 minute
  maxRequests: isProduction ? 100 : 500  // Stricter in production
}));

// SECURITY: Stricter rate limits for sensitive endpoints
app.use('/api/notifications', rateLimit({
  windowMs: 60000,    // 1 minute
  maxRequests: isProduction ? 10 : 50,
  message: 'Too many notification requests, please try again later'
}));

app.use('/api/admin', rateLimit({
  windowMs: 60000,    // 1 minute
  maxRequests: isProduction ? 30 : 100,
  message: 'Too many admin requests, please try again later'
}));

app.use('/api/scrape', rateLimit({
  windowMs: 300000,   // 5 minutes
  maxRequests: isProduction ? 5 : 20,
  message: 'Too many scrape requests, please try again later'
}));

// Serve static files from dist in production
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Cache for camps data (refresh every 5 minutes)
let campsCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getCamps() {
  const now = Date.now();
  if (!campsCache || now - cacheTime > CACHE_TTL) {
    campsCache = await loadCamps();
    cacheTime = now;
  }
  return campsCache;
}

// API Routes

// Get all camps with filtering
app.get('/api/camps', async (req, res) => {
  try {
    const camps = await getCamps();

    const filters = {
      search: req.query.search,
      category: req.query.category,
      age: req.query.age,
      minAge: req.query.minAge,
      maxAge: req.query.maxAge,
      maxPrice: req.query.maxPrice,
      keywords: req.query.keywords ? req.query.keywords.split(',') : null,
      hasExtendedCare: req.query.extendedCare === 'true',
      hasTransport: req.query.transport === 'true',
      hasSiblingDiscount: req.query.siblingDiscount === 'true',
      foodIncluded: req.query.foodIncluded === 'true',
      includeClosed: req.query.includeClosed === 'true'
    };

    const filtered = filterCamps(camps, filters);

    // Sort
    const sortBy = req.query.sortBy || 'camp_name';
    const sortDir = req.query.sortDir || 'asc';

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle numeric sorts
      if (sortBy === 'min_price' || sortBy === 'max_price') {
        aVal = aVal ?? Infinity;
        bVal = bVal ?? Infinity;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    res.json({
      total: filtered.length,
      camps: filtered
    });
  } catch (error) {
    console.error('Error loading camps:', error);
    res.status(500).json({ error: 'Failed to load camps' });
  }
});

// Get single camp by ID
app.get('/api/camps/:id', async (req, res) => {
  try {
    const camps = await getCamps();
    const camp = camps.find(c => c.id === req.params.id);

    if (!camp) {
      return res.status(404).json({ error: 'Camp not found' });
    }

    res.json(camp);
  } catch (error) {
    console.error('Error loading camp:', error);
    res.status(500).json({ error: 'Failed to load camp' });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error loading categories:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// Get keywords
app.get('/api/keywords', async (req, res) => {
  try {
    const keywords = await getAllKeywords();
    res.json(keywords);
  } catch (error) {
    console.error('Error loading keywords:', error);
    res.status(500).json({ error: 'Failed to load keywords' });
  }
});

// Get scrape status
app.get('/api/scrape/status', async (req, res) => {
  try {
    const log = await getScrapeLog();
    res.json(log || { status: 'never_run' });
  } catch (error) {
    console.error('Error loading scrape status:', error);
    res.status(500).json({ error: 'Failed to load scrape status' });
  }
});

// Trigger a new scrape (admin endpoint - requires authentication)
app.post('/api/scrape/run',
  authenticate(),
  authorize('admin'),
  async (req, res) => {
    try {
      const { limit, singleCamp } = req.body;

      // Clear cache
      campsCache = null;

      res.json({ status: 'started', message: 'Scrape job started' });

      // Run scraper in background
      runScraper({ limit, singleCamp }).then(() => {
        console.log('Scrape completed');
      }).catch(err => {
        console.error('Scrape failed:', err);
      });
    } catch (error) {
      console.error('Error starting scrape:', error);
      res.status(500).json({ error: 'Failed to start scrape' });
    }
  }
);

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const camps = await getCamps();
    const active = camps.filter(c => !c.is_closed);

    const stats = {
      total: camps.length,
      active: active.length,
      closed: camps.length - active.length,
      categories: {},
      priceRange: {
        min: null,
        max: null
      },
      ageRange: {
        min: null,
        max: null
      }
    };

    // Count by category
    active.forEach(camp => {
      stats.categories[camp.category] = (stats.categories[camp.category] || 0) + 1;
    });

    // Price range
    const prices = active.filter(c => c.min_price !== null).map(c => c.min_price);
    if (prices.length) {
      stats.priceRange.min = Math.min(...prices);
      stats.priceRange.max = Math.max(...active.filter(c => c.max_price !== null).map(c => c.max_price));
    }

    // Age range
    const ages = active.filter(c => c.min_age !== null);
    if (ages.length) {
      stats.ageRange.min = Math.min(...ages.map(c => c.min_age));
      stats.ageRange.max = Math.max(...ages.filter(c => c.max_age !== null).map(c => c.max_age));
    }

    res.json(stats);
  } catch (error) {
    console.error('Error loading stats:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ============================================================================
// EMAIL NOTIFICATION ENDPOINTS
// ============================================================================

// Process notification queue (called by cron job or admin)
app.post('/api/notifications/process',
  apiKeyAuth({ headerName: 'x-api-key', envVar: 'INTERNAL_API_KEY' }),
  async (req, res) => {
    try {
      const result = await emailService.processNotificationQueue();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error processing notifications:', error);
      res.status(500).json({ error: 'Failed to process notifications' });
    }
  }
);

// Send weekly digest emails (called by cron job or admin)
app.post('/api/notifications/digest',
  apiKeyAuth({ headerName: 'x-api-key', envVar: 'INTERNAL_API_KEY' }),
  async (req, res) => {
    try {
      const result = await emailService.sendWeeklyDigests();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error sending digest:', error);
      res.status(500).json({ error: 'Failed to send digest' });
    }
  }
);

// Test email endpoint (development only)
app.post('/api/notifications/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { email, type } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await emailService.sendEmail(
      email,
      `Test Email - ${type || 'general'}`,
      `<div style="font-family: sans-serif; padding: 20px;">
        <h1>Test Email</h1>
        <p>This is a test email from Santa Barbara Summer Camps.</p>
        <p>Type: ${type || 'general'}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </div>`
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// ============================================================================
// ADMIN API ENDPOINTS
// ============================================================================

// Get admin dashboard stats
app.get('/api/admin/stats',
  authenticate(),
  authorize('admin'),
  async (req, res) => {
    try {
      const camps = await getCamps();
      const active = camps.filter(c => !c.is_closed);

      // This would typically query Supabase for user/review stats
      // For now, return camp-based stats
      res.json({
        totalCamps: camps.length,
        activeCamps: active.length,
        closedCamps: camps.length - active.length,
        categories: Object.entries(
          active.reduce((acc, camp) => {
            acc[camp.category] = (acc[camp.category] || 0) + 1;
            return acc;
          }, {})
        ).map(([name, count]) => ({ name, count }))
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
      res.status(500).json({ error: 'Failed to load admin stats' });
    }
  }
);

// Get current user profile (authenticated)
app.get('/api/me',
  authenticate(),
  async (req, res) => {
    res.json({
      user: req.user,
      profile: req.profile
    });
  }
);

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  // Initialize email service
  await emailService.initialize();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log('  GET  /api/camps               - List camps with filtering');
    console.log('  GET  /api/camps/:id           - Get single camp');
    console.log('  GET  /api/categories          - List categories');
    console.log('  GET  /api/keywords            - List keywords');
    console.log('  GET  /api/stats               - Get statistics');
    console.log('  GET  /api/scrape/status       - Get last scrape info');
    console.log('  POST /api/scrape/run          - Trigger new scrape (admin)');
    console.log('  POST /api/notifications/process - Process email queue');
    console.log('  POST /api/notifications/digest  - Send weekly digest');
    console.log('  GET  /api/admin/stats         - Admin dashboard stats');
    console.log('  GET  /api/me                  - Get current user profile');
  });
}

startServer().catch(console.error);

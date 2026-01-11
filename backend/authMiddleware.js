import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * SECURITY: Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Initialize Supabase client with service key for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabaseAdmin = null;
let supabaseAnon = null;

// Initialize clients (lazy loading)
function getSupabaseAdmin() {
  if (!supabaseAdmin && supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin;
}

function getSupabaseAnon() {
  if (!supabaseAnon && supabaseUrl && supabaseAnonKey) {
    supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseAnon;
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verify JWT token and get user
 */
async function verifyToken(token) {
  const supabase = getSupabaseAnon();
  if (!supabase) {
    console.warn('Supabase not configured, skipping auth verification');
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Get user profile including role
 */
async function getUserProfile(userId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    return error ? null : data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

/**
 * Authentication middleware - verifies JWT token
 * Adds user object to request if valid
 */
export function authenticate(options = {}) {
  const { required = true } = options;

  return async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
      if (required) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication token is required'
        });
      }
      return next();
    }

    const user = await verifyToken(token);

    if (!user) {
      if (required) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }
      return next();
    }

    // Get user profile with role
    const profile = await getUserProfile(user.id);

    req.user = user;
    req.profile = profile;

    // Update last_active_at (fire and forget)
    const supabase = getSupabaseAdmin();
    if (supabase) {
      supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {});
    }

    next();
  };
}

/**
 * Authorization middleware - checks user role
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = req.profile?.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Rate limiting middleware
 * Supports both in-memory (development) and Redis (production) storage
 *
 * SECURITY: For production with multiple instances, configure REDIS_URL
 * to enable distributed rate limiting that works across server instances.
 */
const rateLimitStore = new Map();
let redisClient = null;

// Initialize Redis if available (for distributed rate limiting)
async function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    // Dynamic import to avoid requiring redis in development
    const { createClient } = await import('redis');
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.error('Redis error:', err));
    await redisClient.connect();
    console.log('Redis connected for distributed rate limiting');
    return redisClient;
  } catch (err) {
    console.warn('Redis not available, falling back to in-memory rate limiting:', err.message);
    return null;
  }
}

// Initialize Redis on module load (non-blocking)
getRedisClient().catch(() => {});

export function rateLimit(options = {}) {
  const {
    windowMs = 60000,      // 1 minute
    maxRequests = 100,     // max requests per window
    keyGenerator = (req) => req.ip || 'unknown',
    message = 'Too many requests, please try again later',
    keyPrefix = 'rl:'      // Redis key prefix
  } = options;

  // Cleanup old entries periodically (for in-memory store)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.windowStart > windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  // Prevent interval from keeping process alive
  cleanupInterval.unref?.();

  return async (req, res, next) => {
    const key = keyGenerator(req);
    const fullKey = `${keyPrefix}${key}`;
    const now = Date.now();

    let count;
    let windowStart;

    // Try Redis first, fall back to in-memory
    const redis = await getRedisClient();

    if (redis) {
      try {
        // Atomic increment with expiration in Redis
        const multi = redis.multi();
        multi.incr(fullKey);
        multi.pTTL(fullKey);
        const results = await multi.exec();

        count = results[0];
        const ttl = results[1];

        // Set expiration on first request in window
        if (ttl === -1) {
          await redis.pExpire(fullKey, windowMs);
          windowStart = now;
        } else {
          windowStart = now - (windowMs - ttl);
        }
      } catch (err) {
        console.error('Redis rate limit error, falling back to memory:', err);
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    if (count === undefined) {
      let record = rateLimitStore.get(key);

      if (!record || now - record.windowStart > windowMs) {
        record = { windowStart: now, count: 0 };
      }

      record.count++;
      rateLimitStore.set(key, record);

      count = record.count;
      windowStart = record.windowStart;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + windowMs) / 1000));

    if (count > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil((windowStart + windowMs - now) / 1000)
      });
    }

    next();
  };
}

/**
 * API Key authentication for internal/server-to-server calls
 * SECURITY: Uses constant-time comparison to prevent timing attacks
 * SECURITY: Requires minimum key length to prevent weak keys
 */
export function apiKeyAuth(options = {}) {
  const {
    headerName = 'x-api-key',
    envVar = 'INTERNAL_API_KEY',
    minKeyLength = 32  // Minimum 32 chars (256 bits) for security
  } = options;

  return (req, res, next) => {
    const apiKey = req.headers[headerName];
    const expectedKey = process.env[envVar];

    if (!expectedKey) {
      console.warn(`API key env var ${envVar} not configured`);
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'API key not configured'
      });
    }

    // SECURITY: Enforce minimum key length
    if (expectedKey.length < minKeyLength) {
      console.error(`SECURITY WARNING: ${envVar} is too short (${expectedKey.length} chars). Minimum ${minKeyLength} required.`);
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'API key configuration is insecure'
      });
    }

    // SECURITY: Use constant-time comparison to prevent timing attacks
    if (!apiKey || !secureCompare(apiKey, expectedKey)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    req.isServiceAccount = true;
    next();
  };
}

/**
 * CORS configuration middleware
 */
export function corsConfig(options = {}) {
  const {
    allowedOrigins = ['http://localhost:5173', 'http://localhost:3001'],
    allowCredentials = true
  } = options;

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    if (allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
}

/**
 * Request logging middleware
 */
export function requestLogger(options = {}) {
  const { includeBody = false, logLevel = 'info' } = options;

  return (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    // Log request
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - IP: ${ip}`);

    if (includeBody && req.body && Object.keys(req.body).length > 0) {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
    }

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - ${statusCode} (${duration}ms)`);
    });

    next();
  };
}

/**
 * Error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';

  const statusCode = err.statusCode || err.status || 500;
  const message = isProduction && statusCode === 500
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    ...(isProduction ? {} : { stack: err.stack })
  });
}

/**
 * Validation helper
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    const errors = [];

    // Validate body
    if (schema.body) {
      for (const [key, rules] of Object.entries(schema.body)) {
        const value = req.body?.[key];

        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({ field: key, message: `${key} is required` });
          continue;
        }

        if (value !== undefined && value !== null) {
          if (rules.type && typeof value !== rules.type) {
            errors.push({ field: key, message: `${key} must be a ${rules.type}` });
          }

          if (rules.minLength && value.length < rules.minLength) {
            errors.push({ field: key, message: `${key} must be at least ${rules.minLength} characters` });
          }

          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({ field: key, message: `${key} must be at most ${rules.maxLength} characters` });
          }

          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({ field: key, message: rules.message || `${key} is invalid` });
          }
        }
      }
    }

    // Validate query
    if (schema.query) {
      for (const [key, rules] of Object.entries(schema.query)) {
        const value = req.query?.[key];

        if (rules.required && !value) {
          errors.push({ field: key, message: `Query parameter ${key} is required` });
        }
      }
    }

    // Validate params
    if (schema.params) {
      for (const [key, rules] of Object.entries(schema.params)) {
        const value = req.params?.[key];

        if (rules.required && !value) {
          errors.push({ field: key, message: `URL parameter ${key} is required` });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * CSRF Protection middleware
 * SECURITY: Protects against Cross-Site Request Forgery attacks
 *
 * For this app, CSRF risk is low because:
 * 1. We use Bearer token auth (not cookies)
 * 2. Tokens are stored in memory, not automatically sent
 *
 * However, this provides defense-in-depth by validating Origin header.
 */
const csrfTokenStore = new Map();

export function csrfProtection(options = {}) {
  const {
    allowedOrigins = [],
    tokenHeader = 'x-csrf-token',
    tokenLength = 32,
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS']
  } = options;

  return (req, res, next) => {
    // Skip for safe methods
    if (ignoreMethods.includes(req.method)) {
      return next();
    }

    // Check Origin header (primary defense)
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (origin) {
      // Origin header present - validate it
      const isAllowed = allowedOrigins.length === 0 ||
        allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed));

      if (!isAllowed) {
        console.warn(`CSRF: Blocked request from origin ${origin}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid request origin'
        });
      }
    } else if (referer) {
      // No origin but has referer - validate referer
      try {
        const refererOrigin = new URL(referer).origin;
        const isAllowed = allowedOrigins.length === 0 ||
          allowedOrigins.some(allowed => refererOrigin === allowed || refererOrigin.startsWith(allowed));

        if (!isAllowed) {
          console.warn(`CSRF: Blocked request from referer ${referer}`);
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid request referer'
          });
        }
      } catch (err) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid referer header'
        });
      }
    }
    // Note: Requests with neither origin nor referer are allowed
    // (e.g., server-to-server API calls with API key)

    next();
  };
}

/**
 * Generate CSRF token for a session
 */
export function generateCsrfToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
}

export default {
  authenticate,
  authorize,
  rateLimit,
  apiKeyAuth,
  corsConfig,
  requestLogger,
  errorHandler,
  validateRequest,
  csrfProtection,
  generateCsrfToken
};

/**
 * Global Error Handling Utilities
 * Provides consistent error handling, user-friendly messages, and error tracking
 */
import { useState, useCallback } from 'react';

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN', originalError = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    this.userFriendly = true; // Indicates message is safe to show users
  }
}

/**
 * Map of error codes to user-friendly messages
 */
const ERROR_MESSAGES = {
  // Database errors
  'PGRST116': 'No data found. Please refresh and try again.',
  '23505': 'This item already exists.',
  '23503': 'Cannot delete - item is in use elsewhere.',
  '42P01': 'Database table not found. Please contact support.',

  // Auth errors
  'auth/invalid-credential': 'Invalid login credentials.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',

  // Validation errors
  'VALIDATION_ERROR': 'Invalid data provided.',
  'SCHEDULE_CONFLICT': 'Schedule conflict detected.',
  'ALREADY_MEMBER': 'You are already a member.',
  'INVALID_INVITE': 'Invalid or expired invite code.',

  // Permission errors
  'PERMISSION_DENIED': 'You do not have permission to do that.',
  'AUTH_REQUIRED': 'Please sign in to continue.',

  // Generic errors
  'NETWORK_ERROR': 'Network error. Check your connection.',
  'TIMEOUT': 'Request timed out. Please try again.',
  'UNKNOWN': 'Something went wrong. Please try again.'
};

/**
 * Determines if an error is retryable
 */
function isRetryable(code) {
  const nonRetryableErrors = [
    '23505', // Unique constraint violation
    '23503', // Foreign key violation
    'PERMISSION_DENIED',
    'AUTH_REQUIRED',
    'VALIDATION_ERROR',
    'ALREADY_MEMBER',
    'INVALID_INVITE'
  ];

  return !nonRetryableErrors.includes(code);
}

/**
 * Extract error code from various error formats
 */
function extractErrorCode(error) {
  if (error.code) return error.code;
  if (error.originalError?.code) return error.originalError.code;
  if (error.message?.includes('PGRST')) {
    const match = error.message.match(/PGRST\d+/);
    if (match) return match[0];
  }
  return 'UNKNOWN';
}

/**
 * Handle async errors with user-friendly messages
 */
export function handleAsyncError(error, context = '') {
  console.error(`[${context}]`, error);

  const code = extractErrorCode(error);
  const userMessage = ERROR_MESSAGES[code] || ERROR_MESSAGES['UNKNOWN'];

  // Log to error tracking service if available
  if (window.Sentry) {
    window.Sentry.captureException(error, {
      tags: { context },
      extra: { code, originalError: error.originalError }
    });
  }

  return {
    message: userMessage,
    code,
    canRetry: isRetryable(code),
    originalError: error
  };
}

/**
 * Wrapper for async functions with automatic error handling
 *
 * Usage:
 * const safeFunction = withErrorHandling(async () => {
 *   // your code
 * }, 'functionName');
 */
export function withErrorHandling(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const handled = handleAsyncError(error, context);

      // Re-throw as AppError for consistent handling
      throw new AppError(handled.message, handled.code, error);
    }
  };
}

/**
 * React hook for handling errors with state
 */
export function useErrorHandler() {
  const [error, setError] = useState(null);

  const handleError = useCallback((err, context = '') => {
    const handled = handleAsyncError(err, context);
    setError(handled);
    return handled;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
}

/**
 * Utility to safely parse and handle Supabase errors
 */
export function parseSupabaseError(error) {
  if (!error) return null;

  // Supabase returns {error: {message, code, ...}}
  const message = error.message || error.msg || 'Unknown error';
  const code = error.code || error.error_code || extractErrorCode(error);

  return new AppError(
    ERROR_MESSAGES[code] || message,
    code,
    error
  );
}

/**
 * Validation error formatter
 * Converts Zod validation errors to user-friendly messages
 */
export function formatValidationError(zodError) {
  const firstError = zodError.errors[0];
  const field = firstError.path.join('.');
  const message = firstError.message;

  return new AppError(
    `${field}: ${message}`,
    'VALIDATION_ERROR',
    zodError
  );
}

/**
 * Network error detector
 */
export function isNetworkError(error) {
  return (
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.code === 'NETWORK_ERROR' ||
    !navigator.onLine
  );
}

/**
 * Retry helper for failed operations
 */
export async function retryOperation(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Do not retry if error is not retryable
      const code = extractErrorCode(error);
      if (!isRetryable(code)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

/**
 * Global unhandled rejection handler
 * Catches any promises that reject without .catch()
 */
export function setupGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    const handled = handleAsyncError(event.reason, 'unhandledRejection');

    // Show user notification for critical unhandled errors
    if (handled.code === 'UNKNOWN') {
      console.warn('Unhandled error should be caught and handled properly');
    }

    // Prevent default browser error display
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    handleAsyncError(event.error, 'globalError');
  });
}

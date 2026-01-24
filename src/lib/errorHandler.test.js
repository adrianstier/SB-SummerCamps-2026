import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  handleAsyncError,
  withErrorHandling,
  parseSupabaseError,
  formatValidationError,
  isNetworkError,
  retryOperation,
} from './errorHandler';

describe('AppError', () => {
  it('creates error with message, code, and originalError', () => {
    const original = new Error('db failed');
    const err = new AppError('Something went wrong', 'DB_ERROR', original);

    expect(err.message).toBe('Something went wrong');
    expect(err.code).toBe('DB_ERROR');
    expect(err.originalError).toBe(original);
    expect(err.name).toBe('AppError');
    expect(err.userFriendly).toBe(true);
    expect(err.timestamp).toBeDefined();
  });

  it('defaults to UNKNOWN code', () => {
    const err = new AppError('oops');
    expect(err.code).toBe('UNKNOWN');
    expect(err.originalError).toBe(null);
  });

  it('is an instance of Error', () => {
    const err = new AppError('test');
    expect(err instanceof Error).toBe(true);
  });
});

describe('handleAsyncError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Sentry;
  });

  it('returns user-friendly message for known error codes', () => {
    const result = handleAsyncError({ code: '23505' }, 'test');
    expect(result.message).toBe('This item already exists.');
    expect(result.code).toBe('23505');
    expect(result.canRetry).toBe(false);
  });

  it('returns generic message for unknown errors', () => {
    const result = handleAsyncError(new Error('random'), 'test');
    expect(result.message).toBe('Something went wrong. Please try again.');
    expect(result.code).toBe('UNKNOWN');
    expect(result.canRetry).toBe(true);
  });

  it('identifies PGRST errors from message', () => {
    const result = handleAsyncError({ message: 'PGRST116: no rows found' }, 'test');
    expect(result.code).toBe('PGRST116');
    expect(result.message).toBe('No data found. Please refresh and try again.');
  });

  it('marks permission errors as non-retryable', () => {
    const result = handleAsyncError({ code: 'PERMISSION_DENIED' }, 'test');
    expect(result.canRetry).toBe(false);
  });

  it('marks auth errors as non-retryable', () => {
    const result = handleAsyncError({ code: 'AUTH_REQUIRED' }, 'test');
    expect(result.canRetry).toBe(false);
  });

  it('marks validation errors as non-retryable', () => {
    const result = handleAsyncError({ code: 'VALIDATION_ERROR' }, 'test');
    expect(result.canRetry).toBe(false);
  });

  it('marks network errors as retryable', () => {
    const result = handleAsyncError({ code: 'NETWORK_ERROR' }, 'test');
    expect(result.canRetry).toBe(true);
  });

  it('reports to Sentry if available', () => {
    const captureException = vi.fn();
    window.Sentry = { captureException };

    handleAsyncError(new Error('test'), 'myContext');

    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { context: 'myContext' } })
    );
  });

  it('logs to console with context', () => {
    handleAsyncError(new Error('test'), 'myContext');
    expect(console.error).toHaveBeenCalledWith('[myContext]', expect.any(Error));
  });
});

describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through successful results', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const wrapped = withErrorHandling(fn, 'test');

    const result = await wrapped('arg1', 'arg2');

    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('converts errors to AppError', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('failed'));
    const wrapped = withErrorHandling(fn, 'test');

    await expect(wrapped()).rejects.toThrow(AppError);
  });

  it('preserves error code in thrown AppError', async () => {
    const fn = vi.fn().mockRejectedValue({ code: '23505', message: 'duplicate' });
    const wrapped = withErrorHandling(fn, 'test');

    try {
      await wrapped();
    } catch (err) {
      expect(err.code).toBe('23505');
      expect(err.message).toBe('This item already exists.');
    }
  });
});

describe('parseSupabaseError', () => {
  it('returns null for null input', () => {
    expect(parseSupabaseError(null)).toBe(null);
  });

  it('creates AppError from Supabase error', () => {
    const err = parseSupabaseError({ message: 'Row not found', code: 'PGRST116' });

    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('PGRST116');
    expect(err.message).toBe('No data found. Please refresh and try again.');
  });

  it('uses message when code is unknown', () => {
    const err = parseSupabaseError({ message: 'Custom error', code: 'CUSTOM' });

    expect(err.message).toBe('Custom error');
    expect(err.code).toBe('CUSTOM');
  });

  it('handles error with error_code field', () => {
    const err = parseSupabaseError({ msg: 'fail', error_code: 'AUTH_REQUIRED' });

    expect(err.code).toBe('AUTH_REQUIRED');
  });
});

describe('formatValidationError', () => {
  it('creates AppError from Zod-like error', () => {
    const zodError = {
      errors: [{ path: ['name'], message: 'Required' }],
    };

    const err = formatValidationError(zodError);

    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('name: Required');
  });

  it('handles nested path', () => {
    const zodError = {
      errors: [{ path: ['address', 'zip'], message: 'Invalid' }],
    };

    const err = formatValidationError(zodError);
    expect(err.message).toBe('address.zip: Invalid');
  });
});

describe('isNetworkError', () => {
  it('detects fetch errors', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
  });

  it('detects network errors', () => {
    expect(isNetworkError({ message: 'network request failed' })).toBe(true);
  });

  it('detects NETWORK_ERROR code', () => {
    expect(isNetworkError({ code: 'NETWORK_ERROR', message: '' })).toBe(true);
  });

  it('returns false for non-network errors', () => {
    expect(isNetworkError({ message: 'validation failed', code: 'OTHER' })).toBe(false);
  });
});

describe('retryOperation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryOperation(fn, 3, 1);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValueOnce('success');

    const result = await retryOperation(fn, 3, 1);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(retryOperation(fn, 2, 1)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue({ code: '23505', message: 'duplicate' });

    await expect(retryOperation(fn, 3, 1)).rejects.toEqual(
      expect.objectContaining({ code: '23505' })
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls function multiple times with retries', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success');

    const result = await retryOperation(fn, 3, 1);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

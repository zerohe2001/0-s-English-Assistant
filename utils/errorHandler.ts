/**
 * Unified error handling utility
 * Provides consistent error handling and user feedback across the application
 */

type ErrorHandler = (error: unknown) => {
  message: string;
  shouldRetry: boolean;
  isUserFacing: boolean;
};

/**
 * Extract error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
};

/**
 * Check if error is a network/API error that should be retried
 */
export const isRetryableError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();

  // Network errors
  if (message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch')) {
    return true;
  }

  // API rate limiting
  if (message.includes('rate limit') ||
      message.includes('429')) {
    return true;
  }

  // Temporary server errors
  if (message.includes('500') ||
      message.includes('503') ||
      message.includes('server error')) {
    return true;
  }

  return false;
};

/**
 * Determine if error should be shown to user vs logged silently
 */
export const isUserFacingError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();

  // Silent errors (log only)
  if (message.includes('aborted') ||
      message.includes('cancelled')) {
    return false;
  }

  // Show to user
  return true;
};

/**
 * Handle API call errors with consistent behavior
 */
export const handleApiError = (error: unknown): {
  message: string;
  shouldRetry: boolean;
  isUserFacing: boolean;
} => {
  const message = getErrorMessage(error);
  const shouldRetry = isRetryableError(error);
  const isUserFacing = isUserFacingError(error);

  // Log all errors for debugging
  console.error('❌ API Error:', message);

  return {
    message: isUserFacing ? message : 'Operation cancelled',
    shouldRetry,
    isUserFacing,
  };
};

/**
 * Wrapper for async operations with automatic error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  onError: (error: string) => void,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    silent?: boolean;
  } = {}
): Promise<T | null> {
  const { maxRetries = 0, retryDelay = 1000, silent = false } = options;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      const errorInfo = handleApiError(error);

      // Log attempt
      if (!silent) {
        console.log(`🔄 Attempt ${attempt + 1}/${maxRetries + 1} failed:`, errorInfo.message);
      }

      // Check if should retry
      if (errorInfo.shouldRetry && attempt < maxRetries) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // Final failure - notify user if applicable
      if (errorInfo.isUserFacing) {
        onError(errorInfo.message);
      }

      return null;
    }
  }

  return null;
}

/**
 * Simplified error handler for simple try-catch blocks
 */
export const logAndNotify = (
  error: unknown,
  showToast: (message: string, type: 'error' | 'success') => void,
  context?: string
) => {
  const errorInfo = handleApiError(error);
  const message = context
    ? `${context}: ${errorInfo.message}`
    : errorInfo.message;

  if (errorInfo.isUserFacing) {
    showToast(message, 'error');
  }
};

/**
 * Performance monitoring wrapper
 */
export async function withPerformanceTracking<T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> {
  const startTime = performance.now();
  console.log(`⏱️ [${label}] Starting...`);

  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    console.log(`✅ [${label}] Completed in ${duration.toFixed(0)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ [${label}] Failed after ${duration.toFixed(0)}ms:`, getErrorMessage(error));
    throw error;
  }
}

import { useCallback, useEffect, useRef } from 'react';
import { errorTrackingService } from '../services/errorTracking';

export const useErrorTracking = ({
  onError,
  onRecovery,
  groupSimilar = true,
  errorThreshold = 3,
  enableNetworkTracking = true
} = {}) => {
  const errorCache = useRef(new Map());
  const contextRef = useRef({});
  const ERROR_CACHE_TIMEOUT = 1000 * 60 * 5; // 5 minutes

  useEffect(() => {
    if (enableNetworkTracking) {
      errorTrackingService.setupNetworkErrorTracking();
    }
  }, [enableNetworkTracking]);

  const getErrorFingerprint = useCallback((error, metadata = {}) => {
    const baseFingerprint = `${error.message}_${error.stack?.split('\n')[1] || ''}_${metadata.type || ''}`;
    return groupSimilar ? baseFingerprint : `${baseFingerprint}_${Date.now()}`;
  }, [groupSimilar]);

  const shouldTrackError = useCallback((error, metadata = {}) => {
    if (!groupSimilar) return true;

    const fingerprint = getErrorFingerprint(error, metadata);
    const cachedError = errorCache.current.get(fingerprint);
    
    if (!cachedError) {
      errorCache.current.set(fingerprint, { count: 1, timestamp: Date.now() });
      return true;
    }

    // Check if cache has expired
    if (Date.now() - cachedError.timestamp > ERROR_CACHE_TIMEOUT) {
      errorCache.current.set(fingerprint, { count: 1, timestamp: Date.now() });
      return true;
    }

    // Increment error count
    cachedError.count += 1;
    
    if (cachedError.count > errorThreshold) {
      console.warn(`Error threshold exceeded for error: ${error.message}`);
      return false;
    }
    
    return true;
  }, [errorThreshold, getErrorFingerprint, groupSimilar]);

  const formatError = useCallback((error, metadata = {}) => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...contextRef.current,
      ...metadata
    };

    if (error.cause) {
      errorInfo.cause = typeof error.cause === 'string' 
        ? error.cause 
        : formatError(error.cause);
    }

    if (metadata.type === 'api' && error.response) {
      errorInfo.status = error.response.status;
      errorInfo.data = error.response.data;
    }

    return errorInfo;
  }, []);

  const trackError = useCallback(async (error, metadata = {}) => {
    if (!shouldTrackError(error, metadata)) return;

    const errorInfo = formatError(error, metadata);
    console.error(metadata.type ? `${metadata.type} Error:` : 'Unhandled Error:', errorInfo);

    try {
      await errorTrackingService.sendError(error, errorInfo);
    } catch (err) {
      console.error('Failed to send error to tracking service:', err);
    }

    if (onError) {
      onError(error, errorInfo);
    }
  }, [formatError, onError, shouldTrackError]);

  const clearErrors = useCallback(async () => {
    errorCache.current.clear();
    
    try {
      await errorTrackingService.sendAnalytics();
    } catch (err) {
      console.error('Failed to send analytics:', err);
    }

    if (onRecovery) {
      onRecovery();
    }
  }, [onRecovery]);

  const clearContext = useCallback(() => {
    contextRef.current = {};
  }, []);

  const attemptRecovery = useCallback(async (error, context) => {
    try {
      return await errorTrackingService.attemptRecovery(error, context);
    } catch (err) {
      console.error('Recovery failed:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      trackError(event.reason, { type: 'promise' });
    };

    const handleError = (event) => {
      trackError(event.error || new Error(event.message), { type: 'window' });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [trackError]);

  return {
    trackError,
    clearErrors,
    clearContext,
    attemptRecovery
  };
};

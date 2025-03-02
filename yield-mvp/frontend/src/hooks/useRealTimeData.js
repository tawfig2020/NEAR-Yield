import { useState, useEffect, useCallback, useRef } from 'react';
import useWebSocket from './useWebSocket';
import { api } from '../services/api';
import { errorTrackingService } from '../services/errorTracking';

const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_STALE_TIME = 30000; // 30 seconds

const useRealTimeData = (protocol, options = {}) => {
  const {
    retryCount = DEFAULT_RETRY_COUNT,
    retryDelay = DEFAULT_RETRY_DELAY,
    staleTime = DEFAULT_STALE_TIME,
    onDataUpdate,
    onError,
    transformData
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const retryCountRef = useRef(0);
  const ws = useWebSocket();

  // Transform data before setting state
  const processData = useCallback((newData) => {
    try {
      const processedData = transformData ? transformData(newData) : newData;
      setData(processedData);
      setLastUpdated(Date.now());
      setIsStale(false);
      onDataUpdate?.(processedData);
    } catch (err) {
      errorTrackingService.sendError(err, {
        type: 'data_transform',
        protocol,
        data: newData
      });
      setError('Failed to process data');
      onError?.(err);
    }
  }, [protocol, transformData, onDataUpdate, onError]);

  // Fetch initial data with retry logic
  const fetchData = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      const response = await api.get(`/protocols/${protocol}`);
      processData(response.data);
      setError(null);
      retryCountRef.current = 0;
    } catch (err) {
      if (retryCountRef.current < retryCount && isRetry) {
        retryCountRef.current++;
        setTimeout(() => fetchData(true), retryDelay * retryCountRef.current);
      } else {
        const errorMessage = err.message || 'Failed to fetch protocol data';
        setError(errorMessage);
        errorTrackingService.sendError(err, {
          type: 'api_fetch',
          protocol,
          retryCount: retryCountRef.current
        });
        onError?.(err);
      }
    } finally {
      setLoading(false);
    }
  }, [protocol, retryCount, retryDelay, processData, onError]);

  // Handle WebSocket messages
  const handleMessage = useCallback((message) => {
    if (message.protocol === protocol) {
      processData(message.data);
    }
  }, [protocol, processData]);

  // Check for stale data
  useEffect(() => {
    if (!lastUpdated || !staleTime) return;

    const checkStaleInterval = setInterval(() => {
      if (Date.now() - lastUpdated > staleTime) {
        setIsStale(true);
      }
    }, 1000);

    return () => clearInterval(checkStaleInterval);
  }, [lastUpdated, staleTime]);

  // Auto-refresh stale data
  useEffect(() => {
    if (isStale && !loading) {
      fetchData();
    }
  }, [isStale, loading, fetchData]);

  // WebSocket reconnection handling
  useEffect(() => {
    if (ws.connected && !data) {
      fetchData();
    }
  }, [ws.connected, data, fetchData]);

  // Setup WebSocket subscription
  useEffect(() => {
    if (ws.connected) {
      ws.subscribe(protocol);
      ws.addMessageListener(handleMessage);
    }

    return () => {
      if (ws.connected) {
        ws.unsubscribe(protocol);
        ws.removeMessageListener(handleMessage);
      }
    };
  }, [protocol, ws.connected, handleMessage, ws]);

  // Manual refresh with retry
  const refreshData = useCallback(async () => {
    retryCountRef.current = 0;
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    error: error || ws.error,
    loading,
    connected: ws.connected,
    isStale,
    lastUpdated,
    refreshData
  };
};

export default useRealTimeData;

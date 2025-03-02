import { useEffect, useCallback, useRef } from 'react';

export const usePerformanceMonitoring = (componentName = 'unknown') => {
  const metricsRef = useRef({
    cumulativeLayoutShift: 0,
    firstContentfulPaint: null,
  });

  const observersRef = useRef([]);

  // Helper to safely call Performance API methods
  const safePerformanceCall = useCallback((method, ...args) => {
    try {
      if (window.performance && typeof window.performance[method] === 'function') {
        return window.performance[method](...args);
      }
    } catch (error) {
      console.warn(`Error calling performance.${method}:`, error);
    }
    return null;
  }, []);

  useEffect(() => {
    // Start measuring render time
    const startMark = `${componentName}_render_start`;
    const endMark = `${componentName}_render_end`;
    
    safePerformanceCall('mark', startMark);
    
    return () => {
      try {
        safePerformanceCall('mark', endMark);
        safePerformanceCall('measure', `${componentName}_render`, startMark, endMark);
        safePerformanceCall('clearMarks', startMark);
        safePerformanceCall('clearMarks', endMark);
      } catch (error) {
        console.warn('Error measuring render time:', error);
      }
    };
  }, [componentName, safePerformanceCall]);

  const startMeasure = useCallback((name) => {
    try {
      safePerformanceCall('mark', `${name}_start`);
    } catch (error) {
      console.warn(`Error starting measure ${name}:`, error);
    }
  }, [safePerformanceCall]);

  const endMeasure = useCallback((name) => {
    try {
      const startMark = `${name}_start`;
      const endMark = `${name}_end`;
      
      safePerformanceCall('mark', endMark);
      safePerformanceCall('measure', name, startMark, endMark);
      safePerformanceCall('clearMarks', startMark);
      safePerformanceCall('clearMarks', endMark);
    } catch (error) {
      console.warn(`Error ending measure ${name}:`, error);
    }
  }, [safePerformanceCall]);

  const measureInteraction = useCallback(async (name, callback) => {
    try {
      startMeasure(name);
      await callback();
      endMeasure(name);
    } catch (error) {
      console.error(`Error measuring interaction ${name}:`, error);
      throw error;
    }
  }, [startMeasure, endMeasure]);

  const getMemorySnapshot = useCallback(() => {
    try {
      if (window.performance?.memory) {
        return {
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        };
      }
    } catch (error) {
      console.warn('Error getting memory snapshot:', error);
    }
    return null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Track layout shifts
    try {
      const layoutObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            metricsRef.current.cumulativeLayoutShift += entry.value;
          }
        });
      });
      layoutObserver.observe({ entryTypes: ['layout-shift'] });
      observersRef.current.push(layoutObserver);
    } catch (error) {
      console.warn('Error observing layout shifts:', error);
    }

    // Track first contentful paint
    try {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            metricsRef.current.firstContentfulPaint = entry.startTime;
            paintObserver.disconnect();
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      observersRef.current.push(paintObserver);
    } catch (error) {
      console.warn('Error observing paint timing:', error);
    }

    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current = [];
    };
  }, []);

  const getMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      memory: getMemorySnapshot(),
    };
  }, [getMemorySnapshot]);

  useEffect(() => {
    return () => {
      try {
        safePerformanceCall('clearMarks');
        safePerformanceCall('clearMeasures');
      } catch (error) {
        console.warn('Error clearing performance marks and measures:', error);
      }
    };
  }, [safePerformanceCall]);

  return {
    startMeasure,
    endMeasure,
    measureInteraction,
    getMemorySnapshot,
    getMetrics,
  };
};

import { useEffect, useRef, useState } from 'react';

const usePerformanceMonitoring = (options = {}) => {
  const [metrics, setMetrics] = useState({
    renderTime: null,
    fcp: null,
    cls: null,
    memory: null,
    customEvents: {},
    interactions: []
  });

  const startTimeRef = useRef(performance.now());
  const observerRef = useRef(null);

  const measureRenderTime = () => {
    try {
      const endTime = performance.now();
      const renderTime = endTime - startTimeRef.current;
      setMetrics(prev => ({ ...prev, renderTime }));
    } catch (error) {
      console.error('Error measuring render time:', error);
    }
  };

  const measureCustomEvent = (eventName) => {
    try {
      const mark = `${eventName}_start`;
      const measure = `${eventName}_measure`;
      
      performance.mark(mark);
      return () => {
        performance.measure(measure, mark);
        const entries = performance.getEntriesByName(measure);
        if (entries.length > 0) {
          setMetrics(prev => ({
            ...prev,
            customEvents: {
              ...prev.customEvents,
              [eventName]: entries[0].duration
            }
          }));
        }
        performance.clearMarks(mark);
        performance.clearMeasures(measure);
      };
    } catch (error) {
      console.error('Error measuring custom event:', error);
      return () => {};
    }
  };

  const trackInteraction = (interactionName, startTime) => {
    try {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        interactions: [
          ...prev.interactions,
          { name: interactionName, duration, timestamp: new Date() }
        ]
      }));
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  const measureMemoryUsage = () => {
    try {
      if (performance.memory) {
        setMetrics(prev => ({
          ...prev,
          memory: {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          }
        }));
      }
    } catch (error) {
      console.error('Error measuring memory usage:', error);
    }
  };

  useEffect(() => {
    try {
      if ('PerformanceObserver' in window) {
        // Observe First Contentful Paint
        const fcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            setMetrics(prev => ({ ...prev, fcp: entries[0].startTime }));
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Observe Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((entryList) => {
          let clsValue = 0;
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          setMetrics(prev => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        observerRef.current = { fcpObserver, clsObserver };
      }

      // Initial measurements
      measureRenderTime();
      measureMemoryUsage();

      // Cleanup function
      return () => {
        if (observerRef.current) {
          Object.values(observerRef.current).forEach(observer => {
            observer.disconnect();
          });
        }
      };
    } catch (error) {
      console.error('Error setting up performance monitoring:', error);
    }
  }, []);

  return {
    metrics,
    measureCustomEvent,
    trackInteraction
  };
};

export default usePerformanceMonitoring;

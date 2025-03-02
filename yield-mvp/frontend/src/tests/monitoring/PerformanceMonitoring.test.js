import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

// Mock Performance API
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  getEntriesByType: jest.fn(),
  getEntriesByName: jest.fn(),
  now: jest.fn(() => Date.now()),
  memory: {
    jsHeapSizeLimit: 2000000000,
    totalJSHeapSize: 1000000000,
    usedJSHeapSize: 500000000
  }
};

// Mock PerformanceObserver
const mockObserveLayoutShift = jest.fn();
const mockObservePaint = jest.fn();
const mockDisconnect = jest.fn();

class MockPerformanceObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe(options) {
    if (options.entryTypes.includes('layout-shift')) {
      mockObserveLayoutShift(this.callback);
    }
    if (options.entryTypes.includes('paint')) {
      mockObservePaint(this.callback);
    }
  }
  
  disconnect() {
    mockDisconnect();
  }
}

describe('Performance Monitoring', () => {
  const originalPerformance = window.performance;
  const originalPerformanceObserver = window.PerformanceObserver;
  const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeAll(() => {
    window.performance = mockPerformance;
    window.PerformanceObserver = MockPerformanceObserver;
    jest.useFakeTimers();
  });

  afterAll(() => {
    window.performance = originalPerformance;
    window.PerformanceObserver = originalPerformanceObserver;
    jest.useRealTimers();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = (componentName = 'TestComponent') => {
    return renderHook(() => usePerformanceMonitoring(componentName));
  };

  it('should measure component render time', async () => {
    const { unmount } = setup();

    unmount();

    expect(performance.mark).toHaveBeenCalledWith('TestComponent_render_start');
    expect(performance.mark).toHaveBeenCalledWith('TestComponent_render_end');
    expect(performance.measure).toHaveBeenCalledWith(
      'TestComponent_render',
      'TestComponent_render_start',
      'TestComponent_render_end'
    );
  });

  it('should handle errors when measuring render time', async () => {
    const error = new Error('Mock error');
    performance.mark.mockImplementationOnce(() => { throw error; });
    
    const { unmount } = setup();
    unmount();

    expect(mockConsoleWarn).toHaveBeenCalledWith('Error measuring render time:', error);
  });

  it('should measure custom events', async () => {
    const { result } = setup();

    await act(async () => {
      result.current.startMeasure('custom_event');
      jest.advanceTimersByTime(100);
      result.current.endMeasure('custom_event');
    });

    expect(performance.mark).toHaveBeenCalledWith('custom_event_start');
    expect(performance.mark).toHaveBeenCalledWith('custom_event_end');
    expect(performance.measure).toHaveBeenCalledWith(
      'custom_event',
      'custom_event_start',
      'custom_event_end'
    );
  });

  it('should handle errors in custom measurements', async () => {
    const error = new Error('Mock error');
    performance.mark.mockImplementationOnce(() => { throw error; });
    
    const { result } = setup();
    result.current.startMeasure('error_event');

    expect(mockConsoleWarn).toHaveBeenCalledWith('Error starting measure error_event:', error);
  });

  it('should measure interaction time', async () => {
    const { result } = setup();
    const callback = jest.fn().mockImplementation(() => jest.advanceTimersByTime(50));

    await act(async () => {
      await result.current.measureInteraction('button_click', callback);
    });

    expect(callback).toHaveBeenCalled();
    expect(performance.mark).toHaveBeenCalledWith('button_click_start');
    expect(performance.mark).toHaveBeenCalledWith('button_click_end');
    expect(performance.measure).toHaveBeenCalledWith(
      'button_click',
      'button_click_start',
      'button_click_end'
    );
  });

  it('should handle errors in interaction measurements', async () => {
    const error = new Error('Mock error');
    const { result } = setup();
    const callback = jest.fn().mockImplementation(() => { throw error; });

    await expect(
      result.current.measureInteraction('error_interaction', callback)
    ).rejects.toThrow(error);

    expect(mockConsoleError).toHaveBeenCalledWith('Error measuring interaction error_interaction:', error);
  });

  it('should track memory usage when available', () => {
    const { result } = setup();
    const memorySnapshot = result.current.getMemorySnapshot();

    expect(memorySnapshot).toEqual({
      jsHeapSizeLimit: 2000000000,
      totalJSHeapSize: 1000000000,
      usedJSHeapSize: 500000000
    });
  });

  it('should handle unavailable memory metrics gracefully', () => {
    const tempPerformance = { ...mockPerformance };
    delete tempPerformance.memory;
    window.performance = tempPerformance;

    const { result } = setup();
    const memorySnapshot = result.current.getMemorySnapshot();

    expect(memorySnapshot).toBeNull();
    window.performance = mockPerformance;
  });

  it('should track cumulative layout shift', async () => {
    const { result } = setup();
    
    await act(async () => {
      const layoutCallback = mockObserveLayoutShift.mock.calls[0][0];
      layoutCallback({
        getEntries: () => [{
          entryType: 'layout-shift',
          value: 0.1,
          hadRecentInput: false
        }]
      });
    });

    expect(result.current.getMetrics().cumulativeLayoutShift).toBe(0.1);
  });

  it('should track first contentful paint', async () => {
    const { result } = setup();
    
    await act(async () => {
      const paintCallback = mockObservePaint.mock.calls[0][0];
      paintCallback({
        getEntries: () => [{
          entryType: 'paint',
          name: 'first-contentful-paint',
          startTime: 100
        }]
      });
    });

    expect(result.current.getMetrics().firstContentfulPaint).toBe(100);
  });

  it('should clean up observers and measurements on unmount', () => {
    const { unmount } = setup();
    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
    expect(performance.clearMarks).toHaveBeenCalled();
    expect(performance.clearMeasures).toHaveBeenCalled();
  });

  it('should handle errors in paint timing observation', async () => {
    window.PerformanceObserver = jest.fn(() => {
      throw new Error('Mock observer error');
    });
    
    setup();
    
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Error observing paint timing:',
      expect.any(Error)
    );
  });

  it('should handle errors in layout shift observation', async () => {
    let observerCount = 0;
    window.PerformanceObserver = jest.fn(() => {
      observerCount++;
      if (observerCount === 2) { // Only throw on layout shift observer
        throw new Error('Mock observer error');
      }
      return new MockPerformanceObserver(() => {});
    });
    
    setup();
    
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Error observing layout shifts:',
      expect.any(Error)
    );
  });

  it('should handle cleanup errors gracefully', async () => {
    performance.clearMarks.mockImplementationOnce(() => {
      throw new Error('Mock cleanup error');
    });
    
    const { unmount } = setup();
    unmount();

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Error clearing performance marks and measures:',
      expect.any(Error)
    );
  });

  it('should handle multiple measurements in sequence', async () => {
    const { result } = setup();
    
    await act(async () => {
      result.current.startMeasure('event1');
      jest.advanceTimersByTime(100);
      result.current.endMeasure('event1');
      
      result.current.startMeasure('event2');
      jest.advanceTimersByTime(50);
      result.current.endMeasure('event2');
    });

    expect(performance.mark).toHaveBeenCalledWith('event1_start');
    expect(performance.mark).toHaveBeenCalledWith('event1_end');
    expect(performance.mark).toHaveBeenCalledWith('event2_start');
    expect(performance.mark).toHaveBeenCalledWith('event2_end');
    expect(performance.measure).toHaveBeenCalledWith('event1', 'event1_start', 'event1_end');
    expect(performance.measure).toHaveBeenCalledWith('event2', 'event2_start', 'event2_end');
  });

  it('should handle performance API unavailability', async () => {
    const tempWindow = { ...window };
    delete tempWindow.performance;
    window = tempWindow;

    const { result } = setup();
    
    await act(async () => {
      result.current.startMeasure('test_event');
      result.current.endMeasure('test_event');
    });

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Error calling performance.mark:',
      expect.any(Error)
    );

    // Restore window
    window = global.window;
  });
});

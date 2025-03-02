import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

// Mock Performance API
const mockPerformanceMethods = {
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  getEntriesByType: jest.fn(),
  getEntriesByName: jest.fn(),
  now: jest.fn(() => Date.now())
};

// Mock PerformanceObserver
const mockObservers = [];

class MockPerformanceObserver {
  constructor(callback) {
    this.callback = callback;
    this.entryTypes = [];
    this.observe = jest.fn(({ entryTypes }) => {
      this.entryTypes = entryTypes;
      mockObservers.push(this);
    });
    this.disconnect = jest.fn(() => {
      const index = mockObservers.indexOf(this);
      if (index > -1) {
        mockObservers.splice(index, 1);
      }
    });
  }

  simulateEntries(entries) {
    this.callback({
      getEntries: () => entries
    });
  }
}

describe('Performance Monitoring', () => {
  const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeAll(() => {
    // Store original values
    global.originalPerformance = window.performance;
    global.originalPerformanceObserver = window.PerformanceObserver;

    // Define window.performance with memory
    Object.defineProperty(window, 'performance', {
      value: {
        ...mockPerformanceMethods,
        memory: {
          jsHeapSizeLimit: 2000000000,
          totalJSHeapSize: 1000000000,
          usedJSHeapSize: 500000000
        }
      },
      configurable: true,
      writable: true
    });

    // Define window.PerformanceObserver
    window.PerformanceObserver = jest.fn().mockImplementation((callback) => {
      return new MockPerformanceObserver(callback);
    });
  });

  afterAll(() => {
    // Restore original values
    Object.defineProperty(window, 'performance', {
      value: global.originalPerformance,
      configurable: true,
      writable: true
    });
    window.PerformanceObserver = global.originalPerformanceObserver;

    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockObservers.length = 0;
  });

  const setup = (componentName = 'TestComponent') => {
    return renderHook(() => usePerformanceMonitoring(componentName));
  };

  it('should measure component render time', () => {
    const { unmount } = setup();
    
    act(() => {
      unmount();
    });

    expect(mockPerformanceMethods.mark).toHaveBeenCalledWith('TestComponent_render_start');
    expect(mockPerformanceMethods.mark).toHaveBeenCalledWith('TestComponent_render_end');
    expect(mockPerformanceMethods.measure).toHaveBeenCalledWith(
      'TestComponent_render',
      'TestComponent_render_start',
      'TestComponent_render_end'
    );
  });

  it('should handle errors when measuring render time', () => {
    const error = new Error('Mock error');
    mockPerformanceMethods.mark.mockImplementationOnce(() => { throw error; });
    
    const { unmount } = setup();
    act(() => {
      unmount();
    });

    expect(mockConsoleWarn).toHaveBeenCalledWith('Error calling performance.mark:', error);
  });

  it('should measure custom events', () => {
    const { result } = setup();

    act(() => {
      result.current.startMeasure('custom_event');
      result.current.endMeasure('custom_event');
    });

    expect(mockPerformanceMethods.mark).toHaveBeenCalledWith('custom_event_start');
    expect(mockPerformanceMethods.mark).toHaveBeenCalledWith('custom_event_end');
    expect(mockPerformanceMethods.measure).toHaveBeenCalledWith(
      'custom_event',
      'custom_event_start',
      'custom_event_end'
    );
  });

  it('should handle errors in custom measurements', () => {
    const error = new Error('Mock error');
    mockPerformanceMethods.mark.mockImplementationOnce(() => { throw error; });
    
    const { result } = setup();
    act(() => {
      result.current.startMeasure('error_event');
    });

    expect(mockConsoleWarn).toHaveBeenCalledWith('Error starting measure error_event:', error);
  });

  it('should measure interaction time', async () => {
    const { result } = setup();
    const callback = jest.fn();

    await act(async () => {
      await result.current.measureInteraction('button_click', callback);
    });

    expect(callback).toHaveBeenCalled();
    expect(mockPerformanceMethods.mark).toHaveBeenCalledWith('button_click_start');
    expect(mockPerformanceMethods.mark).toHaveBeenCalledWith('button_click_end');
    expect(mockPerformanceMethods.measure).toHaveBeenCalledWith(
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
      act(async () => {
        await result.current.measureInteraction('error_interaction', callback);
      })
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
    const tempPerformance = { ...mockPerformanceMethods };
    
    Object.defineProperty(window, 'performance', {
      value: tempPerformance,
      configurable: true,
      writable: true
    });

    const { result } = setup();
    const memorySnapshot = result.current.getMemorySnapshot();

    expect(memorySnapshot).toBeNull();
    
    Object.defineProperty(window, 'performance', {
      value: {
        ...mockPerformanceMethods,
        memory: {
          jsHeapSizeLimit: 2000000000,
          totalJSHeapSize: 1000000000,
          usedJSHeapSize: 500000000
        }
      },
      configurable: true,
      writable: true
    });
  });

  it('should track cumulative layout shift', () => {
    const { result } = setup();
    
    // Find the layout shift observer and simulate entries
    const layoutObserver = mockObservers.find(obs => obs.entryTypes.includes('layout-shift'));
    expect(layoutObserver).toBeTruthy();
    
    act(() => {
      layoutObserver.simulateEntries([{
        hadRecentInput: false,
        value: 0.1
      }]);
    });
    
    expect(result.current.getMetrics().cumulativeLayoutShift).toBe(0.1);
  });

  it('should track first contentful paint', () => {
    const { result } = setup();
    
    // Find the paint observer and simulate entries
    const paintObserver = mockObservers.find(obs => obs.entryTypes.includes('paint'));
    expect(paintObserver).toBeTruthy();
    
    act(() => {
      paintObserver.simulateEntries([{
        name: 'first-contentful-paint',
        startTime: 100
      }]);
    });
    
    expect(result.current.getMetrics().firstContentfulPaint).toBe(100);
  });

  it('should cleanup performance observers on unmount', () => {
    const { unmount } = setup();
    
    // Get observers before unmount
    const observersBeforeUnmount = [...mockObservers];
    expect(observersBeforeUnmount.length).toBeGreaterThan(0);
    
    act(() => {
      unmount();
    });
    
    // All observers should be disconnected and removed
    expect(mockObservers.length).toBe(0);
    observersBeforeUnmount.forEach(observer => {
      expect(observer.disconnect).toHaveBeenCalled();
    });
  });
});

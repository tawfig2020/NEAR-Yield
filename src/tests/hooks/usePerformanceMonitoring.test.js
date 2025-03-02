import { renderHook, act } from '@testing-library/react';
import usePerformanceMonitoring from '../../hooks/usePerformanceMonitoring';

// Mock observers array to track created observers
const mockObservers = [];

// Mock Performance API
const mockPerformance = {
  now: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000
  }
};

// Mock PerformanceObserver
class MockPerformanceObserver {
  constructor(callback) {
    this.callback = callback;
    mockObservers.push(this);
  }

  observe(options) {
    this.options = options;
  }

  disconnect() {
    const index = mockObservers.indexOf(this);
    if (index > -1) {
      mockObservers.splice(index, 1);
    }
  }

  // Helper method to simulate entries for testing
  simulateEntries(entries) {
    this.callback({
      getEntries: () => entries
    });
  }
}

describe('usePerformanceMonitoring', () => {
  beforeAll(() => {
    // Save original implementations
    global.PerformanceObserver = window.PerformanceObserver;
    global.performance = window.performance;
  });

  beforeEach(() => {
    // Setup mocks
    window.PerformanceObserver = MockPerformanceObserver;
    window.performance = mockPerformance;
    mockObservers.length = 0;

    // Reset all mocks
    jest.clearAllMocks();
    mockPerformance.now.mockImplementation(() => Date.now());
  });

  afterAll(() => {
    // Restore original implementations
    window.PerformanceObserver = global.PerformanceObserver;
    window.performance = global.performance;
  });

  it('should initialize with default metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    expect(result.current.metrics).toEqual({
      renderTime: expect.any(Number),
      fcp: null,
      cls: null,
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000
      },
      customEvents: {},
      interactions: []
    });
  });

  it('should measure render time correctly', () => {
    mockPerformance.now
      .mockReturnValueOnce(1000)  // Start time
      .mockReturnValueOnce(1500); // End time

    const { result } = renderHook(() => usePerformanceMonitoring());
    
    expect(result.current.metrics.renderTime).toBe(500);
  });

  it('should track custom events', () => {
    mockPerformance.getEntriesByName.mockReturnValue([{ duration: 100 }]);
    
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    act(() => {
      const endMeasurement = result.current.measureCustomEvent('testEvent');
      endMeasurement();
    });

    expect(result.current.metrics.customEvents.testEvent).toBe(100);
    expect(mockPerformance.mark).toHaveBeenCalledWith('testEvent_start');
    expect(mockPerformance.measure).toHaveBeenCalledWith('testEvent_measure', 'testEvent_start');
  });

  it('should track interactions', () => {
    mockPerformance.now
      .mockReturnValueOnce(2000)  // Start time
      .mockReturnValueOnce(2300); // End time

    const { result } = renderHook(() => usePerformanceMonitoring());
    
    act(() => {
      result.current.trackInteraction('buttonClick', 2000);
    });

    expect(result.current.metrics.interactions).toHaveLength(1);
    expect(result.current.metrics.interactions[0]).toEqual({
      name: 'buttonClick',
      duration: 300,
      timestamp: expect.any(Date)
    });
  });

  it('should observe First Contentful Paint', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    const fcpObserver = mockObservers.find(
      observer => observer.options.entryTypes.includes('paint')
    );
    
    expect(fcpObserver).toBeTruthy();
    
    act(() => {
      fcpObserver.simulateEntries([{ startTime: 1000 }]);
    });

    expect(result.current.metrics.fcp).toBe(1000);
  });

  it('should observe Cumulative Layout Shift', () => {
    const { result } = renderHook(() => usePerformanceMonitoring());
    
    const clsObserver = mockObservers.find(
      observer => observer.options.entryTypes.includes('layout-shift')
    );
    
    expect(clsObserver).toBeTruthy();
    
    act(() => {
      clsObserver.simulateEntries([
        { value: 0.1, hadRecentInput: false },
        { value: 0.2, hadRecentInput: false },
        { value: 0.3, hadRecentInput: true }  // Should be ignored due to recent input
      ]);
    });

    expect(result.current.metrics.cls).toBe(0.3);
  });

  it('should cleanup observers on unmount', () => {
    const { unmount } = renderHook(() => usePerformanceMonitoring());
    
    expect(mockObservers.length).toBe(2); // FCP and CLS observers
    
    unmount();
    
    expect(mockObservers.length).toBe(0);
  });

  it('should handle errors gracefully', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockPerformance.mark.mockImplementation(() => {
      throw new Error('Mock error');
    });

    const { result } = renderHook(() => usePerformanceMonitoring());
    
    act(() => {
      const endMeasurement = result.current.measureCustomEvent('testEvent');
      endMeasurement();
    });

    expect(consoleError).toHaveBeenCalled();
    expect(result.current.metrics.customEvents.testEvent).toBeUndefined();
    
    consoleError.mockRestore();
  });
});

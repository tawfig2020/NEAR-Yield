import { renderHook, act } from '@testing-library/react';
import { useErrorTracking } from '../../hooks/useErrorTracking';

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  jest.useFakeTimers();
});

afterAll(() => {
  console = originalConsole;
  jest.useRealTimers();
});

describe('Error Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window error handlers
    window.onerror = jest.fn();
    window.onunhandledrejection = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  const setup = () => {
    return renderHook(() => useErrorTracking({
      onError: jest.fn(),
      onRecovery: jest.fn(),
      groupSimilar: true,
      errorThreshold: 3
    }));
  };

  it('should capture unhandled errors', async () => {
    const { result } = setup();
    const error = new Error('Test error');

    await act(async () => {
      result.current.trackError(error);
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Test error'));
  }, 15000);

  it('should capture promise rejections', async () => {
    const { result } = setup();
    const error = new Error('Promise rejection');

    await act(async () => {
      result.current.trackError(error);
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Promise rejection'));
  });

  it('should track component errors', async () => {
    const { result } = setup();
    const error = new Error('Component error');

    await act(async () => {
      result.current.trackError(error, { component: 'TestComponent' });
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Component error'),
      expect.objectContaining({ component: 'TestComponent' })
    );
  });

  it('should group similar errors', async () => {
    const { result } = setup();
    const error = new Error('Duplicate error');

    await act(async () => {
      result.current.trackError(error);
      result.current.trackError(error);
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should respect error threshold', async () => {
    const { result } = setup();
    const error = new Error('Threshold test');

    await act(async () => {
      for (let i = 0; i < 5; i++) {
        result.current.trackError(error);
      }
      jest.advanceTimersByTime(100);
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error threshold exceeded')
    );
  });

  it('should handle error recovery', async () => {
    const { result } = setup();
    const error = new Error('Recoverable error');

    await act(async () => {
      result.current.trackError(error);
      result.current.clearErrors();
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should track API errors', async () => {
    const { result } = setup();
    const apiError = {
      response: {
        status: 404,
        data: { message: 'Not found' }
      }
    };

    await act(async () => {
      result.current.trackError(apiError, { type: 'api' });
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('API Error'),
      expect.objectContaining({ status: 404 })
    );
  });

  it('should maintain error context', async () => {
    const { result } = setup();
    const error = new Error('Context test');
    const context = { user: 'test-user', action: 'test-action' };

    await act(async () => {
      result.current.trackError(error, context);
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Context test'),
      expect.objectContaining(context)
    );
  });

  it('should clear error context', async () => {
    const { result } = setup();
    const error = new Error('Clear context test');
    const context = { user: 'test-user' };

    await act(async () => {
      result.current.trackError(error, context);
      result.current.clearContext();
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Clear context test'),
      expect.not.objectContaining(context)
    );
  });

  it('should handle nested errors', async () => {
    const { result } = setup();
    const innerError = new Error('Inner error');
    const outerError = new Error('Outer error');
    outerError.cause = innerError;

    await act(async () => {
      result.current.trackError(outerError);
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Outer error'),
      expect.objectContaining({ cause: expect.stringContaining('Inner error') })
    );
  });
});

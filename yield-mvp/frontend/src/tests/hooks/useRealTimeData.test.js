import { renderHook, act } from '@testing-library/react';
import useRealTimeData from '../../hooks/useRealTimeData';
import { api } from '../../services/api';
import { errorTrackingService } from '../../services/errorTracking';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('../../services/errorTracking');

const mockWs = {
  connected: true,
  error: null,
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  addMessageListener: jest.fn(),
  removeMessageListener: jest.fn()
};

jest.mock('../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: () => mockWs
}));

describe('useRealTimeData', () => {
  const mockProtocol = 'test-protocol';
  const mockData = { id: 1, name: 'Test Protocol' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: mockData });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Data Fetching', () => {
    it('should fetch initial data', async () => {
      const { result } = renderHook(() => useRealTimeData(mockProtocol));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);

      await act(() => Promise.resolve());

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBe(null);
      expect(api.get).toHaveBeenCalledWith(`/protocols/${mockProtocol}`);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('API Error');
      api.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRealTimeData(mockProtocol));
      await act(() => Promise.resolve());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(error.message);
      expect(result.current.data).toBe(null);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      const error = new Error('Network error');
      api.get
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => 
        useRealTimeData(mockProtocol, { 
          retryCount: 3,
          retryDelay: 1000 
        })
      );

      // First attempt fails
      await act(() => Promise.resolve());
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(error.message);

      // Second attempt after delay
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Third attempt after delay
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await Promise.resolve();
      });

      expect(api.get).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBe(null);
    });

    it('should stop retrying after max attempts', async () => {
      const error = new Error('Persistent error');
      api.get.mockRejectedValue(error);

      const { result } = renderHook(() => 
        useRealTimeData(mockProtocol, { 
          retryCount: 2,
          retryDelay: 1000 
        })
      );

      // Initial attempt + 2 retries
      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      expect(api.get).toHaveBeenCalledTimes(3);
      expect(result.current.error).toBe(error.message);
      expect(errorTrackingService.sendError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          type: 'api_fetch',
          protocol: mockProtocol,
          retryCount: 2
        })
      );
    });
  });

  describe('Data Transformation', () => {
    it('should transform data using provided function', async () => {
      const transformData = (data) => ({
        ...data,
        transformed: true,
        name: data.name.toUpperCase()
      });

      const { result } = renderHook(() => 
        useRealTimeData(mockProtocol, { transformData })
      );

      await act(() => Promise.resolve());

      expect(result.current.data).toEqual({
        ...mockData,
        transformed: true,
        name: mockData.name.toUpperCase()
      });
    });

    it('should handle transformation errors', async () => {
      const transformData = () => {
        throw new Error('Transform error');
      };

      const onError = jest.fn();

      const { result } = renderHook(() => 
        useRealTimeData(mockProtocol, { transformData, onError })
      );

      await act(() => Promise.resolve());

      expect(result.current.error).toBe('Failed to process data');
      expect(onError).toHaveBeenCalled();
      expect(errorTrackingService.sendError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          type: 'data_transform',
          protocol: mockProtocol
        })
      );
    });
  });

  describe('Stale Data Handling', () => {
    it('should mark data as stale after timeout', async () => {
      const { result } = renderHook(() => 
        useRealTimeData(mockProtocol, { staleTime: 5000 })
      );

      await act(() => Promise.resolve());
      expect(result.current.isStale).toBe(false);

      await act(async () => {
        jest.advanceTimersByTime(6000);
        await Promise.resolve();
      });

      expect(result.current.isStale).toBe(true);
    });

    it('should auto-refresh stale data', async () => {
      const { result } = renderHook(() => 
        useRealTimeData(mockProtocol, { staleTime: 5000 })
      );

      await act(() => Promise.resolve());
      
      const updatedData = { ...mockData, refreshed: true };
      api.get.mockResolvedValueOnce({ data: updatedData });

      await act(async () => {
        jest.advanceTimersByTime(6000);
        await Promise.resolve();
      });

      expect(result.current.data).toEqual(updatedData);
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('WebSocket Integration', () => {
    it('should handle websocket updates', async () => {
      const onDataUpdate = jest.fn();
      const { result } = renderHook(() => 
        useRealTimeData(mockProtocol, { onDataUpdate })
      );
      
      await act(() => Promise.resolve());

      const messageHandler = mockWs.addMessageListener.mock.calls[0][0];
      const wsMessage = {
        protocol: mockProtocol,
        data: { ...mockData, updated: true }
      };

      act(() => {
        messageHandler(wsMessage);
      });

      expect(result.current.data).toEqual(wsMessage.data);
      expect(onDataUpdate).toHaveBeenCalledWith(wsMessage.data);
    });

    it('should handle websocket reconnection', async () => {
      mockWs.connected = false;
      const { result, rerender } = renderHook(() => useRealTimeData(mockProtocol));
      
      await act(() => Promise.resolve());
      expect(api.get).toHaveBeenCalledTimes(1);

      // Simulate reconnection
      mockWs.connected = true;
      rerender();

      await act(() => Promise.resolve());
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup websocket subscriptions and intervals on unmount', async () => {
      const { unmount } = renderHook(() => 
        useRealTimeData(mockProtocol, { staleTime: 5000 })
      );
      
      await act(() => Promise.resolve());
      unmount();

      expect(mockWs.unsubscribe).toHaveBeenCalledWith(mockProtocol);
      expect(mockWs.removeMessageListener).toHaveBeenCalled();
    });
  });
});

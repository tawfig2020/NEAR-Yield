import { renderHook, act } from '@testing-library/react';
import useRealTimeData from '../../hooks/useRealTimeData';
import { mockWebSocket, mockYieldOpportunity, waitForPromises, waitForWebSocket } from '../utils/testUtils';
import '../mocks/serviceMocks';

describe('Real-time Updates', () => {
  const protocol = 'test-protocol';
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch initial data on mount', async () => {
    const { result } = renderHook(() => useRealTimeData(protocol));

    // Initially should be loading
    expect(result.current.loading).toBe(true);

    // Wait for initial data fetch
    await waitForPromises();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockYieldOpportunity);
    expect(result.current.error).toBeNull();
  });

  it('should handle WebSocket connection status', async () => {
    const { result } = renderHook(() => useRealTimeData(protocol));

    await waitForWebSocket();
    expect(result.current.connected).toBe(true);

    // Simulate WebSocket disconnection
    act(() => {
      mockWebSocket.connected = false;
      mockWebSocket.error = 'Connection lost';
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBe('Connection lost');
  });

  it('should subscribe to protocol updates', async () => {
    renderHook(() => useRealTimeData(protocol));
    
    await waitForWebSocket();
    
    expect(mockWebSocket.subscribe).toHaveBeenCalledWith(protocol);
  });

  it('should unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() => useRealTimeData(protocol));
    
    await waitForWebSocket();
    
    unmount();
    
    expect(mockWebSocket.unsubscribe).toHaveBeenCalledWith(protocol);
  });

  it('should update data on WebSocket message', async () => {
    const { result } = renderHook(() => useRealTimeData(protocol));

    await waitForPromises();

    const updatedData = {
      ...mockYieldOpportunity,
      apy: 16.5
    };

    // Get the message handler and simulate a message
    const messageHandler = mockWebSocket.addMessageListener.mock.calls[0][0];
    act(() => {
      messageHandler({
        protocol,
        data: updatedData
      });
    });

    expect(result.current.data.apy).toBe(16.5);
  });

  it('should handle API errors', async () => {
    // Mock API error
    const errorMessage = 'Failed to fetch data';
    jest.spyOn(require('../../services/api').api, 'get')
      .mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useRealTimeData(protocol));

    await waitForPromises();

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.loading).toBe(false);
  });

  it('should refresh data manually', async () => {
    const { result } = renderHook(() => useRealTimeData(protocol));

    await waitForPromises();

    const updatedData = {
      ...mockYieldOpportunity,
      apy: 17.5
    };

    // Mock new data for refresh
    jest.spyOn(require('../../services/api').api, 'get')
      .mockResolvedValueOnce({ data: updatedData });

    // Trigger refresh
    await act(async () => {
      await result.current.refreshData();
    });

    expect(result.current.data).toEqual(updatedData);
  });

  it('should handle multiple rapid updates', async () => {
    const { result } = renderHook(() => useRealTimeData(protocol));

    await waitForPromises();

    const messageHandler = mockWebSocket.addMessageListener.mock.calls[0][0];

    // Simulate multiple rapid updates
    await act(async () => {
      messageHandler({
        protocol,
        data: { ...mockYieldOpportunity, apy: 16.0 }
      });
      messageHandler({
        protocol,
        data: { ...mockYieldOpportunity, apy: 16.5 }
      });
      messageHandler({
        protocol,
        data: { ...mockYieldOpportunity, apy: 17.0 }
      });
    });

    // Should have the latest value
    expect(result.current.data.apy).toBe(17.0);
  });

  it('should ignore messages from other protocols', async () => {
    const { result } = renderHook(() => useRealTimeData(protocol));

    await waitForPromises();

    const initialData = result.current.data;
    const messageHandler = mockWebSocket.addMessageListener.mock.calls[0][0];

    // Send message for different protocol
    act(() => {
      messageHandler({
        protocol: 'other-protocol',
        data: { ...mockYieldOpportunity, apy: 20.0 }
      });
    });

    // Data should remain unchanged
    expect(result.current.data).toEqual(initialData);
  });
});

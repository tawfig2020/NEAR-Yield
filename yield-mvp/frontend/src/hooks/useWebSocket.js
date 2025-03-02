import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000/ws';

const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const messageListenersRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        setConnected(true);
        setError(null);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      socket.onclose = () => {
        setConnected(false);
        // Attempt to reconnect after 5 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 5000);
        }
      };

      socket.onerror = (event) => {
        setError('WebSocket error: Connection failed');
        console.error('WebSocket error:', event);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          messageListenersRef.current.forEach(listener => {
            try {
              listener(data);
            } catch (err) {
              console.error('Error in message listener:', err);
            }
          });
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current = socket;
    } catch (err) {
      setError(`Failed to create WebSocket connection: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const subscribe = useCallback((protocol) => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify({ 
        action: 'subscribe', 
        protocol,
        timestamp: Date.now()
      }));
    }
  }, [connected]);

  const unsubscribe = useCallback((protocol) => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify({ 
        action: 'unsubscribe', 
        protocol,
        timestamp: Date.now()
      }));
    }
  }, [connected]);

  const addMessageListener = useCallback((listener) => {
    messageListenersRef.current.add(listener);
    return () => messageListenersRef.current.delete(listener);
  }, []);

  const removeMessageListener = useCallback((listener) => {
    messageListenersRef.current.delete(listener);
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  return {
    connected,
    error,
    subscribe,
    unsubscribe,
    addMessageListener,
    removeMessageListener,
    reconnect
  };
};

export default useWebSocket;

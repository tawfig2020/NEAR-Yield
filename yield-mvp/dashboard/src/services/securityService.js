import axios from 'axios';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
const socket = io(API_BASE_URL);

export const useSecurityMonitoring = () => {
  const getSecurityMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/security/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      throw error;
    }
  };

  const getRecentAlerts = async (limit = 10) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/security/alerts`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent alerts:', error);
      throw error;
    }
  };

  const getKeyRotationStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/security/key-rotation`);
      return response.data;
    } catch (error) {
      console.error('Error fetching key rotation status:', error);
      throw error;
    }
  };

  const subscribeToAlerts = (callback) => {
    socket.on('security-alert', callback);
    return () => socket.off('security-alert', callback);
  };

  const subscribeToMetrics = (callback) => {
    socket.on('security-metrics', callback);
    return () => socket.off('security-metrics', callback);
  };

  const triggerKeyRotation = async (force = false) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/security/rotate-keys`, {
        force
      });
      return response.data;
    } catch (error) {
      console.error('Error triggering key rotation:', error);
      throw error;
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/security/alerts/${alertId}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  };

  const getSecurityLogs = async (startDate, endDate, type = 'all') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/security/logs`, {
        params: {
          startDate,
          endDate,
          type
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching security logs:', error);
      throw error;
    }
  };

  const updateSecuritySettings = async (settings) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/security/settings`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw error;
    }
  };

  const testAlertChannels = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/security/test-alerts`);
      return response.data;
    } catch (error) {
      console.error('Error testing alert channels:', error);
      throw error;
    }
  };

  return {
    getSecurityMetrics,
    getRecentAlerts,
    getKeyRotationStatus,
    subscribeToAlerts,
    subscribeToMetrics,
    triggerKeyRotation,
    acknowledgeAlert,
    getSecurityLogs,
    updateSecuritySettings,
    testAlertChannels
  };
};

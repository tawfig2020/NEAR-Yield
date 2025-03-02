import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const yieldApi = {
  getOpportunities: async () => {
    const response = await api.get('/api/yield/opportunities');
    return response.data;
  },

  getProtocolOpportunities: async (protocolId) => {
    const response = await api.get(`/api/yield/protocols/${protocolId}`);
    return response.data;
  },

  getHistoricalPerformance: async (protocolId, days = 30) => {
    const response = await api.get(`/api/yield/historical/${protocolId}`, {
      params: { days }
    });
    return response.data;
  },

  simulateLPPosition: async (params) => {
    const response = await api.post('/api/yield/simulate-lp', params);
    return response.data;
  },

  getProtocolStats: async (protocolId) => {
    const response = await api.get(`/api/yield/protocols/${protocolId}/stats`);
    return response.data;
  },

  getProtocolPools: async (protocolId) => {
    const response = await api.get(`/api/yield/protocols/${protocolId}/pools`);
    return response.data;
  },

  getProtocolTVL: async (protocolId) => {
    const response = await api.get(`/api/yield/protocols/${protocolId}/tvl`);
    return response.data;
  },

  getProtocolAPY: async (protocolId, poolId) => {
    const response = await api.get(`/api/yield/protocols/${protocolId}/pools/${poolId}/apy`);
    return response.data;
  }
};

export const authApi = {
  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    const { token } = response.data;
    localStorage.setItem('token', token);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    const { token } = response.data;
    localStorage.setItem('token', token);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getProfile: async () => {
    const response = await api.get('/api/auth/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/api/auth/profile', data);
    return response.data;
  }
};

export const portfolioApi = {
  getPortfolio: async () => {
    const response = await api.get('/api/portfolio');
    return response.data;
  },

  updatePortfolio: async (data) => {
    const response = await api.put('/api/portfolio', data);
    return response.data;
  },

  getPortfolioHistory: async (days = 30) => {
    const response = await api.get('/api/portfolio/history', {
      params: { days }
    });
    return response.data;
  },

  getPortfolioAnalytics: async () => {
    const response = await api.get('/api/portfolio/analytics');
    return response.data;
  }
};

export { api };

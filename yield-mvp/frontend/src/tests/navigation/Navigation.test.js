import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/testUtils';
import App from '../../App';

describe('Navigation Flow', () => {
  beforeEach(() => {
    renderWithProviders(<App />);
  });

  test('navigates to dashboard when authenticated', async () => {
    // Mock authentication
    localStorage.setItem('token', 'test-token');
    
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  test('redirects to login when not authenticated', async () => {
    // Clear authentication
    localStorage.removeItem('token');
    
    await waitFor(() => {
      expect(screen.getByText(/login/i)).toBeInTheDocument();
    });
  });

  test('navigates between main sections', async () => {
    // Mock authentication
    localStorage.setItem('token', 'test-token');
    
    // Wait for navigation to load
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    // Navigate to Yield Opportunities
    fireEvent.click(screen.getByText(/yield opportunities/i));
    await waitFor(() => {
      expect(screen.getByText(/available opportunities/i)).toBeInTheDocument();
    });

    // Navigate to Portfolio
    fireEvent.click(screen.getByText(/portfolio/i));
    await waitFor(() => {
      expect(screen.getByText(/your investments/i)).toBeInTheDocument();
    });

    // Navigate to Analytics
    fireEvent.click(screen.getByText(/analytics/i));
    await waitFor(() => {
      expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
    });
  });

  test('handles 404 routes', async () => {
    renderWithProviders(<App />, { route: '/invalid-route' });
    
    await waitFor(() => {
      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });
  });
});

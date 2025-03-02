import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StrategyMonitor from '../components/StrategyMonitor';

describe('StrategyMonitor Component', () => {
  beforeEach(() => {
    render(<StrategyMonitor />);
  });

  test('renders strategy monitor dashboard', () => {
    expect(screen.getByText('Strategy Monitor')).toBeInTheDocument();
    expect(screen.getByText('Overall Market Sentiment')).toBeInTheDocument();
    expect(screen.getByText('Source Sentiment Analysis')).toBeInTheDocument();
  });

  test('displays sentiment data correctly', async () => {
    await waitFor(() => {
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('Reddit')).toBeInTheDocument();
      expect(screen.getByText('Santiment')).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    render(<StrategyMonitor />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays asset allocation', async () => {
    await waitFor(() => {
      expect(screen.getByText('Current Asset Allocation')).toBeInTheDocument();
      expect(screen.getByText('NEAR Staking')).toBeInTheDocument();
      expect(screen.getByText('DeFi Yield')).toBeInTheDocument();
    });
  });

  test('shows recent activity', async () => {
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    });
  });

  test('updates sentiment data periodically', async () => {
    jest.useFakeTimers();
    
    await waitFor(() => {
      expect(screen.getByText('Twitter')).toBeInTheDocument();
    });

    jest.advanceTimersByTime(60000);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});

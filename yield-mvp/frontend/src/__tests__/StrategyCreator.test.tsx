import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StrategyCreator from '../components/StrategyCreator';

describe('StrategyCreator Component', () => {
  beforeEach(() => {
    render(<StrategyCreator />);
  });

  test('renders strategy configuration form', () => {
    expect(screen.getByText('Create AI-Powered Strategy')).toBeInTheDocument();
    expect(screen.getByText('Bearish Strategy')).toBeInTheDocument();
    expect(screen.getByText('Bullish Strategy')).toBeInTheDocument();
  });

  test('updates bearish threshold when slider is moved', async () => {
    const slider = screen.getAllByRole('slider')[0];
    fireEvent.change(slider, { target: { value: 40 } });
    
    await waitFor(() => {
      expect(screen.getByText('Threshold: 40%')).toBeInTheDocument();
    });
  });

  test('validates allocation percentages sum to 100%', async () => {
    const deployButton = screen.getByText('Deploy Strategy');
    fireEvent.click(deployButton);

    await waitFor(() => {
      const errorMessage = screen.queryByText('Allocations must sum to 100%');
      expect(errorMessage).toBeInTheDocument();
    });
  });

  test('shows loading state during deployment', async () => {
    const deployButton = screen.getByText('Deploy Strategy');
    fireEvent.click(deployButton);

    await waitFor(() => {
      expect(screen.getByText('Deploying...')).toBeInTheDocument();
    });
  });
});

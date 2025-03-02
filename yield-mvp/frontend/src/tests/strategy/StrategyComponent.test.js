import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/testUtils';
import { mockNearWallet } from '../utils/testUtils';
import StrategyComponent from '../../components/strategy/StrategyComponent';
import { api } from '../../services/api';

// Mock the API module
jest.mock('../../services/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

// Mock the NEAR wallet hook
jest.mock('../../hooks/useNearWallet', () => ({
  useNearWallet: () => mockNearWallet,
}));

describe('Strategy Component', () => {
  const mockStrategyParams = {
    name: 'Test Strategy',
    targetApy: '10',
    rebalanceThreshold: '5',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    renderWithProviders(<StrategyComponent />);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should render deploy strategy form', () => {
    expect(screen.getByText(/deploy new strategy/i)).toBeInTheDocument();
    expect(screen.getByTestId('strategy-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('target-apy-input')).toBeInTheDocument();
    expect(screen.getByTestId('rebalance-threshold-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deploy strategy/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const deployButton = screen.getByRole('button', { name: /deploy strategy/i });
    
    fireEvent.click(deployButton);
    
    await waitFor(() => {
      expect(screen.getByText(/strategy name is required/i)).toBeInTheDocument();
    });
  });

  it('should validate numeric fields', async () => {
    const nameInput = screen.getByTestId('strategy-name-input').querySelector('input');
    const apyInput = screen.getByTestId('target-apy-input').querySelector('input');
    const deployButton = screen.getByRole('button', { name: /deploy strategy/i });

    fireEvent.change(nameInput, { target: { value: 'Test Strategy' } });
    fireEvent.change(apyInput, { target: { value: '-5' } });
    fireEvent.click(deployButton);

    await waitFor(() => {
      expect(screen.getByText(/target apy must be a positive number/i)).toBeInTheDocument();
    });
  });

  it('should handle successful strategy deployment', async () => {
    // Mock successful transaction
    mockNearWallet.signAndSendTransaction.mockResolvedValueOnce({
      transaction: { hash: 'test-hash' },
    });
    api.post.mockResolvedValueOnce({ data: { success: true } });

    // Fill in the form
    const nameInput = screen.getByTestId('strategy-name-input').querySelector('input');
    const apyInput = screen.getByTestId('target-apy-input').querySelector('input');
    const thresholdInput = screen.getByTestId('rebalance-threshold-input').querySelector('input');

    fireEvent.change(nameInput, { target: { value: mockStrategyParams.name } });
    fireEvent.change(apyInput, { target: { value: mockStrategyParams.targetApy } });
    fireEvent.change(thresholdInput, { target: { value: mockStrategyParams.rebalanceThreshold } });

    // Submit the form
    const deployButton = screen.getByRole('button', { name: /deploy strategy/i });
    fireEvent.click(deployButton);

    // Verify loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/strategy deployed successfully/i)).toBeInTheDocument();
    });

    // Verify API calls
    expect(mockNearWallet.signAndSendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          expect.objectContaining({
            params: expect.objectContaining({
              methodName: 'deploy_strategy',
              args: expect.objectContaining({
                strategy_name: mockStrategyParams.name,
                target_apy: parseFloat(mockStrategyParams.targetApy),
                rebalance_threshold: parseFloat(mockStrategyParams.rebalanceThreshold),
              }),
            }),
          }),
        ]),
      })
    );

    expect(api.post).toHaveBeenCalledWith('/api/strategies', expect.objectContaining({
      name: mockStrategyParams.name,
      targetApy: parseFloat(mockStrategyParams.targetApy),
      rebalanceThreshold: parseFloat(mockStrategyParams.rebalanceThreshold),
      txHash: 'test-hash',
    }));
  });

  it('should handle deployment errors', async () => {
    // Mock transaction error
    const error = new Error('Transaction failed');
    mockNearWallet.signAndSendTransaction.mockRejectedValueOnce(error);

    // Fill in the form
    const nameInput = screen.getByTestId('strategy-name-input').querySelector('input');
    const apyInput = screen.getByTestId('target-apy-input').querySelector('input');
    const thresholdInput = screen.getByTestId('rebalance-threshold-input').querySelector('input');

    fireEvent.change(nameInput, { target: { value: mockStrategyParams.name } });
    fireEvent.change(apyInput, { target: { value: mockStrategyParams.targetApy } });
    fireEvent.change(thresholdInput, { target: { value: mockStrategyParams.rebalanceThreshold } });

    // Submit the form
    const deployButton = screen.getByRole('button', { name: /deploy strategy/i });
    fireEvent.click(deployButton);

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
    });

    // Verify the API wasn't called
    expect(api.post).not.toHaveBeenCalled();
  });
});

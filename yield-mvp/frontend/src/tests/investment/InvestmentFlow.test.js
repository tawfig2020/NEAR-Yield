import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, waitForPromises, mockNearWallet, mockYieldOpportunity } from '../utils/testUtils';
import InvestmentModal from '../../components/investment/InvestmentModal';
import { formatNearAmount } from 'near-api-js/lib/utils/format';

jest.mock('../../hooks/useNearWallet', () => ({
  useNearWallet: () => mockNearWallet,
}));

describe('Investment Flow', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    opportunity: mockYieldOpportunity,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    renderWithProviders(<InvestmentModal {...defaultProps} />);
  });

  describe('Initial Render', () => {
    test('displays investment modal with correct information', () => {
      // Check basic modal content
      expect(screen.getByText(/invest in/i)).toBeInTheDocument();
      expect(screen.getByText(mockYieldOpportunity.protocol)).toBeInTheDocument();
      expect(screen.getByText(mockYieldOpportunity.pool)).toBeInTheDocument();
      
      // Check APY and TVL display
      expect(screen.getByText(new RegExp(`${mockYieldOpportunity.apy}%`, 'i'))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`\\$${mockYieldOpportunity.tvl.toLocaleString()}`, 'i'))).toBeInTheDocument();
      
      // Check step indicators
      expect(screen.getByText(/enter amount/i)).toBeInTheDocument();
      expect(screen.getByText(/confirm transaction/i)).toBeInTheDocument();
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    test('displays user balance correctly', () => {
      const formattedBalance = formatNearAmount(mockNearWallet.balance);
      expect(screen.getByText(new RegExp(`${formattedBalance} NEAR`, 'i'))).toBeInTheDocument();
    });
  });

  describe('Amount Validation', () => {
    test('validates minimum investment amount', async () => {
      const amountInput = screen.getByLabelText(/amount to invest/i);
      
      // Test amount below minimum
      fireEvent.change(amountInput, { target: { value: '0.00001' } });
      fireEvent.click(screen.getByText(/next/i));
      
      await waitFor(() => {
        expect(screen.getByText(/minimum investment amount is/i)).toBeInTheDocument();
      });
    });

    test('validates maximum investment amount', async () => {
      const amountInput = screen.getByLabelText(/amount to invest/i);
      
      // Test amount above maximum
      fireEvent.change(amountInput, { target: { value: '10000000' } });
      fireEvent.click(screen.getByText(/next/i));
      
      await waitFor(() => {
        expect(screen.getByText(/maximum investment amount is/i)).toBeInTheDocument();
      });
    });

    test('handles invalid input characters', () => {
      const amountInput = screen.getByLabelText(/amount to invest/i);
      
      // Test invalid characters
      fireEvent.change(amountInput, { target: { value: 'abc' } });
      expect(amountInput.value).toBe('');
      
      // Test multiple decimal points
      fireEvent.change(amountInput, { target: { value: '1.2.3' } });
      expect(amountInput.value).toBe('1.23');
    });
  });

  describe('Transaction Confirmation', () => {
    beforeEach(async () => {
      // Setup valid investment amount
      const amountInput = screen.getByLabelText(/amount to invest/i);
      fireEvent.change(amountInput, { target: { value: '0.1' } });
      fireEvent.click(screen.getByText(/next/i));
      await waitForPromises();
    });

    test('displays correct transaction summary', () => {
      // Check transaction details
      expect(screen.getByText(/investment summary/i)).toBeInTheDocument();
      expect(screen.getByText(/0.1 NEAR/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(mockYieldOpportunity.protocol, 'i'))).toBeInTheDocument();
      expect(screen.getByText(/estimated apy/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`${mockYieldOpportunity.apy}%`, 'i'))).toBeInTheDocument();
    });

    test('allows navigation back to amount screen', async () => {
      fireEvent.click(screen.getByText(/back/i));
      await waitFor(() => {
        expect(screen.getByText(/enter amount/i)).toBeInTheDocument();
        const amountInput = screen.getByLabelText(/amount to invest/i);
        expect(amountInput.value).toBe('0.1');
      });
    });
  });

  describe('Transaction Processing', () => {
    beforeEach(async () => {
      // Setup and navigate to confirmation
      const amountInput = screen.getByLabelText(/amount to invest/i);
      fireEvent.change(amountInput, { target: { value: '0.1' } });
      fireEvent.click(screen.getByText(/next/i));
      await waitForPromises();
    });

    test('handles successful transaction with loading states', async () => {
      mockNearWallet.signAndSendTransaction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ transaction: { hash: 'test-hash' } }), 1000))
      );

      fireEvent.click(screen.getByText(/confirm investment/i));
      
      // Check loading state
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/investment successful/i)).toBeInTheDocument();
        expect(screen.getByText(/test-hash/i)).toBeInTheDocument();
        expect(mockOnSuccess).toHaveBeenCalledWith({
          amount: '0.1',
          txHash: 'test-hash',
          protocol: mockYieldOpportunity.protocol
        });
      });
    });

    test('handles transaction rejection by user', async () => {
      mockNearWallet.signAndSendTransaction.mockRejectedValueOnce(
        new Error('User rejected transaction')
      );

      fireEvent.click(screen.getByText(/confirm investment/i));

      await waitFor(() => {
        expect(screen.getByText(/transaction cancelled/i)).toBeInTheDocument();
        expect(screen.getByText(/user rejected transaction/i)).toBeInTheDocument();
      });

      // Check retry button
      const retryButton = screen.getByText(/try again/i);
      expect(retryButton).toBeInTheDocument();
      
      // Test retry functionality
      mockNearWallet.signAndSendTransaction.mockResolvedValueOnce({
        transaction: { hash: 'retry-hash' }
      });
      
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText(/investment successful/i)).toBeInTheDocument();
        expect(screen.getByText(/retry-hash/i)).toBeInTheDocument();
      });
    });

    test('handles network errors during transaction', async () => {
      mockNearWallet.signAndSendTransaction.mockRejectedValueOnce(
        new Error('Network error')
      );

      fireEvent.click(screen.getByText(/confirm investment/i));

      await waitFor(() => {
        expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interaction', () => {
    test('handles modal close during transaction', async () => {
      // Setup long running transaction
      mockNearWallet.signAndSendTransaction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ transaction: { hash: 'test-hash' } }), 5000))
      );

      // Start transaction
      const amountInput = screen.getByLabelText(/amount to invest/i);
      fireEvent.change(amountInput, { target: { value: '0.1' } });
      fireEvent.click(screen.getByText(/next/i));
      await waitForPromises();
      
      fireEvent.click(screen.getByText(/confirm investment/i));
      
      // Try to close modal
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      
      // Check warning message
      expect(screen.getByText(/transaction in progress/i)).toBeInTheDocument();
      expect(screen.getByText(/please wait/i)).toBeInTheDocument();
      
      // Close button should be disabled
      expect(screen.getByRole('button', { name: /close/i })).toBeDisabled();
    });

    test('preserves form state on accidental close', async () => {
      // Enter amount
      const amountInput = screen.getByLabelText(/amount to invest/i);
      fireEvent.change(amountInput, { target: { value: '0.1' } });
      
      // Try to close
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      
      // Check confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      
      // Cancel close
      fireEvent.click(screen.getByText(/cancel/i));
      
      // Check amount is preserved
      expect(screen.getByLabelText(/amount to invest/i).value).toBe('0.1');
    });
  });
});

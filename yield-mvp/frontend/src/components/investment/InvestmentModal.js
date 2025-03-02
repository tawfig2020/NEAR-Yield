import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useNearWallet } from '../../hooks/useNearWallet';
import { api } from '../../services/api';

const steps = ['Enter Amount', 'Confirm Transaction', 'Processing'];

const InvestmentModal = ({ open, onClose, opportunity }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const { wallet, signAndSendTransaction } = useNearWallet();

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const validateAmount = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (numAmount > wallet.balance) {
      setError('Insufficient balance');
      return false;
    }
    return true;
  };

  const handleInvest = async () => {
    try {
      setLoading(true);
      setError('');

      // Prepare transaction
      const transaction = {
        receiverId: opportunity.contractAddress,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'deposit',
              args: {
                pool_id: opportunity.poolId,
                amount: amount,
              },
              gas: '300000000000000',
              deposit: amount,
            },
          },
        ],
      };

      // Sign and send transaction
      const result = await signAndSendTransaction(transaction);
      setTxHash(result.transaction.hash);

      // Record investment in our backend
      await api.post('/api/portfolio/invest', {
        protocol: opportunity.protocol,
        amount: parseFloat(amount),
        poolId: opportunity.poolId,
        txHash: result.transaction.hash,
      });

      handleNext();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Available Balance: {wallet.balance} NEAR
            </Typography>
            <TextField
              fullWidth
              label="Amount to Invest (NEAR)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              sx={{ mt: 2 }}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Investment Summary
            </Typography>
            <Typography variant="body1">Protocol: {opportunity.protocol}</Typography>
            <Typography variant="body1">Pool: {opportunity.pool}</Typography>
            <Typography variant="body1">Amount: {amount} NEAR</Typography>
            <Typography variant="body1">Expected APY: {opportunity.apy}%</Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              Please confirm the transaction in your NEAR wallet
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            {loading ? (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>Processing your investment...</Typography>
              </>
            ) : txHash ? (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Investment successful!
                </Alert>
                <Typography variant="body2">
                  Transaction Hash: {txHash}
                </Typography>
              </>
            ) : null}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invest in {opportunity.protocol}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {renderStepContent(activeStep)}
      </DialogContent>
      <DialogActions>
        {activeStep === 0 && (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                if (validateAmount()) handleNext();
              }}
            >
              Next
            </Button>
          </>
        )}
        {activeStep === 1 && (
          <>
            <Button onClick={handleBack}>Back</Button>
            <Button
              variant="contained"
              onClick={handleInvest}
              disabled={loading}
            >
              Confirm Investment
            </Button>
          </>
        )}
        {activeStep === 2 && (
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InvestmentModal;

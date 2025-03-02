import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  TextField,
  Alert,
} from '@mui/material';
import { useNearWallet } from '../../hooks/useNearWallet';
import { api } from '../../services/api';

const StrategyComponent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [strategyParams, setStrategyParams] = useState({
    name: '',
    targetApy: '',
    rebalanceThreshold: '',
  });
  const { wallet, signAndSendTransaction } = useNearWallet();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStrategyParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateParams = () => {
    if (!strategyParams.name.trim()) {
      setError('Strategy name is required');
      return false;
    }
    if (isNaN(strategyParams.targetApy) || parseFloat(strategyParams.targetApy) <= 0) {
      setError('Target APY must be a positive number');
      return false;
    }
    if (isNaN(strategyParams.rebalanceThreshold) || parseFloat(strategyParams.rebalanceThreshold) <= 0) {
      setError('Rebalance threshold must be a positive number');
      return false;
    }
    return true;
  };

  const handleDeploy = async () => {
    if (!validateParams()) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Prepare transaction for strategy deployment
      const transaction = {
        receiverId: process.env.REACT_APP_STRATEGY_CONTRACT_ID,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'deploy_strategy',
              args: {
                strategy_name: strategyParams.name,
                target_apy: parseFloat(strategyParams.targetApy),
                rebalance_threshold: parseFloat(strategyParams.rebalanceThreshold),
              },
              gas: '300000000000000',
              deposit: '0',
            },
          },
        ],
      };

      // Sign and send transaction
      const result = await signAndSendTransaction(transaction);

      // Record strategy deployment in backend
      await api.post('/api/strategies', {
        name: strategyParams.name,
        targetApy: parseFloat(strategyParams.targetApy),
        rebalanceThreshold: parseFloat(strategyParams.rebalanceThreshold),
        txHash: result.transaction.hash,
      });

      setSuccess('Strategy deployed successfully!');
      setStrategyParams({
        name: '',
        targetApy: '',
        rebalanceThreshold: '',
      });
    } catch (err) {
      setError(err.message || 'Failed to deploy strategy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Deploy New Strategy
        </Typography>

        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Strategy Name"
            name="name"
            value={strategyParams.name}
            onChange={handleInputChange}
            margin="normal"
            data-testid="strategy-name-input"
          />

          <TextField
            fullWidth
            label="Target APY (%)"
            name="targetApy"
            type="number"
            value={strategyParams.targetApy}
            onChange={handleInputChange}
            margin="normal"
            data-testid="target-apy-input"
          />

          <TextField
            fullWidth
            label="Rebalance Threshold (%)"
            name="rebalanceThreshold"
            type="number"
            value={strategyParams.rebalanceThreshold}
            onChange={handleInputChange}
            margin="normal"
            data-testid="rebalance-threshold-input"
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleDeploy}
              disabled={loading}
              data-testid="deploy-strategy-button"
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Deploy Strategy'
              )}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StrategyComponent;

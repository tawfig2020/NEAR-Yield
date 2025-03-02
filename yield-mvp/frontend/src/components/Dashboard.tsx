import React, { useState, useEffect } from 'react';
import { Grid, Container, Typography, Button, Card, CardContent } from '@mui/material';
import { useWallet } from '../context/WalletContext';
import { useAI } from '../context/AIContext';
import SentimentGauge from './SentimentGauge';
import TransactionHistory from './TransactionHistory';
import Onboarding from './Onboarding';

interface PerformanceData {
  totalValue: number;
  yield24h: number;
  yieldTotal: number;
  activeStrategies: number;
}

const Dashboard: React.FC = () => {
  const { wallet, isConnected, connectWallet } = useWallet();
  const { sentiment, strategies } = useAI();
  const [performance, setPerformance] = useState<PerformanceData>({
    totalValue: 0,
    yield24h: 0,
    yieldTotal: 0,
    activeStrategies: 0
  });

  useEffect(() => {
    if (isConnected) {
      fetchPerformanceData();
    }
  }, [isConnected]);

  const fetchPerformanceData = async () => {
    try {
      // TODO: Implement actual data fetching
      const mockData: PerformanceData = {
        totalValue: 1000,
        yield24h: 2.5,
        yieldTotal: 15.8,
        activeStrategies: 2
      };
      setPerformance(mockData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  if (!isConnected) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to NEAR Deep Yield
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Connect your wallet to start earning optimized yields
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={connectWallet}
          className="wallet-connect"
        >
          Connect Wallet
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Onboarding />
      
      <Grid container spacing={3}>
        {/* Performance Overview */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Portfolio Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Value
                  </Typography>
                  <Typography variant="h6">
                    {performance.totalValue} NEAR
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    24h Yield
                  </Typography>
                  <Typography variant="h6">
                    {performance.yield24h}%
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Yield
                  </Typography>
                  <Typography variant="h6">
                    {performance.yieldTotal}%
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Active Strategies
                  </Typography>
                  <Typography variant="h6">
                    {performance.activeStrategies}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sentiment Gauge */}
        <Grid item xs={12} md={4}>
          <SentimentGauge value={sentiment} />
        </Grid>

        {/* Transaction History */}
        <Grid item xs={12}>
          <TransactionHistory />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;

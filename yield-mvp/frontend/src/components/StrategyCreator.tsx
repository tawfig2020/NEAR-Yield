import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Slider,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  TrendingDown,
  TrendingUp,
  Notifications,
  AccountBalance,
} from '@mui/icons-material';

interface StrategyConfig {
  bearishThreshold: number;
  bullishThreshold: number;
  bearishAllocation: {
    staking: number;
    stablecoin: number;
    defi: number;
  };
  bullishAllocation: {
    staking: number;
    stablecoin: number;
    defi: number;
  };
  alerts: {
    devActivity: boolean;
    whaleMovements: boolean;
    socialVolume: boolean;
    sentimentShift: boolean;
  };
}

const StrategyCreator: React.FC = () => {
  const [config, setConfig] = useState<StrategyConfig>({
    bearishThreshold: 30,
    bullishThreshold: 70,
    bearishAllocation: {
      staking: 70,
      stablecoin: 20,
      defi: 10,
    },
    bullishAllocation: {
      staking: 20,
      stablecoin: 0,
      defi: 80,
    },
    alerts: {
      devActivity: true,
      whaleMovements: true,
      socialVolume: true,
      sentimentShift: true,
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [estimatedGas, setEstimatedGas] = useState("0.01");

  const handleThresholdChange = (type: 'bearish' | 'bullish', value: number) => {
    setConfig({
      ...config,
      [`${type}Threshold`]: value,
    });
  };

  const handleAllocationChange = (
    scenario: 'bearish' | 'bullish',
    type: 'staking' | 'stablecoin' | 'defi',
    value: number
  ) => {
    setConfig({
      ...config,
      [`${scenario}Allocation`]: {
        ...config[`${scenario}Allocation`],
        [type]: value,
      },
    });
  };

  const handleAlertToggle = (type: keyof StrategyConfig['alerts']) => {
    setConfig({
      ...config,
      alerts: {
        ...config.alerts,
        [type]: !config.alerts[type],
      },
    });
  };

  const validateAllocations = (allocation: typeof config.bearishAllocation) => {
    const total = allocation.staking + allocation.stablecoin + allocation.defi;
    return Math.abs(total - 100) < 0.1;
  };

  const deployStrategy = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate allocations
      if (!validateAllocations(config.bearishAllocation)) {
        throw new Error('Bearish allocations must sum to 100%');
      }
      if (!validateAllocations(config.bullishAllocation)) {
        throw new Error('Bullish allocations must sum to 100%');
      }

      // Validate thresholds
      if (config.bearishThreshold >= config.bullishThreshold) {
        throw new Error('Bearish threshold must be lower than bullish threshold');
      }

      // Simulate contract deployment
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess('Strategy deployed successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          Create AI-Powered Strategy
        </Typography>
        <Typography color="textSecondary" paragraph>
          Configure your automated yield optimization strategy based on sentiment analysis.
        </Typography>

        <Grid container spacing={3}>
          {/* Bearish Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingDown color="error" />
                  <Typography variant="h6" ml={1}>Bearish Strategy</Typography>
                </Box>

                <Typography gutterBottom>
                  Threshold: {config.bearishThreshold}%
                </Typography>
                <Slider
                  value={config.bearishThreshold}
                  onChange={(_, value) => handleThresholdChange('bearish', value as number)}
                  min={0}
                  max={100}
                />

                <Typography variant="subtitle1" mt={2}>Asset Allocation</Typography>
                <Box mt={1}>
                  <Typography>NEAR Staking: {config.bearishAllocation.staking}%</Typography>
                  <Slider
                    value={config.bearishAllocation.staking}
                    onChange={(_, value) => handleAllocationChange('bearish', 'staking', value as number)}
                    min={0}
                    max={100}
                  />
                </Box>
                <Box mt={1}>
                  <Typography>Stablecoin: {config.bearishAllocation.stablecoin}%</Typography>
                  <Slider
                    value={config.bearishAllocation.stablecoin}
                    onChange={(_, value) => handleAllocationChange('bearish', 'stablecoin', value as number)}
                    min={0}
                    max={100}
                  />
                </Box>
                <Box mt={1}>
                  <Typography>DeFi Yield: {config.bearishAllocation.defi}%</Typography>
                  <Slider
                    value={config.bearishAllocation.defi}
                    onChange={(_, value) => handleAllocationChange('bearish', 'defi', value as number)}
                    min={0}
                    max={100}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Bullish Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUp color="success" />
                  <Typography variant="h6" ml={1}>Bullish Strategy</Typography>
                </Box>

                <Typography gutterBottom>
                  Threshold: {config.bullishThreshold}%
                </Typography>
                <Slider
                  value={config.bullishThreshold}
                  onChange={(_, value) => handleThresholdChange('bullish', value as number)}
                  min={0}
                  max={100}
                />

                <Typography variant="subtitle1" mt={2}>Asset Allocation</Typography>
                <Box mt={1}>
                  <Typography>NEAR Staking: {config.bullishAllocation.staking}%</Typography>
                  <Slider
                    value={config.bullishAllocation.staking}
                    onChange={(_, value) => handleAllocationChange('bullish', 'staking', value as number)}
                    min={0}
                    max={100}
                  />
                </Box>
                <Box mt={1}>
                  <Typography>Stablecoin: {config.bullishAllocation.stablecoin}%</Typography>
                  <Slider
                    value={config.bullishAllocation.stablecoin}
                    onChange={(_, value) => handleAllocationChange('bullish', 'stablecoin', value as number)}
                    min={0}
                    max={100}
                  />
                </Box>
                <Box mt={1}>
                  <Typography>DeFi Yield: {config.bullishAllocation.defi}%</Typography>
                  <Slider
                    value={config.bullishAllocation.defi}
                    onChange={(_, value) => handleAllocationChange('bullish', 'defi', value as number)}
                    min={0}
                    max={100}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Alerts Configuration */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Notifications color="primary" />
                  <Typography variant="h6" ml={1}>Alert Configuration</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.alerts.devActivity}
                          onChange={() => handleAlertToggle('devActivity')}
                        />
                      }
                      label="Dev Activity Drops"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.alerts.whaleMovements}
                          onChange={() => handleAlertToggle('whaleMovements')}
                        />
                      }
                      label="Whale Movements"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.alerts.socialVolume}
                          onChange={() => handleAlertToggle('socialVolume')}
                        />
                      }
                      label="Social Volume Spikes"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.alerts.sentimentShift}
                          onChange={() => handleAlertToggle('sentimentShift')}
                        />
                      }
                      label="Sentiment Shifts"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Deployment Section */}
        <Box mt={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <AccountBalance color="primary" />
                  <Typography variant="h6" ml={1}>Deploy Strategy</Typography>
                </Box>
                <Chip
                  label={`Estimated Gas: ${estimatedGas} NEAR`}
                  color="primary"
                  variant="outlined"
                />
              </Box>

              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={deployStrategy}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Deploying...' : 'Deploy Strategy'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Status Messages */}
        <Box mt={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Box>
      </Box>
    </Container>
  );
};

export default StrategyCreator;

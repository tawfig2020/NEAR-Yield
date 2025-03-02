import React, { useState } from 'react';
import {
  Card,
  Grid,
  Typography,
  Slider,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Alert,
} from '@mui/material';
import { motion } from 'framer-motion';

interface StrategyConfig {
  name: string;
  riskLevel: 'low' | 'moderate' | 'high';
  sentimentThreshold: number;
  rebalancePercentage: number;
  preferredAssets: string[];
  maxDrawdown: number;
  rebalanceInterval: number;
}

const StrategyBuilder: React.FC = () => {
  const [config, setConfig] = useState<StrategyConfig>({
    name: 'AI Safety Strategy',
    riskLevel: 'moderate',
    sentimentThreshold: 30,
    rebalancePercentage: 50,
    preferredAssets: ['NEAR', 'USDC'],
    maxDrawdown: 10,
    rebalanceInterval: 24,
  });

  const [previewMetrics, setPreviewMetrics] = useState({
    estimatedApy: 0,
    riskScore: 0,
    gasSavings: 0,
  });

  const handleConfigChange = (field: keyof StrategyConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    updatePreviewMetrics({ ...config, [field]: value });
  };

  const updatePreviewMetrics = async (newConfig: StrategyConfig) => {
    try {
      const response = await fetch('/api/preview-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const data = await response.json();
      setPreviewMetrics(data);
    } catch (error) {
      console.error('Failed to update preview:', error);
    }
  };

  const handleAssetAdd = (asset: string) => {
    if (!config.preferredAssets.includes(asset)) {
      handleConfigChange('preferredAssets', [...config.preferredAssets, asset]);
    }
  };

  const handleAssetRemove = (asset: string) => {
    handleConfigChange(
      'preferredAssets',
      config.preferredAssets.filter(a => a !== asset)
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Strategy Configuration
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Strategy Name"
                  value={config.name}
                  onChange={(e) => handleConfigChange('name', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Risk Level</InputLabel>
                  <Select
                    value={config.riskLevel}
                    onChange={(e) => handleConfigChange('riskLevel', e.target.value)}
                  >
                    <MenuItem value="low">Low Risk</MenuItem>
                    <MenuItem value="moderate">Moderate Risk</MenuItem>
                    <MenuItem value="high">High Risk</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Sentiment Threshold: {config.sentimentThreshold}%
                </Typography>
                <Slider
                  value={config.sentimentThreshold}
                  onChange={(_, value) => handleConfigChange('sentimentThreshold', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Rebalance Percentage: {config.rebalancePercentage}%
                </Typography>
                <Slider
                  value={config.rebalancePercentage}
                  onChange={(_, value) => handleConfigChange('rebalancePercentage', value)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>Preferred Assets</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {config.preferredAssets.map((asset) => (
                    <Chip
                      key={asset}
                      label={asset}
                      onDelete={() => handleAssetRemove(asset)}
                    />
                  ))}
                </Box>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Add Asset</InputLabel>
                  <Select
                    value=""
                    onChange={(e) => handleAssetAdd(e.target.value as string)}
                  >
                    <MenuItem value="NEAR">NEAR</MenuItem>
                    <MenuItem value="USDC">USDC</MenuItem>
                    <MenuItem value="ETH">ETH</MenuItem>
                    <MenuItem value="USDT">USDT</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Maximum Drawdown: {config.maxDrawdown}%
                </Typography>
                <Slider
                  value={config.maxDrawdown}
                  onChange={(_, value) => handleConfigChange('maxDrawdown', value)}
                  min={0}
                  max={50}
                  valueLabelDisplay="auto"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom>
                  Rebalance Interval: {config.rebalanceInterval} hours
                </Typography>
                <Slider
                  value={config.rebalanceInterval}
                  onChange={(_, value) => handleConfigChange('rebalanceInterval', value)}
                  min={1}
                  max={72}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Strategy Preview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Estimated APY</Typography>
                <Typography variant="h4" color="primary">
                  {previewMetrics.estimatedApy}%
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Risk Score</Typography>
                <Typography variant="h4" color="secondary">
                  {previewMetrics.riskScore}/100
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Estimated Gas Savings</Typography>
                <Typography variant="h4" color="success">
                  {previewMetrics.gasSavings} NEAR
                </Typography>
              </Grid>
            </Grid>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Safety Features
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Automated protection against market volatility
            </Alert>
            <Alert severity="success" sx={{ mb: 2 }}>
              Real-time sentiment monitoring
            </Alert>
            <Alert severity="warning">
              Maximum drawdown protection enabled
            </Alert>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {/* Deploy strategy */}}
            >
              Deploy Strategy
            </Button>
          </Card>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default StrategyBuilder;

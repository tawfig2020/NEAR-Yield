import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Twitter, Reddit, Analytics } from '@mui/icons-material';

interface DataSourceConfig {
  twitter: {
    enabled: boolean;
    weight: number;
  };
  santiment: {
    enabled: boolean;
    apiKey: string;
    weight: number;
  };
  reddit: {
    enabled: boolean;
    authorized: boolean;
    weight: number;
  };
}

const DataSourceConfig: React.FC = () => {
  const [config, setConfig] = useState<DataSourceConfig>({
    twitter: {
      enabled: true,
      weight: 40,
    },
    santiment: {
      enabled: false,
      apiKey: '',
      weight: 35,
    },
    reddit: {
      enabled: false,
      authorized: false,
      weight: 25,
    },
  });

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSantimentApiKey = async (apiKey: string) => {
    setConfig({
      ...config,
      santiment: {
        ...config.santiment,
        apiKey,
      },
    });
  };

  const handleWeightChange = (source: keyof DataSourceConfig, value: number) => {
    setConfig({
      ...config,
      [source]: {
        ...config[source],
        weight: value,
      },
    });
  };

  const handleToggleSource = (source: keyof DataSourceConfig) => {
    setConfig({
      ...config,
      [source]: {
        ...config[source],
        enabled: !config[source].enabled,
      },
    });
  };

  const authorizeReddit = async () => {
    try {
      setLoading('reddit');
      // Simulate Reddit OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      setConfig({
        ...config,
        reddit: {
          ...config.reddit,
          authorized: true,
          enabled: true,
        },
      });
      setSuccess('Reddit authorization successful!');
    } catch (err) {
      setError('Failed to authorize Reddit');
    } finally {
      setLoading(null);
    }
  };

  const validateConfig = async () => {
    try {
      setLoading('validate');
      // Validate weights sum to 100%
      const totalWeight = Object.values(config).reduce(
        (sum, source) => sum + (source.enabled ? source.weight : 0),
        0
      );
      
      if (Math.abs(totalWeight - 100) > 0.1) {
        throw new Error('Weights must sum to 100%');
      }

      // Validate Santiment API key if enabled
      if (config.santiment.enabled && !config.santiment.apiKey) {
        throw new Error('Santiment API key is required');
      }

      // Validate Reddit authorization if enabled
      if (config.reddit.enabled && !config.reddit.authorized) {
        throw new Error('Reddit authorization is required');
      }

      setSuccess('Configuration validated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          Data Source Configuration
        </Typography>
        <Typography color="textSecondary" paragraph>
          Configure and weight multiple data sources for sentiment analysis.
        </Typography>

        <Grid container spacing={3}>
          {/* Twitter Configuration */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <Twitter color="primary" />
                  </Grid>
                  <Grid item xs>
                    <Typography variant="h6">Twitter Integration</Typography>
                    <Typography color="textSecondary">
                      Pre-configured for real-time market sentiment
                    </Typography>
                  </Grid>
                  <Grid item>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.twitter.enabled}
                          onChange={() => handleToggleSource('twitter')}
                        />
                      }
                      label="Enabled"
                    />
                  </Grid>
                </Grid>
                {config.twitter.enabled && (
                  <Box mt={2}>
                    <Typography gutterBottom>Weight: {config.twitter.weight}%</Typography>
                    <Slider
                      value={config.twitter.weight}
                      onChange={(_, value) => handleWeightChange('twitter', value as number)}
                      min={0}
                      max={100}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Santiment Configuration */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <Analytics color="primary" />
                  </Grid>
                  <Grid item xs>
                    <Typography variant="h6">Santiment Integration</Typography>
                    <Typography color="textSecondary">
                      On-chain metrics and whale activity tracking
                    </Typography>
                  </Grid>
                  <Grid item>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.santiment.enabled}
                          onChange={() => handleToggleSource('santiment')}
                        />
                      }
                      label="Enabled"
                    />
                  </Grid>
                </Grid>
                {config.santiment.enabled && (
                  <Box mt={2}>
                    <TextField
                      fullWidth
                      label="Santiment API Key"
                      value={config.santiment.apiKey}
                      onChange={(e) => handleSantimentApiKey(e.target.value)}
                      margin="normal"
                      type="password"
                    />
                    <Typography gutterBottom>Weight: {config.santiment.weight}%</Typography>
                    <Slider
                      value={config.santiment.weight}
                      onChange={(_, value) => handleWeightChange('santiment', value as number)}
                      min={0}
                      max={100}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Reddit Configuration */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <Reddit color="primary" />
                  </Grid>
                  <Grid item xs>
                    <Typography variant="h6">Reddit Integration</Typography>
                    <Typography color="textSecondary">
                      Community sentiment from r/NEAR and r/cryptocurrency
                    </Typography>
                  </Grid>
                  <Grid item>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.reddit.enabled}
                          onChange={() => handleToggleSource('reddit')}
                        />
                      }
                      label="Enabled"
                    />
                  </Grid>
                </Grid>
                {config.reddit.enabled && (
                  <Box mt={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={authorizeReddit}
                      disabled={config.reddit.authorized || loading === 'reddit'}
                      startIcon={loading === 'reddit' ? <CircularProgress size={20} /> : null}
                    >
                      {config.reddit.authorized ? 'Authorized' : 'Authorize Reddit'}
                    </Button>
                    <Box mt={2}>
                      <Typography gutterBottom>Weight: {config.reddit.weight}%</Typography>
                      <Slider
                        value={config.reddit.weight}
                        onChange={(_, value) => handleWeightChange('reddit', value as number)}
                        min={0}
                        max={100}
                      />
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box mt={4} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            onClick={validateConfig}
            disabled={loading === 'validate'}
            startIcon={loading === 'validate' ? <CircularProgress size={20} /> : null}
          >
            Save Configuration
          </Button>
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

export default DataSourceConfig;

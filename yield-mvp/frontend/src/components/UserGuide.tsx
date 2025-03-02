import React from 'react';
import {
  Box,
  Container,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
} from '@mui/material';
import {
  AccountBalanceWallet,
  DataUsage,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';

const UserGuide: React.FC = () => {
  const [activeStep, setActiveStep] = React.useState(0);

  const steps = [
    {
      label: 'Sign Up & Connect Wallet',
      icon: <AccountBalanceWallet />,
      content: (
        <>
          <Typography paragraph>
            Get started by connecting your NEAR wallet to access our AI-powered yield optimization platform.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Supported Wallets</Typography>
                  <ul>
                    <li>Sender Wallet</li>
                    <li>Meteor Wallet</li>
                    <li>Ledger (Recommended for institutional users)</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            Tip: Use Ledger for enhanced security with large portfolios.
          </Alert>
        </>
      ),
    },
    {
      label: 'Enable Data Sources',
      icon: <DataUsage />,
      content: (
        <>
          <Typography paragraph>
            Configure multiple data sources to enhance the accuracy of our sentiment analysis.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Santiment Setup</Typography>
                  <ol>
                    <li>Get API key from Santiment</li>
                    <li>Navigate to Settings → Data Sources</li>
                    <li>Paste API key in "Santiment API Key" field</li>
                  </ol>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Reddit Integration</Typography>
                  <ol>
                    <li>Click "Authorize Reddit"</li>
                    <li>Grant read-only access</li>
                    <li>Select relevant subreddits (r/NEAR, r/cryptocurrency)</li>
                  </ol>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Alert severity="success" sx={{ mt: 2 }}>
            Twitter data is pre-configured - no setup required!
          </Alert>
        </>
      ),
    },
    {
      label: 'Create Your First Strategy',
      icon: <TrendingUp />,
      content: (
        <>
          <Typography paragraph>
            Set up your automated yield optimization strategy with custom parameters.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Strategy Configuration</Typography>
                  <ol>
                    <li>Set composite sentiment thresholds:
                      <ul>
                        <li>Bearish: &lt; 30% → Move 70% to NEAR staking</li>
                        <li>Bullish: &gt; 70% → Allocate 80% to high-risk pools</li>
                      </ul>
                    </li>
                    <li>Configure custom alerts:
                      <ul>
                        <li>Dev activity drops</li>
                        <li>Whale movements</li>
                        <li>Social volume spikes</li>
                      </ul>
                    </li>
                    <li>Deploy strategy (≈ $0.01 gas fee)</li>
                  </ol>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Start with small allocations while testing your strategy.
          </Alert>
        </>
      ),
    },
    {
      label: 'Monitor & Optimize',
      icon: <Assessment />,
      content: (
        <>
          <Typography paragraph>
            Track performance and fine-tune your strategy using our comprehensive dashboard.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Key Metrics</Typography>
                  <ul>
                    <li>Composite Sentiment Score</li>
                    <li>Source-specific trends</li>
                    <li>Risk-adjusted APY</li>
                    <li>Portfolio allocation</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Optimization Tools</Typography>
                  <ul>
                    <li>Adjust source weightings</li>
                    <li>Fine-tune thresholds</li>
                    <li>Export performance reports</li>
                    <li>Set up notifications</li>
                  </ul>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            Compare your AI strategy performance against manual trading benchmarks.
          </Alert>
        </>
      ),
    },
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          Getting Started Guide
        </Typography>
        <Typography color="textSecondary" paragraph>
          Follow these steps to set up your AI-powered yield optimization strategy.
        </Typography>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel icon={step.icon}>
                <Typography variant="h6">{step.label}</Typography>
              </StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mb: 2 }}>
                  <div>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      {index === steps.length - 1 ? 'Finish' : 'Continue'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === steps.length && (
          <Box sx={{ p: 3 }}>
            <Typography>All steps completed!</Typography>
            <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
              Reset Guide
            </Button>
            <Button
              variant="contained"
              href="/dashboard"
              sx={{ mt: 1, mr: 1 }}
            >
              Go to Dashboard
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default UserGuide;

import React from 'react';
import { Box, Container, Typography, Button, Grid, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(45deg, #1a237e 30%, #311b92 90%)'
        : 'linear-gradient(45deg, #42a5f5 30%, #1976d2 90%)'
    }}>
      <Container>
        <Grid container spacing={4} sx={{ py: 8 }}>
          {/* Hero Section */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mt: 8 }}>
              <Typography variant="h2" component="h1" color="white" gutterBottom>
                NEAR Deep Yield
              </Typography>
              <Typography variant="h5" color="white" paragraph>
                Maximize your crypto yields with our advanced DeFi aggregator platform
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{ mr: 2 }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{ color: 'white', borderColor: 'white' }}
                >
                  Login
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Features */}
          <Grid item xs={12}>
            <Grid container spacing={4} sx={{ mt: 4 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Best Yields
                  </Typography>
                  <Typography>
                    Find the highest yielding opportunities across multiple protocols
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Risk Analysis
                  </Typography>
                  <Typography>
                    Advanced risk scoring and analytics for informed decisions
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Portfolio Management
                  </Typography>
                  <Typography>
                    Track and manage your investments in one place
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LandingPage;

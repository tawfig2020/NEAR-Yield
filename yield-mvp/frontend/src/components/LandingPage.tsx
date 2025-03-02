import React from 'react';
import { Box, Button, Container, Grid, Typography, Card, CardContent, useTheme } from '@mui/material';
import { BarChart, Timeline, Security } from '@mui/icons-material';
import { motion } from 'framer-motion';

const LandingPage: React.FC = () => {
  const theme = useTheme();

  const features = [
    {
      icon: <Timeline />,
      title: "Multi-Source Sentiment Analysis",
      description: "Combine real-time data from Twitter, Santiment, and Reddit for comprehensive market insights."
    },
    {
      icon: <BarChart />,
      title: "NEAR's Low-Fee Automation",
      description: "Execute strategies automatically with minimal gas costs on NEAR Protocol."
    },
    {
      icon: <Security />,
      title: "Institutional-Grade Tools",
      description: "Access professional trading tools and analytics previously reserved for institutions."
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box py={8}>
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                AI-Powered Yield Optimization
              </Typography>
              <Typography variant="h5" color="textSecondary" paragraph>
                Maximize your NEAR Protocol yields with advanced sentiment analysis and automated strategies.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                href="/onboarding"
                sx={{ mt: 2 }}
              >
                Start Free Trial
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/assets/dashboard-preview.png"
                alt="Dashboard Preview"
                sx={{ width: '100%', borderRadius: 2 }}
              />
            </Grid>
          </Grid>
        </motion.div>

        {/* Features Section */}
        <Box mt={8}>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                >
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box color="primary.main" mb={2}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h5" component="h2" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography color="textSecondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Stats Section */}
        <Box mt={8} textAlign="center">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h3" color="primary">35%</Typography>
              <Typography variant="subtitle1">Average Returns</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h3" color="primary">$0.01</Typography>
              <Typography variant="subtitle1">Average Gas Fee</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h3" color="primary">5s</Typography>
              <Typography variant="subtitle1">Strategy Execution</Typography>
            </Grid>
          </Grid>
        </Box>

        {/* CTA Section */}
        <Box mt={8} textAlign="center">
          <Typography variant="h4" gutterBottom>
            Ready to Start Optimizing?
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            href="/onboarding"
            sx={{ mt: 2 }}
          >
            Connect Wallet
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default LandingPage;

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const DashboardCard = ({ title, value, subtitle, loading }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            <Typography color="textSecondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalValue: 0,
    totalYield: 0,
    activePositions: 0,
    performanceData: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/api/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.email}
      </Typography>

      <Grid container spacing={3}>
        {/* Portfolio Stats */}
        <Grid item xs={12} md={4}>
          <DashboardCard
            title="Total Portfolio Value"
            value={`$${stats.totalValue.toLocaleString()}`}
            subtitle="Current value of all positions"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardCard
            title="Total Yield"
            value={`${stats.totalYield.toFixed(2)}%`}
            subtitle="Average APY across all positions"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardCard
            title="Active Positions"
            value={stats.activePositions}
            subtitle="Number of active investments"
            loading={loading}
          />
        </Grid>

        {/* Performance Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Portfolio Performance
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                    <Bar dataKey="yield" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Card,
  CardContent,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { Line } from 'react-chartjs-2';
import { useNearContract } from '../services/nearService';
import { useSecurityMonitoring } from '../services/securityService';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  card: {
    height: '100%',
  },
  chart: {
    marginTop: theme.spacing(2),
  },
  alert: {
    marginBottom: theme.spacing(2),
  },
}));

const SecurityDashboard = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [securityMetrics, setSecurityMetrics] = useState({
    keyAge: 0,
    failedAttempts: 0,
    lastRotation: null,
    contractState: {},
  });
  const [alerts, setAlerts] = useState([]);
  const [chartData, setChartData] = useState(null);

  const { getContractState } = useNearContract();
  const { getSecurityMetrics, getRecentAlerts } = useSecurityMonitoring();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch security metrics
        const metrics = await getSecurityMetrics();
        setSecurityMetrics(metrics);
        
        // Fetch recent alerts
        const recentAlerts = await getRecentAlerts();
        setAlerts(recentAlerts);
        
        // Fetch contract state
        const state = await getContractState();
        setSecurityMetrics(prev => ({ ...prev, contractState: state }));
        
        // Prepare chart data
        const chartData = {
          labels: metrics.timePoints,
          datasets: [
            {
              label: 'Failed Login Attempts',
              data: metrics.failedAttempts,
              borderColor: 'rgba(255, 99, 132, 1)',
              fill: false,
            },
            {
              label: 'Successful Transactions',
              data: metrics.successfulTransactions,
              borderColor: 'rgba(75, 192, 192, 1)',
              fill: false,
            },
          ],
        };
        setChartData(chartData);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Grid container justify="center">
        <CircularProgress />
      </Grid>
    );
  }

  if (error) {
    return (
      <Alert severity="error" className={classes.alert}>
        Error loading dashboard: {error}
      </Alert>
    );
  }

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        {/* Security Status */}
        <Grid item xs={12}>
          <Paper className={classes.paper}>
            <Typography variant="h6">Security Status</Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography color="textSecondary">Key Age</Typography>
                    <Typography variant="h4">
                      {securityMetrics.keyAge} days
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography color="textSecondary">Failed Attempts</Typography>
                    <Typography variant="h4">
                      {securityMetrics.failedAttempts}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography color="textSecondary">Last Rotation</Typography>
                    <Typography variant="h4">
                      {new Date(securityMetrics.lastRotation).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography color="textSecondary">Contract Status</Typography>
                    <Typography variant="h4">
                      {securityMetrics.contractState.status || 'Unknown'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12} md={6}>
          <Paper className={classes.paper}>
            <Typography variant="h6">Recent Alerts</Typography>
            {alerts.map((alert, index) => (
              <Alert
                key={index}
                severity={alert.severity}
                className={classes.alert}
              >
                {alert.message}
              </Alert>
            ))}
          </Paper>
        </Grid>

        {/* Security Metrics Chart */}
        <Grid item xs={12} md={6}>
          <Paper className={classes.paper}>
            <Typography variant="h6">Security Metrics</Typography>
            {chartData && (
              <div className={classes.chart}>
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            )}
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default SecurityDashboard;

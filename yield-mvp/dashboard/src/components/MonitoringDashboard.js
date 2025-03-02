import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { ContractMonitor } from '../services/contractMonitor';
import { SecurityAuditLog } from './SecurityAuditLog';

export const MonitoringDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [contractState, setContractState] = useState(null);
  const [securityStatus, setSecurityStatus] = useState(null);
  const [transactionData, setTransactionData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [monitor, setMonitor] = useState(null);

  useEffect(() => {
    const initializeMonitor = async () => {
      const contractMonitor = new ContractMonitor(
        process.env.REACT_APP_CONTRACT_ID,
        process.env.REACT_APP_NODE_URL
      );

      contractMonitor.onEvent = (event, data) => {
        switch (event) {
          case 'stateUpdate':
            setContractState(data);
            break;
          case 'securityUpdate':
            setSecurityStatus(data);
            break;
          case 'error':
            setAlerts(prev => [...prev, {
              severity: 'error',
              message: data.message,
              timestamp: new Date(),
            }]);
            break;
        }
      };

      await contractMonitor.initialize();
      setMonitor(contractMonitor);
      setLoading(false);
    };

    initializeMonitor();
    return () => {
      if (monitor) {
        monitor.stopMonitoring();
      }
    };
  }, []);

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!monitor) return;

      const now = new Date();
      const dayAgo = new Date(now - 86400000);
      const history = await monitor.trackTransactionVolume(dayAgo, now);

      setTransactionData({
        labels: Array.from({ length: 24 }, (_, i) => `${23-i}h ago`),
        datasets: [{
          label: 'Transaction Volume',
          data: history.hourlyVolume,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
        }],
      });
    };

    fetchTransactionHistory();
  }, [monitor]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Security Status */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Security Status
            </Typography>
            {securityStatus && (
              <Grid container spacing={2}>
                {securityStatus.checks.map((check) => (
                  <Grid item xs={12} sm={6} md={3} key={check.name}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          {check.name.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="h5" component="div">
                          {check.value}
                        </Typography>
                        <Alert severity={check.status === 'passed' ? 'success' : 'warning'}>
                          {check.details || check.status}
                        </Alert>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Transaction Volume */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Transaction Volume (24h)
            </Typography>
            {transactionData && (
              <Box sx={{ height: 300 }}>
                <Line
                  data={transactionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {alerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.severity}
                  sx={{ mb: 1 }}
                >
                  {alert.message}
                  <Typography variant="caption" display="block">
                    {alert.timestamp.toLocaleString()}
                  </Typography>
                </Alert>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Contract State */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Contract State
            </Typography>
            {contractState && (
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <pre>
                  {JSON.stringify(contractState.state, null, 2)}
                </pre>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Security Audit Log */}
        <Grid item xs={12}>
          <SecurityAuditLog />
        </Grid>
      </Grid>
    </Box>
  );
};

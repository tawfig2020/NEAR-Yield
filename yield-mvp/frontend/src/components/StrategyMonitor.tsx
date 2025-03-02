import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Twitter,
  Reddit,
  Analytics,
} from '@mui/icons-material';

interface SentimentData {
  source: string;
  score: number;
  trend: 'up' | 'down' | 'neutral';
  confidence: number;
  timestamp: string;
}

interface AssetAllocation {
  asset: string;
  currentAllocation: number;
  targetAllocation: number;
  value: number;
  yield: number;
}

interface RecentActivity {
  timestamp: string;
  action: string;
  details: string;
  status: 'completed' | 'pending' | 'failed';
}

const StrategyMonitor: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [overallSentiment, setOverallSentiment] = useState(65);

  useEffect(() => {
    // Simulate data fetching
    const fetchData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSentimentData([
        {
          source: 'Twitter',
          score: 72,
          trend: 'up',
          confidence: 85,
          timestamp: new Date().toISOString(),
        },
        {
          source: 'Reddit',
          score: 68,
          trend: 'up',
          confidence: 78,
          timestamp: new Date().toISOString(),
        },
        {
          source: 'Santiment',
          score: 61,
          trend: 'neutral',
          confidence: 92,
          timestamp: new Date().toISOString(),
        },
      ]);

      setAllocations([
        {
          asset: 'NEAR Staking',
          currentAllocation: 25,
          targetAllocation: 20,
          value: 25000,
          yield: 11.2,
        },
        {
          asset: 'Stablecoin',
          currentAllocation: 15,
          targetAllocation: 20,
          value: 15000,
          yield: 8.5,
        },
        {
          asset: 'DeFi Yield',
          currentAllocation: 60,
          targetAllocation: 60,
          value: 60000,
          yield: 15.8,
        },
      ]);

      setRecentActivity([
        {
          timestamp: new Date().toISOString(),
          action: 'Rebalance',
          details: 'Adjusted allocation based on bullish sentiment',
          status: 'completed',
        },
        {
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          action: 'Alert',
          details: 'Significant whale movement detected',
          status: 'completed',
        },
        {
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          action: 'Yield Harvest',
          details: 'Harvested and reinvested DeFi yields',
          status: 'completed',
        },
      ]);

      setLoading(false);
    };

    fetchData();
  }, []);

  const getSentimentIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" />;
      case 'down':
        return <TrendingDown color="error" />;
      default:
        return <Info color="primary" />;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'twitter':
        return <Twitter />;
      case 'reddit':
        return <Reddit />;
      default:
        return <Analytics />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip size="small" label="Completed" color="success" />;
      case 'pending':
        return <Chip size="small" label="Pending" color="warning" />;
      case 'failed':
        return <Chip size="small" label="Failed" color="error" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box py={4}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          Strategy Monitor
        </Typography>

        {/* Overall Sentiment */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Overall Market Sentiment
            </Typography>
            <Box display="flex" alignItems="center">
              <Box flexGrow={1} mr={2}>
                <LinearProgress
                  variant="determinate"
                  value={overallSentiment}
                  color={overallSentiment > 60 ? 'success' : overallSentiment < 40 ? 'error' : 'warning'}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="h5" color={overallSentiment > 60 ? 'success.main' : overallSentiment < 40 ? 'error.main' : 'warning.main'}>
                {overallSentiment}%
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Sentiment Analysis */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Source Sentiment Analysis
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Source</TableCell>
                        <TableCell align="right">Score</TableCell>
                        <TableCell align="right">Confidence</TableCell>
                        <TableCell align="right">Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sentimentData.map((row) => (
                        <TableRow key={row.source}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getSourceIcon(row.source)}
                              <Typography ml={1}>{row.source}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{row.score}%</TableCell>
                          <TableCell align="right">{row.confidence}%</TableCell>
                          <TableCell align="right">
                            {getSentimentIcon(row.trend)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Asset Allocation */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Asset Allocation
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Asset</TableCell>
                        <TableCell align="right">Current</TableCell>
                        <TableCell align="right">Target</TableCell>
                        <TableCell align="right">Yield</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allocations.map((row) => (
                        <TableRow key={row.asset}>
                          <TableCell>{row.asset}</TableCell>
                          <TableCell align="right">{row.currentAllocation}%</TableCell>
                          <TableCell align="right">{row.targetAllocation}%</TableCell>
                          <TableCell align="right">{row.yield}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Details</TableCell>
                        <TableCell align="right">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentActivity.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(row.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{row.action}</TableCell>
                          <TableCell>{row.details}</TableCell>
                          <TableCell align="right">
                            {getStatusChip(row.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default StrategyMonitor;

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { api } from '../services/api';

const YieldDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [filters, setFilters] = useState({
    protocol: 'all',
    minApy: '',
    maxRisk: 'all',
  });

  const protocols = ['all', 'Ref Finance', 'Burrow', 'Jumbo'];
  const riskLevels = ['all', 'low', 'medium', 'high'];

  useEffect(() => {
    fetchOpportunities();
  }, [filters]);

  const fetchOpportunities = async () => {
    try {
      const response = await api.get('/api/yield/opportunities', {
        params: filters,
      });
      setOpportunities(response.data);
    } catch (error) {
      console.error('Error fetching yield opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field) => (event) => {
    setFilters({
      ...filters,
      [field]: event.target.value,
    });
  };

  const calculateRiskScore = (opportunity) => {
    // Risk scoring algorithm based on various factors
    const {
      liquidityScore,
      volatilityScore,
      protocolScore,
      auditsScore,
    } = opportunity;

    return (
      (liquidityScore * 0.3 +
        volatilityScore * 0.3 +
        protocolScore * 0.2 +
        auditsScore * 0.2) *
      100
    ).toFixed(2);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Yield Opportunities
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Protocol"
              value={filters.protocol}
              onChange={handleFilterChange('protocol')}
            >
              {protocols.map((protocol) => (
                <MenuItem key={protocol} value={protocol}>
                  {protocol}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Minimum APY %"
              type="number"
              value={filters.minApy}
              onChange={handleFilterChange('minApy')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Maximum Risk"
              value={filters.maxRisk}
              onChange={handleFilterChange('maxRisk')}
            >
              {riskLevels.map((level) => (
                <MenuItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Opportunities Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Protocol</TableCell>
                <TableCell>Pool</TableCell>
                <TableCell align="right">APY (%)</TableCell>
                <TableCell align="right">TVL</TableCell>
                <TableCell align="right">Risk Score</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {opportunities.map((opportunity) => (
                <TableRow key={opportunity.id}>
                  <TableCell>{opportunity.protocol}</TableCell>
                  <TableCell>{opportunity.pool}</TableCell>
                  <TableCell align="right">
                    {opportunity.apy.toFixed(2)}%
                  </TableCell>
                  <TableCell align="right">
                    ${opportunity.tvl.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {calculateRiskScore(opportunity)}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        // Handle investment action
                      }}
                    >
                      Invest
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Container>
  );
};

export default YieldDashboard;

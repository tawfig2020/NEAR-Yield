import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Assessment, TrendingUp, Security } from '@mui/icons-material';

const Header = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          NEAR Deep Yield
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button color="inherit" startIcon={<Assessment />}>
            Dashboard
          </Button>
          <Button color="inherit" startIcon={<TrendingUp />}>
            Analytics
          </Button>
          <Button color="inherit" startIcon={<Security />}>
            Risk Analysis
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

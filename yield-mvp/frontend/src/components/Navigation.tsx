import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, Typography, Box } from '@mui/material';
import { useWallet } from '../context/WalletContext';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { isConnected, connectWallet, disconnectWallet } = useWallet();

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar>
        <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
          NEAR Deep Yield
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component={Link}
            to="/"
            color={location.pathname === '/' ? 'primary' : 'inherit'}
          >
            Dashboard
          </Button>
          
          <Button
            component={Link}
            to="/guide"
            color={location.pathname === '/guide' ? 'primary' : 'inherit'}
          >
            Guide
          </Button>

          {isConnected ? (
            <Button
              variant="outlined"
              color="primary"
              onClick={disconnectWallet}
            >
              Disconnect Wallet
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={connectWallet}
            >
              Connect Wallet
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;

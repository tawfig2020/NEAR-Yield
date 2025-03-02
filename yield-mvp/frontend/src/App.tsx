import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import UserGuide from './components/UserGuide';
import { WalletProvider } from './context/WalletContext';
import { AIProvider } from './context/AIContext';
import { theme } from './theme';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WalletProvider>
        <AIProvider>
          <Router>
            <div className="app">
              <Navigation />
              <main>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/guide" element={<UserGuide />} />
                </Routes>
              </main>
            </div>
          </Router>
        </AIProvider>
      </WalletProvider>
    </ThemeProvider>
  );
};

export default App;

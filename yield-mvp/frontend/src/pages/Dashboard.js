import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/layout/Card';
import { Toast } from '../components/feedback/Toast';
import { useSecureTransaction } from '../hooks/useSecureTransaction';
import './Dashboard.css';

export const Dashboard = ({ wallet }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [toast, setToast] = useState(null);
  const { stake, unstake, isProcessing, error } = useSecureTransaction(wallet);
  const [amount, setAmount] = useState('');

  const handleStake = async () => {
    try {
      await stake(amount);
      setToast({
        type: 'success',
        message: 'Successfully staked tokens!'
      });
      setAmount('');
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message
      });
    }
  };

  const handleUnstake = async () => {
    try {
      await unstake(amount);
      setToast({
        type: 'success',
        message: 'Successfully unstaked tokens!'
      });
      setAmount('');
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message
      });
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>NEAR Deep Yield</h1>
        <Button
          variant="outline"
          onClick={toggleTheme}
        >
          {isDarkMode ? '☀️ Light' : '🌙 Dark'}
        </Button>
      </header>

      <div className="dashboard-grid">
        <Card
          title="Stake Tokens"
          subtitle="Earn yield by staking your NEAR tokens"
          loading={isProcessing}
          error={error}
        >
          <div className="stake-form">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to stake"
              className="input"
            />
            <div className="button-group">
              <Button
                onClick={handleStake}
                loading={isProcessing}
                disabled={!amount}
                fullWidth
              >
                Stake
              </Button>
              <Button
                variant="outline"
                onClick={handleUnstake}
                loading={isProcessing}
                disabled={!amount}
                fullWidth
              >
                Unstake
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title="Your Stats"
          subtitle="Overview of your yield farming activity"
        >
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Staked</span>
              <span className="stat-value">1,234 NEAR</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current APY</span>
              <span className="stat-value">12.34%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Rewards Earned</span>
              <span className="stat-value">45.67 NEAR</span>
            </div>
          </div>
        </Card>

        <Card
          title="Recent Activity"
          subtitle="Your latest transactions"
        >
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-type success">Stake</span>
              <span className="activity-amount">+100 NEAR</span>
              <span className="activity-time">2 hours ago</span>
            </div>
            <div className="activity-item">
              <span className="activity-type warning">Unstake</span>
              <span className="activity-amount">-50 NEAR</span>
              <span className="activity-time">1 day ago</span>
            </div>
            <div className="activity-item">
              <span className="activity-type info">Reward</span>
              <span className="activity-amount">+5.5 NEAR</span>
              <span className="activity-time">3 days ago</span>
            </div>
          </div>
        </Card>
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

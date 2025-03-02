import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface SentimentGaugeProps {
  value: number;
  title?: string;
}

const SentimentGauge: React.FC<SentimentGaugeProps> = ({ value, title = 'Market Sentiment' }) => {
  const getColor = (value: number) => {
    if (value >= 75) return '#4CAF50';
    if (value >= 50) return '#8BC34A';
    if (value >= 25) return '#FFC107';
    return '#F44336';
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom align="center">
          {title}
        </Typography>
        <Box sx={{ width: 200, height: 200, margin: '0 auto' }}>
          <CircularProgressbar
            value={value}
            text={`${value}%`}
            styles={buildStyles({
              rotation: 0.25,
              strokeLinecap: 'round',
              textSize: '16px',
              pathTransitionDuration: 0.5,
              pathColor: getColor(value),
              textColor: getColor(value),
              trailColor: '#d6d6d6',
              backgroundColor: '#3e98c7',
            })}
          />
        </Box>
        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          {value >= 75 && 'Very Bullish'}
          {value >= 50 && value < 75 && 'Bullish'}
          {value >= 25 && value < 50 && 'Bearish'}
          {value < 25 && 'Very Bearish'}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SentimentGauge;

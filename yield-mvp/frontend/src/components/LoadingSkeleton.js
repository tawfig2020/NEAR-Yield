import React from 'react';
import { Skeleton, Card, CardContent, Grid } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';

export const OpportunitySkeleton = () => {
  const theme = useMuiTheme();

  return (
    <Card
      sx={{
        mb: 2,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Skeleton variant="text" width="80%" height={24} />
            <Skeleton variant="text" width="60%" height={20} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Skeleton variant="text" width="70%" height={24} />
            <Skeleton variant="text" width="50%" height={20} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Skeleton variant="text" width="75%" height={24} />
            <Skeleton variant="text" width="55%" height={20} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Skeleton variant="rectangular" width="100%" height={36} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export const PortfolioSkeleton = () => {
  const theme = useMuiTheme();

  return (
    <Card
      sx={{
        mb: 2,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export const AnalyticsSkeleton = () => {
  const theme = useMuiTheme();

  return (
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((item) => (
        <Grid item xs={12} sm={6} md={3} key={item}>
          <Card
            sx={{
              backgroundColor: theme.palette.background.paper,
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="80%" height={32} />
              <Skeleton variant="rectangular" height={60} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div>
      <Skeleton variant="rectangular" height={56} sx={{ mb: 1 }} />
      {Array(rows)
        .fill(0)
        .map((_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', marginBottom: '8px' }}>
            {Array(columns)
              .fill(0)
              .map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  variant="text"
                  width={`${100 / columns}%`}
                  height={40}
                  style={{ marginRight: '8px' }}
                />
              ))}
          </div>
        ))}
    </div>
  );
};

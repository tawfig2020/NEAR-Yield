import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Box, Button, Alert } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const VerifyEmail = () => {
  const { token } = useParams();
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        await verifyEmail(token);
        setVerified(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token, verifyEmail]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        {error ? (
          <>
            <Typography variant="h5" component="h1" gutterBottom color="error">
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </>
        ) : (
          <>
            <Typography variant="h5" component="h1" gutterBottom color="primary">
              Email Verified Successfully
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              Your email has been verified. You can now log in to your account.
            </Alert>
          </>
        )}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            fullWidth
          >
            Go to Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default VerifyEmail;

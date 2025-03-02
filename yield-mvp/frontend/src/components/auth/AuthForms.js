import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

const formStyles = {
  paper: {
    p: 4,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 400,
    mx: 'auto',
    mt: 8,
  },
  form: {
    width: '100%',
    mt: 1,
  },
  submit: {
    mt: 3,
    mb: 2,
  },
  google: {
    mt: 1,
    mb: 2,
    backgroundColor: '#fff',
    color: '#757575',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  divider: {
    my: 2,
  },
};

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSuccess = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        await googleLogin(response.access_token);
        navigate('/dashboard');
      } catch (err) {
        setError(err.message);
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={formStyles.paper}>
        <Typography component="h1" variant="h5">
          Sign In
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={formStyles.form}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={formStyles.submit}
          >
            Sign In
          </Button>
          <Divider sx={formStyles.divider}>OR</Divider>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={() => handleGoogleSuccess()}
            sx={formStyles.google}
          >
            Sign in with Google
          </Button>
          <Box mt={2} textAlign="center">
            <Link to="/forgot-password">Forgot password?</Link>
          </Box>
          <Box mt={2} textAlign="center">
            Don't have an account?{' '}
            <Link to="/register">Sign Up</Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await register(formData);
      navigate('/login', { state: { message: 'Please check your email to verify your account.' } });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={formStyles.paper}>
        <Typography component="h1" variant="h5">
          Sign Up
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={formStyles.form}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={formStyles.submit}
          >
            Sign Up
          </Button>
          <Box mt={2} textAlign="center">
            Already have an account?{' '}
            <Link to="/login">Sign In</Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={formStyles.paper}>
        <Typography component="h1" variant="h5">
          Reset Password
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        {success ? (
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            Password reset instructions have been sent to your email.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={formStyles.form}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={formStyles.submit}
            >
              Send Reset Link
            </Button>
            <Box mt={2} textAlign="center">
              <Link to="/login">Back to Sign In</Link>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

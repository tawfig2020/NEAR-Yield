const express = require('express');
const router = express.Router();
const { catchAsync } = require('../middleware/errorHandler');
const AuthService = require('../services/authService');
const UserModel = require('../models/user');

const authService = new AuthService(UserModel);

// Register new user
router.post('/register', catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    ...result
  });
}));

// Login with email/password
router.post('/login', catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json({
    success: true,
    message: 'Login successful',
    ...result
  });
}));

// Google OAuth login
router.post('/google', catchAsync(async (req, res) => {
  const { token } = req.body;
  const result = await authService.googleLogin(token);
  res.json({
    success: true,
    message: 'Google login successful',
    ...result
  });
}));

// Verify email
router.get('/verify-email/:token', catchAsync(async (req, res) => {
  const result = await authService.verifyEmail(req.params.token);
  res.json({
    success: true,
    message: 'Email verified successfully',
    ...result
  });
}));

// Forgot password
router.post('/forgot-password', catchAsync(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  res.json({
    success: true,
    message: 'Password reset instructions sent to your email'
  });
}));

// Reset password
router.post('/reset-password/:token', catchAsync(async (req, res) => {
  const { password } = req.body;
  const result = await authService.resetPassword(req.params.token, password);
  res.json({
    success: true,
    message: 'Password reset successful',
    ...result
  });
}));

// Update portfolio
router.put('/portfolio', catchAsync(async (req, res) => {
  try {
    const { portfolio } = req.body;
    await authService.updatePortfolio(req.user.userId, portfolio);
    res.json({
      success: true,
      data: { message: 'Portfolio updated successfully' }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}));

// Get portfolio
router.get('/portfolio', catchAsync(async (req, res) => {
  try {
    const portfolio = await authService.getPortfolio(req.user.userId);
    res.json({
      success: true,
      data: { portfolio }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}));

module.exports = router;

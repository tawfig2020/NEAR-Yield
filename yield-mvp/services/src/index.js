const express = require('express');
const cors = require('cors');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { monitoringMiddleware } = require('./utils/monitoring');
const limiters = require('./middleware/rateLimit');
const yieldRoutes = require('./routes/yield');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(monitoringMiddleware);

// Rate limiting
app.use('/api/auth', limiters.auth);
app.use('/api/yield', limiters.api);

// Routes
app.use('/api/yield', yieldRoutes);
app.use('/api/auth', authRoutes);

// Metrics endpoint
if (process.env.PROMETHEUS_ENABLED === 'true') {
  const { register } = require('./utils/monitoring');
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err);
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

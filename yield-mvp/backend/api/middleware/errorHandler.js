function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error
  let status = 500;
  let message = 'Internal Server Error';
  let details = undefined;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
    details = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
    details = err.message;
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden';
    details = err.message;
  } else if (err.name === 'NotFoundError') {
    status = 404;
    message = 'Not Found';
    details = err.message;
  } else if (err.name === 'ConflictError') {
    status = 409;
    message = 'Conflict';
    details = err.message;
  } else if (err.name === 'TooManyRequestsError') {
    status = 429;
    message = 'Too Many Requests';
    details = err.message;
  }

  // Handle NEAR-specific errors
  if (err.type === 'AccountDoesNotExist') {
    status = 404;
    message = 'Account Not Found';
    details = err.message;
  } else if (err.type === 'InvalidTransaction') {
    status = 400;
    message = 'Invalid Transaction';
    details = err.message;
  } else if (err.type === 'InsufficientFunds') {
    status = 402;
    message = 'Insufficient Funds';
    details = err.message;
  }

  // Send error response
  res.status(status).json({
    error: {
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: req.id // Assuming request ID middleware is used
    }
  });

  // Log error for monitoring
  if (status === 500) {
    // Log to error monitoring service
    req.errorTrackingService?.sendError(err, {
      type: 'api_error',
      status,
      path: req.path,
      method: req.method,
      requestId: req.id
    });
  }
}

module.exports = { errorHandler };

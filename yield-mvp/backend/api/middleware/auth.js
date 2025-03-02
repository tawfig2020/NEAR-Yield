const { validateAccountId } = require('../../utils/validation');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const [authType, token] = authHeader.split(' ');

    if (authType !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization type' });
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      // Verify the token signature
      const payload = verifyToken(token);
      
      // Validate account ID from token
      validateAccountId(payload.accountId);

      // Check if account exists and is active
      const accountExists = await req.accountService.accountExists(payload.accountId);
      if (!accountExists) {
        return res.status(401).json({ error: 'Account not found' });
      }

      // Add user info to request
      req.user = {
        accountId: payload.accountId,
        permissions: payload.permissions || []
      };

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    next(error);
  }
}

function verifyToken(token) {
  try {
    // Here you would typically verify the JWT token
    // For now, we'll just decode a base64 token for testing
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload;
  } catch (error) {
    throw new Error('Invalid token format');
  }
}

module.exports = { authMiddleware };

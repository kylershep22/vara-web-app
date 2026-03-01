// backend/middleware/auth.js
// Firebase ID token verification middleware for Express routes.

const { auth } = require('../firebase/firebase');

/**
 * Middleware that verifies the Firebase ID token from the Authorization header.
 * On success, sets req.uid (verified user ID) and req.user (decoded token).
 * Returns 401 if the token is missing, malformed, or invalid.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth middleware: token verification failed -', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };

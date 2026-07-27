const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Verify Google ID token and extract user info
async function verifyGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID not configured');
  }
  
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  
  const payload = ticket.getPayload();
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

// Express middleware: require authentication
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Login required. Please sign in with Google.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  verifyGoogleToken(token)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => {
      console.error('Auth error:', err.message);
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    });
}

// Express middleware: optional auth (doesn't block, just attaches user if present)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  verifyGoogleToken(token)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(() => {
      req.user = null;
      next();
    });
}

module.exports = { verifyGoogleToken, requireAuth, optionalAuth };

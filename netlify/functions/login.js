// netlify/functions/login.js
//
// This function runs SERVER-SIDE on Netlify's infrastructure.
// Credentials are NEVER in frontend code — they live only in
// Netlify environment variables (set in the Netlify dashboard UI).
//
// Environment variables required (set in Netlify UI → Site config → Env vars):
//   PORTAL_USERNAME   — e.g.  idfc-wv
//   PORTAL_PASSWORD   — e.g.  your-password-here
//   SESSION_SECRET    — any long random string, e.g. openssl rand -hex 32

const crypto = require('crypto');

// Simple HMAC-signed token: "username.expiry.signature"
function createToken(username) {
  const secret  = process.env.SESSION_SECRET || 'change-this-secret';
  const expiry  = Date.now() + 8 * 60 * 60 * 1000; // 8 hours from now
  const payload = `${username}.${expiry}`;
  const sig     = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64');
}

exports.handler = async (event) => {
  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid request' }) };
  }

  const { username, password } = body;

  // Pull credentials from environment (never hardcoded here)
  const validUsername = process.env.PORTAL_USERNAME;
  const validPassword = process.env.PORTAL_PASSWORD;

  if (!validUsername || !validPassword) {
    console.error('Environment variables PORTAL_USERNAME / PORTAL_PASSWORD not set.');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server configuration error.' })
    };
  }

  // Constant-time comparison to prevent timing attacks
  const usernameMatch = crypto.timingSafeEqual(
    Buffer.from(username  || ''), Buffer.from(validUsername)
  );
  const passwordMatch = crypto.timingSafeEqual(
    Buffer.from(password  || ''), Buffer.from(validPassword)
  );

  if (!usernameMatch || !passwordMatch) {
    // Artificial delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 500));
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid username or password.' })
    };
  }

  // Credentials correct — issue a signed session token
  const token = createToken(username);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username })
  };
};

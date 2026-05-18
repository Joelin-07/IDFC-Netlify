// netlify/functions/verify.js
//
// Called by dashboard.html on every page load.
// Validates the HMAC-signed token issued by login.js.
// If valid and not expired → returns { ok: true, username }
// Otherwise → returns { ok: false }

const crypto = require('crypto');

function verifyToken(token) {
  try {
    const secret  = process.env.SESSION_SECRET || 'change-this-secret';
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts   = decoded.split('.');

    // Format: username.expiry.signature
    if (parts.length < 3) return null;

    const sig      = parts.pop();                        // last segment
    const payload  = parts.join('.');                    // everything before sig
    const [username, expiry] = payload.split('.');

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const sigValid = crypto.timingSafeEqual(
      Buffer.from(sig), Buffer.from(expectedSig)
    );
    if (!sigValid) return null;

    // Check expiry
    if (Date.now() > parseInt(expiry, 10)) return null;

    return { username };
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false }) };
  }

  const result = verifyToken(body.token);

  if (!result) {
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, username: result.username })
  };
};

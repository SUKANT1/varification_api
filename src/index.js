// ============================================
// CONFIGURATION
// ============================================
const SECRET_SALT = "Sk2024#Lx7Mq9Pv3Zt8Xw1Bn6Cr4Fy5Gh2Jk0Nl3";

// ============================================
// HELPER FUNCTIONS
// ============================================

function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
  const istTime = new Date(now.getTime() + istOffset);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString();
}

async function generateDailyCode(dateString, secretSalt) {
  const message = `${dateString}_${secretSalt}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretSalt);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashBytes = new Uint8Array(signature);
  
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*+-=";
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += chars[hashBytes[i % hashBytes.length] % chars.length];
  }
  return code;
}

function isAuthorized(request, env) {
  const authHeader = request.headers.get('Authorization');
  // Expects header: "Authorization: Bearer YOUR_ADMIN_TOKEN"
  return authHeader === `Bearer ${env.ADMIN_TOKEN}`;
}

async function logVerification(db, data) {
  try {
    await db.prepare(`
      INSERT INTO verification_logs (
        timestamp, success, code_entered, ip_address, country, city, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.timestamp, data.success ? 1 : 0, data.codeEntered, 
      data.ipAddress, data.country, data.city, data.userAgent
    ).run();
  } catch (e) { console.error('Logging Error:', e); }
}

// ============================================
// MAIN WORKER
// ============================================

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const istDate = getISTDate();
    const todayCode = await generateDailyCode(istDate, SECRET_SALT);

    // 1. Root Route
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'online', timezone: 'IST' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 2. Verify Route (Main logic)
    if (url.pathname === '/verify' && request.method === 'POST') {
      try {
        const body = await request.json();
        const userCode = body.code;
        const isSuccess = userCode === todayCode;

        await logVerification(env.DB, {
          timestamp: getISTTimestamp(),
          success: isSuccess,
          codeEntered: userCode,
          ipAddress: request.headers.get('CF-Connecting-IP'),
          country: request.headers.get('CF-IPCountry'),
          city: request.cf?.city || 'Unknown',
          userAgent: request.headers.get('User-Agent')
        });

        return new Response(JSON.stringify({ success: isSuccess }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: corsHeaders });
      }
    }

    // 3. Admin Routes (Protected)
    const adminPaths = ['/logs', '/stats', '/admin-code'];
    if (adminPaths.includes(url.pathname)) {
      if (!isAuthorized(request, env)) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      // Route: Get current code for admin verification
      if (url.pathname === '/admin-code') {
        return new Response(JSON.stringify({ code: todayCode }), { headers: corsHeaders });
      }

      // Route: Fetch logs from D1
      if (url.pathname === '/logs') {
        const { results } = await env.DB.prepare(`
          SELECT * FROM verification_logs ORDER BY timestamp DESC LIMIT 50
        `).all();
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Route: Basic statistics
      if (url.pathname === '/stats') {
        const { results } = await env.DB.prepare(`
          SELECT success, COUNT(*) as count FROM verification_logs GROUP BY success
        `).all();
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Default 404
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

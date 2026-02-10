// ============================================
// CONFIGURATION
// ============================================
const SECRET_SALT = "Sk2024#Lx7Mq9Pv3Zt8Xw1Bn6Cr4Fy5Gh2Jk0Nl3";

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get current IST date (YYYYMMDD format)
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
  const istTime = new Date(now.getTime() + istOffset);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Get current IST timestamp
function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString();
}

// Generate daily verification code
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

// Parse user agent to extract rich device info
function parseUserAgent(userAgent) {
  const info = {
    browser: 'Unknown',
    browserVersion: 'Unknown',
    os: 'Unknown',
    osVersion: 'Unknown',
    deviceType: 'Desktop'
  };
  
  if (!userAgent) return info;
  
  // Detect OS
  if (userAgent.includes('Windows NT 10.0')) info.os = 'Windows', info.osVersion = '10';
  else if (userAgent.includes('Windows NT 6.3')) info.os = 'Windows', info.osVersion = '8.1';
  else if (userAgent.includes('Windows NT 6.2')) info.os = 'Windows', info.osVersion = '8';
  else if (userAgent.includes('Windows NT 6.1')) info.os = 'Windows', info.osVersion = '7';
  else if (userAgent.includes('Mac OS X')) {
    info.os = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+)[._](\d+)/);
    if (match) info.osVersion = `${match[1]}.${match[2]}`;
  }
  else if (userAgent.includes('Android')) {
    info.os = 'Android';
    info.deviceType = 'Mobile';
    const match = userAgent.match(/Android (\d+\.?\d*)/);
    if (match) info.osVersion = match[1];
  }
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    info.os = userAgent.includes('iPad') ? 'iPadOS' : 'iOS';
    info.deviceType = userAgent.includes('iPad') ? 'Tablet' : 'Mobile';
    const match = userAgent.match(/OS (\d+)[._](\d+)/);
    if (match) info.osVersion = `${match[1]}.${match[2]}`;
  }
  else if (userAgent.includes('Linux')) info.os = 'Linux';
  
  // Detect Browser
  if (userAgent.includes('Edg/')) {
    info.browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+)/);
    if (match) info.browserVersion = match[1];
  }
  else if (userAgent.includes('Chrome/')) {
    info.browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (match) info.browserVersion = match[1];
  }
  else if (userAgent.includes('Firefox/')) {
    info.browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) info.browserVersion = match[1];
  }
  
  return info;
}

function isAuthorized(request, env) {
  const authHeader = request.headers.get('Authorization');
  return authHeader === `Bearer ${env.ADMIN_TOKEN}`;
}

async function logVerification(db, data) {
  try {
    await db.prepare(`
      INSERT INTO verification_logs (
        timestamp, success, code_entered, ip_address, country, city,
        user_agent, browser, browser_version, os, os_version,
        device_type, device_vendor, device_model, screen_resolution,
        timezone, language, extension_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.timestamp, data.success ? 1 : 0, data.codeEntered || null,
      data.ipAddress || null, data.country || null, data.city || null,
      data.userAgent || null, data.browser || null, data.browserVersion || null,
      data.os || null, data.osVersion || null, data.deviceType || null,
      data.deviceVendor || null, data.deviceModel || null, data.screenResolution || null,
      data.timezone || null, data.language || null, data.extensionVersion || null
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

    // 2. Verify Route (With rich data logging)
    if (url.pathname === '/verify' && request.method === 'POST') {
      try {
        const body = await request.json();
        const userCode = body.code;
        const deviceInfo = body.deviceInfo || {};
        const userAgent = request.headers.get('User-Agent') || '';
        const uaInfo = parseUserAgent(userAgent);
        
        const isSuccess = userCode === todayCode;

        await logVerification(env.DB, {
          timestamp: getISTTimestamp(),
          success: isSuccess,
          codeEntered: userCode,
          ipAddress: request.headers.get('CF-Connecting-IP'),
          country: request.headers.get('CF-IPCountry'),
          city: request.cf?.city || 'Unknown',
          userAgent: userAgent,
          browser: uaInfo.browser,
          browserVersion: uaInfo.browserVersion,
          os: uaInfo.os,
          osVersion: uaInfo.osVersion,
          deviceType: deviceInfo.deviceType || uaInfo.deviceType,
          deviceVendor: deviceInfo.deviceVendor || null,
          deviceModel: deviceInfo.deviceModel || null,
          screenResolution: deviceInfo.screenResolution || null,
          timezone: deviceInfo.timezone || null,
          language: deviceInfo.language || null,
          extensionVersion: deviceInfo.extensionVersion || null
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

      if (url.pathname === '/admin-code') {
        return new Response(JSON.stringify({ code: todayCode }), { headers: corsHeaders });
      }

      if (url.pathname === '/logs') {
        const { results } = await env.DB.prepare(`
          SELECT * FROM verification_logs ORDER BY timestamp DESC LIMIT 50
        `).all();
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

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

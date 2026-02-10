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
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashBytes = new Uint8Array(signature);
  
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%&*+-=";
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let code = "";
  for (let i = 0; i < 16; i++) {
    const charIndex = hashBytes[i % hashBytes.length] % allChars.length;
    code += allChars[charIndex];
  }
  
  // Ensure diversity
  if (!(/[A-Z]/.test(code))) {
    code = uppercase[hashBytes[0] % uppercase.length] + code.substring(1);
  }
  if (!(/[a-z]/.test(code))) {
    code = code[0] + lowercase[hashBytes[1] % lowercase.length] + code.substring(2);
  }
  if (!(/[0-9]/.test(code))) {
    code = code.substring(0, 2) + numbers[hashBytes[2] % numbers.length] + code.substring(3);
  }
  if (!(/[!@#$%&*+\-=]/.test(code))) {
    code = code.substring(0, 3) + symbols[hashBytes[3] % symbols.length] + code.substring(4);
  }
  
  return code.substring(0, 16);
}

// Parse user agent to extract device info
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
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    info.browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) info.browserVersion = match[1];
  }
  
  return info;
}

// Log verification attempt to database
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
      data.timestamp,
      data.success ? 1 : 0,
      data.codeEntered || null,
      data.ipAddress || null,
      data.country || null,
      data.city || null,
      data.userAgent || null,
      data.browser || null,
      data.browserVersion || null,
      data.os || null,
      data.osVersion || null,
      data.deviceType || null,
      data.deviceVendor || null,
      data.deviceModel || null,
      data.screenResolution || null,
      data.timezone || null,
      data.language || null,
      data.extensionVersion || null
    ).run();
    
    console.log('Verification logged successfully');
  } catch (error) {
    console.error('Error logging verification:', error);
  }
}

// ============================================
// MAIN WORKER
// ============================================

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const istDate = getISTDate();
    const todayCode = await generateDailyCode(istDate, SECRET_SALT);

    // Get IP address and location from Cloudflare
    const ipAddress = request.headers.get('CF-Connecting-IP') || 'Unknown';
    const country = request.headers.get('CF-IPCountry') || 'Unknown';
    const city = request.cf?.city || 'Unknown';
    const userAgent = request.headers.get('User-Agent') || '';

    // ============================================
    // ROUTE: Root - API Status
    // ============================================
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          message: 'Daily Verification API is running!',
          status: 'online',
          istDate: istDate,
          istTime: getISTTimestamp(),
          info: 'Code changes daily at midnight IST'
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // ============================================
    // ROUTE: Get Today's Code (REMOVE IN PRODUCTION!)
    // ============================================
    if (url.pathname === '/today-code' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          date: istDate,
          code: todayCode,
          warning: '⚠️ This endpoint should be removed in production!'
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // ============================================
    // ROUTE: Verify Code
    // ============================================
    if (url.pathname === '/verify' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { 
          code, 
          deviceInfo = {} 
        } = body;

        // Parse user agent
        const uaInfo = parseUserAgent(userAgent);

        // Prepare log data
        const logData = {
          timestamp: getISTTimestamp(),
          success: code === todayCode,
          codeEntered: code,
          ipAddress: ipAddress,
          country: country,
          city: city,
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
        };

        // Log to database
        await logVerification(env.DB, logData);

        console.log('Verification attempt:', {
          ip: ipAddress,
          country: country,
          success: logData.success
        });

        // Return response
        if (logData.success) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Verification successful! ✓',
              validUntil: 'Midnight IST',
              location: `${city}, ${country}`
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            }
          );
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Invalid verification code ✗'
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            }
          );
        }
      } catch (error) {
        console.error('Verification error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Error processing request'
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
    }

    // ============================================
    // ROUTE: View Logs
    // ============================================
    if (url.pathname === '/logs' && request.method === 'GET') {
      try {
        const limit = parseInt(url.searchParams.get('limit')) || 100;
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        
        const { results } = await env.DB.prepare(`
          SELECT * FROM verification_logs 
          ORDER BY timestamp DESC 
          LIMIT ? OFFSET ?
        `).bind(limit, offset).all();

        return new Response(
          JSON.stringify({
            logs: results,
            count: results.length,
            limit: limit,
            offset: offset
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch logs' }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
    }

    // ============================================
    // ROUTE: Stats
    // ============================================
    if (url.pathname === '/stats' && request.method === 'GET') {
      try {
        const { results: totalResults } = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(success) as successful,
            COUNT(*) - SUM(success) as failed
          FROM verification_logs
        `).all();

        const { results: todayResults } = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(success) as successful
          FROM verification_logs
          WHERE DATE(timestamp) = DATE('now')
        `).all();

        const { results: topCountries } = await env.DB.prepare(`
          SELECT country, COUNT(*) as count
          FROM verification_logs
          WHERE country IS NOT NULL AND country != 'Unknown'
          GROUP BY country
          ORDER BY count DESC
          LIMIT 10
        `).all();

        return new Response(
          JSON.stringify({
            allTime: totalResults[0],
            today: todayResults[0],
            topCountries: topCountries
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch stats' }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
    }

    // 404 for other routes
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
};

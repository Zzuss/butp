/**
 * CAS Proxy Server
 *
 * This is a standalone Express server that acts as a proxy for CAS authentication.
 * It handles the popup-based authentication flow for the BuTP application.
 *
 * Architecture:
 * 1. Frontend opens popup window pointing to /api/auth/cas/proxy-login
 * 2. This server redirects to CAS server for authentication
 * 3. After successful auth, CAS redirects back to /api/auth/cas/callback
 * 4. The callback returns an HTML page that posts the ticket to parent window via postMessage
 * 5. Frontend receives ticket and sends it to Next.js API for verification
 *
 * Environment:
 * - Runs on port 8080 by default
 * - Requires VPN connection to access (10.3.58.3)
 * - Must be accessible from the frontend application
 *
 * Required dependencies:
 * - express
 * - cors
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Enable CORS for all origins (adjust for production)
app.use(cors({
  origin: '*',
  credentials: true
}));

// Parse query parameters
app.use(express.urlencoded({ extended: true }));

/**
 * Route: /api/auth/cas/proxy-login
 *
 * Initiates the CAS login flow by redirecting to the CAS server.
 *
 * Query parameters:
 * - returnUrl: (optional) The URL to redirect to after successful authentication
 *
 * Flow:
 * 1. User clicks "CAS Login" button on frontend
 * 2. Frontend opens popup window pointing to this route
 * 3. This route constructs CAS login URL with callback URL
 * 4. Redirects user's browser to CAS server
 * 5. User authenticates with CAS server
 * 6. CAS server redirects back to /api/auth/cas/callback with ticket
 */
app.get('/api/auth/cas/proxy-login', (req, res) => {
  const returnUrl = req.query.returnUrl || '/dashboard';

  // CAS server configuration
  const CAS_SERVER_URL = 'https://auth.bupt.edu.cn/authserver';
  const CALLBACK_URL = `http://10.3.58.3:8080/api/auth/cas/callback?returnUrl=${encodeURIComponent(returnUrl)}`;

  // Build CAS login URL
  const casLoginUrl = `${CAS_SERVER_URL}/login?service=${encodeURIComponent(CALLBACK_URL)}`;

  console.log(`[${new Date().toISOString()}] Redirecting to CAS login:`, {
    returnUrl,
    callbackUrl: CALLBACK_URL,
    casLoginUrl: casLoginUrl.substring(0, 100) + '...'
  });

  // Redirect to CAS server
  return res.redirect(casLoginUrl);
});

/**
 * Route: /api/auth/cas/callback
 *
 * Handles the callback from CAS server after successful authentication.
 *
 * Query parameters:
 * - ticket: The CAS service ticket
 * - returnUrl: (optional) The URL to return after authentication
 *
 * Flow:
 * 1. CAS server redirects here with ticket after successful authentication
 * 2. This route returns an HTML page with embedded JavaScript
 * 3. The JavaScript posts the ticket to parent window via postMessage
 * 4. Frontend receives message and sends ticket to Next.js API for verification
 */
app.get('/api/auth/cas/callback', (req, res) => {
  const ticket = req.query.ticket;
  const returnUrl = req.query.returnUrl || '/dashboard';

  console.log(`[${new Date().toISOString()}] CAS callback received:`, {
    hasTicket: !!ticket,
    ticket: ticket ? ticket.substring(0, 20) + '...' : 'none',
    returnUrl
  });

  if (!ticket) {
    return res.status(400).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>认证失败</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fee2e2; }
    .container { text-align: center; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>认证失败</h1>
    <p>未收到CAS票据，请重试</p>
  </div>
</body>
</html>
    `);
  }

  // Return HTML page that posts ticket to parent window
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CAS认证成功</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      text-align: center;
      color: white;
      padding: 2rem;
    }
    .spinner {
      border: 4px solid rgba(255,255,255,0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
    p { margin: 0; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>认证成功</h1>
    <div class="spinner"></div>
    <p>正在跳转...</p>
  </div>
  <script>
    (function() {
      const ticket = '${ticket}';
      const returnUrl = '${returnUrl}';

      console.log('CAS callback: posting message to parent window');

      // Post message to parent window
      if (window.opener) {
        try {
          window.opener.postMessage({
            type: 'CAS_SUCCESS',
            ticket: ticket,
            returnUrl: returnUrl
          }, '*'); // In production, specify the exact origin instead of '*'

          console.log('CAS callback: message posted successfully');

          // Close window after a short delay to ensure message is received
          setTimeout(function() {
            console.log('CAS callback: closing popup window');
            window.close();
          }, 500);
        } catch (error) {
          console.error('CAS callback: error posting message:', error);
          document.body.innerHTML = '<h1>认证成功，但无法完成自动跳转</h1><p>请关闭此窗口并刷新主页面</p>';
        }
      } else {
        console.warn('CAS callback: no parent window found');
        document.body.innerHTML = '<h1>认证成功，但无法找到父窗口</h1><p>请关闭此窗口并刷新主页面</p>';
      }
    })();
  </script>
</body>
</html>
  `);
});

/**
 * Route: /health
 *
 * Health check endpoint for monitoring
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cas-proxy-server'
  });
});

/**
 * Route: /
 *
 * Root endpoint with service information
 */
app.get('/', (req, res) => {
  res.json({
    service: 'CAS Proxy Server',
    version: '1.0.0',
    endpoints: {
      proxyLogin: '/api/auth/cas/proxy-login?returnUrl=/dashboard',
      callback: '/api/auth/cas/callback',
      health: '/health'
    },
    description: 'Proxy server for CAS authentication with popup-based flow'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CAS Proxy Server running on port ${PORT}`);
  console.log(`- Health check: http://10.3.58.3:${PORT}/health`);
  console.log(`- Proxy login: http://10.3.58.3:${PORT}/api/auth/cas/proxy-login`);
  console.log(`- Callback: http://10.3.58.3:${PORT}/api/auth/cas/callback`);
});

module.exports = app;

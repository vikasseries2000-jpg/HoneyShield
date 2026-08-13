const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();

// 💡 JSON Pretty-Printing Enable (Clean API Logs)
app.set('json spaces', 2);

const LOG_FILE = path.join(__dirname, 'logs.json');

function loadLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error("Error reading log file:", err.message);
  }
  return [];
}

function saveLogs(logs) {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing to log file:", err.message);
  }
}

const attackLogs = loadLogs();

// IP Tracking Data Structures
const ipAttackCounts = {}; 
const blockedIPs = new Set(); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Helper function to detect Attack Payload Type
function detectAttackType(username = '', password = '', defaultRoute = '/admin') {
  const combined = (username + ' ' + password).toLowerCase();
  
  // SQL Injection Signatures
  const sqliRegex = /(\b(select|union|insert|update|delete|drop|alter|exec|exec\(|concat)\b|'|--|#|\/\*|or 1=1|1='1)/i;
  
  // XSS Signatures
  const xssRegex = /(<script|javascript:|onerror=|onload=|document\.cookie|<img)/i;

  if (sqliRegex.test(combined)) {
    return '💉 SQL Injection (SQLi)';
  } else if (xssRegex.test(combined)) {
    return '☣️ Cross-Site Scripting (XSS)';
  } else if (username || password) {
    return '🔑 Credential Bruteforce';
  }
  
  return defaultRoute;
}

// IP Blocking Middleware for Traps
function checkBlockedIP(req, res, next) {
  const attackerIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  if (blockedIPs.has(attackerIP)) {
    return res.status(403).json({
      error: 'IP_BLOCKED',
      message: '🚨 Access Denied! Your IP has been permanently blacklisted due to multiple attack attempts.'
    });
  }
  next();
}

function generateFakeSpoofedIP() {
  const fakeSubnets = ['10.0.12.', '192.168.99.', '172.16.4.'];
  const randomSubnet = fakeSubnets[Math.floor(Math.random() * fakeSubnets.length)];
  const randomHost = Math.floor(Math.random() * 253) + 1;
  return randomSubnet + randomHost;
}

// Record Attacks Helper + Auto Blocking Logic
function recordAttack(ip, route, inputDetails, userAgent, severity = 'MEDIUM') {
  ipAttackCounts[ip] = (ipAttackCounts[ip] || 0) + 1;
  
  let isNowBlocked = false;
  if (ipAttackCounts[ip] >= 2) {
    blockedIPs.add(ip);
    isNowBlocked = true;
  }

  const fakeSpoofedIP = generateFakeSpoofedIP();
  const sessionId = 'SESS-' + Math.random().toString(36).substr(2, 9).toUpperCase();

  const newLog = {
    id: Date.now(),
    sessionId: sessionId,
    ip: ip,
    spoofedResponseIP: fakeSpoofedIP,
    path: route,
    userAgent: userAgent || 'Unknown',
    capturedInputs: inputDetails + (isNowBlocked ? ' ⛔ [IP AUTO-BLOCKED]' : ''),
    severity: isNowBlocked ? 'CRITICAL' : severity,
    isBlocked: isNowBlocked,
    timestamp: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString()
  };

  attackLogs.unshift(newLog);
  saveLogs(attackLogs);
  console.warn(`🚨 ATTACK DETECTED [Count: ${ipAttackCounts[ip]}]! Type/Route: ${route} | IP: ${ip} ${isNowBlocked ? '--> BLOCKED!' : ''}`);
  return { fakeSpoofedIP, isBlocked: isNowBlocked };
}

// ==========================================
// 1. REAL AUTHENTICATION & LOGIN API
// ==========================================
app.post('/api/login', checkBlockedIP, (req, res) => {
  const { username, password } = req.body;
  const attackerIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // 🔑 REAL ADMIN CREDENTIALS
  const REAL_ADMIN_USER = "admin";
  const REAL_ADMIN_PASS = "HoneyShield@2026";

  // Check Credentials
  if (username === REAL_ADMIN_USER && password === REAL_ADMIN_PASS) {
    console.log(`✅ REAL ADMIN LOGGED IN from IP: ${attackerIP}`);
    return res.json({
      success: true,
      message: "Login successful!",
      redirectUrl: "/dashboard.html"
    });
  }

  // 🚨 IF WRONG -> TRIGGER HONEYPOT TRAP
  const attackType = detectAttackType(username, password, '/admin');
  const inputDetails = `User: ${username || 'N/A'} | Pass: ${password || 'N/A'}`;
  const defaultSeverity = attackType.includes('SQL Injection') || attackType.includes('XSS') ? 'CRITICAL' : 'MEDIUM';

  const { isBlocked } = recordAttack(attackerIP, attackType, inputDetails, userAgent, defaultSeverity);

  setTimeout(() => {
    return res.status(401).json({
      success: false,
      message: isBlocked ? '🚨 IP PERMANENTLY BLOCKED AFTER 2 ATTACKS!' : 'Invalid Credentials!',
      isBlocked: isBlocked
    });
  }, 1000);
});

// ==========================================
// 2. FAKE HONEYTOKENS IN DECOY .ENV
// ==========================================
app.get('/.env', checkBlockedIP, (req, res) => {
  const attackerIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const { isBlocked } = recordAttack(attackerIP, '📜 Honeytoken Recon (.env)', 'EXPOSED HONEYTOKENS DOWNLOADED', userAgent, 'HIGH');

  if (isBlocked) {
    return res.status(403).send("403 Forbidden - Your IP has been blocked due to malicious behavior.");
  }

  const fakeEnvContent = `# CRITICAL SYSTEM CONFIG - DEPLOYMENT PROD
PORT=5000
NODE_ENV=production

# DATABASE CREDENTIALS (HONEYTOKEN)
DB_HOST=10.0.4.12
DB_USER=root_admin
DB_PASS=P@ssw0rd_HoneyShield2026!

# AWS S3 CREDENTIALS (HONEYTOKEN)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# JWT SECRET KEY
JWT_SECRET=honeyshield_decoy_secret_key_88912
`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(fakeEnvContent);
});

// ==========================================
// 3. HONEYTOKEN EXPLOIT DETECTOR (TRAP API)
// ==========================================
app.all('/api/v1/auth/aws-login', checkBlockedIP, (req, res) => {
  const attackerIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  recordAttack(attackerIP, '⚡ AWS Honeytoken Exploit', 'HONEYTOKEN EXPLOITATION ATTEMPT', userAgent, 'CRITICAL');

  setTimeout(() => {
    res.status(401).json({ error: 'Honeytoken Detected: IP Flagged by SOC Engine' });
  }, 1000);
});

// ==========================================
// 4. RESET IP API (FOR TESTING)
// ==========================================
app.post('/api/reset-ip', (req, res) => {
  const { ip } = req.body;
  if (ip) {
    blockedIPs.delete(ip);
    delete ipAttackCounts[ip];
    console.log(`✅ IP Unblocked & Reset: ${ip}`);
    return res.json({ success: true, message: `IP ${ip} has been unblocked!` });
  }
  
  blockedIPs.clear();
  for (let member in ipAttackCounts) delete ipAttackCounts[member];
  console.log(`✅ All IP Blocklists cleared!`);
  res.json({ success: true, message: 'All IPs have been reset and unblocked!' });
});

// ==========================================
// 5. HONEYPOT / ADMIN ROUTE SERVING
// ==========================================
const trapRoutes = ['/admin', '/wp-login.php'];

app.get(trapRoutes, checkBlockedIP, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Dashboard API Endpoint
app.get('/api/logs', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({
    totalAttacks: attackLogs.length,
    logs: attackLogs,
    blockedIPs: Array.from(blockedIPs),
    ipCounts: ipAttackCounts
  }, null, 2));
});

// Serve Static Frontend Directory
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🛡️ HoneyShield Console Active on http://localhost:${PORT}`);
});
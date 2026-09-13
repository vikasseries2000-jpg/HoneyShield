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
    path: route, // Contains specific attack vector like SQL Injection now!
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
// 1. FAKE HONEYTOKENS IN DECOY .ENV
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
// 2. HONEYTOKEN EXPLOIT DETECTOR (TRAP API)
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
// 3. FORM SUBMIT ATTACK TRIGGER (Detects SQLi / XSS / Bruteforce)
// ==========================================
app.post('/api/submit-attack', checkBlockedIP, (req, res) => {
  const { username, password, targetRoute } = req.body;
  const attackerIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // Automatically detect if it is SQL Injection, XSS, or Bruteforce
  const attackType = detectAttackType(username, password, targetRoute || '/admin');

  const fakeBearerToken = 'ht_bearer_' + Math.random().toString(36).substring(2);
  const inputDetails = `User: ${username || 'N/A'} | Pass: ${password || 'N/A'}`;

  // Assign CRITICAL severity automatically if SQL Injection or XSS
  const defaultSeverity = attackType.includes('SQL Injection') || attackType.includes('XSS') ? 'CRITICAL' : 'MEDIUM';

  const { isBlocked } = recordAttack(attackerIP, attackType, inputDetails, userAgent, defaultSeverity);

  setTimeout(() => {
    res.status(401).json({
      status: isBlocked ? 'Blocked' : 'Failed',
      message: isBlocked ? 'IP Blacklisted after 2 attack attempts!' : 'Authentication Failed.',
      fakeToken: fakeBearerToken,
      isBlocked: isBlocked
    });
  }, 1500);
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
// 5. HONEYPOT LOGIN PAGE (/admin)
// ==========================================
const trapRoutes = ['/admin', '/wp-login.php'];

app.get(trapRoutes, checkBlockedIP, (req, res) => {
  const fakeSpoofedIP = generateFakeSpoofedIP();

  res.setHeader('X-Deception-Gateway-IP', fakeSpoofedIP);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Portal Login</title>
      <style>
        body { background: #111827; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .login-card { background: #1f2937; padding: 30px; border-radius: 8px; width: 340px; border: 1px solid #374151; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5); }
        input { width: 100%; padding: 10px; margin: 10px 0; background: #374151; border: 1px solid #4b5563; color: white; border-radius: 4px; box-sizing: border-box;}
        button { width: 100%; padding: 10px; background: #f43f5e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px; }
        button:hover { background: #e11d48; }
        .msg { font-size: 12px; color: #f87171; margin-top: 10px; text-align: center; display: none; }
        .token-box { font-size: 10px; color: #6ee7b7; background: #064e3b; padding: 6px; border-radius: 4px; margin-top: 8px; word-break: break-all; display: none; }
      </style>
    </head>
    <body>
      <div class="login-card">
        <h2>Secure Admin Portal</h2>
        <p style="font-size: 11px; color: #9ca3af;">Deception Gateway IP: ${fakeSpoofedIP}</p>
        <form id="loginForm">
          <input type="text" id="username" placeholder="Username" required autocomplete="off">
          <input type="password" id="password" placeholder="Password" required>
          <button type="submit" id="subBtn">Login System</button>
        </form>
        <div id="errorMsg" class="msg">Access Denied: Invalid Credentials</div>
        <div id="tokenMsg" class="token-box"></div>
      </div>

      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('subBtn');
          const msg = document.getElementById('errorMsg');
          const tokenMsg = document.getElementById('tokenMsg');
          
          btn.innerText = "Authenticating...";
          btn.disabled = true;

          const u = document.getElementById('username').value;
          const p = document.getElementById('password').value;

          try {
            const res = await fetch('/api/submit-attack', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: u, password: p, targetRoute: window.location.pathname })
            });

            const data = await res.json();

            btn.innerText = "Login System";
            btn.disabled = false;
            
            if (res.status === 403 && data.error === 'IP_BLOCKED') {
              msg.innerText = data.message;
              msg.style.display = "block";
              btn.style.background = "#6b7280";
              btn.disabled = true;
              return;
            }

            msg.innerText = data.isBlocked ? "🚨 IP PERMANENTLY BLOCKED AFTER 2 ATTACKS!" : "Access Denied: Invalid Credentials";
            msg.style.display = "block";

            if(data.fakeToken) {
              tokenMsg.style.display = "block";
              tokenMsg.innerText = "Bait Auth Token Issued: " + data.fakeToken;
            }
          } catch(err) {
            btn.innerText = "Login System";
            btn.disabled = false;
            msg.innerText = "Connection Error or IP Blacklisted!";
            msg.style.display = "block";
          }
        });
      </script>
    </body>
    </html>
  `);
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

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🛡️ HoneyShield Console Active on http://localhost:${PORT}`);
});
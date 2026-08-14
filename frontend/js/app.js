/**
 * ============================================================================
 * HONEYSHIELD DEFENSE CONSOLE - ENTERPRISE HONEYPOT & THREAT INTELLIGENCE
 * ============================================================================
 * Features:
 *  - 3-Strike IP Auto-Blocking Mechanism
 *  - Web Audio API Live Emergency Siren Trigger (3rd Attack/Block Event)
 *  - Real-Time IST Timezone Capture (Asia/Kolkata)
 *  - Exact Attacker Payload & Credential Capture (User & Pass text)
 *  - Multi-Vector Attack Classifier (SQLi, XSS, Brute Force, Path Traversal)
 *  - Multiple Decoy Honeypot Routes (/wp-admin, /phpmyadmin, /.env, /backup.sql)
 *  - Live Polling API & Client-Side Auto-Refresh
 *  - Emergency IP Unblock & CSV Intelligence Export Endpoints
 * ============================================================================
 */

const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// 1. CORE MIDDLEWARE & CONFIGURATION
// ============================================================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'honeyshield_cyber_defense_secret_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 Hours
        secure: false // Set to true if running behind HTTPS
    }
}));

// ============================================================================
// 2. IN-MEMORY THREAT INTELLIGENCE DATABASES
// ============================================================================
const USERS_DB = {
    'admin': { password: 'adminpassword', role: 'admin', name: 'System Administrator' },
    'user1': { password: 'userpassword', role: 'user', name: 'Standard Operator' }
};

const blockedIPs = new Set();
const ipAttackCounts = {};
const threatLogs = [];
const honeypotTrapsTriggered = { total: 0 };

// System startup time for uptime metric
const SERVER_START_TIME = new Date();

// ============================================================================
// 3. UTILITY & HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts real client IP address through proxy layers (Render, Cloudflare, Nginx)
 */
function getClientIP(req) {
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP) return cfIP;

    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }
    
    return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Generates decoy IP addresses for visual analysis testing
 */
function generateFakeAttackerIP() {
    const octet1 = Math.floor(Math.random() * 180) + 10;
    const octet2 = Math.floor(Math.random() * 255);
    const octet3 = Math.floor(Math.random() * 255);
    const octet4 = Math.floor(Math.random() * 254) + 1;
    return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

/**
 * Escapes raw HTML input to prevent XSS rendering in the Admin Console
 */
function escapeHTML(str) {
    if (!str) return 'N/A';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Classifies payload vectors based on signature matching
 */
function classifyAttackPayload(username = '', password = '') {
    const input = `${username} ${password}`;

    const sqliRegex = /(\'|\"|\-\-|\b(OR|AND|SELECT|INSERT|DELETE|DROP|UNION|EXEC)\b)/i;
    const xssRegex = /(<script>|javascript:|onload=|onerror=|<iframe|<img)/i;
    const pathTraversalRegex = /(\.\.\/|\.\.\\|etc\/passwd|boot\.ini)/i;
    const cmdInjectionRegex = /(;|\||`|\$\(|system\(|exec\()/i;

    if (sqliRegex.test(input)) return 'SQL Injection (SQLi)';
    if (xssRegex.test(input)) return 'Cross-Site Scripting (XSS)';
    if (pathTraversalRegex.test(input)) return 'Directory Traversal Attempt';
    if (cmdInjectionRegex.test(input)) return 'Command Injection Attempt';
    
    return 'Brute Force / Bad Credentials';
}

/**
 * Formats date object to Indian Standard Time (IST - Asia/Kolkata)
 */
function getFormattedISTTime() {
    return new Date().toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    });
}

/**
 * Central Attack Registration Engine
 */
function registerAttack(realIP, route, attackType, userAgent, attemptedUser = 'N/A', attemptedPass = 'N/A') {
    ipAttackCounts[realIP] = (ipAttackCounts[realIP] || 0) + 1;
    const currentCount = ipAttackCounts[realIP];
    const isBlocked = currentCount >= 3;
    
    if (isBlocked) {
        blockedIPs.add(realIP);
    }

    const newLog = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        time: getFormattedISTTime(),
        ip: realIP,
        route: route,
        attackType: attackType,
        attemptedUser: attemptedUser || 'N/A',
        attemptedPass: attemptedPass || 'N/A',
        action: isBlocked ? 'BLOCKED' : 'LOGGED',
        userAgent: userAgent || 'Unknown Client',
        isNewBlock: isBlocked,
        attackCount: currentCount
    };

    threatLogs.unshift(newLog); // Prepend so newest attack is always at index 0
    return isBlocked;
}

// ============================================================================
// 4. UI HTML TEMPLATES GENERATOR
// ============================================================================
function renderHTML(title, pageType, data = {}) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HoneyShield - ${title}</title>
        <style>
            :root {
                --bg-primary: #0b1320;
                --bg-secondary: #131f37;
                --bg-card: #182744;
                --text-main: #e2e8f0;
                --text-muted: #94a3b8;
                --accent-blue: #38bdf8;
                --accent-green: #10b981;
                --accent-yellow: #f59e0b;
                --accent-red: #ef4444;
                --border-color: #1e293b;
            }

            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
            body { background-color: var(--bg-primary); color: var(--text-main); display: flex; flex-direction: column; min-height: 100vh; }
            
            header { 
                background: var(--bg-secondary); 
                border-bottom: 1px solid var(--border-color); 
                padding: 16px 32px; 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
            }
            .logo { font-size: 22px; font-weight: 700; color: var(--accent-blue); display: flex; align-items: center; gap: 10px; }
            .user-nav { font-size: 14px; color: var(--text-muted); }
            .user-nav b { color: var(--text-main); }
            .btn-logout { color: var(--accent-red); margin-left: 12px; text-decoration: none; font-weight: 600; }
            .btn-logout:hover { text-decoration: underline; }

            .container { padding: 30px; max-width: 1300px; margin: 0 auto; width: 100%; flex: 1; }
            
            .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 25px; }
            .card-stat { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; text-align: center; }
            .card-stat h4 { font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
            .card-stat .val { font-size: 32px; font-weight: 800; margin-top: 8px; }

            .card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
            .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .card-title { color: var(--accent-blue); font-size: 18px; font-weight: 700; }

            .login-box { max-width: 420px; margin: 40px auto; }
            label { display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-muted); font-weight: 600; }
            input[type="text"], input[type="password"] { width: 100%; padding: 12px; margin-bottom: 18px; background: var(--bg-primary); border: 1px solid #334155; color: #fff; border-radius: 6px; outline: none; transition: 0.2s; }
            input[type="text"]:focus, input[type="password"]:focus { border-color: var(--accent-blue); }
            
            button { width: 100%; padding: 12px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 15px; transition: background 0.2s; }
            button:hover { background: #0369a1; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
            th { background: var(--bg-primary); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 12px; }
            tr:hover { background: rgba(255,255,255,0.02); }

            .badge-blocked { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); border: 1px solid var(--accent-red); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
            .badge-logged { background: rgba(245, 158, 11, 0.2); color: var(--accent-yellow); border: 1px solid var(--accent-yellow); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
            .error-box { background: rgba(239, 68, 68, 0.15); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 12px; border-radius: 6px; margin-bottom: 18px; font-size: 14px; }
            
            code { font-family: 'Courier New', Courier, monospace; color: #f43f5e; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; }
            .ip-highlight { color: var(--accent-yellow); font-weight: 700; }
            .payload-user { color: var(--accent-red); font-weight: 700; }

            .top-actions { display: flex; gap: 10px; }
            .btn-sm { padding: 6px 12px; font-size: 12px; width: auto; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); }
            .btn-sm:hover { background: #1e293b; }
        </style>
    </head>
    <body>
        <header>
            <div class="logo">🛡️ HoneyShield Cyber Defense Console</div>
            ${data.user ? `
                <div class="user-nav">
                    Logged as: <b>${escapeHTML(data.user)}</b>
                    <a href="/logout" class="btn-logout">Logout</a>
                </div>
            ` : ''}
        </header>

        <div class="container">
            ${pageType === 'login' ? `
                <div class="card login-box">
                    <h2 style="margin-bottom: 20px; text-align: center; color: var(--accent-blue);">Secure Authentication</h2>
                    ${data.error ? `<div class="error-box">${data.error}</div>` : ''}
                    <form action="/login" method="POST">
                        <label>Username / Payload Input</label>
                        <input type="text" name="username" placeholder="Enter username or attack test" required autocomplete="off">
                        <label>Password Input</label>
                        <input type="password" name="password" placeholder="Enter password" required autocomplete="off">
                        <button type="submit">Authenticate</button>
                    </form>
                    <div style="margin-top: 15px; text-align: center; font-size: 12px; color: var(--text-muted);">
                        Demo Account: <code>admin</code> / <code>adminpassword</code>
                    </div>
                </div>
            ` : ''}

            ${pageType === 'admin' ? `
                <div class="grid-stats">
                    <div class="card-stat">
                        <h4>Total Attack Attempts</h4>
                        <div class="val" style="color: var(--accent-yellow);" id="statTotalAttacks">${threatLogs.length}</div>
                    </div>
                    <div class="card-stat">
                        <h4>Active IP Blocks</h4>
                        <div class="val" style="color: var(--accent-red);" id="statBlockedIPs">${blockedIPs.size}</div>
                    </div>
                    <div class="card-stat">
                        <h4>Honeypot Traps Triggered</h4>
                        <div class="val" style="color: var(--accent-blue);" id="statHoneypots">${honeypotTrapsTriggered.total}</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">🚨 Real-Time Threat Intelligence Logs (IST Time)</div>
                        <div class="top-actions">
                            <a href="/api/export-csv" download="threat_logs.csv"><button class="btn-sm">📥 Export CSV</button></a>
                            <a href="/unblock-me"><button class="btn-sm" style="color: var(--accent-green);">🔓 Unblock All IPs</button></a>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Time (IST)</th>
                                <th>Attacker IP</th>
                                <th>Attack Type</th>
                                <th>Captured Username</th>
                                <th>Captured Password</th>
                                <th>Enforcement Action</th>
                            </tr>
                        </thead>
                        <tbody id="logsTableBody">
                            ${threatLogs.map(log => `
                                <tr>
                                    <td>${log.time}</td>
                                    <td><span class="ip-highlight">${escapeHTML(log.ip)}</span></td>
                                    <td>${escapeHTML(log.attackType)}</td>
                                    <td><span class="payload-user">${escapeHTML(log.attemptedUser)}</span></td>
                                    <td><code>${escapeHTML(log.attemptedPass)}</code></td>
                                    <td>
                                        <span class="${log.action === 'BLOCKED' ? 'badge-blocked' : 'badge-logged'}">
                                            ${log.action} (${log.attackCount}/3)
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                            ${threatLogs.length === 0 ? `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No threat activity recorded yet. System operational.</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${pageType === 'dashboard' ? `
                <div class="card">
                    <h2 style="color: var(--accent-green); margin-bottom: 10px;">Welcome to Protected User Terminal</h2>
                    <p style="color: var(--text-muted);">You are authenticated as an authorized operator. HoneyShield active monitoring system is running in background.</p>
                </div>
            ` : ''}
        </div>
    </body>
    </html>
    `;
}

// ============================================================================
// 5. DECITY & HONEYPOT ROUTES (DECOY TRAPS FOR RECON)
// ============================================================================
const honeypotPaths = ['/wp-admin', '/phpmyadmin', '/.env', '/backup.sql', '/admin.php', '/api/v1/config'];

honeypotPaths.forEach(trapPath => {
    app.all(trapPath, (req, res) => {
        const clientIP = getClientIP(req);
        honeypotTrapsTriggered.total += 1;
        
        registerAttack(
            clientIP, 
            trapPath, 
            `Honeypot Trap Triggered (${trapPath})`, 
            req.get('User-Agent'), 
            'UNAUTHORIZED_RECON', 
            'N/A'
        );

        res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center;">
                <h1>🛑 HONEYPOT TRAP TRIGGERED</h1>
                <p style="color:#e2e8f0; margin-top:10px;">Unlawful reconnaissance detected from IP: <b>${clientIP}</b></p>
                <p style="color:#94a3b8; margin-top:5px;">This event has been logged and reported to HoneyShield Security Intelligence.</p>
            </div>
        `);
    });
});

// ============================================================================
// 6. APPLICATION ENDPOINTS & AUTH LOGIC
// ============================================================================

// Index Route
app.get('/', (req, res) => {
    if (req.session.user) {
        return req.session.role === 'admin' ? res.redirect('/admin') : res.redirect('/dashboard');
    }
    res.send(renderHTML('Login', 'login'));
});

// Live Log Polling API Endpoint
app.get('/api/logs', (req, res) => {
    res.json({
        logs: threatLogs,
        blockedCount: blockedIPs.size,
        totalAttacks: threatLogs.length,
        honeypots: honeypotTrapsTriggered.total
    });
});

// Emergency IP Unblock Route
app.get('/unblock-me', (req, res) => {
    const clientIP = getClientIP(req);
    
    blockedIPs.clear();
    for (let ip in ipAttackCounts) {
        ipAttackCounts[ip] = 0;
    }

    res.send(`
        <div style="background:#0b1320; color:#10b981; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
            <h1>✅ ALL IPs & ATTACK COUNTS RESET</h1>
            <p style="color:#e2e8f0; margin-top:10px; font-size:16px;">Your IP <b>${clientIP}</b> and all blacklisted addresses have been unblocked.</p>
            <a href="/" style="color:#38bdf8; margin-top:20px; font-weight:bold; text-decoration:none; background:#131f37; padding:10px 20px; border-radius:6px; border:1px solid #1e293b;">Return to Login Page</a>
        </div>
    `);
});

// CSV Export Endpoint
app.get('/api/export-csv', (req, res) => {
    if (!req.session.user || req.session.role !== 'admin') {
        return res.status(403).send('Unauthorized');
    }

    let csvContent = "Time (IST),Attacker IP,Attack Type,Captured User,Captured Pass,Action,Attack Count\n";
    threatLogs.forEach(log => {
        csvContent += `"${log.time}","${log.ip}","${log.attackType}","${log.attemptedUser}","${log.attemptedPass}","${log.action}","${log.attackCount}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=honeyshield_threat_logs.csv');
    res.status(200).send(csvContent);
});

// Main Login Endpoint (Handles Attack Enforcement & Capture)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const clientIP = getClientIP(req);

    // 1. IP Blacklist Gatekeeper
    if (blockedIPs.has(clientIP)) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 ACCESS BLOCKED BY HONEYSHIELD</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">IP Address <b style="color:#f59e0b;">${clientIP}</b> has exceeded allowed attack limits.</p>
                <p style="color:#94a3b8;">Contact administrator or visit <a href="/unblock-me" style="color:#38bdf8;">/unblock-me</a> to clear locks.</p>
            </div>
        `);
    }

    // 2. Classify Payload & Attack Vector
    const detectedType = classifyAttackPayload(username, password);

    // 3. Valid Credentials Check
    if (USERS_DB[username] && USERS_DB[username].password === password) {
        req.session.user = username;
        req.session.role = USERS_DB[username].role;
        return req.session.role === 'admin' ? res.redirect('/admin') : res.redirect('/dashboard');
    }

    // 4. Register Attack Attempt & Capture Credentials
    const isBlocked = registerAttack(clientIP, '/login', detectedType, req.get('User-Agent'), username, password);

    if (isBlocked) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 MAXIMUM STRIKES EXCEEDED (3/3)</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">Attacker IP <b style="color:#ef4444;">${clientIP}</b> is now blacklisted.</p>
                <p style="color:#94a3b8;">Siren alert dispatched to admin dashboard.</p>
            </div>
        `);
    }

    res.send(renderHTML('Login', 'login', { 
        error: `⚠️ Invalid Credentials! Threat registered from IP ${clientIP}. Attempt (${ipAttackCounts[clientIP]}/3)` 
    }));
});

// Admin Route
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.role !== 'admin') {
        return res.redirect('/');
    }
    res.send(renderHTML('Admin Console', 'admin', { user: req.session.user }));
});

// User Dashboard Route
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.send(renderHTML('User Dashboard', 'dashboard', { user: req.session.user }));
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// ============================================================================
// 7. REAL-TIME POLLING & WEB AUDIO EMERGENCY SIREN SCRIPT
// ============================================================================
const SIREN_SCRIPT = `
<script>
    let sirenAudioCtx = null;
    let lastLogCount = 0;

    // Unlocks browser autoplay audio restrictions upon first interaction
    function unlockAudio() {
        if (!sirenAudioCtx) {
            sirenAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (sirenAudioCtx.state === 'suspended') {
            sirenAudioCtx.resume();
        }
        const banner = document.getElementById('audioBanner');
        if (banner) {
            banner.style.background = 'rgba(16, 185, 129, 0.2)';
            banner.style.color = '#10b981';
            banner.style.border = '1px solid #10b981';
            banner.innerHTML = '🔊 <b>Siren Audio Active:</b> System ready to play audible alerts on 3rd attack!';
        }
    }

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    // Synthesizes a loud dual-frequency police siren sound
    function playSirenSound() {
        try {
            if (!sirenAudioCtx) {
                sirenAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (sirenAudioCtx.state === 'suspended') {
                sirenAudioCtx.resume();
            }

            const osc = sirenAudioCtx.createOscillator();
            const gain = sirenAudioCtx.createGain();

            osc.type = 'sawtooth';
            const now = sirenAudioCtx.currentTime;

            // Frequency Sweep (Wailing Police Siren)
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
            osc.frequency.linearRampToValueAtTime(500, now + 0.8);
            osc.frequency.linearRampToValueAtTime(1200, now + 1.2);

            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

            osc.connect(gain);
            gain.connect(sirenAudioCtx.destination);

            osc.start(now);
            osc.stop(now + 1.4);
        } catch (e) {
            console.error("Audio Siren Error:", e);
        }
    }

    // Real-Time Polling Engine (Every 2 seconds)
    setInterval(async () => {
        try {
            const res = await fetch('/api/logs');
            const data = await res.json();
            
            // Trigger audio and refresh DOM if new threat log is appended
            if (lastLogCount > 0 && data.logs.length > lastLogCount) {
                const latestLog = data.logs[0];
                
                // Siren triggers specifically on 3rd attempt or BLOCKED status
                if (latestLog.attackCount >= 3 || latestLog.action === 'BLOCKED' || latestLog.isNewBlock) {
                    playSirenSound();
                }

                setTimeout(() => { window.location.reload(); }, 400);
            }
            lastLogCount = data.logs.length;
        } catch (err) {
            console.error("Polling error:", err);
        }
    }, 2000);

    // Render Audio Status Banner
    document.addEventListener("DOMContentLoaded", () => {
        const header = document.querySelector('header');
        if (header) {
            const banner = document.createElement('div');
            banner.id = 'audioBanner';
            banner.style.padding = '10px 20px';
            banner.style.margin = '15px 30px 0 30px';
            banner.style.borderRadius = '6px';
            banner.style.background = 'rgba(239, 68, 68, 0.2)';
            banner.style.color = '#ef4444';
            banner.style.border = '1px solid #ef4444';
            banner.style.cursor = 'pointer';
            banner.style.fontSize = '14px';
            banner.style.fontFamily = 'sans-serif';
            banner.innerHTML = '⚠️ <b>Siren Audio Standby:</b> Click anywhere on screen once to unlock loud alarm!';
            header.after(banner);
        }
    });
</script>
`;

// Middleware to inject Siren & Polling script into Admin Console
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
        if (typeof body === 'string' && body.includes('HoneyShield Cyber Defense Console')) {
            body = body.replace('</body>', `${SIREN_SCRIPT}</body>`);
        }
        return originalSend.call(this, body);
    };
    next();
});

// ============================================================================
// 8. SERVER STARTUP & LISTEN
// ============================================================================
app.listen(PORT, () => {
    console.log(`
  =============================================================
  🛡️  HONEYSHIELD DEFENSE CONSOLE INITIALIZED SUCCESSFULLY
  -------------------------------------------------------------
  ► Server Port   : ${PORT}
  ► Timezone      : Asia/Kolkata (IST)
  ► Honeypot Traps: ${honeypotPaths.join(', ')}
  ► Admin Login   : admin / adminpassword
  =============================================================
  `);
});
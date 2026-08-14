/**
 * ============================================================================
 * HONEYSHIELD DEFENSE CONSOLE - PIE CHART & EXPLICIT SIREN BUTTON
 * ============================================================================
 */

const express = require('express');
const session = require('express-session');

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
        maxAge: 24 * 60 * 60 * 1000,
        secure: false
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

// ============================================================================
// 3. UTILITY & HELPER FUNCTIONS
// ============================================================================

function getClientIP(req) {
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP) return cfIP;

    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }
    
    return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

function escapeHTML(str) {
    if (!str) return 'N/A';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

function getFormattedISTTime() {
    return new Date().toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    });
}

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

    threatLogs.unshift(newLog);
    return isBlocked;
}

// ============================================================================
// 4. UI HTML TEMPLATES GENERATOR
// ============================================================================
function renderHTML(title, pageType, data = {}) {
    const attackCounts = {
        'SQLi': 0,
        'XSS': 0,
        'Brute Force': 0,
        'Honeypot Trap': 0,
        'Others': 0
    };

    threatLogs.forEach(log => {
        if (log.attackType.includes('SQL')) attackCounts['SQLi']++;
        else if (log.attackType.includes('XSS')) attackCounts['XSS']++;
        else if (log.attackType.includes('Brute')) attackCounts['Brute Force']++;
        else if (log.attackType.includes('Honeypot')) attackCounts['Honeypot Trap']++;
        else attackCounts['Others']++;
    });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HoneyShield - ${title}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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

            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
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
            .user-nav { display: flex; align-items: center; gap: 15px; font-size: 14px; color: var(--text-muted); }
            .user-nav b { color: var(--text-main); }
            
            .btn-siren {
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid var(--accent-red);
                color: var(--accent-red);
                padding: 6px 14px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-logout { color: var(--accent-red); text-decoration: none; font-weight: 600; }

            .container { padding: 30px; max-width: 1300px; margin: 0 auto; width: 100%; flex: 1; }
            
            .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 25px; }
            .card-stat { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; text-align: center; }
            .card-stat h4 { font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
            .card-stat .val { font-size: 32px; font-weight: 800; margin-top: 8px; }

            /* SPLIT LAYOUT: STATS/TABLE LEFT, PIE CHART RIGHT */
            .main-dashboard-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 25px;
            }

            @media (max-width: 992px) {
                .main-dashboard-grid { grid-template-columns: 1fr; }
            }

            .card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
            .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .card-title { color: var(--accent-blue); font-size: 18px; font-weight: 700; }

            .login-box { max-width: 420px; margin: 40px auto; }
            label { display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-muted); font-weight: 600; }
            input[type="text"], input[type="password"] { width: 100%; padding: 12px; margin-bottom: 18px; background: var(--bg-primary); border: 1px solid #334155; color: #fff; border-radius: 6px; outline: none; }
            
            button { width: 100%; padding: 12px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 15px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
            th { background: var(--bg-primary); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 12px; }
            tr:hover { background: rgba(255,255,255,0.02); }

            .badge-blocked { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); border: 1px solid var(--accent-red); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
            .badge-logged { background: rgba(245, 158, 11, 0.2); color: var(--accent-yellow); border: 1px solid var(--accent-yellow); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
            
            code { font-family: monospace; color: #f43f5e; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; }
            .ip-highlight { color: var(--accent-yellow); font-weight: 700; }
            .payload-user { color: var(--accent-red); font-weight: 700; }

            .top-actions { display: flex; gap: 10px; }
            .btn-sm { padding: 6px 12px; font-size: 12px; width: auto; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); }

            .pie-chart-container { position: relative; height: 280px; width: 100%; display: flex; justify-content: center; align-items: center; }
        </style>
    </head>
    <body>
        <header>
            <div class="logo">🛡️ HoneyShield Cyber Defense Console</div>
            ${data.user ? `
                <div class="user-nav">
                    <button id="sirenToggleBtn" class="btn-siren" onclick="toggleSirenAudio()">🔔 Enable Siren Sound</button>
                    <span>Logged as: <b>${escapeHTML(data.user)}</b></span>
                    <a href="/logout" class="btn-logout">Logout</a>
                </div>
            ` : ''}
        </header>

        <div class="container">
            ${pageType === 'login' ? `
                <div class="card login-box">
                    <h2 style="margin-bottom: 20px; text-align: center; color: var(--accent-blue);">System Portal Login</h2>
                    ${data.error ? `<div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 12px; border-radius: 6px; margin-bottom: 18px;">${data.error}</div>` : ''}
                    <form action="/login" method="POST">
                        <label>Username</label>
                        <input type="text" name="username" placeholder="Enter username" required autocomplete="off">
                        <label>Password</label>
                        <input type="password" name="password" placeholder="Enter password" required autocomplete="off">
                        <button type="submit">Sign In</button>
                    </form>
                </div>
            ` : ''}

            ${pageType === 'admin' ? `
                <div class="grid-stats">
                    <div class="card-stat">
                        <h4>Total Threat Logged</h4>
                        <div class="val" style="color: var(--accent-yellow);">${threatLogs.length}</div>
                    </div>
                    <div class="card-stat">
                        <h4>Blocked Attacker IPs</h4>
                        <div class="val" style="color: var(--accent-red);">${blockedIPs.size}</div>
                    </div>
                    <div class="card-stat">
                        <h4>Honeypot Traps Triggered</h4>
                        <div class="val" style="color: var(--accent-blue);">${honeypotTrapsTriggered.total}</div>
                    </div>
                </div>

                <div class="main-dashboard-grid">
                    <!-- LEFT SIDE: REAL-TIME THREAT LOGS TABLE -->
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
                                    <th>Captured User</th>
                                    <th>Captured Pass</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
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

                    <!-- RIGHT CORNER: ATTACK VECTOR PIE CHART -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-title">📊 Attack Vectors (Pie Chart)</div>
                        </div>
                        <div class="pie-chart-container">
                            <canvas id="attackPieChart"></canvas>
                        </div>
                    </div>
                </div>

                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        const ctx = document.getElementById('attackPieChart').getContext('2d');
                        new Chart(ctx, {
                            type: 'pie',
                            data: {
                                labels: ['SQLi', 'XSS', 'Brute Force', 'Honeypot Trap', 'Others'],
                                datasets: [{
                                    data: [${attackCounts['SQLi']}, ${attackCounts['XSS']}, ${attackCounts['Brute Force']}, ${attackCounts['Honeypot Trap']}, ${attackCounts['Others']}],
                                    backgroundColor: ['#ef4444', '#f59e0b', '#38bdf8', '#8b5cf6', '#64748b'],
                                    borderWidth: 2,
                                    borderColor: '#131f37'
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: { color: '#94a3b8', font: { size: 12 } }
                                    }
                                }
                            }
                        });
                    });
                </script>
            ` : ''}

            ${pageType === 'dashboard' ? `
                <div class="card">
                    <h2 style="color: var(--accent-green); margin-bottom: 10px;">Welcome to User Terminal</h2>
                    <p style="color: var(--text-muted);">Standard operator interface active.</p>
                </div>
            ` : ''}
        </div>
    </body>
    </html>
    `;
}

// ============================================================================
// 5. HONEYPOT TRAP ROUTES
// ============================================================================
const honeypotPaths = ['/wp-admin', '/phpmyadmin', '/.env', '/backup.sql', '/admin.php', '/api/v1/config'];

honeypotPaths.forEach(trapPath => {
    app.all(trapPath, (req, res) => {
        const clientIP = getClientIP(req);
        honeypotTrapsTriggered.total += 1;
        
        registerAttack(clientIP, trapPath, `Honeypot Trap (${trapPath})`, req.get('User-Agent'), 'UNAUTHORIZED_RECON', 'N/A');

        res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center;">
                <h1>🛑 HONEYPOT TRAP TRIGGERED</h1>
                <p style="color:#e2e8f0; margin-top:10px;">Unlawful reconnaissance detected from IP: <b>${clientIP}</b></p>
            </div>
        `);
    });
});

// ============================================================================
// 6. LOGIN & MANAGEMENT ROUTES
// ============================================================================

app.get('/', (req, res) => {
    if (req.session.user) {
        return req.session.role === 'admin' ? res.redirect('/admin') : res.redirect('/dashboard');
    }
    res.send(renderHTML('Login', 'login'));
});

app.get('/api/logs', (req, res) => {
    res.json({
        logs: threatLogs,
        blockedCount: blockedIPs.size,
        totalAttacks: threatLogs.length,
        honeypots: honeypotTrapsTriggered.total
    });
});

app.get('/unblock-me', (req, res) => {
    const clientIP = getClientIP(req);
    blockedIPs.clear();
    for (let ip in ipAttackCounts) {
        ipAttackCounts[ip] = 0;
    }

    res.send(`
        <div style="background:#0b1320; color:#10b981; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
            <h1>✅ ALL IPs & ATTACK COUNTS RESET</h1>
            <p style="color:#e2e8f0; margin-top:10px;">Your IP <b>${clientIP}</b> and all blacklisted addresses have been unblocked.</p>
            <a href="/" style="color:#38bdf8; margin-top:20px; font-weight:bold; text-decoration:none; background:#131f37; padding:10px 20px; border-radius:6px; border:1px solid #1e293b;">Return to Login Page</a>
        </div>
    `);
});

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

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const clientIP = getClientIP(req);

    if (blockedIPs.has(clientIP)) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 ACCESS BLOCKED BY HONEYSHIELD</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">IP Address <b style="color:#f59e0b;">${clientIP}</b> is blacklisted.</p>
                <p style="color:#94a3b8;">Visit <a href="/unblock-me" style="color:#38bdf8;">/unblock-me</a> to unblock.</p>
            </div>
        `);
    }

    const detectedType = classifyAttackPayload(username, password);

    if (USERS_DB[username] && USERS_DB[username].password === password) {
        req.session.user = username;
        req.session.role = USERS_DB[username].role;
        return req.session.role === 'admin' ? res.redirect('/admin') : res.redirect('/dashboard');
    }

    const isBlocked = registerAttack(clientIP, '/login', detectedType, req.get('User-Agent'), username, password);

    if (isBlocked) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 MAXIMUM STRIKES EXCEEDED (3/3)</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">Attacker IP <b style="color:#ef4444;">${clientIP}</b> is now blacklisted.</p>
            </div>
        `);
    }

    res.send(renderHTML('Login', 'login', { 
        error: `⚠️ Invalid Credentials! Threat registered from IP ${clientIP}. Attempt (${ipAttackCounts[clientIP]}/3)` 
    }));
});

app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.role !== 'admin') return res.redirect('/');
    res.send(renderHTML('Admin Console', 'admin', { user: req.session.user }));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.send(renderHTML('User Dashboard', 'dashboard', { user: req.session.user }));
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// ============================================================================
// 7. EXPLICIT SIREN BUTTON & POLLING SCRIPT
// ============================================================================
const SIREN_SCRIPT = `
<script>
    let sirenAudioCtx = null;
    let lastLogCount = 0;

    function setSirenUIState(active) {
        const btn = document.getElementById('sirenToggleBtn');
        if (!btn) return;
        if (active) {
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
            btn.style.borderColor = '#10b981';
            btn.style.color = '#10b981';
            btn.innerHTML = '🔊 Siren Sound Active';
        } else {
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
            btn.style.borderColor = '#ef4444';
            btn.style.color = '#ef4444';
            btn.innerHTML = '🔔 Enable Siren Sound';
        }
    }

    function initSirenState() {
        const active = localStorage.getItem('sirenEnabled') === 'true';
        setSirenUIState(active);
        if (active) {
            if (!sirenAudioCtx) {
                sirenAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (sirenAudioCtx.state === 'suspended') {
                sirenAudioCtx.resume();
            }
        }
    }

    function toggleSirenAudio() {
        const currentState = localStorage.getItem('sirenEnabled') === 'true';
        const newState = !currentState;
        localStorage.setItem('sirenEnabled', newState ? 'true' : 'false');
        
        if (newState) {
            if (!sirenAudioCtx) {
                sirenAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (sirenAudioCtx.state === 'suspended') {
                sirenAudioCtx.resume();
            }
            setSirenUIState(true);
            playSirenSound();
        } else {
            setSirenUIState(false);
        }
    }

    function playSirenSound() {
        if (localStorage.getItem('sirenEnabled') !== 'true') return;
        
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

            osc.frequency.setValueAtTime(500, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
            osc.frequency.linearRampToValueAtTime(500, now + 0.6);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.9);

            gain.gain.setValueAtTime(0.9, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

            osc.connect(gain);
            gain.connect(sirenAudioCtx.destination);

            osc.start(now);
            osc.stop(now + 1.2);
        } catch (e) {
            console.error("Audio Siren Error:", e);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSirenState();
    });

    setInterval(async () => {
        try {
            const res = await fetch('/api/logs');
            const data = await res.json();
            
            if (lastLogCount > 0 && data.logs.length > lastLogCount) {
                const latestLog = data.logs[0];
                
                if (latestLog.attackCount >= 3 || latestLog.action === 'BLOCKED' || latestLog.isNewBlock) {
                    playSirenSound();
                }

                setTimeout(() => { window.location.reload(); }, 300);
            }
            lastLogCount = data.logs.length;
        } catch (err) {
            console.error("Polling error:", err);
        }
    }, 1500);
</script>
`;

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
// 8. SERVER LISTEN
// ============================================================================
app.listen(PORT, () => {
    console.log(`🛡️ HoneyShield Engine running on port ${PORT}`);
});
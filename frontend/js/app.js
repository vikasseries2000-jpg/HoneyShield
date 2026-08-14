const express = require('express');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Express ko proxy (X-Forwarded-For headers) trust karne ke liye set karein
app.set('trust proxy', true);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'honeyshield_secret_key_12345',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // HTTPS ke liye true karein
}));

// In-Memory Data Stores
const blockedIPs = new Set();
const threatLogs = [];
const ipAttackCounts = {};

// Dummy User Database
const USERS_DB = {
    'admin': { password: 'adminpassword', role: 'admin' },
    'user1': { password: 'userpassword', role: 'user' }
};

// --- HELPER FUNCTIONS ---

// Real Attacker IP extract karne ka function
function getClientIP(req) {
    let ip = req.headers['x-forwarded-for'] || 
             req.socket.remoteAddress || 
             req.ip || 
             '127.0.0.1';
             
    if (ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }
    // Localhost IPv6 ko standard IPv4 mein convert karein
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1';
    }
    return ip;
}

// Security Helper: HTML Escaping
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Decoy / Fake IP Generator (Demo Honeypot Simulation ke liye)
function generateFakeAttackerIP() {
    return `${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
}

// Attack Register & Logging Function (Updated with Username and Password capture)
function registerAttack(realIP, route, attackType, userAgent, attemptedUser = 'N/A', attemptedPass = 'N/A') {
    ipAttackCounts[realIP] = (ipAttackCounts[realIP] || 0) + 1;
    const isBlocked = ipAttackCounts[realIP] >= 3;
    
    if (isBlocked) {
        blockedIPs.add(realIP);
    }

    const newLog = {
        time: new Date().toLocaleTimeString(),
        ip: realIP, // Real Attacker IP
        route: route,
        attackType: attackType,
        attemptedUser: attemptedUser, // Captured Username
        attemptedPass: attemptedPass, // Captured Password
        action: isBlocked ? 'BLOCKED' : 'LOGGED',
        userAgent: userAgent || 'Unknown',
        isNewBlock: isBlocked
    };

    threatLogs.unshift(newLog); // Newest log top par
    return isBlocked;
}

// --- HTML RENDER ENGINE ---

function renderHTML(page, title, data = {}) {
    // ADMIN CONSOLE & LOGS PAGE RENDERER
    if (page === 'admin_console' || page === 'logs_page') {
        const totalAttacks = threatLogs.length;
        const totalBlocked = blockedIPs.size;

        const attackTypeCounts = {};
        threatLogs.forEach(log => {
            attackTypeCounts[log.attackType] = (attackTypeCounts[log.attackType] || 0) + 1;
        });

        const routeCounts = {};
        threatLogs.forEach(log => {
            routeCounts[log.route] = (routeCounts[log.route] || 0) + 1;
        });
        
        let mostTargeted = 'N/A';
        let maxCount = 0;
        for (let r in routeCounts) {
            if (routeCounts[r] > maxCount) {
                maxCount = routeCounts[r];
                mostTargeted = r;
            }
        }

        const blockedListArray = Array.from(blockedIPs);

        if (page === 'logs_page') {
            return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Threat Logs - HoneyShield</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
                    body { background-color: #0b1320; color: #e2e8f0; min-height: 100vh; padding: 25px; }
                    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #1e293b; }
                    .logo { font-size: 22px; font-weight: bold; color: #38bdf8; }
                    .btn { padding: 8px 15px; border-radius: 5px; border: none; cursor: pointer; font-weight: 600; text-decoration: none; font-size: 13px; }
                    .btn-back { background: #334155; color: white; }
                    .btn-csv { background: #38bdf8; color: #0f172a; margin-left: 10px; }
                    .logs-card { background: #152032; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; text-align: left; font-size: 14px; }
                    th { color: #94a3b8; padding: 12px; border-bottom: 1px solid #1e293b; background: #0b1320; }
                    td { padding: 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
                    .attack-badge { background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
                    .blocked-badge { background: rgba(239, 68, 68, 0.9); color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
                    code { background: #0b1320; padding: 2px 6px; border-radius: 4px; color: #f59e0b; }
                </style>
            </head>
            <body>
                <header>
                    <div class="logo">📋 Detailed Threat Logs Panel</div>
                    <div>
                        <a href="/admin" class="btn btn-back">⬅️ Back to Console</a>
                        <button class="btn btn-csv" onclick="exportCSV()">📥 Export CSV</button>
                    </div>
                </header>
                <div class="logs-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Real Attacker IP</th>
                                <th>Attempted Username</th>
                                <th>Attempted Password</th>
                                <th>Target Route</th>
                                <th>Detected Attack Type</th>
                                <th>Action Taken</th>
                            </tr>
                        </thead>
                        <tbody id="logsTableBody">
                            ${threatLogs.length === 0 ? `
                                <tr><td colspan="7" style="text-align:center; color:#64748b; padding:40px;">No threats logged yet!</td></tr>
                            ` : threatLogs.map(log => `
                                <tr>
                                    <td>${escapeHTML(log.time)}</td>
                                    <td><b style="color:#e2e8f0;">${escapeHTML(log.ip)}</b></td>
                                    <td><b style="color:#ef4444;">${escapeHTML(log.attemptedUser)}</b></td>
                                    <td><code>${escapeHTML(log.attemptedPass)}</code></td>
                                    <td><span style="color:#38bdf8;">${escapeHTML(log.route)}</span></td>
                                    <td><span class="attack-badge">${escapeHTML(log.attackType)}</span></td>
                                    <td><span class="${log.action.includes('BLOCKED') ? 'blocked-badge' : ''}">${escapeHTML(log.action)}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <script>
                    function exportCSV() {
                        let csv = 'Time,Real Attacker IP,Attempted Username,Attempted Password,Target Route,Attack Type,Action\\n';
                        const logs = ${JSON.stringify(threatLogs)};
                        logs.forEach(l => { 
                            csv += '"' + l.time + '","' + l.ip + '","' + (l.attemptedUser || 'N/A') + '","' + (l.attemptedPass || 'N/A') + '","' + l.route + '","' + l.attackType + '","' + l.action + '"\\n'; 
                        });
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const a = document.createElement('a');
                        a.href = window.URL.createObjectURL(blob);
                        a.download = 'full_threat_logs.csv';
                        a.click();
                    }
                </script>
            </body>
            </html>
            `;
        }

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>HoneyShield Defense Console</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
                body { background-color: #0b1320; color: #e2e8f0; min-height: 100vh; padding: 20px; transition: background-color 0.3s; }
                header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #1e293b; }
                .logo { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: bold; color: #38bdf8; }
                .status-badge { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; padding: 6px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: 0.3s; }
                .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1.5fr; gap: 15px; margin-bottom: 25px; }
                .card { background: #152032; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; }
                .card h4 { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 12px; }
                .metric-val { font-size: 32px; font-weight: bold; color: #ef4444; }
                .metric-val.blue { color: #38bdf8; }
                .metric-val.orange { color: #f59e0b; }
                .chart-container { height: 160px; display: flex; justify-content: center; align-items: center; }
                .content-grid { display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 20px; }
                .logs-section, .blocked-section { background: #152032; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; }
                .logs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .btn { padding: 8px 15px; border-radius: 5px; border: none; cursor: pointer; font-weight: 600; text-decoration: none; font-size: 13px; }
                .btn-logs { background: #38bdf8; color: #0f172a; }
                .btn-logout { background: #ef4444; color: white; margin-left: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; text-align: left; font-size: 13px; }
                th { color: #94a3b8; padding: 10px; border-bottom: 1px solid #1e293b; }
                td { padding: 12px 10px; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
                .attack-badge { background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
                .switch { position: relative; display: inline-block; width: 44px; height: 22px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #10b981; transition: .3s; border-radius: 22px; }
                .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
                input:checked + .slider { background-color: #ef4444; }
                input:checked + .slider:before { transform: translateX(22px); }
                code { background: #0b1320; padding: 2px 5px; border-radius: 3px; color: #f59e0b; font-size: 11px; }
            </style>
        </head>
        <body>
            <header>
                <div class="logo">🛡️ HoneyShield Defense Console</div>
                <div>
                    <button id="sirenBtn" onclick="toggleSirenSetting()" class="status-badge">🔔 Loading Siren...</button>
                    <a href="/logout" class="btn btn-logout">Logout</a>
                </div>
            </header>

            <div class="metrics-grid">
                <div class="card">
                    <h4>Total Trapped Attacks</h4>
                    <div class="metric-val" id="totalAttacksVal">${totalAttacks}</div>
                </div>
                <div class="card">
                    <h4>Blocked IPs</h4>
                    <div class="metric-val orange" id="totalBlockedVal">${totalBlocked}</div>
                </div>
                <div class="card">
                    <h4>Most Targeted Route</h4>
                    <div class="metric-val blue" id="mostTargetedVal">${escapeHTML(mostTargeted)}</div>
                </div>
                <div class="card">
                    <h4>Attack Type Distribution</h4>
                    <div class="chart-container">
                        <canvas id="attackChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="content-grid">
                <div class="logs-section">
                    <div class="logs-header">
                        <h3>Recent Threat Logs</h3>
                        <a href="/admin/logs" target="_blank" class="btn btn-logs">📋 Open Full Logs Tab ↗</a>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Attacker IP</th>
                                <th>Username</th>
                                <th>Password</th>
                                <th>Attack Type</th>
                            </tr>
                        </thead>
                        <tbody id="recentLogsTable">
                            ${threatLogs.slice(0, 5).length === 0 ? `
                                <tr><td colspan="5" style="text-align:center; color:#64748b; padding:30px;">No attacks detected yet.</td></tr>
                            ` : threatLogs.slice(0, 5).map(log => `
                                <tr>
                                    <td>${escapeHTML(log.time)}</td>
                                    <td><b>${escapeHTML(log.ip)}</b></td>
                                    <td><b style="color:#ef4444;">${escapeHTML(log.attemptedUser)}</b></td>
                                    <td><code>${escapeHTML(log.attemptedPass)}</code></td>
                                    <td><span class="attack-badge">${escapeHTML(log.attackType)}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="blocked-section">
                    <h3 style="margin-bottom:15px; color:#ef4444;">⛔ IP Access Controller</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Real Attacker IP</th>
                                <th>Block Status</th>
                            </tr>
                        </thead>
                        <tbody id="blockedIpTable">
                            ${blockedListArray.length === 0 ? `
                                <tr><td colspan="2" style="text-align:center; color:#64748b; padding:20px;">No IPs currently blocked.</td></tr>
                            ` : blockedListArray.map(ip => `
                                <tr>
                                    <td><b>${escapeHTML(ip)}</b></td>
                                    <td style="display:flex; align-items:center; gap:10px;">
                                        <label class="switch">
                                            <input type="checkbox" checked onchange="toggleBlock('${escapeHTML(ip)}', this.checked)">
                                            <span class="slider"></span>
                                        </label>
                                        <span id="status-${escapeHTML(ip)}" style="font-weight:bold; color:#ef4444;">BLOCKED</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <script>
                let lastLogCount = ${totalAttacks};
                let audioContext = null;

                if (localStorage.getItem('siren_enabled') === null) {
                    localStorage.setItem('siren_enabled', 'true');
                }

                function initAudioContext() {
                    if (!audioContext) {
                        audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    if (audioContext.state === 'suspended') {
                        audioContext.resume();
                    }
                }

                window.addEventListener('click', () => initAudioContext(), { once: true });

                function updateSirenUI() {
                    const btn = document.getElementById('sirenBtn');
                    const isEnabled = localStorage.getItem('siren_enabled') === 'true';
                    if (isEnabled) {
                        btn.style.background = 'rgba(16, 185, 129, 0.2)';
                        btn.style.color = '#10b981';
                        btn.style.border = '1px solid #10b981';
                        btn.innerText = '🔊 Siren Alert Enabled';
                    } else {
                        btn.style.background = '#f59e0b';
                        btn.style.color = '#0f172a';
                        btn.style.border = 'none';
                        btn.innerText = '🔔 Click to Enable Siren Alert';
                    }
                }

                function toggleSirenSetting() {
                    initAudioContext();
                    const current = localStorage.getItem('siren_enabled') === 'true';
                    localStorage.setItem('siren_enabled', !current);
                    updateSirenUI();
                }

                function playSirenSound() {
                    if (localStorage.getItem('siren_enabled') !== 'true') return;
                    try {
                        initAudioContext();
                        const osc = audioContext.createOscillator();
                        const gain = audioContext.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(1000, audioContext.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.8);
                        gain.gain.setValueAtTime(0.8, audioContext.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.start();
                        osc.stop(audioContext.currentTime + 0.8);
                    } catch(e) { console.log('Audio error:', e); }
                }

                updateSirenUI();

                // Live Polling Engine
                setInterval(async () => {
                    try {
                        const res = await fetch('/api/threat-logs');
                        if (!res.ok) return;
                        const data = await res.json();
                        
                        if (data.totalAttacks > lastLogCount) {
                            playSirenSound();
                            document.body.style.backgroundColor = '#450a0a';
                            setTimeout(() => document.body.style.backgroundColor = '#0b1320', 600);
                            
                            lastLogCount = data.totalAttacks;
                            document.getElementById('totalAttacksVal').innerText = data.totalAttacks;
                            
                            if (data.logs && data.logs.length > 0) {
                                const recent = data.logs.slice(0, 5);
                                let tableHtml = '';
                                recent.forEach(function(log) {
                                    tableHtml += '<tr>' +
                                        '<td>' + log.time + '</td>' +
                                        '<td><b>' + log.ip + '</b></td>' +
                                        '<td><b style="color:#ef4444;">' + (log.attemptedUser || 'N/A') + '</b></td>' +
                                        '<td><code>' + (log.attemptedPass || 'N/A') + '</code></td>' +
                                        '<td><span class="attack-badge">' + log.attackType + '</span></td>' +
                                        '</tr>';
                                });
                                document.getElementById('recentLogsTable').innerHTML = tableHtml;
                            }
                        }
                    } catch(e) {
                        console.error('Polling error:', e);
                    }
                }, 1500);

                async function toggleBlock(ip, isChecked) {
                    const statusText = document.getElementById('status-' + ip);
                    if (!isChecked) {
                        statusText.innerText = 'UNBLOCKED';
                        statusText.style.color = '#10b981';
                    } else {
                        statusText.innerText = 'BLOCKED';
                        statusText.style.color = '#ef4444';
                    }

                    await fetch('/api/toggle-ip-block', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ip: ip, blockStatus: isChecked })
                    });
                }

                const ctx = document.getElementById('attackChart').getContext('2d');
                const attackTypeCounts = ${JSON.stringify(attackTypeCounts)};
                const labels = Object.keys(attackTypeCounts).length ? Object.keys(attackTypeCounts) : ['No Attacks'];
                const chartData = Object.values(attackTypeCounts).length ? Object.values(attackTypeCounts) : [1];

                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: chartData,
                            backgroundColor: ['#ef4444', '#f59e0b', '#38bdf8', '#8b5cf6', '#10b981'],
                            borderWidth: 0
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { legend: { display: true, position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } } }, 
                        cutout: '60%' 
                    }
                });
            </script>
        </body>
        </html>
        `;
    }

    // LOGIN & USER DASHBOARD PAGES RENDERER
    const currentDisplayIP = data.clientIP || '127.0.0.1';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"><title>${escapeHTML(title)}</title>
        <style>
            body { font-family: Arial, sans-serif; background: #0b1320; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .card { background: #152032; border: 1px solid #1e293b; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); width: 360px; text-align: center; }
            input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; background: #0b1320; border: 1px solid #334155; color: white; border-radius: 4px; }
            button { width: 100%; padding: 10px; background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
            .error { color: #f59e0b; background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; padding: 8px; border-radius: 4px; font-size: 13px; margin-bottom: 15px; }
            .ip-badge { font-size: 12px; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 15px; border: 1px solid rgba(56, 189, 248, 0.3); }
            .logout { background: #ef4444; text-decoration: none; color: white; padding: 10px; display: inline-block; border-radius: 4px; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="card">
            ${page === 'login' ? `
                <h2 style="margin-bottom:10px; color:#38bdf8;">Login Panel</h2>
                <div class="ip-badge">🌐 Your Detected IP: <b>${escapeHTML(currentDisplayIP)}</b></div>
                ${data.error ? `<div class="error">${escapeHTML(data.error)}</div>` : ''}
                <form method="POST" action="/login">
                    <input type="text" name="username" placeholder="Username / Payload" required><br>
                    <input type="password" name="password" placeholder="Password" required><br>
                    <button type="submit">Login</button>
                </form>
            ` : ''}
            ${page === 'user_dashboard' ? `
                <h2>User Dashboard</h2>
                <p>Welcome, <b>${escapeHTML(data.username)}</b>!</p>
                <a href="/logout" class="logout">Logout</a>
            ` : ''}
        </div>
    </body>
    </html>
    `;
}

// --- API ROUTES ---

// Admin API: Toggle Block Status
app.post('/api/toggle-ip-block', (req, res) => {
    if (!req.session || req.session.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const { ip, blockStatus } = req.body;
    if (ip) {
        if (blockStatus) {
            blockedIPs.add(ip);
        } else {
            blockedIPs.delete(ip);
            ipAttackCounts[ip] = 0;
        }
        return res.json({ success: true, message: `IP ${ip} status updated!` });
    }
    res.status(400).json({ success: false, message: 'Invalid Request' });
});

// Protected API for Threat Logs (Admin Only)
app.get('/api/threat-logs', (req, res) => {
    if (!req.session || req.session.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const hasNewBlock = threatLogs.length > 0 && threatLogs[0].isNewBlock;
    res.json({ totalAttacks: threatLogs.length, logs: threatLogs, hasNewBlock: hasNewBlock });
});

// Dedicated Threat Logs View Route
app.get('/admin/logs', (req, res) => {
    if (!req.session || !req.session.user || req.session.role !== 'admin') {
        return res.redirect('/?error=admin_login_required');
    }
    res.send(renderHTML('logs_page', 'Threat Logs'));
});

// --- SERVER ROUTES ---

app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return req.session.role === 'admin' ? res.redirect('/admin') : res.redirect('/dashboard');
    }
    const clientIP = getClientIP(req);
    
    // Check if client IP is already blocked
    if (blockedIPs.has(clientIP)) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 ACCESS BLOCKED</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">Your IP <b style="color:#f59e0b;">${clientIP}</b> is blocked due to excessive suspicious activities.</p>
            </div>
        `);
    }

    res.send(renderHTML('login', 'Login', { clientIP }));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const clientIP = getClientIP(req);

    // Pehle check karein IP block to nahi hai
    if (blockedIPs.has(clientIP)) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 ACCESS BLOCKED</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">IP <b style="color:#f59e0b;">${clientIP}</b> was blocked.</p>
            </div>
        `);
    }

    // Valid Credentials
    if (USERS_DB[username] && USERS_DB[username].password === password) {
        req.session.user = username;
        req.session.role = USERS_DB[username].role;
        return req.session.role === 'admin' ? res.redirect('/admin') : res.redirect('/dashboard');
    } 
    
    // Invalid Login -> Register Attack with REAL Attacker IP and Captured Credentials
    const isBlocked = registerAttack(clientIP, '/login', 'Brute Force / Bad Credentials', req.get('User-Agent'), username, password);
    const fakeIP = generateFakeAttackerIP();

    if (isBlocked) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 ACCESS BLOCKED DUE TO MULTIPLE ATTACKS</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">Attacker IP <b style="color:#ef4444;">${clientIP}</b> (Trapped on Decoy Node ${fakeIP}) exceeded attack limits (3/3 attempts).</p>
            </div>
        `);
    }

    res.send(renderHTML('login', 'Login', { 
        clientIP, 
        fakeIP, 
        error: `⚠️ Warning: Invalid Credentials! Attacker IP ${clientIP} logged. Attempt (${ipAttackCounts[clientIP]}/3)` 
    }));
});

app.get('/dashboard', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/');
    res.send(renderHTML('user_dashboard', 'User Dashboard', { username: req.session.user }));
});

app.get('/admin', (req, res) => {
    const clientIP = getClientIP(req);

    if (!req.session || !req.session.user || req.session.role !== 'admin') {
        const isBlocked = registerAttack(clientIP, '/admin', 'Unauthorized Admin Access Attempt', req.get('User-Agent'), 'N/A (Direct Access)', 'N/A');
        const fakeIP = generateFakeAttackerIP();

        if (isBlocked) {
            return res.status(403).send(`
                <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                    <h1>🛑 ACCESS BLOCKED DUE TO MULTIPLE ATTACKS</h1>
                    <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">Attacker IP <b style="color:#ef4444;">${clientIP}</b> (Decoy Node ${fakeIP}) exceeded attack limits (3/3 attempts).</p>
                </div>
            `);
        }

        return res.status(403).send(`Access Denied! Unauthorized access from IP ${clientIP} logged.`);
    }
    res.send(renderHTML('admin_console', 'HoneyShield Console'));
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Server Run
app.listen(PORT, '0.0.0.0', () => {
    console.log(` HoneyShield Defense Server running on http://localhost:${PORT}`);
});
// ==========================================
// OVERRIDE: CAPTURE ATTACKER USERNAME & PASSWORD
// ==========================================

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const clientIP = getClientIP(req);

    // 1. IP Block Check
    if (blockedIPs.has(clientIP)) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 ACCESS BLOCKED</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">IP <b style="color:#f59e0b;">${clientIP}</b> was blocked due to suspicious activity.</p>
            </div>
        `);
    }

    // 2. SQL Injection / Payload Detection
    const attackPattern = /(\'|\"|\-\-|\b(OR|AND|SELECT|INSERT|DELETE|DROP)\b|<script>)/i;
    let detectedType = 'Brute Force / Bad Credentials';

    if (attackPattern.test(username) || attackPattern.test(password)) {
        detectedType = 'SQL Injection / Malicious Payload';
    }

    // 3. Valid Credentials Check (admin -> adminpassword)
    if (USERS_DB[username] && USERS_DB[username].password === password) {
        req.session.user = username;
        req.session.role = USERS_DB[username].role;
        return req.session.role === 'admin' ? res.redirect('/admin') : res.redirect('/dashboard');
    } 

    // 4. Register Attack with Captured Username & Password
    const isBlocked = registerAttack(clientIP, '/login', detectedType, req.get('User-Agent'), username, password);
    const fakeIP = generateFakeAttackerIP();

    if (isBlocked) {
        return res.status(403).send(`
            <div style="background:#0b1320; color:#ef4444; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; text-align:center; padding:20px;">
                <h1>🛑 ACCESS BLOCKED DUE TO MULTIPLE ATTACKS</h1>
                <p style="color:#e2e8f0; font-size:18px; margin: 15px 0;">Attacker IP <b style="color:#ef4444;">${clientIP}</b> exceeded attack limits (3/3 attempts).</p>
            </div>
        `);
    }

    res.send(renderHTML('login', 'Login', { 
        clientIP, 
        fakeIP, 
        error: `⚠️ Warning: Invalid Credentials! Attacker IP ${clientIP} logged. Attempt (${ipAttackCounts[clientIP]}/3)` 
    }));
});

// Missing Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// App Listener
app.listen(PORT, () => {
    console.log(` HoneyShield Server running on http://localhost:${PORT}`);
});
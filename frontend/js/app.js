// Honeypot App Configuration and Core Logic
const SUPABASE_URL = "https://tvhuflxhzaulpoojdfeu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aHVmbHhoemF1bHBvb2pkZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMzk1MTgsImV4cCI6MjA1NjkxNTUxOH0.K267fLlsg_zY5zMvS9PZzXjDLOqC1L5U2K3M0aM_u_k";

// Safe initialization for Browser/Node compatibility
const supabase = (typeof window !== 'undefined' && window.supabase) 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

// Audio Alert System
let audioCtx = null;
let sirenActive = true;

function initAudio() {
    if (!audioCtx && typeof window !== 'undefined') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSiren() {
    if (!sirenActive || !audioCtx) return;
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// Client IP Fetcher
async function fetchClientIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        return '127.0.0.1';
    }
}

// Database Helper Functions
async function getBlockedIPsSet() {
    if (!supabase) return new Set();
    try {
        const { data, error } = await supabase.from('blocked_ips').select('ip');
        if (error) {
            console.error('Error fetching blocked IPs:', error);
            return new Set();
        }
        return new Set(data.map(row => row.ip));
    } catch (e) {
        console.error('Unexpected error fetching blocked IPs:', e);
        return new Set();
    }
}

async function getIPAttackCount(ip) {
    if (!supabase) return 0;
    try {
        const { data, error } = await supabase
            .from('threat_logs')
            .select('id')
            .eq('ip_address', ip);
            
        if (error) {
            console.error('Error fetching IP count:', error);
            return 0;
        }
        return data ? data.length : 0;
    } catch (e) {
        console.error('Unexpected error fetching IP count:', e);
        return 0;
    }
}

// Register Threat & Auto-Block Logic
async function registerAttack(realIP, route, attackType, userAgent, attemptedUser = 'N/A', attemptedPass = 'N/A') {
    if (!supabase) return { currentCount: 0, isBlocked: false };

    const currentCount = (await getIPAttackCount(realIP)) + 1;
    const existingBlocked = await getBlockedIPsSet();
    const isBlocked = currentCount >= 3 || existingBlocked.has(realIP);

    // Auto-insert into blocked_ips if threshold hit
    if (isBlocked && !existingBlocked.has(realIP)) {
        const { error: blockErr } = await supabase.from('blocked_ips').insert([{ ip: realIP }]);
        if (blockErr) {
            console.error('Error inserting blocked IP:', blockErr);
        }
    }

    const { error: logErr } = await supabase.from('threat_logs').insert([{
        ip_address: realIP,
        threat_type: attackType,
        attempts: currentCount,
        created_at: new Date().toISOString()
    }]);

    if (logErr) {
        console.error('Error logging threat:', logErr);
    }

    playSiren();
    return { currentCount, isBlocked };
}

// Manual IP Action Handlers
async function toggleBlockIP(ip) {
    if (!supabase) return;
    const blocked = await getBlockedIPsSet();
    if (blocked.has(ip)) {
        const { error } = await supabase.from('blocked_ips').delete().eq('ip', ip);
        if (error) console.error('Error unblocking IP:', error);
    } else {
        const { error } = await supabase.from('blocked_ips').insert([{ ip }]);
        if (error) console.error('Error blocking IP:', error);
    }
    loadDashboard();
}

async function unblockAllIPs() {
    if (!supabase) return;
    const { error } = await supabase.from('blocked_ips').delete().neq('ip', '0.0.0.0');
    if (error) console.error('Error clearing blocked IPs:', error);
    loadDashboard();
}

// Chart.js Pie Chart Rendering Helper
let attackChartInstance = null;

function updateAttackChart(sqli, xss, brute) {
    const canvas = document.getElementById('attackChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (attackChartInstance) {
        attackChartInstance.destroy();
    }

    attackChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['SQLi', 'XSS', 'Brute Force'],
            datasets: [{
                data: [sqli, xss, brute],
                backgroundColor: ['#e53e3e', '#ecc94b', '#3182ce'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#a0aec0', font: { size: 12 } }
                }
            }
        }
    });
}

// Dashboard UI Rendering
async function loadDashboard() {
    if (!supabase) return;
    
    const blockedSet = await getBlockedIPsSet();
    
    const { data: logs, error } = await supabase
        .from('threat_logs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    // Update Top Counters
    const totalThreats = logs.length;
    const blockedCount = blockedSet.size;
    
    const totalThreatsEl = document.getElementById('total-threats');
    const blockedIpsEl = document.getElementById('blocked-ips-count');
    
    if (totalThreatsEl) totalThreatsEl.innerText = totalThreats;
    if (blockedIpsEl) blockedIpsEl.innerText = blockedCount;

    // Categorize Vector Attack Breakdown for Graph
    let sqliCount = 0;
    let xssCount = 0;
    let bruteCount = 0;

    logs.forEach(log => {
        const type = (log.threat_type || '').toLowerCase();
        if (type.includes('sqli') || type.includes('sql')) sqliCount++;
        else if (type.includes('xss')) xssCount++;
        else bruteCount++;
    });

    updateAttackChart(sqliCount, xssCount, bruteCount);

    // Render Table Body
    const tableBody = document.getElementById('logs-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    logs.forEach(log => {
        const isBlocked = blockedSet.has(log.ip_address);
        const row = document.createElement('tr');
        
        const dateStr = new Date(log.created_at).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        row.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid #2d3748;">${dateStr}</td>
            <td style="padding: 10px; border-bottom: 1px solid #2d3748; color: #ecc94b; font-weight: bold;">${log.ip_address}</td>
            <td style="padding: 10px; border-bottom: 1px solid #2d3748;">${log.threat_type || 'Brute Force / Bad Credentials'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #2d3748; color: #e53e3e;">${log.user_attempted || 'Admin'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #2d3748; color: #e53e3e;">••••••</td>
            <td style="padding: 10px; border-bottom: 1px solid #2d3748;">
                <span style="background: ${isBlocked ? '#9b2c2c' : '#744210'}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
                    ${isBlocked ? 'BLOCKED (' + log.attempts + '/3)' : 'LOGGED (' + log.attempts + '/3)'}
                </span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #2d3748;">
                <button onclick="toggleBlockIP('${log.ip_address}')" style="background: ${isBlocked ? '#2b6cb0' : '#c53030'}; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                    ${isBlocked ? 'Unblock' : 'Block'}
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Attack Simulation Form Handler (Login Page)
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ip = await fetchClientIP();
            const blockedSet = await getBlockedIPsSet();

            const statusBanner = document.getElementById('status-message');

            if (blockedSet.has(ip)) {
                if (statusBanner) {
                    statusBanner.style.display = 'block';
                    statusBanner.style.background = '#e53e3e';
                    statusBanner.innerText = '🛑 ACCESS BLOCKED: Your IP is blacklisted due to multiple attack attempts.';
                }
                playSiren();
                return;
            }

            const userInput = document.getElementById('username')?.value || '';
            const passInput = document.getElementById('password')?.value || '';

            let attackType = 'Brute Force / Bad Credentials';
            if (userInput.includes("'") || userInput.toLowerCase().includes('or') || userInput.includes('--')) {
                attackType = 'SQL Injection (SQLi)';
            } else if (userInput.includes('<script>') || userInput.includes('javascript:')) {
                attackType = 'Cross-Site Scripting (XSS)';
            }

            const result = await registerAttack(ip, '/login', attackType, navigator.userAgent, userInput, passInput);

            if (result.isBlocked) {
                if (statusBanner) {
                    statusBanner.style.display = 'block';
                    statusBanner.style.background = '#e53e3e';
                    statusBanner.innerText = '🛑 ACCESS BLOCKED: Threshold (3/3) exceeded! IP Blacklisted.';
                }
            } else {
                if (statusBanner) {
                    statusBanner.style.display = 'block';
                    statusBanner.style.background = '#dd6b20';
                    statusBanner.innerText = `⚠️ Invalid credentials! Threat logged. Attempt ${result.currentCount}/3`;
                }
            }
        });
    }

    // Toggle Siren Sound Button
    const sirenBtn = document.getElementById('toggle-siren');
    if (sirenBtn) {
        sirenBtn.addEventListener('click', () => {
            sirenActive = !sirenActive;
            sirenBtn.innerText = sirenActive ? '🔊 Siren Sound Active' : '🔇 Siren Sound Muted';
        });
    }

    // Auto-refresh Dashboard if on Dashboard Page
    if (document.getElementById('logs-table-body')) {
        loadDashboard();
        setInterval(loadDashboard, 5000);
    }
});
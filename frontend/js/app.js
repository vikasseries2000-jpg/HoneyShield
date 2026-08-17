const SUPABASE_URL = "https://tvhuflxhzaulpoojdfeu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2aHVmbHhoemF1bHBvb2pkZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMzk1MTgsImV4cCI6MjA1NjkxNTUxOH0.K267fLlsg_zY5zMvS9PZzXjDLOqC1L5U2K3M0aM_u_k";

const supabase = (typeof window !== 'undefined' && window.supabase) 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

let attackChartInstance = null;

// 🔊 Function to play Beep Sound (Bina external file ke sound play karta hai)
function playBeepSound(times = 1) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let delay = 0;

        for (let i = 0; i < times; i++) {
            setTimeout(() => {
                const oscillator = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Sound Frequency (Hz)
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);

                oscillator.connect(gain);
                gain.connect(audioCtx.destination);

                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.15); // Beep duration
            }, delay);

            delay += 300; // Har beep ke beech ka gap (milliseconds)
        }
    } catch (e) {
        console.log("Audio play error:", e);
    }
}

async function fetchClientIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        return '127.0.0.1';
    }
}

async function getBlockedIPsSet() {
    if (!supabase) return new Set();
    try {
        const { data } = await supabase.from('blocked_ips').select('ip');
        return new Set((data || []).map(row => row.ip));
    } catch (e) {
        return new Set();
    }
}

async function getIPAttackCount(ip) {
    if (!supabase) return 0;
    try {
        const { data } = await supabase.from('threat_logs').select('id').eq('ip_address', ip);
        return data ? data.length : 0;
    } catch (e) {
        return 0;
    }
}

// Render Pie Chart
function renderPieChart(sqli, xss, brute) {
    const canvas = document.getElementById('attackChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (attackChartInstance) attackChartInstance.destroy();

    const total = sqli + xss + brute;

    attackChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: total > 0 ? ['SQLi Attack', 'XSS Attack', 'Brute Force / Invalid Pass'] : ['No Attacks Yet'],
            datasets: [{
                data: total > 0 ? [sqli, xss, brute] : [1],
                backgroundColor: total > 0 ? ['#ef4444', '#eab308', '#38bdf8'] : ['#334155'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } }
            }
        }
    });
}

// Load Dashboard Data
async function loadDashboard() {
    if (!supabase) return;

    const blockedSet = await getBlockedIPsSet();
    const { data: logs } = await supabase.from('threat_logs').select('*').order('created_at', { ascending: false });

    if (!logs) return;

    document.getElementById('totalAttacks').innerText = logs.length;
    document.getElementById('blockedCount').innerText = blockedSet.size;

    const blockedContainer = document.getElementById('blockedIpList');
    if (blockedSet.size === 0) {
        blockedContainer.innerHTML = 'No IPs currently blacklisted.';
    } else {
        blockedContainer.innerHTML = Array.from(blockedSet).map(ip => `<span style="background:#7f1d1d; color:#fca5a5; padding:3px 8px; border-radius:4px; margin-right:5px; font-family:monospace;">${ip}</span>`).join('');
    }

    // Pie Chart Breakdown
    let sqli = 0, xss = 0, brute = 0;
    logs.forEach(log => {
        const type = (log.threat_type || '').toLowerCase();
        if (type.includes('sqli') || type.includes('sql')) sqli++;
        else if (type.includes('xss')) xss++;
        else brute++;
    });

    renderPieChart(sqli, xss, brute);

    const tableBody = document.getElementById('logsTable');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    logs.forEach(log => {
        const isBlocked = blockedSet.has(log.ip_address);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(log.created_at).toLocaleTimeString()}</td>
            <td style="color: #f43f5e; font-weight: bold;">${log.ip_address}</td>
            <td style="color: #eab308;">${log.threat_type || 'Brute Force'}</td>
            <td style="color: #38bdf8;">${log.user_attempted || 'N/A'}</td>
            <td><span style="background: ${isBlocked ? '#ef4444' : '#334155'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${isBlocked ? 'BLOCKED' : 'LOGGED'}</span></td>
            <td><button onclick="toggleBlock('${log.ip_address}')" style="background:#ef4444; color:white; border:none; padding:3px 8px; border-radius:4px; cursor:pointer;">${isBlocked ? 'Unblock' : 'Block'}</button></td>
        `;
        tableBody.appendChild(row);
    });
}

async function unblockAllIPs() {
    if (!supabase) return;
    await supabase.from('blocked_ips').delete().neq('ip', '0.0.0.0');
    loadDashboard();
}

async function toggleBlock(ip) {
    if (!supabase) return;
    const blockedSet = await getBlockedIPsSet();
    if (blockedSet.has(ip)) {
        await supabase.from('blocked_ips').delete().eq('ip', ip);
    } else {
        await supabase.from('blocked_ips').insert([{ ip }]);
    }
    loadDashboard();
}

// Login Logic & Threat Detection
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ip = await fetchClientIP();
            const blockedSet = await getBlockedIPsSet();
            const statusMsg = document.getElementById('status-message');

            if (blockedSet.has(ip)) {
                playBeepSound(3); // 🚨 Already blocked - 3 Beeps
                statusMsg.style.display = 'block';
                statusMsg.style.background = '#7f1d1d';
                statusMsg.style.color = '#fca5a5';
                statusMsg.innerText = '🛑 ACCESS BLOCKED: Your IP is blacklisted due to multiple threats!';
                return;
            }

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Correct Credentials
            if (username === 'admin' && password === 'admin123') {
                window.location.href = '/dashboard';
                return;
            }

            // Threat Classification
            let attackType = 'Brute Force / Bad Credentials';
            if (username.includes("'") || username.toLowerCase().includes('or') || username.includes('--')) {
                attackType = 'SQL Injection (SQLi)';
            } else if (username.includes('<script>') || username.includes('javascript:')) {
                attackType = 'Cross-Site Scripting (XSS)';
            }

            const currentCount = (await getIPAttackCount(ip)) + 1;
            const isBlocked = currentCount >= 3;

            if (isBlocked) {
                await supabase.from('blocked_ips').insert([{ ip }]);
            }

            await supabase.from('threat_logs').insert([{
                ip_address: ip,
                threat_type: attackType,
                user_attempted: username,
                attempts: currentCount,
                created_at: new Date().toISOString()
            }]);

            // 🔊 Sound Logic:
            if (isBlocked) {
                playBeepSound(3); // 🛑 3 Tries Exceed hone par 3 baar Beep sound bajega
            } else {
                playBeepSound(1); // ⚠️ Single invalid attempt par 1 baar Beep sound bajega
            }

            statusMsg.style.display = 'block';
            statusMsg.style.background = isBlocked ? '#7f1d1d' : '#713f12';
            statusMsg.style.color = isBlocked ? '#fca5a5' : '#fef08a';
            statusMsg.innerText = isBlocked 
                ? '🛑 ACCESS BLOCKED: 3 Bad Attempts Exceeded! IP Blacklisted.' 
                : `⚠️ Invalid Credentials / Threat Detected! Attempt ${currentCount}/3`;
        });
    }

    if (document.getElementById('logsTable')) {
        loadDashboard();
        setInterval(loadDashboard, 4000);
    }
});
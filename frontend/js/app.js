function showVisualThreatAlert(log){if(document.getElementById('honeyshieldVisualAlert'))return;var x=document.createElement('div');x.id='honeyshieldVisualAlert';x.innerHTML='<div style="position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999998;background:#7f1d1d;color:white;border:2px solid #ef4444;border-radius:14px;padding:18px 28px;font:700 18px Segoe UI,Arial;box-shadow:0 0 35px rgba(239,68,68,.7);text-align:center>THREAT DETECTED<br><span style=font-size:13px;color:#fecaca>IP permanently blocked Ã¢â‚¬Â¢ '+(log.ip||'unknown')+'</span></div>';document.body.appendChild(x);setTimeout(function(){x.remove()},7000)}
// ============================================================
// HONEYSHIELD FRONTEND
// FINAL STABLE VERSION
// ============================================================

let attackChartInstance = null;

let sirenEnabled = true;

let audioContext = null;


// ============================================================
// AUDIO / SIREN
// ============================================================

async function initAudio() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) {
            return false;
        }

        if (!audioContext) {

            audioContext =
                new AudioContext();

        }

        if (
            audioContext.state ===
            "suspended"
        ) {

            await audioContext.resume();

        }

        return true;

    } catch (error) {

        console.warn(
            "Audio initialization failed:",
            error
        );

        return false;

    }

}


async function playBeepSound(times = 3) {

    if (!sirenEnabled) {
        return;
    }

    try {

        const ready =
            await initAudio();

        if (!ready) {
            return;
        }

        for (
            let i = 0;
            i < times;
            i++
        ) {

            if (
                audioContext.state ===
                "suspended"
            ) {

                await audioContext.resume();

            }

            const oscillator =
                audioContext.createOscillator();

            const gain =
                audioContext.createGain();

            oscillator.type =
                "square";

            oscillator.frequency.value =
                900;

            gain.gain.setValueAtTime(
                0.12,
                audioContext.currentTime
            );

            oscillator.connect(gain);

            gain.connect(
                audioContext.destination
            );

            oscillator.start();

            oscillator.stop(
                audioContext.currentTime +
                0.18
            );

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        280
                    )
            );

        }

    } catch (error) {

        console.warn(
            "Siren unavailable:",
            error
        );

    }

}


// ============================================================
// SIREN BUTTON
// ============================================================

function createSirenButton() {

    if (
        document.getElementById(
            "sirenBtn"
        )
    ) {
        return;
    }

    const button =
        document.createElement(
            "button"
        );

    button.id =
        "sirenBtn";

    button.innerHTML = "🔊 Siren ON";

    button.style.cssText = `

        position:fixed;
        right:25px;
        bottom:25px;
        z-index:999999;

        padding:12px 20px;

        border:none;
        border-radius:8px;

        background:#16a34a;
        color:white;

        font-weight:bold;

        cursor:pointer;

        box-shadow:
            0 5px 20px rgba(0,0,0,.5);

    `;

    button.addEventListener(
        "click",
        async () => {

            sirenEnabled =
                !sirenEnabled;

            if (sirenEnabled) {

                button.innerHTML = "🔊 Siren ON";

                button.style.background =
                    "#16a34a";

                await initAudio();

                playBeepSound(1);

            } else {

                button.innerHTML = "🔇 Siren OFF";

                button.style.background =
                    "#64748b";

            }

        }
    );

    document.body.appendChild(
        button
    );

}


// ============================================================
// PERMANENT BLOCK SCREEN
// ============================================================

function showPermanentBlockScreen(ip) {

    document.body.innerHTML = `

        <div style="
            position:fixed;
            inset:0;

            background:
                radial-gradient(
                    circle at center,
                    #450a0a 0%,
                    #180000 45%,
                    #050000 100%
                );

            color:white;

            display:flex;
            align-items:center;
            justify-content:center;

            text-align:center;

            font-family:
                Segoe UI,
                Arial,
                sans-serif;

            z-index:9999999;

            padding:30px;
        ">

            <div style="
                width:min(700px,100%);

                border:2px solid #ef4444;
                border-radius:18px;

                padding:45px 30px;

                background:
                    rgba(0,0,0,.45);

                box-shadow:
                    0 0 50px
                    rgba(239,68,68,.35);
            ">

                <div style="
                    font-size:72px;
                    margin-bottom:20px;
                ">
                    Ã°Å¸Å¡Â¨
                </div>

                <h1 style="
                    color:#f87171;
                    font-size:34px;
                    margin-bottom:18px;
                ">
                    ACCESS PERMANENTLY BLOCKED
                </h1>

                <h2 style="
                    color:#fecaca;
                    font-size:22px;
                    margin-bottom:25px;
                ">
                    Your IP has been permanently blocked
                    due to suspicious activity.
                </h2>

                <div style="
                    background:#1f2937;

                    padding:15px;

                    border-radius:8px;

                    margin-bottom:25px;

                    font-family:monospace;

                    color:#fca5a5;
                ">

                    Detected IP:

                    <strong>
                        ${escapeHTML(ip || "unknown")}
                    </strong>

                </div>

                <div style="
                    color:#94a3b8;
                    font-size:14px;
                ">

                    HoneyShield Security Engine

                    <br>

                    Intrusion prevention system activated.

                </div>

            </div>

        </div>

    `;

    playBeepSound(8);

}


// ============================================================
// LOGIN STATUS
// ============================================================

function showLoginStatus(
    message,
    type = "warning"
) {

    const status =
        document.getElementById(
            "status-message"
        ) ||
        document.getElementById(
            "statusMessage"
        );

    if (!status) {

        console.log(message);

        return;

    }

    status.style.display =
        "block";

    status.innerText =
        message;

    if (type === "success") {

        status.style.background =
            "#14532d";

        status.style.color =
            "#86efac";

    } else {

        status.style.background =
            "#7f1d1d";

        status.style.color =
            "#fecaca";

    }

}


// ============================================================
// LOGIN
// ============================================================

async function handleLogin(event) {

    event.preventDefault();

    const usernameInput =
        document.getElementById(
            "username"
        );

    const passwordInput =
        document.getElementById(
            "password"
        );

    if (
        !usernameInput ||
        !passwordInput
    ) {

        return;

    }

    const username =
        usernameInput.value.trim();

    const password =
        passwordInput.value;

    if (
        !username ||
        !password
    ) {

        showLoginStatus(
            "Username and password are required."
        );

        return;

    }

    await initAudio();

    const loginButton =
        document.querySelector(
            "#login-form button[type='submit']"
        ) ||
        document.querySelector(
            "#loginForm button[type='submit']"
        );

    if (loginButton) {

        loginButton.disabled =
            true;

        loginButton.innerText =
            "Authenticating...";

    }

    try {

        const response =
            await fetch(
                "/api/auth/login",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            username,

                            password

                        })

                }
            );

        const result =
            await response.json();

        console.log(
            "HoneyShield:",
            result
        );


        // ====================================================
        // PERMANENTLY BLOCKED
        // ====================================================

        if (
            result.mode ===
            "BLOCKED"
        ) {

            await playBeepSound(8);

            showPermanentBlockScreen(
                result.ip
            );

            return;

        }


        // ====================================================
        // SUCCESS
        // ====================================================

        if (
            result.success === true &&
            result.mode === "REAL"
        ) {

            showLoginStatus(
                "Ã¢Å“â€¦ Authentication successful. Opening dashboard...",
                "success"
            );

            setTimeout(
                () => {

                    window.location.href =
                        "/dashboard";

                },
                500
            );

            return;

        }


        // ====================================================
        // SUSPICIOUS
        // ====================================================

        if (
            result.mode ===
            "SUSPICIOUS"
        ) {

            await playBeepSound(2);

            showLoginStatus(

                `ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Suspicious activity detected. Attempt ${result.attempts || result.attemptCount || "?"} of 3.`

            );

            return;

        }


        // ====================================================
        // NORMAL FAILED
        // ====================================================

        showLoginStatus(

            result.message ||
            "ÃƒÂ¢Ã‚ÂÃ…â€™ Invalid username or password."

        );

    } catch (error) {

        console.error(
            "Login failed:",
            error
        );

        showLoginStatus(
            "ÃƒÂ¢Ã‚ÂÃ…â€™ Cannot connect to HoneyShield backend."
        );

    } finally {

        if (loginButton) {

            loginButton.disabled =
                false;

            loginButton.innerText =
                "Login to Dashboard";

        }

    }

}


// ============================================================
// LOAD LOGS
// ============================================================

async function loadLogs() {

    try {

        const response =
            await fetch(
                "/api/logs",
                {
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Logs API returned ${response.status}`
            );

        }

        const result =
            await response.json();

        console.log(
            "HoneyShield Logs:",
            result
        );

        return Array.isArray(
            result.logs
        )
            ? result.logs
            : [];

    } catch (error) {

        console.error(
            "Logs error:",
            error
        );

        return [];

    }

}


// ============================================================
// LOAD BLOCKED IPS
// ============================================================

async function loadBlockedIPs() {

    try {

        const response =
            await fetch(
                "/api/blocked-ips",
                {
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Blocked IP API returned ${response.status}`
            );

        }

        const result =
            await response.json();

        console.log(
            "HoneyShield Blocked IPs:",
            result
        );

        return Array.isArray(
            result.blockedIPs
        )
            ? result.blockedIPs
            : [];

    } catch (error) {

        console.error(
            "Blocked IP API error:",
            error
        );

        return [];

    }

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// LOG TIME
// ============================================================

function getLogTime(log) {

    const value =
        log.created_at || log.timestamp || log.time;

    if (!value) {

        return "Time unavailable";

    }

    const date =
        new Date(value);

    if (
        isNaN(
            date.getTime()
        )
    ) {

        return escapeHTML(
            value
        );

    }

    return escapeHTML(
        date.toLocaleString()
    );

}


// ============================================================
// NORMALIZE LOG
// ============================================================

function normalizeLog(log = {}) {

    return {

        id:
            log.id || "-",

        created_at:
            log.created_at || log.timestamp || log.time ||
            null,

        ip:
            log.ip ||
            "-",

        type:
            log.type ||
            log.attack_type ||
            "UNKNOWN",

        username:
            log.username ||
            log.attempted_user ||
            "-",

        password:
            log.password !== undefined && log.password !== null ? log.password : (log.attempted_password !== undefined && log.attempted_password !== null ? log.attempted_password : (log.attempted_pass !== undefined && log.attempted_pass !== null ? log.attempted_pass : "-")),

        status:
            log.status ||
            log.action ||
            "LOGGED",

        attemptCount:
            log.attemptCount ??
            log.attack_count ??
            log.attempt_count ??
            0

    };

}


// ============================================================
// GET REAL ATTACK LOGS
// ============================================================
//
// REAL ATTACK EVENTS:
//
// LOGIN_ATTEMPT
// IP_BLOCKED
//
// SECURITY EVENTS:
//
// DECOY_REDIRECT
// BLOCKED_REQUEST
//
// ============================================================

function getAttackLogs(logs) {

    return logs.filter(
        log => {

            const type =
                String(
                    log.type ||
                    log.attack_type ||
                    ""
                ).toUpperCase();

            return (

                type ===
                    "LOGIN_ATTEMPT" ||

                type ===
                    "IP_BLOCKED" ||

                type ===
                    "SQL_INJECTION" ||

                type ===
                    "XSS" ||

                type.includes(
                    "BRUTE"
                )

            );

        }
    );

}


// ============================================================
// RENDER LOGS
// ============================================================

function renderLogs(logs) {

    const tableBody =
        document.getElementById(
            "logsTable"
        );

    if (!tableBody) {
        return;
    }

    if (!logs.length) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:25px;
                        color:#64748b;
                    "
                >

                    No security events recorded yet.

                </td>

            </tr>

        `;

        return;

    }

    tableBody.innerHTML = "";

    logs.forEach(
        rawLog => {

            const log =
                normalizeLog(
                    rawLog
                );

            const row =
                document.createElement(
                    "tr"
                );


            // =================================================
            // STATUS COLOR
            // =================================================

            let bg =
                "#334155";

            let statusIcon = "";

            const status =
                String(
                    log.status
                ).toUpperCase();

            if (
                status ===
                "BLOCKED"
            ) {

                bg =
                    "#dc2626";

                statusIcon = "";

            } else if (
                status ===
                    "ATTACKER" ||
                status ===
                    "REDIRECTED_TO_DECOY"
            ) {

                bg =
                    "#dc2626";

                statusIcon = "";

            } else if (
                status ===
                "SUSPICIOUS"
            ) {

                bg =
                    "#d97706";

                statusIcon = "";

            } else if (
                status ===
                "SUCCESS"
            ) {

                bg =
                    "#16a34a";

                statusIcon = "";

            } else if (
                status ===
                "FAILED"
            ) {

                bg =
                    "#7c3aed";

                statusIcon = "";

            }


            // =================================================
            // TYPE COLOR
            // =================================================

            let typeColor =
                "#eab308";

            const type =
                String(
                    log.type
                ).toUpperCase();

            if (
                type ===
                "IP_BLOCKED"
            ) {

                typeColor =
                    "#f87171";

            } else if (
                type ===
                "DECOY_REDIRECT"
            ) {

                typeColor =
                    "#c084fc";

            } else if (
                type ===
                "LOGIN_SUCCESS"
            ) {

                typeColor =
                    "#4ade80";

            } else if (
                type ===
                "LOGIN_ATTEMPT"
            ) {

                typeColor =
                    "#fbbf24";

            }


            row.innerHTML = `

                <td style="
                    white-space:nowrap;
                    color:#cbd5e1;
                ">
                    ${getLogTime(log)}
                </td>

                <td style="
                    font-family:monospace;
                    color:#f43f5e;
                    font-weight:bold;
                ">
                    ${escapeHTML(log.ip)}
                </td>

                <td style="
                    color:${typeColor};
                    font-weight:bold;
                ">
                    ${escapeHTML(log.type)}
                </td>

                <td style="
                    color:#38bdf8;
                ">
                    ${escapeHTML(log.username)}
                </td>

                <td style="
                    color:#f87171;
                    font-family:monospace;
                    font-weight:bold;
                ">
                    ${escapeHTML(log.password)}
                </td>

                <td>

                    <span style="
                        display:inline-block;

                        padding:5px 9px;

                        border-radius:5px;

                        background:${bg};

                        color:white;

                        font-size:11px;

                        font-weight:bold;

                        white-space:nowrap;
                    ">

                        ${statusIcon}
                        ${escapeHTML(log.status)}

                    </span>

                </td>

                <td style="
                    text-align:center;
                    font-weight:bold;
                    color:#cbd5e1;
                ">
                    ${escapeHTML(
                        log.attemptCount || "-"
                    )}
                </td>

            `;

            tableBody.appendChild(
                row
            );

        }
    );

}


// ============================================================
// RENDER BLOCKED IPS
// ============================================================

function renderBlockedIPs(ips) {

    const count =
        document.getElementById("blockedCount");

    if (count) {
        count.innerText = ips.length;
    }

    const list =
        document.getElementById("blockedIpList");

    if (!list) {
        return;
    }

    if (!ips.length) {

        list.innerHTML =
            '<span style="color:#94a3b8;">No IPs blacklisted.</span>';

        return;
    }

    list.innerHTML =
        ips.map(ip => {

            const safeIP =
                escapeHTML(ip);

            const encodedIP =
                encodeURIComponent(ip);

            return `
                <span style="
                    background:#7f1d1d;
                    color:#fca5a5;
                    padding:6px 10px;
                    border-radius:5px;
                    margin:3px;
                    display:inline-flex;
                    align-items:center;
                    gap:8px;
                    font-family:monospace;
                    font-weight:bold;
                ">

                    &#128308; ${safeIP}

                    <button
                        type="button"
                        onclick="unblockSingleIP('${encodedIP}')"
                        style="
                            background:#16a34a;
                            color:white;
                            border:none;
                            padding:4px 8px;
                            border-radius:4px;
                            cursor:pointer;
                            font-weight:bold;
                        "
                    >
                        &#128076; Unblock
                    </button>

                </span>
            `;

        }).join("");
}


// ============================================================

// ATTACK CHART
// ============================================================
function renderAttackChart(logs) {

    const canvas =
        document.getElementById(
            "attackChart"
        );

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        console.warn(
            "Chart.js is not available."
        );

        return;
    }


    // ========================================================
    // GET ATTACK LOGS
    // ========================================================

    const attackLogs =
        getAttackLogs(logs);


    let sql = 0;
    let xss = 0;
    let brute = 0;


    attackLogs.forEach(
        rawLog => {

            const log =
                normalizeLog(
                    rawLog
                );


            // =================================================
            // SUPPORT OLD + SUPABASE FORMAT
            // =================================================

            const type =
                String(
                    log.attack_type ||
                    log.type ||
                    ""
                ).toUpperCase();


            const username =
                String(
                    log.attempted_user ||
                    log.username ||
                    ""
                );


            const password =
                String(
                    log.attempted_password ||
                    log.password ||
                    ""
                );


            const combined =
                username +
                " " +
                password;


            // =================================================
            // SQL INJECTION
            // =================================================

            const sqlPattern =
                /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\btruncate\b|\bexec\b|\bexecute\b|\bor\b|\band\b).*(=|--|\/\*|\*\/|'|"|\bfrom\b|\bwhere\b)|(--|\/\*|\*\/|'\s*or\s*'|'\s*=\s*'|"\s*or\s*"|"\s*=\s*")/i;


            // =================================================
            // XSS
            // =================================================

            const xssPattern =
                /(<script\b|<\/script>|javascript\s*:|onerror\s*=|onload\s*=|onclick\s*=|onmouseover\s*=|<img\b|<svg\b|<iframe\b|<object\b|<embed\b|alert\s*\(|prompt\s*\(|confirm\s*\()/i;


            // =================================================
            // CLASSIFY
            // =================================================

            if (
                type.includes("SQL_INJECTION") ||
                type.includes("SQLI") ||
                type.includes("SQL INJECTION") ||
                sqlPattern.test(combined)
            ) {

                sql++;

            }

            else if (
                type.includes("XSS") ||
                type.includes("CROSS_SITE_SCRIPT") ||
                type.includes("CROSS-SITE") ||
                xssPattern.test(combined)
            ) {

                xss++;

            }

            else {

                brute++;

            }

        }
    );


    // ========================================================
    // DESTROY OLD CHART
    // ========================================================

    if (
        attackChartInstance
    ) {

        attackChartInstance.destroy();

        attackChartInstance =
            null;
    }


    // ========================================================
    // CREATE PIE CHART
    // ========================================================

    attackChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "pie",

                data: {

                    labels: [

                        "SQL Injection",

                        "XSS",

                        "Brute Force / Login"

                    ],

                    datasets: [{

                        data: [

                            sql,

                            xss,

                            brute

                        ],

                        backgroundColor: [

                            "#ef4444",

                            "#eab308",

                            "#38bdf8"

                        ],

                        borderWidth:
                            0

                    }]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            position:
                                "right",

                            labels: {

                                color:
                                    "#f8fafc"

                            }

                        }

                    }

                }

            }
        );

}

// ============================================================
// DASHBOARD
// ============================================================

function checkDashboardSiren(logs) {
    if (!sirenEnabled || !Array.isArray(logs) || !logs.length) return;
    const blocked = logs.filter(function(log) {
        return String(log.type || log.attack_type || '').toUpperCase() === 'IP_BLOCKED';
    });
    if (!blocked.length) return;
    blocked.sort(function(a,b) {
        return new Date(b.created_at || b.timestamp || b.time || 0) - new Date(a.created_at || a.time || 0);
    });
    const latest = blocked[0]; showVisualThreatAlert(latest);
    const eventId = String(latest.id || ((latest.created_at || latest.timestamp || latest.time || '') + '|' + (latest.ip || '')));
    const lastEvent = localStorage.getItem('honeyshield_last_siren_event');
    if (lastEvent === eventId) return;
    const eventTime = new Date(latest.created_at || latest.timestamp || latest.time || 0).getTime();
    if (lastEvent === null && (!eventTime || Date.now() - eventTime > 30000)) {
        localStorage.setItem('honeyshield_last_siren_event', eventId);
        return;
    }
    localStorage.setItem('honeyshield_last_siren_event', eventId);
    console.log('HoneyShield: IP_BLOCKED detected - dashboard siren triggered');
    playBeepSound(5);
}

async function loadDashboard() {

    try {

        const [
            logs,
            blockedIPs
        ] = await Promise.all([

            loadLogs(),

            loadBlockedIPs()

        ]);


        // ====================================================
        // REAL ATTACK COUNT
        // ====================================================

        checkDashboardSiren(logs);


        const attackLogs =
            getAttackLogs(
                logs
            );

        const total =
            document.getElementById(
                "totalAttacks"
            );

        if (total) {

            total.innerText =
                attackLogs.length;

        }


        // ====================================================
        // BLOCKED IPS
        // ====================================================

        renderBlockedIPs(
            blockedIPs
        );


        // ====================================================
        // ALL SECURITY EVENTS
        // ====================================================

        renderLogs(
            logs
        );


        // ====================================================
        // CHART
        // ====================================================

        renderAttackChart(
            logs
        );


        console.log(
            `HoneyShield Dashboard: ${attackLogs.length} attacks, ${logs.length} security events, ${blockedIPs.length} blocked IPs.`
        );


    } catch (error) {

        console.error(
            "Dashboard loading failed:",
            error
        );

    }

}


// ============================================================
// CSV EXPORT
// ============================================================

async function exportLogsCSV() {

    try {

        const response =
            await fetch(
                "/api/logs",
                {
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Unable to fetch security logs."
            );

        }

        const result =
            await response.json();

        const logs =
            Array.isArray(
                result.logs
            )
                ? result.logs
                : [];


        if (!logs.length) {

            alert(
                "No security logs available for export."
            );

            return;

        }


        // ====================================================
        // CSV HEADERS
        // ====================================================

        const headers = [

            "ID",

            "Created At",

            "IP Address",

            "Threat Type",

            "Username",

            "Password",

            "Status",

            "Attempt Count"

        ];


        // ====================================================
        // CSV ESCAPE
        // ====================================================

        function escapeCSV(value) {

            const text =
                String(
                    value ?? ""
                );

            return `"${text.replace(
                /"/g,
                '""'
            )}"`;

        }


        // ====================================================
        // CSV ROWS
        // ====================================================

        const rows =
            logs.map(
                rawLog => {

                    const log =
                        normalizeLog(
                            rawLog
                        );

                    return [

                        log.id,

                        log.created_at,

                        log.ip,

                        log.type,

                        log.username,

                        log.password,

                        log.status,

                        log.attemptCount

                    ]
                        .map(
                            escapeCSV
                        )
                        .join(",");

                }
            );


        const csvContent = [

            headers
                .map(
                    escapeCSV
                )
                .join(","),

            ...rows

        ].join("\r\n");


        // ====================================================
        // CREATE CSV FILE
        // ====================================================

        const blob =
            new Blob(

                [

                    "\uFEFF",

                    csvContent

                ],

                {

                    type:
                        "text/csv;charset=utf-8;"

                }

            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        const timestamp =
            new Date()
                .toISOString()
                .replace(
                    /[:.]/g,
                    "-"
                );


        link.href =
            url;

        link.download =
            `HoneyShield_Security_Logs_${timestamp}.csv`;


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        URL.revokeObjectURL(
            url
        );


        console.log(
            `HoneyShield: Exported ${logs.length} security logs.`
        );


        alert(
            `Ã¢Å“â€¦ CSV exported successfully.\n\n${logs.length} security events exported.`
        );


    } catch (error) {

        console.error(
            "CSV export failed:",
            error
        );

        alert(
            "ÃƒÂ¢Ã‚ÂÃ…â€™ Unable to export security logs."
        );

    }

}


// ============================================================
// UNBLOCK ONE IP
// ============================================================

async function unblockSingleIP(encodedIP) {

    try {

        const ip = decodeURIComponent(encodedIP);

        if (!ip) {
            alert("Invalid IP address.");
            return;
        }

        const confirmed = confirm(
            `Unblock IP ${ip}?`
        );

        if (!confirmed) {
            return;
        }

        const response = await fetch(
            `/api/blocked-ips/${encodeURIComponent(ip)}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Unblock API returned ${response.status}`
            );
        }

        const result = await response.json();

        console.log(
            "Single IP unblock result:",
            result
        );

        await loadDashboard();

        alert(
            `IP ${ip} has been unblocked.`
        );

    } catch (error) {

        console.error(
            "Single IP unblock failed:",
            error
        );

        alert(
            "Failed to unblock this IP."
        );
    }
}


// ============================================================
// UNBLOCK ALL
// ============================================================

async function unblockAllIPs() {

    try {

        const confirmed =
            confirm(
                "Are you sure you want to remove all blocked IPs?"
            );

        if (!confirmed) {
            return;
        }


        const response =
            await fetch(
                "/api/blocked-ips",
                {

                    method:
                        "DELETE"

                }
            );


        if (!response.ok) {

            throw new Error(
                `Unblock API returned ${response.status}`
            );

        }


        const result =
            await response.json();


        console.log(
            "Unblock result:",
            result
        );


        renderBlockedIPs(
            []
        );


        await loadDashboard();


        alert(
            "Ã¢Å“â€¦ All blocked IPs have been reset."
        );


    } catch (error) {

        console.error(
            "Unblock failed:",
            error
        );

        alert(
            "ÃƒÂ¢Ã‚ÂÃ…â€™ Failed to reset blocked IPs."
        );

    }

}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

    window.location.href =
        "/";

}


// ============================================================
// REFRESH BUTTON
// ============================================================

function setupRefreshButton() {

    const button =
        document.getElementById(
            "refreshBtn"
        );

    if (button) {

        button.addEventListener(
            "click",
            loadDashboard
        );

    }

}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // ====================================================
        // SIREN
        // ====================================================

        createSirenButton();


        // ====================================================
        // LOGIN
        // ====================================================

        const loginForm =
            document.getElementById(
                "login-form"
            ) ||
            document.getElementById(
                "loginForm"
            );


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                handleLogin
            );

        }


        // ====================================================
        // DASHBOARD
        // ====================================================

        if (
            document.getElementById(
                "logsTable"
            )
        ) {

            loadDashboard();


            setInterval(
                loadDashboard,
                5000
            );

        }


        // ====================================================
        // REFRESH
        // ====================================================

        setupRefreshButton();


        // ====================================================
        // LOGOUT
        // ====================================================

        document
            .querySelectorAll(
                "#logoutBtn, .logout-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        logout
                    );

                }
            );

    }
);


// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.handleLogin =
    handleLogin;

window.loadDashboard =
    loadDashboard;

window.loadLogs =
    loadLogs;

window.logout =
    logout;

window.playBeepSound =
    playBeepSound;

window.unblockAllIPs =
    unblockAllIPs;

window.exportLogsCSV =
    exportLogsCSV;


console.log(
    "Ã°Å¸â€ºÂ¡Ã¯Â¸ÂÃ‚Â HoneyShield app.js loaded successfully."
);

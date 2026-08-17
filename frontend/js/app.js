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


    button.innerHTML =
        "🔊 Siren ON";


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

                button.innerHTML =
                    "🔊 Siren ON";

                button.style.background =
                    "#16a34a";

                await initAudio();

                playBeepSound(1);

            } else {

                button.innerHTML =
                    "🔇 Siren OFF";

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
// BLOCKED FULL SCREEN
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
            font-family:Segoe UI,Arial,sans-serif;
            z-index:9999999;
            padding:30px;
        ">

            <div style="
                width:min(700px,100%);
                border:2px solid #ef4444;
                border-radius:18px;
                padding:45px 30px;
                background:rgba(0,0,0,.45);
                box-shadow:
                    0 0 50px rgba(239,68,68,.35);
            ">

                <div style="
                    font-size:72px;
                    margin-bottom:20px;
                ">
                    🚨
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


    // User gesture initializes browser audio.
    await initAudio();


    const loginButton =
        document.querySelector(
            "#login-form button[type='submit']"
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
                "✅ Authentication successful. Opening dashboard...",
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

                `⚠️ Suspicious activity detected. Attempt ${result.attempts} of 3.`

            );


            return;

        }


        // ====================================================
        // NORMAL FAILED
        // ====================================================

        showLoginStatus(

            result.message ||
            "❌ Invalid username or password."

        );


    } catch (error) {

        console.error(
            "Login failed:",
            error
        );


        showLoginStatus(
            "❌ Cannot connect to HoneyShield backend."
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
                "/api/logs"
            );


        const result =
            await response.json();


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
// LOAD BLOCKED IPS FROM SERVER
// ============================================================

async function loadBlockedIPs() {

    try {

        const response =
            await fetch(
                "/api/blocked-ips"
            );


        const result =
            await response.json();


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
// FIXED LOG TIME
// ============================================================

function getLogTime(log) {

    const value =
        log.created_at;


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


    return date.toLocaleString();

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
                        padding:20px;
                        color:#64748b;
                    "
                >
                    No security attacks recorded yet.
                </td>

            </tr>

        `;

        return;

    }


    tableBody.innerHTML = "";


    logs.forEach(log => {

        const row =
            document.createElement(
                "tr"
            );


        const ip =
            log.ip || "-";


        const type =
            log.type || "UNKNOWN";


        const username =
            log.username || "-";


        const password =
            log.password || "-";


        const status =
            log.status || "LOGGED";


        const time =
            getLogTime(log);


        const attempts =
            log.attemptCount || "-";


        let bg =
            "#334155";


        if (
            status === "BLOCKED"
        ) {

            bg = "#dc2626";

        } else if (
            status === "ATTACKER" ||
            status ===
                "REDIRECTED_TO_DECOY"
        ) {

            bg = "#dc2626";

        } else if (
            status === "SUSPICIOUS"
        ) {

            bg = "#d97706";

        } else if (
            status === "SUCCESS"
        ) {

            bg = "#16a34a";

        }


        row.innerHTML = `

            <td>
                ${escapeHTML(time)}
            </td>

            <td style="
                font-family:monospace;
                color:#f43f5e;
            ">
                ${escapeHTML(ip)}
            </td>

            <td style="
                color:#eab308;
                font-weight:bold;
            ">
                ${escapeHTML(type)}
            </td>

            <td style="
                color:#38bdf8;
            ">
                ${escapeHTML(username)}
            </td>

            <td style="
                color:#f87171;
                font-family:monospace;
                font-weight:bold;
            ">
                ${escapeHTML(password)}
            </td>

            <td>

                <span style="
                    padding:4px 8px;
                    border-radius:4px;
                    background:${bg};
                    color:white;
                    font-size:11px;
                ">
                    ${escapeHTML(status)}
                </span>

            </td>

            <td>
                ${escapeHTML(attempts)}
            </td>

        `;


        tableBody.appendChild(
            row
        );

    });

}


// ============================================================
// RENDER BLOCKED IPS
// ============================================================

function renderBlockedIPs(ips) {

    const count =
        document.getElementById(
            "blockedCount"
        );


    if (count) {

        count.innerText =
            ips.length;

    }


    const list =
        document.getElementById(
            "blockedIpList"
        );


    if (!list) {
        return;
    }


    if (!ips.length) {

        list.innerHTML =
            "No IPs blacklisted.";

        return;

    }


    list.innerHTML =
        ips.map(
            ip => `

                <span style="
                    background:#7f1d1d;
                    color:#fca5a5;
                    padding:5px 9px;
                    border-radius:4px;
                    margin:3px;
                    display:inline-block;
                    font-family:monospace;
                ">
                    ${escapeHTML(ip)}
                </span>

            `
        ).join("");

}


// ============================================================
// GET REAL ATTACK LOGS
// ============================================================
//
// Only these log types represent actual attack attempts.
//
// LOGIN_ATTEMPT:
//   Attempt 1 and Attempt 2
//
// IP_BLOCKED:
//   Third failed attempt
//
// BLOCKED_REQUEST:
//   Already-blocked IP tried again.
//   NOT a new attack attempt.
//
// DECOY_REDIRECT:
//   Security action generated by the third attempt.
//   NOT a separate attack.
//
// ============================================================

function getAttackLogs(logs) {

    return logs.filter(log => {

        return (
            log.type === "LOGIN_ATTEMPT" ||
            log.type === "IP_BLOCKED"
        );

    });

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
        return;
    }


    // Only count real attacks.
    const attackLogs =
        getAttackLogs(logs);


    let sql = 0;

    let xss = 0;

    let brute = 0;


    attackLogs.forEach(log => {

        const type =
            String(
                log.type || ""
            ).toLowerCase();


        if (
            type.includes("sql")
        ) {

            sql++;

        } else if (
            type.includes("xss")
        ) {

            xss++;

        } else {

            // Login attempts and IP_BLOCKED
            // belong to brute-force/login attacks.
            brute++;

        }

    });


    if (
        attackChartInstance
    ) {

        attackChartInstance.destroy();

    }


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

                        borderWidth: 0

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position:
                                "right"

                        }

                    }

                }

            }
        );

}


// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {

    const logs =
        await loadLogs();


    const blockedIPs =
        await loadBlockedIPs();


    // ========================================================
    // TOTAL SUBMITTED ATTACKS
    // ========================================================
    //
    // IMPORTANT:
    // Do NOT use logs.length here.
    //
    // logs.length includes:
    //
    // BLOCKED_REQUEST
    // DECOY_REDIRECT
    //
    // These are security events, not new attack attempts.
    //
    // ========================================================

    const attackLogs =
        getAttackLogs(logs);


    const total =
        document.getElementById(
            "totalAttacks"
        );


    if (total) {

        total.innerText =
            attackLogs.length;

    }


    // ========================================================
    // BLOCKED IP COUNT
    // ========================================================

    // Count comes from the actual server API.
    renderBlockedIPs(
        blockedIPs
    );


    // ========================================================
    // LOG TABLE
    // ========================================================

    // Show all security events in the log table.
    // This preserves the complete security history.
    renderLogs(
        logs
    );


    // ========================================================
    // ATTACK CHART
    // ========================================================

    // Chart only counts actual attack events.
    renderAttackChart(
        logs
    );

}


// ============================================================
// REFRESH
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
// UNBLOCK ALL
// ============================================================

async function unblockAllIPs() {

    try {

        const response =
            await fetch(
                "/api/blocked-ips",
                {
                    method:
                        "DELETE"
                }
            );


        const result =
            await response.json();


        console.log(
            "Unblock result:",
            result
        );


        // Immediately update UI.
        renderBlockedIPs([]);


        await loadDashboard();


    } catch (error) {

        console.error(
            "Unblock failed:",
            error
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
// INIT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // Siren is optional frontend functionality.
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
// GLOBAL
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


console.log(
    "🛡️ HoneyShield app.js loaded."
);
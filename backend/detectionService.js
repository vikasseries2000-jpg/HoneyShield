const path = require('path');
const fs = require('fs');
const https = require('https');

// Log file path in project root
const logsFilePath = path.join(__dirname, '../telemetry_logs.json');

// In-Memory Tracker to hold running risk score for each IP
const ipRiskStore = {};

// Optional: Paste your Discord Webhook URL here if you want real alerts
const DISCORD_WEBHOOK_URL = ""; 

// Helper to trigger external SOC Alert (Discord Webhook)
function sendSOCAlert(eventData) {
    if (!DISCORD_WEBHOOK_URL) return;

    const payload = JSON.stringify({
        embeds: [{
            title: "🚨 CRITICAL THREAT: IP BLACKLISTED",
            color: 15158332, // Red
            fields: [
                { name: "Attacker Real IP", value: `\`${eventData.realIP}\``, inline: true },
                { name: "Threat Vector", value: `\`${eventData.attackType}\``, inline: true },
                { name: "Accumulated Risk", value: `\`${eventData.accumulatedRiskScore} / 100\``, inline: true },
                { name: "Sinkhole Routed IP", value: `\`${eventData.spoofedFakeIP}\``, inline: true },
                { name: "Threat Geo-Origin", value: `\`${eventData.geoMeta}\``, inline: true }
            ],
            footer: { text: "HoneyShield Automated Incident Response Engine" },
            timestamp: new Date().toISOString()
        }]
    });

    try {
        const url = new URL(DISCORD_WEBHOOK_URL);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        });
        req.on('error', (e) => console.error("Webhook Alert Failed:", e.message));
        req.write(payload);
        req.end();
    } catch (err) {
        console.error("Webhook Execution Error:", err.message);
    }
}

function evaluateRiskAndSpoof(req, attackType, riskIncrement = 0) {
    // 1. Get Real IP
    let realIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (realIP === '::1' || realIP === '::ffff:127.0.0.1') {
        realIP = '127.0.0.1';
    }

    // 2. Initialize IP in tracker if missing
    if (!ipRiskStore[realIP]) {
        ipRiskStore[realIP] = { score: 0, alerted: false };
    }

    // 3. Increment Risk Score
    ipRiskStore[realIP].score += riskIncrement;
    const currentTotalRisk = ipRiskStore[realIP].score;

    // 4. Generate Random Spoofed IP & Synthetic Geo Location
    const spoofedFakeIP = `10.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
    const geoOrigins = ['RU-Moscow [AS12389]', 'CN-Beijing [AS4134]', 'US-Ashburn [AS16509]', 'NL-Amsterdam [AS60781]', 'BR-SaoPaulo [AS28573]'];
    const geoMeta = geoOrigins[Math.floor(Math.random() * geoOrigins.length)];

    // 5. Determine Blocked Status
    const isBlocked = currentTotalRisk >= 80;
    const currentStatus = isBlocked ? 'BLOCKED' : 'DECEPTION_ACTIVE';

    // 6. Create Telemetry Object
    const eventData = {
        timestamp: new Date().toISOString(),
        realIP: realIP,
        spoofedFakeIP: spoofedFakeIP,
        attackType: attackType,
        accumulatedRiskScore: currentTotalRisk,
        status: currentStatus,
        geoMeta: geoMeta,
        userAgent: req.headers['user-agent'] || 'Unknown'
    };

    // 7. Write to telemetry_logs.json
    if (attackType !== 'PASSIVE_CHECK') {
        try {
            let logs = [];
            if (fs.existsSync(logsFilePath)) {
                const fileData = fs.readFileSync(logsFilePath, 'utf8');
                logs = fileData ? JSON.parse(fileData) : [];
            }
            logs.push(eventData);
            fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2));
        } catch (err) {
            console.error("Telemetry File Error:", err);
        }

        // 8. Trigger Automated SOC Notification if newly blocked
        if (isBlocked && !ipRiskStore[realIP].alerted) {
            ipRiskStore[realIP].alerted = true;
            sendSOCAlert(eventData);
        }
    }

    return { eventData, isBlocked };
}

// Clear all blocked IPs from memory
function clearRiskStore() {
    for (let ip in ipRiskStore) {
        delete ipRiskStore[ip];
    }
    return { success: true, message: "IP Risk Memory Cleared!" };
}

module.exports = {
    evaluateRiskAndSpoof,
    logsFilePath,
    clearRiskStore
};
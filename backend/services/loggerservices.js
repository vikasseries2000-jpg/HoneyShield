// ============================================================
// HONEYSHIELD SECURITY ENGINE
// LOCAL SECURITY LOG SERVICE
// ============================================================

const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "..", "logs.json");


// ============================================================
// READ LOGS
// ============================================================

function readLogs() {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            fs.writeFileSync(
                LOG_FILE,
                "[]",
                "utf8"
            );

            return [];
        }

        const data = fs.readFileSync(
            LOG_FILE,
            "utf8"
        );

        if (!data.trim()) {
            return [];
        }

        const logs = JSON.parse(data);

        return Array.isArray(logs)
            ? logs
            : [];

    } catch (error) {
        console.error(
            "Unable to read security logs:",
            error.message
        );

        return [];
    }
}


// ============================================================
// WRITE LOGS
// ============================================================

function writeLogs(logs) {
    try {
        fs.writeFileSync(
            LOG_FILE,
            JSON.stringify(
                logs,
                null,
                2
            ),
            "utf8"
        );

        return true;

    } catch (error) {
        console.error(
            "Unable to write security logs:",
            error.message
        );

        return false;
    }
}


// ============================================================
// ADD LOG
// ============================================================

async function addLog(log = {}) {

    const entry = {

        id:
            log.id ||
            Date.now(),

        timestamp:
            log.timestamp ||
            log.created_at ||
            new Date().toISOString(),

        type:
            log.type ||
            "UNKNOWN",

        ip:
            log.ip ||
            "-",

        username:
            log.username ||
            "-",

        password:
            log.password !== undefined
                ? log.password
                : undefined,

        status:
            log.status ||
            "LOGGED",

        attemptCount:
            log.attemptCount ??
            log.attack_count ??
            log.attempt_count ??
            0

    };


    const logs = readLogs();

    logs.push(entry);

    writeLogs(logs);

    return entry;
}


// ============================================================
// GET LOGS
// ============================================================

async function getLogs() {

    const logs = readLogs();

    return [...logs].reverse();

}


// ============================================================
// CLEAR LOGS
// ============================================================

async function clearLogs() {

    return writeLogs([]);

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    addLog,

    getLogs,

    clearLogs

};
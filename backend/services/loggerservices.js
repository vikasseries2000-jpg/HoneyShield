// ============================================================
// HONEYSHIELD SECURITY LOGGER
// ============================================================

let securityLogs = [];


// ============================================================
// ADD LOG
// ============================================================

function addLog(data = {}) {

    const log = {

        id:
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        // IMPORTANT:
        // Timestamp is created ONCE and never changed.
        created_at:
            new Date().toISOString(),

        type:
            data.type ||
            "UNKNOWN",

        ip:
            data.ip ||
            "unknown",

        username:
            data.username ||
            "-",

        // Demo honeypot only.
        password:
            data.password !== undefined
                ? String(data.password)
                : "-",

        status:
            data.status ||
            "LOGGED",

        attemptCount:
            data.attemptCount || 0

    };


    securityLogs.unshift(log);


    console.log(
        "📝 Security Log:",
        log
    );


    return log;

}


// ============================================================
// GET LOGS
// ============================================================

function getLogs() {

    return securityLogs;

}


// ============================================================
// CLEAR LOGS
// ============================================================

function clearLogs() {

    securityLogs = [];

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    addLog,

    getLogs,

    clearLogs

};
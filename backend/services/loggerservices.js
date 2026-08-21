// ============================================================
// HONEYSHIELD SECURITY LOG SERVICE
// SUPABASE STORAGE
// ============================================================

const { supabase } = require("./supabase");


// ============================================================
// ADD LOG
// ============================================================

async function addLog(log = {}) {

    const entry = {

        id:
            log.id ||
            Date.now(),

        ip:
            log.ip ||
            "-",

        time:
            log.time ||
            log.timestamp ||
            log.created_at ||
            new Date().toISOString(),

        route:
            log.route ||
            "/api/auth/login",

        attack_type:
            log.attack_type ||
            log.type ||
            "UNKNOWN",

        attempted_user:
            log.attempted_user ||
            log.username ||
            "-",

        attempted_password:
            log.attempted_password !== undefined
                ? log.attempted_password
                : log.password !== undefined
                    ? log.password
                    : null,

        action:
            log.action ||
            log.status ||
            "LOGGED",

        attack_count:
            log.attack_count ??
            log.attemptCount ??
            log.attempt_count ??
            0
    };


    // ========================================================
    // SUPABASE CHECK
    // ========================================================

    if (!supabase) {

        console.error(
            "Supabase is not configured. Security log was not saved."
        );

        return entry;
    }


    // ========================================================
    // INSERT INTO SUPABASE
    // ========================================================

    const { data, error } = await supabase
        .from("threat_logs")
        .insert([entry])
        .select()
        .single();


    if (error) {

        console.error(
            "Unable to save security log:",
            error.message
        );

        return entry;
    }


    return data;
}


// ============================================================
// GET LOGS
// ============================================================

async function getLogs() {

    if (!supabase) {

        console.error(
            "Supabase is not configured. Unable to read logs."
        );

        return [];
    }


    const { data, error } = await supabase
        .from("threat_logs")
        .select("*")
        .order("time", {
            ascending: false
        });


    if (error) {

        console.error(
            "Unable to read security logs:",
            error.message
        );

        return [];
    }


    return data || [];
}


// ============================================================
// CLEAR LOGS
// ============================================================

async function clearLogs() {

    if (!supabase) {

        console.error(
            "Supabase is not configured. Unable to clear logs."
        );

        return false;
    }


    const { error } = await supabase
        .from("threat_logs")
        .delete()
        .not("id", "is", null);


    if (error) {

        console.error(
            "Unable to clear security logs:",
            error.message
        );

        return false;
    }


    return true;
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    addLog,
    getLogs,
    clearLogs

};
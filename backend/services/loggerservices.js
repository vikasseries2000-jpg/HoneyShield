// ============================================================
// HONEYSHIELD SECURITY LOGGER
// ============================================================

const { supabase } = require("./supabase");


// ============================================================
// MEMORY FALLBACK
// ============================================================

let securityLogs = [];


// ============================================================
// ADD LOG
// ============================================================

async function addLog(data = {}) {

    const now = new Date().toISOString();

    const log = {

        id:
            data.id ||
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        created_at: now,

        time:
            data.time ||
            now,

        ip:
            data.ip ||
            "unknown",

        route:
            data.route ||
            "/api/auth/login",

        type:
            data.type ||
            data.attack_type ||
            "UNKNOWN",

        username:
            data.username ||
            data.attempted_user ||
            "-",

        password:
            data.password !== undefined
                ? String(data.password)
                : data.attempted_password !== undefined
                    ? String(data.attempted_password)
                    : "-",

        status:
            data.status ||
            data.action ||
            "LOGGED",

        user_agent:
            data.user_agent ||
            "-",

        attack_count:
            Number(
                data.attack_count ??
                data.attackCount ??
                0
            )

    };


    // --------------------------------------------------------
    // MEMORY
    // --------------------------------------------------------

    securityLogs.unshift(log);


    // --------------------------------------------------------
    // SUPABASE
    // --------------------------------------------------------

    if (supabase) {

        try {

            const payload = {

                id:
                    log.id,

                time:
                    log.time,

                ip:
                    log.ip,

                route:
                    log.route,

                attack_type:
                    log.type,

                attempted_user:
                    log.username,

                attempted_password:
                    log.password,

                action:
                    log.status,

                user_agent:
                    log.user_agent,

                attack_count:
                    log.attack_count,

                created_at:
                    log.created_at,

                type:
                    log.type,

                username:
                    log.username,

                password:
                    log.password,

                status:
                    log.status

            };


            const { error } =
                await supabase
                    .from("threat_logs")
                    .insert(payload);


            if (error) {

                console.error(
                    "âŒ Supabase log insert failed:",
                    error.message
                );

            }

        } catch (error) {

            console.error(
                "âŒ Supabase logging error:",
                error.message
            );

        }

    }


    console.log(
        "ðŸ“ Security Log:",
        log
    );


    return log;
}


// ============================================================
// GET LOGS
// ============================================================

async function getLogs() {

    if (supabase) {

        try {

            const {
                data,
                error
            } =
                await supabase
                    .from("threat_logs")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (!error && Array.isArray(data)) {

                return data.map(row => ({

                    id:
                        row.id,

                    created_at:
                        row.created_at,

                    time:
                        row.time ||
                        row.created_at,

                    ip:
                        row.ip ||
                        "unknown",

                    route:
                        row.route ||
                        "/api/auth/login",

                    type:
                        row.type ||
                        row.attack_type ||
                        "UNKNOWN",

                    username:
                        row.username ||
                        row.attempted_user ||
                        "-",

                    password:
                        row.password ??
                        row.attempted_password ??
                        "-",

                    status:
                        row.status ||
                        row.action ||
                        "LOGGED",

                    user_agent:
                        row.user_agent ||
                        "-",

                    attack_count:
                        Number(
                            row.attack_count ??
                            0
                        )

                }));

            }


            if (error) {

                console.error(
                    "âŒ Supabase get logs failed:",
                    error.message
                );

            }

        } catch (error) {

            console.error(
                "âŒ Supabase fetch error:",
                error.message
            );

        }

    }


    // --------------------------------------------------------
    // MEMORY FALLBACK
    // --------------------------------------------------------

    return securityLogs;
}


// ============================================================
// CLEAR LOGS
// ============================================================

async function clearLogs() {

    securityLogs = [];


    if (supabase) {

        try {

            const {
                error
            } =
                await supabase
                    .from("threat_logs")
                    .delete()
                    .not(
                        "id",
                        "is",
                        null
                    );


            if (error) {

                console.error(
                    "âŒ Supabase clear logs failed:",
                    error.message
                );

                return false;

            }

        } catch (error) {

            console.error(
                "âŒ Supabase clear error:",
                error.message
            );

            return false;

        }

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

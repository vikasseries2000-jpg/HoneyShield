// ============================================================
// HONEYSHIELD SECURITY LOGGER
// ============================================================

const {
    supabase
} = require("./supabase");


// ============================================================
// MEMORY FALLBACK
// ============================================================

let securityLogs = [];


// ============================================================
// ADD LOG
// ============================================================

async function addLog(data = {}) {

    const now =
        new Date().toISOString();


    const log = {

        id:
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        created_at:
            now,

        type:
            data.type ||
            "UNKNOWN",

        ip:
            data.ip ||
            "unknown",

        username:
            data.username ||
            "-",

        password:
            data.password !== undefined
                ? String(data.password)
                : "-",

        status:
            data.status ||
            "LOGGED",

        attemptCount:
            Number(
                data.attemptCount || 0
            )

    };


    // --------------------------------------------------------
    // MEMORY
    // --------------------------------------------------------

    securityLogs.unshift(
        log
    );


    // --------------------------------------------------------
    // SUPABASE
    // --------------------------------------------------------

    if (supabase) {

        try {

            const payload = {

                id:
                    log.id,

                created_at:
                    log.created_at,

                type:
                    log.type,

                ip:
                    log.ip,

                username:
                    log.username,

                password:
                    log.password,

                status:
                    log.status,

                attempt_count:
                    log.attemptCount

            };


            const {
                error
            } =
                await supabase
                    .from("threat_logs")
                    .insert(
                        payload
                    );


            if (error) {

                console.error(
                    "❌ Supabase log insert failed:",
                    error.message
                );

            }

        } catch (error) {

            console.error(
                "❌ Supabase logging error:",
                error.message
            );

        }

    }


    console.log(
        "📝 Security Log:",
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

                return data.map(
                    row => ({

                        id:
                            row.id,

                        created_at:
                            row.created_at,

                        type:
                            row.type ||
                            "UNKNOWN",

                        ip:
                            row.ip ||
                            "unknown",

                        username:
                            row.username ||
                            row.attempted_user ||
                            "-",

                        password:
                            row.password ??
                            row.attempted_pass ??
                            "-",

                        status:
                            row.status ||
                            row.action ||
                            "LOGGED",

                        attemptCount:
                            Number(
                                row.attempt_count ||
                                row.attack_count ||
                                0
                            )

                    })
                );

            }


            console.error(
                "❌ Supabase get logs failed:",
                error?.message
            );

        } catch (error) {

            console.error(
                "❌ Supabase fetch error:",
                error.message
            );

        }

    }


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
                    "❌ Supabase clear logs failed:",
                    error.message
                );

                return false;

            }

        } catch (error) {

            console.error(
                "❌ Supabase clear error:",
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
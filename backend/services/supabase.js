// ============================================================
// HONEYSHIELD SUPABASE CONNECTION
// ============================================================

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (
    SUPABASE_URL &&
    SUPABASE_KEY
) {

    supabase =
        createClient(
            SUPABASE_URL,
            SUPABASE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

    console.log(
        "🟢 Supabase connection configured."
    );

} else {

    console.warn(
        "⚠️ Supabase credentials not found. Logs will use temporary memory storage."
    );

}

module.exports = {
    supabase
};
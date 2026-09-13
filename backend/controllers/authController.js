// ============================================================
// HONEYSHIELD AUTHENTICATION CONTROLLER
// ============================================================

const {

    recordFailedAttempt,

    resetAttempts,

    isBlocked,

    normalizeIP

} = require("../detectionService");


const {

    addLog

} = require("../services/loggerservices");


const {

    sendLoginAttemptAlert

} = require("../services/notifierService");


// ============================================================
// DEMO USER
// ============================================================

const DEMO_USER = {

    username:
        "admin",

    password:
        "admin123"

};


// ============================================================
// MAX LOGIN ATTEMPTS
// ============================================================

const MAX_ATTEMPTS = 3;


// ============================================================
// GET CLIENT IP
// ============================================================

function getClientIP(req) {

    const forwarded =
        req.headers[
            "x-forwarded-for"
        ];


    if (
        forwarded
    ) {

        return normalizeIP(
            forwarded
        );

    }


    return normalizeIP(

        req.socket.remoteAddress ||

        req.ip ||

        "unknown"

    );

}


// ============================================================
// GET USER EMAIL
// ============================================================
//
// For this college/demo version the email belongs to the
// configured demo user.
//
// IMPORTANT:
// Do NOT accept email from the browser and blindly send
// security alerts to it. In a real application the email
// should come from the server-side user database.
// ============================================================

function getUserEmail(username) {

    if (
        username ===
        DEMO_USER.username
    ) {

        return (
            process.env.DEMO_USER_EMAIL ||
            process.env.NOTIFY_EMAIL ||
            ""
        );

    }


    return (
        process.env.NOTIFY_EMAIL ||
        ""
    );

}


// ============================================================
// SEND LOGIN EMAIL SAFELY
// ============================================================

async function notifyLoginAttempt({

    username,
    ip,
    attempts,
    remaining,
    status

}) {

    try {

        await sendLoginAttemptAlert({

            username,

            ip,

            attempt:
                attempts,

            remaining,

            status

        });

    }

    catch (error) {

        console.error(
            "Login email notification error:",
            error.message
        );

    }

}


// ============================================================
// LOGIN
// ============================================================

async function login(
    req,
    res
) {

    try {

        const {

            username = "",

            password = ""

        } =
            req.body || {};


        const ip =
            getClientIP(req);


        // ====================================================
        // BLOCKED IP CHECK
        // ====================================================

        if (
            isBlocked(ip)
        ) {

            await addLog({

                type:
                    "BLOCKED_REQUEST",

                ip,

                username,

                password,

                status:
                    "BLOCKED",

                attemptCount:
                    MAX_ATTEMPTS

            });


            return res
                .status(403)
                .json({

                    success:
                        false,

                    mode:
                        "BLOCKED",

                    blocked:
                        true,

                    message:
                        "Your IP has been blocked after 3 failed login attempts. Please contact the administrator for account recovery.",

                    ip,

                    attempts:
                        MAX_ATTEMPTS,

                    remaining:
                        0,

                    recovery:
                        true

                });

        }


        // ====================================================
        // VALIDATION
        // ====================================================

        if (
            !username ||
            !password
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "Username and password are required."

                });

        }


        // ====================================================
        // CORRECT LOGIN
        // ====================================================

        if (

            username ===
            DEMO_USER.username &&

            password ===
            DEMO_USER.password

        ) {

            resetAttempts(
                ip
            );


            await addLog({

                type:
                    "LOGIN_SUCCESS",

                ip,

                username,

                password:
                    "[HIDDEN]",

                status:
                    "SUCCESS",

                attemptCount:
                    0

            });


            return res.json({

                success:
                    true,

                mode:
                    "REAL",

                message:
                    "Authentication successful.",

                redirect:
                    "/dashboard"

            });

        }


        // ====================================================
        // WRONG LOGIN
        // ====================================================

        const detection =
            recordFailedAttempt(
                ip
            );


        const attempts =
            Number(
                detection.attempts ||
                0
            );


        const remaining =
            Math.max(

                0,

                MAX_ATTEMPTS -
                attempts

            );


        // ====================================================
        // THIRD ATTEMPT — IP BLOCK
        // ====================================================

        if (
            detection.blocked
        ) {

            // ------------------------------------------------
            // SECURITY LOG
            // ------------------------------------------------

            await addLog({

                type:
                    "IP_BLOCKED",

                ip,

                username,

                password,

                status:
                    "BLOCKED",

                attemptCount:
                    attempts

            });


            // ------------------------------------------------
            // DECOY LOG
            // ------------------------------------------------

            await addLog({

                type:
                    "DECOY_REDIRECT",

                ip,

                username,

                password,

                status:
                    "REDIRECTED_TO_DECOY",

                attemptCount:
                    attempts

            });


            // ------------------------------------------------
            // EMAIL — ATTEMPT 3
            // ------------------------------------------------

            await notifyLoginAttempt({

                username,

                ip,

                attempts,

                remaining: 0,

                status:
                    "IP_BLOCKED"

            });


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res
                .status(403)
                .json({

                    success:
                        false,

                    mode:
                        "BLOCKED",

                    blocked:
                        true,

                    message:
                        "3 failed login attempts detected. Your IP has been blocked. If you are the legitimate account owner, contact the administrator for verification and access restoration.",

                    ip,

                    attempts,

                    remaining: 0,

                    recovery:
                        true

                });

        }


        // ====================================================
        // NORMAL FAILED ATTEMPT
        // ====================================================

        const status =
            detection.suspicious
                ? "SUSPICIOUS"
                : "FAILED";


        await addLog({

            type:
                "LOGIN_ATTEMPT",

            ip,

            username,

            password,

            status,

            attemptCount:
                attempts

        });


        // ====================================================
        // EMAIL — ATTEMPT 1 / 2
        // ====================================================

        await notifyLoginAttempt({

            username,

            ip,

            attempts,

            remaining,

            status

        });


        // ====================================================
        // ATTEMPT 2 WARNING
        // ====================================================

        if (
            attempts === 2
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    mode:
                        "WARNING",

                    blocked:
                        false,

                    message:
                        "Invalid username or password. You have used 2 of 3 attempts. 1 attempt remaining. If the next login attempt fails, your IP will be blocked.",

                    attempts: 2,

                    remaining: 1,

                    warning:
                        "NEXT_FAILURE_WILL_BLOCK_IP"

                });

        }


        // ====================================================
        // ATTEMPT 1
        // ====================================================

        return res
            .status(401)
            .json({

                success:
                    false,

                mode:
                    detection.suspicious
                        ? "SUSPICIOUS"
                        : "NORMAL",

                blocked:
                    false,

                message:
                    "Invalid username or password. You have used 1 of 3 attempts. 2 attempts remaining.",

                attempts,

                remaining

            });


    }

    catch (error) {

        console.error(
            "Login error:",
            error
        );


        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    "Internal server error."

            });

    }

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    login,

    getUserEmail

};
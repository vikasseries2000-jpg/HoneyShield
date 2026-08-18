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


// ============================================================
// DEMO ADMIN
// ============================================================

const DEMO_USER = {

    username:
        "admin",

    password:
        "admin123"

};


// ============================================================
// GET CLIENT IP
// ============================================================

function getClientIP(req) {

    const forwarded =
        req.headers[
            "x-forwarded-for"
        ];


    if (forwarded) {

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
        // IMPORTANT:
        // A blocked IP can NEVER login.
        // It is NOT counted as a new attack.
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
                    3

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
                        "Your IP has been permanently blocked due to suspicious activity.",

                    ip,

                    attempts:
                        3

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


        // ====================================================
        // THIRD ATTEMPT
        // ====================================================

        if (
            detection.blocked
        ) {

            await addLog({

                type:
                    "IP_BLOCKED",

                ip,

                username,

                password,

                status:
                    "BLOCKED",

                attemptCount:
                    detection.attempts

            });


            await addLog({

                type:
                    "DECOY_REDIRECT",

                ip,

                username,

                password,

                status:
                    "REDIRECTED_TO_DECOY",

                attemptCount:
                    detection.attempts

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
                        "Your IP has been permanently blocked due to suspicious activity.",

                    ip,

                    attempts:
                        detection.attempts

                });

        }


        // ====================================================
        // NORMAL FAILED ATTEMPT
        // ====================================================

        await addLog({

            type:
                "LOGIN_ATTEMPT",

            ip,

            username,

            password,

            status:
                detection.suspicious
                    ? "SUSPICIOUS"
                    : "FAILED",

            attemptCount:
                detection.attempts

        });


        return res
            .status(401)
            .json({

                success:
                    false,

                mode:
                    detection.suspicious
                        ? "SUSPICIOUS"
                        : "NORMAL",

                message:
                    "Invalid username or password.",

                attempts:
                    detection.attempts,

                remaining:
                    MAX_SAFE_REMAINING(
                        detection.attempts
                    )

            });


    } catch (error) {

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
// REMAINING ATTEMPTS
// ============================================================

function MAX_SAFE_REMAINING(
    attempts
) {

    return Math.max(
        0,
        3 -
        Number(
            attempts || 0
        )
    );

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    login

};
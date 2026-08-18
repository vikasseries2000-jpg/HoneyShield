// ============================================================
// HONEYSHIELD ATTACK DETECTION
// PERMANENT IP BLOCKING
// ============================================================

const fs =
    require("fs");

const path =
    require("path");


const MAX_ATTEMPTS =
    Number(
        process.env.MAX_ATTEMPTS_THRESHOLD ||
        3
    );


const BLOCK_FILE =
    path.join(
        __dirname,
        "blocked_ips.json"
    );


const attempts =
    new Map();


let blockedIPs =
    new Set();


// ============================================================
// LOAD BLOCKED IPS
// ============================================================

function loadBlockedIPs() {

    try {

        if (
            !fs.existsSync(
                BLOCK_FILE
            )
        ) {

            return;

        }


        const data =
            JSON.parse(
                fs.readFileSync(
                    BLOCK_FILE,
                    "utf8"
                )
            );


        if (
            Array.isArray(data)
        ) {

            blockedIPs =
                new Set(
                    data.map(
                        normalizeIP
                    )
                );

        }

    } catch (error) {

        console.error(
            "Unable to load blocked IPs:",
            error
        );

        blockedIPs =
            new Set();

    }

}


loadBlockedIPs();


// ============================================================
// SAVE BLOCKED IPS
// ============================================================

function saveBlockedIPs() {

    try {

        fs.writeFileSync(

            BLOCK_FILE,

            JSON.stringify(
                Array.from(
                    blockedIPs
                ),
                null,
                2
            ),

            "utf8"

        );

    } catch (error) {

        console.error(
            "Unable to save blocked IPs:",
            error
        );

    }

}


// ============================================================
// NORMALIZE IP
// ============================================================

function normalizeIP(ip) {

    if (!ip) {

        return "unknown";

    }


    let value =
        String(ip)
            .split(",")[0]
            .trim();


    if (
        value.startsWith(
            "::ffff:"
        )
    ) {

        value =
            value.substring(7);

    }


    return value;

}


// ============================================================
// CHECK BLOCKED
// ============================================================

function isBlocked(ip) {

    ip =
        normalizeIP(ip);

    return blockedIPs.has(ip);

}


// ============================================================
// RECORD FAILED ATTEMPT
// ============================================================

function recordFailedAttempt(ip) {

    ip =
        normalizeIP(ip);


    // --------------------------------------------------------
    // ALREADY BLOCKED
    // --------------------------------------------------------

    if (
        blockedIPs.has(ip)
    ) {

        return {

            attempts:
                attempts.get(ip) ||
                MAX_ATTEMPTS,

            suspicious:
                true,

            attacker:
                true,

            blocked:
                true,

            alreadyBlocked:
                true

        };

    }


    // --------------------------------------------------------
    // INCREMENT
    // --------------------------------------------------------

    const current =
        attempts.get(ip) ||
        0;


    const newCount =
        current + 1;


    attempts.set(
        ip,
        newCount
    );


    // --------------------------------------------------------
    // THIRD ATTEMPT
    // --------------------------------------------------------

    if (
        newCount >=
        MAX_ATTEMPTS
    ) {

        blockedIPs.add(
            ip
        );


        saveBlockedIPs();


        return {

            attempts:
                newCount,

            suspicious:
                true,

            attacker:
                true,

            blocked:
                true,

            alreadyBlocked:
                false

        };

    }


    // --------------------------------------------------------
    // ATTEMPT 1 / 2
    // --------------------------------------------------------

    return {

        attempts:
            newCount,

        suspicious:
            newCount >= 2,

        attacker:
            false,

        blocked:
            false,

        alreadyBlocked:
            false

    };

}


// ============================================================
// RESET ATTEMPTS
// ============================================================

function resetAttempts(ip) {

    ip =
        normalizeIP(ip);

    attempts.delete(
        ip
    );

}


// ============================================================
// GET BLOCKED IPS
// ============================================================

function getBlockedIPs() {

    return Array.from(
        blockedIPs
    );

}


// ============================================================
// UNBLOCK ONE IP
// ============================================================

function unblockIP(ip) {

    ip =
        normalizeIP(ip);


    const existed =
        blockedIPs.delete(
            ip
        );


    attempts.delete(
        ip
    );


    saveBlockedIPs();


    return existed;

}


// ============================================================
// CLEAR ALL
// ============================================================

function clearBlockedIPs() {

    blockedIPs.clear();

    attempts.clear();

    saveBlockedIPs();

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    MAX_ATTEMPTS,

    normalizeIP,

    isBlocked,

    recordFailedAttempt,

    resetAttempts,

    getBlockedIPs,

    unblockIP,

    clearBlockedIPs

};
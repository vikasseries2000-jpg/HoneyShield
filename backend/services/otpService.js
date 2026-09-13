// ============================================================
// HONEYSHIELD
// OTP SERVICE
// ============================================================

const crypto = require("crypto");
const nodemailer = require("nodemailer");

const {
    supabase
} = require("./supabase");


// ============================================================
// CONFIGURATION
// ============================================================

const OTP_EXPIRY_MINUTES =
    Number(
        process.env.OTP_EXPIRY_MINUTES || 5
    );

const OTP_MAX_ATTEMPTS =
    Number(
        process.env.OTP_MAX_ATTEMPTS || 5
    );


// ============================================================
// SMTP TRANSPORTER
// ============================================================

let transporter = null;

if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
) {

    transporter =
        nodemailer.createTransport({

            host:
                process.env.SMTP_HOST,

            port:
                Number(
                    process.env.SMTP_PORT
                ),

            secure:
                String(
                    process.env.SMTP_SECURE
                ).toLowerCase() === "true",

            auth: {

                user:
                    process.env.SMTP_USER,

                pass:
                    process.env.SMTP_PASS

            }

        });

} else {

    console.warn(
        "⚠️ SMTP configuration not found. OTP email service is disabled."
    );

}


// ============================================================
// GENERATE OTP
// ============================================================

function generateOTP() {

    return String(
        crypto.randomInt(
            100000,
            1000000
        )
    );

}


// ============================================================
// HASH OTP
// ============================================================

function hashOTP(
    otp
) {

    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

}


// ============================================================
// MASK EMAIL
// ============================================================

function maskEmail(
    email
) {

    const parts =
        email.split("@");

    if (
        parts.length !== 2
    ) {
        return "***";
    }

    const local =
        parts[0];

    const domain =
        parts[1];

    if (
        local.length <= 2
    ) {

        return (
            local[0] +
            "***@" +
            domain
        );

    }

    return (
        local.substring(
            0,
            2
        ) +
        "***@" +
        domain
    );

}


// ============================================================
// SEND OTP
// ============================================================

async function sendRecoveryOTP({

    requestId,
    username,
    email

}) {

    if (
        !transporter
    ) {

        throw new Error(
            "SMTP service is not configured."
        );

    }


    const otp =
        generateOTP();

    const otpHash =
        hashOTP(
            otp
        );

    const expiresAt =
        new Date(
            Date.now() +
            OTP_EXPIRY_MINUTES *
            60 *
            1000
        ).toISOString();


    // --------------------------------------------------------
    // INVALIDATE OLD OTPs
    // --------------------------------------------------------

    const {
        error:
            invalidateError
    } =
        await supabase
            .from(
                "recovery_otps"
            )
            .update({

                verified:
                    true

            })
            .eq(
                "request_id",
                requestId
            )
            .eq(
                "verified",
                false
            );


    if (
        invalidateError
    ) {

        console.error(
            "OTP invalidation error:",
            invalidateError
        );

        throw new Error(
            "Unable to prepare OTP verification."
        );

    }


    // --------------------------------------------------------
    // STORE OTP HASH ONLY
    // --------------------------------------------------------

    const {
        error:
            insertError
    } =
        await supabase
            .from(
                "recovery_otps"
            )
            .insert({

                request_id:
                    requestId,

                username:
                    username,

                email:
                    email,

                otp_hash:
                    otpHash,

                expires_at:
                    expiresAt,

                attempts:
                    0,

                verified:
                    false

            });


    if (
        insertError
    ) {

        console.error(
            "OTP database error:",
            insertError
        );

        throw new Error(
            "Unable to create OTP verification."
        );

    }


    // --------------------------------------------------------
    // SEND EMAIL
    // --------------------------------------------------------

    await transporter.sendMail({

        from:
            `"HoneyShield Security" <${process.env.SMTP_USER}>`,

        to:
            email,

        subject:
            "HoneyShield Security Verification Code",

        text:
`HoneyShield Security Verification

Hello ${username},

Your HoneyShield recovery verification code is:

${otp}

This code expires in ${OTP_EXPIRY_MINUTES} minutes.

If you did not request account recovery, you can safely ignore this email.

Do not share this verification code with anyone.

Request ID:
${requestId}`,

        html:
`
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">

    <h2>🛡️ HoneyShield Security</h2>

    <p>Hello <strong>${escapeHtml(username)}</strong>,</p>

    <p>
        A recovery verification was requested for your HoneyShield account.
    </p>

    <div style="
        background:#f3f4f6;
        padding:20px;
        text-align:center;
        border-radius:8px;
        margin:20px 0;
    ">

        <div style="font-size:13px;color:#666">
            Verification Code
        </div>

        <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            margin-top:10px;
        ">
            ${otp}
        </div>

    </div>

    <p>
        This code expires in
        <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
    </p>

    <p>
        <strong>Do not share this code with anyone.</strong>
    </p>

    <p>
        Request ID:
        <strong>${escapeHtml(requestId)}</strong>
    </p>

    <hr>

    <p style="color:#777;font-size:12px">
        If you did not request this recovery verification,
        you can safely ignore this email.
    </p>

</div>
`

    });


    console.log(
        `📧 Recovery OTP sent to ${maskEmail(email)} for ${requestId}`
    );


    return {

        expiresAt,

        maskedEmail:
            maskEmail(
                email
            )

    };

}


// ============================================================
// VERIFY OTP
// ============================================================

async function verifyRecoveryOTP({

    requestId,
    otp

}) {

    if (
        !requestId ||
        !otp
    ) {

        return {

            success:
                false,

            message:
                "Request ID and OTP are required."

        };

    }


    const {
        data,
        error
    } =
        await supabase
            .from(
                "recovery_otps"
            )
            .select("*")
            .eq(
                "request_id",
                requestId
            )
            .eq(
                "verified",
                false
            )
            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            )
            .limit(1)
            .maybeSingle();


    if (
        error
    ) {

        console.error(
            "OTP lookup error:",
            error
        );

        return {

            success:
                false,

            message:
                "Unable to verify OTP."

        };

    }


    if (
        !data
    ) {

        return {

            success:
                false,

            message:
                "OTP is invalid or has already been used."

        };

    }


    // --------------------------------------------------------
    // CHECK EXPIRY
    // --------------------------------------------------------

    if (
        new Date(
            data.expires_at
        ).getTime()
        <=
        Date.now()
    ) {

        return {

            success:
                false,

            message:
                "OTP has expired. Please request a new code."

        };

    }


    // --------------------------------------------------------
    // CHECK ATTEMPTS
    // --------------------------------------------------------

    if (
        data.attempts >=
        OTP_MAX_ATTEMPTS
    ) {

        return {

            success:
                false,

            message:
                "Maximum OTP attempts exceeded. Please request a new code."

        };

    }


    const submittedHash =
        hashOTP(
            String(
                otp
            ).trim()
        );


    // --------------------------------------------------------
    // WRONG OTP
    // --------------------------------------------------------

    if (
        submittedHash !==
        data.otp_hash
    ) {

        const newAttempts =
            data.attempts + 1;

        await supabase
            .from(
                "recovery_otps"
            )
            .update({

                attempts:
                    newAttempts

            })
            .eq(
                "id",
                data.id
            );


        const remaining =
            Math.max(
                0,
                OTP_MAX_ATTEMPTS -
                newAttempts
            );


        return {

            success:
                false,

            message:
                remaining > 0
                    ? `Incorrect OTP. ${remaining} attempt(s) remaining.`
                    : "Incorrect OTP. Maximum attempts exceeded."

        };

    }


    // --------------------------------------------------------
    // OTP VERIFIED
    // --------------------------------------------------------

    const {
        error:
            verifyError
    } =
        await supabase
            .from(
                "recovery_otps"
            )
            .update({

                verified:
                    true,

                verified_at:
                    new Date()
                        .toISOString()

            })
            .eq(
                "id",
                data.id
            )
            .eq(
                "verified",
                false
            );


    if (
        verifyError
    ) {

        console.error(
            "OTP verification update error:",
            verifyError
        );

        return {

            success:
                false,

            message:
                "Unable to complete OTP verification."

        };

    }


    console.log(
        `✅ Recovery OTP verified: ${requestId}`
    );


    return {

        success:
            true,

        message:
            "Identity verification successful."

    };

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    sendRecoveryOTP,

    verifyRecoveryOTP

};
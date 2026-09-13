// ============================================================
// HONEYSHIELD EMAIL NOTIFICATION SERVICE
// ============================================================

const nodemailer = require("nodemailer");

// ============================================================
// SMTP CONFIGURATION
// ============================================================

const ALERT_EMAIL =
    process.env.ALERT_EMAIL || "";

const ALERT_PASSWORD =
    process.env.ALERT_PASSWORD || "";

const NOTIFY_EMAIL =
    process.env.NOTIFY_EMAIL ||
    ALERT_EMAIL ||
    "";


// ============================================================
// TRANSPORTER
// ============================================================

let transporter = null;

if (
    ALERT_EMAIL &&
    ALERT_PASSWORD
) {

    transporter =
        nodemailer.createTransport({

            service: "gmail",

            auth: {

                user:
                    ALERT_EMAIL,

                pass:
                    ALERT_PASSWORD

            }

        });

}


// ============================================================
// EMAIL CONFIG CHECK
// ============================================================

function isEmailConfigured() {

    return Boolean(

        transporter &&
        NOTIFY_EMAIL

    );

}


// ============================================================
// SEND LOGIN ATTEMPT EMAIL
// ============================================================

async function sendLoginAttemptAlert({

    username,
    ip,
    attempt,
    remaining,
    status = "FAILED"

}) {

    // --------------------------------------------------------
    // Always show console information.
    // Useful during college demonstration.
    // --------------------------------------------------------

    console.log(
        `\n📧 HoneyShield Login Alert`
    );

    console.log(
        `   User: ${username}`
    );

    console.log(
        `   IP: ${ip}`
    );

    console.log(
        `   Attempt: ${attempt}/3`
    );

    console.log(
        `   Remaining: ${remaining}`
    );

    console.log(
        `   Status: ${status}`
    );


    // --------------------------------------------------------
    // If email is not configured, don't break login.
    // --------------------------------------------------------

    if (
        !isEmailConfigured()
    ) {

        console.log(
            "📧 Email notification skipped: SMTP is not configured."
        );

        return {

            sent:
                false,

            reason:
                "SMTP_NOT_CONFIGURED"

        };

    }


    // --------------------------------------------------------
    // Determine severity/message.
    // --------------------------------------------------------

    let subject = "";

    let heading = "";

    let message = "";

    let actionMessage = "";


    if (
        attempt === 1
    ) {

        subject =
            "⚠️ HoneyShield: Login Attempt 1 Detected";

        heading =
            "⚠️ Failed Login Attempt Detected";

        message =
            "A failed login attempt was detected for your HoneyShield account.";

        actionMessage =
            "If this was you, please make sure you enter the correct password.";

    }

    else if (
        attempt === 2
    ) {

        subject =
            "⚠️ HoneyShield: Login Attempt 2 Warning";

        heading =
            "⚠️ Second Failed Login Attempt";

        message =
            "A second failed login attempt was detected for your HoneyShield account.";

        actionMessage =
            "You have only 1 attempt remaining. The next failed login attempt will block the current IP address.";

    }

    else {

        subject =
            "🚨 HoneyShield: IP BLOCKED After 3 Failed Attempts";

        heading =
            "🚨 Security Alert — IP Address Blocked";

        message =
            "Three consecutive failed login attempts were detected.";

        actionMessage =
            "For security reasons, the current IP address has been blocked. If you are the legitimate account owner, contact the administrator to verify your identity and request access restoration.";

    }


    // --------------------------------------------------------
    // Email HTML
    // --------------------------------------------------------

    const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>HoneyShield Security Alert</title>

</head>


<body
style="
font-family: Arial, sans-serif;
background:#f4f7fb;
padding:30px;
"
>

<div
style="
max-width:600px;
margin:auto;
background:white;
border-radius:10px;
padding:30px;
border:1px solid #ddd;
"
>

<h2
style="
color:#0f172a;
"
>
🛡️ HoneyShield Security Alert
</h2>


<h3
style="
color:#dc2626;
"
>
${heading}
</h3>


<p>
${message}
</p>


<hr>


<p>
<strong>Username:</strong>
${escapeHtml(username)}
</p>


<p>
<strong>IP Address:</strong>
${escapeHtml(ip)}
</p>


<p>
<strong>Attempt:</strong>
${attempt} / 3
</p>


<p>
<strong>Attempts Remaining:</strong>
${remaining}
</p>


<p>
<strong>Status:</strong>
${escapeHtml(status)}
</p>


<p>
<strong>Time:</strong>
${new Date().toLocaleString("en-IN")}
</p>


<hr>


<p>
${actionMessage}
</p>


${
    attempt >= 3
        ? `
<p
style="
background:#fee2e2;
color:#991b1b;
padding:15px;
border-radius:6px;
font-weight:bold;
"
>
Your IP address has been blocked after 3 failed login attempts.
</p>
`
        : `
<p
style="
background:#fff7ed;
color:#9a3412;
padding:15px;
border-radius:6px;
"
>
You still have ${remaining} login attempt(s) remaining.
</p>
`
}


<p
style="
font-size:12px;
color:#64748b;
margin-top:25px;
"
>
This is an automated security notification generated by HoneyShield.
</p>


</div>

</body>

</html>

`;


    // --------------------------------------------------------
    // Send
    // --------------------------------------------------------

    try {

        await transporter.sendMail({

            from:
                `"HoneyShield Security" <${ALERT_EMAIL}>`,

            to:
                NOTIFY_EMAIL,

            subject,

            html

        });


        console.log(
            `✅ Security email sent to ${NOTIFY_EMAIL}`
        );


        return {

            sent:
                true

        };


    }

    catch (error) {

        console.error(
            "❌ Email delivery failed:",
            error.message
        );


        // IMPORTANT:
        // Email failure must NOT crash login system.

        return {

            sent:
                false,

            reason:
                error.message

        };

    }

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(
        value ?? ""
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

    sendLoginAttemptAlert

};
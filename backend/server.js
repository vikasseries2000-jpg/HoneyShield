// ============================================================
// HONEYSHIELD SECURITY ENGINE
// SERVER.JS
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");


// ============================================================
// IMPORT
// ============================================================

const {
    login
} = require("./controllers/authcontroller");


const {
    getLogs,
    clearLogs
} = require("./services/loggerservices");


const {
    getBlockedIPs,
    unblockIP,
    clearBlockedIPs
} = require("./detectionService");


// ============================================================
// APP
// ============================================================

const app = express();

const PORT =
    process.env.PORT || 10000;


// ============================================================
// FRONTEND
// ============================================================

const FRONTEND_DIR =
    path.join(
        __dirname,
        "..",
        "frontend"
    );


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(morgan("dev"));

app.use(cookieParser());

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);


// ============================================================
// ROOT = LOGIN
// ============================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            FRONTEND_DIR,
            "login.html"
        )
    );

});


// ============================================================
// LOGIN PAGE
// ============================================================

app.get(
    "/login.html",
    (req, res) => {

        res.sendFile(
            path.join(
                FRONTEND_DIR,
                "login.html"
            )
        );

    }
);


// ============================================================
// DASHBOARD
// ============================================================

app.get(
    "/dashboard",
    (req, res) => {

        res.sendFile(
            path.join(
                FRONTEND_DIR,
                "index.html"
            )
        );

    }
);


// ============================================================
// INDEX
// ============================================================

app.get(
    "/index.html",
    (req, res) => {

        res.sendFile(
            path.join(
                FRONTEND_DIR,
                "index.html"
            )
        );

    }
);


// ============================================================
// HONEYPOT
// ============================================================

app.get(
    "/honeypot.html",
    (req, res) => {

        res.sendFile(
            path.join(
                FRONTEND_DIR,
                "honeypot.html"
            )
        );

    }
);


// ============================================================
// AUTH API
// ============================================================

app.post(
    "/api/auth/login",
    login
);


// ============================================================
// LOGS API
// ============================================================

app.get(
    "/api/logs",
    (req, res) => {

        const logs =
            getLogs();

        res.json({

            success: true,

            count:
                logs.length,

            logs

        });

    }
);


// ============================================================
// CLEAR LOGS
// ============================================================

app.delete(
    "/api/logs",
    (req, res) => {

        clearLogs();

        res.json({

            success: true,

            message:
                "Security logs cleared."

        });

    }
);


// ============================================================
// GET BLOCKED IPS
// ============================================================

app.get(
    "/api/blocked-ips",
    (req, res) => {

        const ips =
            getBlockedIPs();

        res.json({

            success: true,

            count:
                ips.length,

            blockedIPs:
                ips

        });

    }
);


// ============================================================
// UNBLOCK ONE IP
// ============================================================

app.delete(
    "/api/blocked-ips/:ip",
    (req, res) => {

        const ip =
            decodeURIComponent(
                req.params.ip
            );

        const removed =
            unblockIP(ip);

        res.json({

            success: true,

            removed,

            count:
                getBlockedIPs().length,

            blockedIPs:
                getBlockedIPs()

        });

    }
);


// ============================================================
// UNBLOCK ALL
// ============================================================

app.delete(
    "/api/blocked-ips",
    (req, res) => {

        clearBlockedIPs();

        res.json({

            success: true,

            count: 0,

            blockedIPs: [],

            message:
                "All blocked IPs have been unblocked."

        });

    }
);


// ============================================================
// HEALTH
// ============================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            app:
                "HoneyShield",

            status:
                "ONLINE",

            engine:
                "Honeypot Shield Engine",

            timestamp:
                new Date().toISOString()

        });

    }
);


// ============================================================
// STATIC FILES
// ============================================================

app.use(
    express.static(
        FRONTEND_DIR,
        {
            index: false
        }
    )
);


// ============================================================
// API 404
// ============================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found."

        });

    }
);


// ============================================================
// FRONTEND FALLBACK
// ============================================================

app.use(
    (req, res) => {

        res.sendFile(
            path.join(
                FRONTEND_DIR,
                "login.html"
            )
        );

    }
);


// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "HoneyShield Error:",
            error
        );

        if (res.headersSent) {

            return next(error);

        }

        res.status(500).json({

            success: false,

            message:
                "Internal HoneyShield server error."

        });

    }
);


// ============================================================
// START
// ============================================================

const server =
    app.listen(
        PORT,
        () => {

            console.log("");
            console.log(
                "=========================================="
            );

            console.log(
                "🛡️ HONEYSHIELD SECURITY ENGINE"
            );

            console.log(
                "=========================================="
            );

            console.log(
                "🟢 Status: ONLINE"
            );

            console.log(
                `🚀 http://localhost:${PORT}`
            );

            console.log(
                `🔐 Login: http://localhost:${PORT}/`
            );

            console.log(
                `📊 Dashboard: http://localhost:${PORT}/dashboard`
            );

            console.log(
                `🍯 Honeypot: http://localhost:${PORT}/honeypot.html`
            );

            console.log(
                "=========================================="
            );

        }
    );


// ============================================================
// SHUTDOWN
// ============================================================

function shutdown(signal) {

    console.log(
        `${signal} received.`
    );

    server.close(
        () => {

            console.log(
                "HoneyShield stopped."
            );

            process.exit(0);

        }
    );

}

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);

process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);
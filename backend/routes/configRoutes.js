const express = require("express");
const router = express.Router();
const { loadConfig, saveConfig } = require("../services/configService");
const { requireAuthApi } = require("../utils/requireAuth");

// GET /api/config - current detection thresholds
router.get("/config", requireAuthApi, (req, res) => {
    res.json({ success: true, config: loadConfig() });
});

// POST /api/config - update detection thresholds
router.post("/config", requireAuthApi, (req, res) => {
    const { thresholdAttempts, timeWindowSeconds } = req.body || {};

    const parsedThreshold = Number(thresholdAttempts);
    const parsedWindow = Number(timeWindowSeconds);

    if (!Number.isInteger(parsedThreshold) || parsedThreshold < 1 || parsedThreshold > 20) {
        return res.status(400).json({ success: false, error: "thresholdAttempts must be an integer between 1 and 20" });
    }

    if (!Number.isInteger(parsedWindow) || parsedWindow < 5 || parsedWindow > 3600) {
        return res.status(400).json({ success: false, error: "timeWindowSeconds must be an integer between 5 and 3600" });
    }

    const config = { thresholdAttempts: parsedThreshold, timeWindowSeconds: parsedWindow };
    saveConfig(config);

    res.json({ success: true, message: "Configuration updated", config });
});

module.exports = router;

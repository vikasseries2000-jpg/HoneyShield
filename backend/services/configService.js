const fs = require("fs");
const path = require("path");

const configFile = path.join(__dirname, "..", "config", "settings.json");

const DEFAULT_CONFIG = {
    thresholdAttempts: 3,
    timeWindowSeconds: 60,
};

function loadConfig() {
    if (!fs.existsSync(configFile)) {
        saveConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
    }
    try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configFile)) };
    } catch (err) {
        console.error("Failed to parse settings.json, using defaults:", err.message);
        return DEFAULT_CONFIG;
    }
}

function saveConfig(config) {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

module.exports = { loadConfig, saveConfig, DEFAULT_CONFIG };

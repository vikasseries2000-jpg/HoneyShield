const fs = require('fs');
const path = require('path');

class ThreatIntelService {
  constructor() {
    // Canary tokens register (Fake credentials / keys tracking)
    this.canaryTokens = new Set(['AKIAIOSFODNN7EXAMPLE', 'admin_secret_2026', 'db_root_pass']);
    this.threatLogFile = path.join(__dirname, '../logs/threat_intelligence_feed.json');
  }

  // 1. Canary Token Deception Engine
  checkCanaryTrigger(payload) {
    const str = JSON.stringify(payload);
    for (let token of this.canaryTokens) {
      if (str.includes(token)) {
        return { triggered: true, token };
      }
    }
    return { triggered: false };
  }

  // 2. Behavioral Fingerprinting (Hash combination of Client Headers)
  generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLang = req.headers['accept-language'] || '';
    const encoding = req.headers['accept-encoding'] || '';
    
    // Simple fast hashing for device identification across IP shifts
    let hash = 0;
    const combined = `${userAgent}-${acceptLang}-${encoding}`;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash |= 0;
    }
    return `FP-${Math.abs(hash).toString(16).toUpperCase()}`;
  }

  // 3. Lightweight Heuristic ML / Anomaly Scoring Engine
  calculateAnomalyScore(payloadString) {
    let score = 0;
    if (payloadString.length > 100) score += 20; // Suspicious payload size
    
    // Check entropy / special char density (Obfuscation / Base64 / Hex detection)
    const specialChars = (payloadString.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const ratio = specialChars / (payloadString.length || 1);
    
    if (ratio > 0.3) score += 40; // High entropy / special char density
    if (payloadString.includes('%') || payloadString.includes('\\x')) score += 30; // Encoded payload

    return Math.min(score, 100); // 0 to 100 Risk Score
  }

  // 4. Active Countermeasure: Tarpitting Delay
  async applyTarpitDelay(severity) {
    if (severity === 'CRITICAL') {
      // Delay attacker connection by 3 seconds to waste resources/bandwidth
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // 5. SIEM & Global Threat Intelligence Export
  exportToSIEMFeed(attackLog) {
    try {
      const feedEntry = {
        indicator: attackLog.ip,
        deviceFingerprint: attackLog.fingerprint,
        severity: attackLog.severity,
        vector: attackLog.attackType,
        riskScore: attackLog.riskScore,
        canaryTriggered: attackLog.canaryTriggered,
        timestamp: attackLog.timestamp
      };
      
      let feeds = [];
      if (fs.existsSync(this.threatLogFile)) {
        feeds = JSON.parse(fs.readFileSync(this.threatLogFile, 'utf8') || '[]');
      }
      feeds.push(feedEntry);
      fs.writeFileSync(this.threatLogFile, JSON.stringify(feeds, null, 2));
    } catch (err) {
      console.error('SIEM Export Error:', err.message);
    }
  }
}

module.exports = new ThreatIntelService();
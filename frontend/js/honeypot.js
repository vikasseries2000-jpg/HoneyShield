const express = require('express');
const router = express.Router();
const DetectionService = require('../services/detectionService');

// 1. Honeypot Trap Analysis
router.post('/trap', async (req, res) => {
  const result = await DetectionService.analyzeRequest(req, '/honeypot/login');

  if (result.isBlocked) {
    return res.status(403).json({
      success: false,
      status: 'BLOCKED',
      message: 'Access Denied: IP Blacklisted by HoneyShield.'
    });
  }

  if (result.triggerClownRedirection) {
    return res.status(200).json({
      success: true,
      status: result.status,
      redirectUrl: '/clown.html',
      message: 'Intercepted. Redirecting to mirror environment.'
    });
  }

  res.status(200).json({ success: true, data: result });
});

// 2. Receive Keystrokes Telemetry from clown.html
router.post('/telemetry', (req, res) => {
  const { sessionId, eventType, telemetryData } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  DetectionService.recordTelemetry({
    ip,
    sessionId,
    eventType,
    telemetryData,
    timestamp: new Date().toISOString()
  });

  return res.status(200).json({ status: 'ok' });
});

// 3. Send Live Telemetry Logs to Dashboard
router.get('/telemetry-logs', (req, res) => {
  const logs = DetectionService.getTelemetryLogs();
  return res.status(200).json(logs);
});

// 4. Send Main Attack Logs to Dashboard
router.get('/logs', (req, res) => {
  const logs = require('../services/logService').getLogs();
  return res.status(200).json(logs);
});

module.exports = router;
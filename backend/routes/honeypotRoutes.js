const express = require('express');
const router = express.Router();
const detectionService = require('../services/detectionService');
const logService = require('../services/logService');

// Trap endpoint for honeypot login attempts
router.post('/trap', async (req, res) => {
  try {
    const result = await detectionService.analyzeRequest(req, '/api/honeypot/trap');
    
    // If blocked
    if (result.isBlocked) {
      return res.status(403).json({
        status: 'BLOCKED',
        message: 'Access Denied: Your IP has been permanently blacklisted.'
      });
    }

    // If critical or high attack -> redirect to clown mirror
    if (result.triggerClownRedirection) {
      return res.json({
        status: 'REDIRECT',
        redirectUrl: '/clown.html',
        analysis: result
      });
    }

    // Normal response for standard attempts
    return res.json({
      status: 'SUCCESS',
      message: 'Invalid credentials',
      analysis: result
    });

  } catch (error) {
    console.error('🚨 Trap Route Error:', error);
    return res.status(500).json({ error: 'Internal Security Engine Error' });
  }
});

// Logs fetch endpoint for dashboard
router.get('/logs', (req, res) => {
  try {
    const logs = logService.getLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Live telemetry endpoint
router.post('/telemetry', (req, res) => {
  try {
    const telemetryData = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    detectionService.recordTelemetry({ ...telemetryData, ip, timestamp: new Date().toISOString() });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log telemetry' });
  }
});

router.get('/telemetry-logs', (req, res) => {
  try {
    const logs = detectionService.getTelemetryLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

module.exports = router;
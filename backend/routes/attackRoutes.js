const express = require('express');
const router = express.Router();
const DetectionService = require('../services/detectionService');
const logService = require('../services/logService');

router.post('/trap', (req, res) => {
  const log = DetectionService.analyzeRequest(req, '/honeypot.html');
  res.status(200).json({ status: 'success', message: 'Fake response sent', log });
});

router.get('/logs', (req, res) => {
  const logs = logService.getLogs();
  res.status(200).json({ success: true, count: logs.length, data: logs });
});

module.exports = router;
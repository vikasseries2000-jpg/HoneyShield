// server/middleware/securityEngine.js
const fs = require('fs');
const path = require('path');

// Malicious Signature Patterns
const ATTACK_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,              // SQLi Basic
  /<script\b[^>]*>([\s\S]*?)<\/script>/gi,      // XSS
  /(\.\.\/|\.\.\\)/i,                             // Path Traversal
  /(union|select|insert|delete|drop|alter)/i     // Advanced SQLi
];

function analyzePayload(data) {
  if (!data) return false;
  const strData = typeof data === 'object' ? JSON.stringify(data) : String(data);
  return ATTACK_PATTERNS.some(pattern => pattern.test(strData));
}

function securityEngine(req, res, next) {
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  // 1. Trap Traversal to Hidden Honeypot Endpoints
  const isHoneypotHit = req.path.includes('/admin-login-fake') || 
                        req.path.includes('/.env') || 
                        req.path.includes('/wp-login.php');

  // 2. Payload Inspection
  const hasMaliciousPayload = analyzePayload(req.query) || analyzePayload(req.body);

  if (isHoneypotHit || hasMaliciousPayload) {
    const alertData = {
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent,
      path: req.path,
      method: req.method,
      payload: req.body || req.query,
      type: isHoneypotHit ? 'HONEYPOT_TRAP_TRIGGER' : 'MALICIOUS_PAYLOAD_DETECTED'
    };

    // Log Threat Event
    console.warn('🚨 SECURITY ALERT DETECTED:', JSON.stringify(alertData, null, 2));
    
    // Tarpit Strategy: Intentionally delay response to burn attacker resources
    setTimeout(() => {
      res.status(403).json({ error: 'Access Denied', incidentId: Date.now() });
    }, 3000);

    return;
  }

  next();
}

module.exports = securityEngine;
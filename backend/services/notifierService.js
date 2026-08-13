const nodemailer = require('nodemailer');

class NotifierService {
  constructor() {
    // Standard SMTP Transporter (E.g., Gmail / SendGrid / Ethereal for testing)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ALERT_EMAIL || 'your-admin-email@gmail.com',
        pass: process.env.ALERT_PASSWORD || 'your-app-password'
      }
    });
  }

  async sendAttackAlert(attackLog) {
    // Console log fallback for instant feedback during presentation
    console.log(`\n🚨 [EMAIL ALERT SENT TO ADMIN] Threat Level: ${attackLog.severity} | IP: ${attackLog.ip}`);

    const mailOptions = {
      from: '"HoneyShield SOC Alert" <no-reply@honeyshield.io>',
      to: 'admin@yourdomain.com',
      subject: `🚨 CRITICAL ALERT: ${attackLog.attackType} Detected from ${attackLog.ip}`,
      html: `
        <h2 style="color: #ff4757;">🛡️ HoneyShield Threat Intelligence Alert</h2>
        <p><strong>Incident ID:</strong> ${attackLog.id}</p>
        <p><strong>Severity:</strong> <span style="color: red;">${attackLog.severity}</span></p>
        <p><strong>Attacker IP:</strong> ${attackLog.ip}</p>
        <p><strong>Device Fingerprint:</strong> ${attackLog.fingerprint}</p>
        <p><strong>Attack Vector:</strong> ${attackLog.attackType}</p>
        <p><strong>Payload:</strong> <code>${JSON.stringify(attackLog.payload)}</code></p>
        <br/>
        <p><em>Attacker has been trapped into the Mirror Environment. Keystroke telemetry active.</em></p>
      `
    };

    try {
      // Background async call (fails silently if credentials aren't set)
      await this.transporter.sendMail(mailOptions);
    } catch (err) {
      console.log('Email delivery failed (Make sure SMTP ENV vars are configured):', err.message);
    }
  }
}

module.exports = new NotifierService();
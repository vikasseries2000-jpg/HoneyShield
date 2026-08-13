const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../log/logs.json');

class LogService {
  static getLogs() {
    try {
      if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, JSON.stringify([]));
      }
      const data = fs.readFileSync(logFilePath, 'utf8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('Error reading logs:', err);
      return [];
    }
  }

  static saveLog(logData) {
    const logs = this.getLogs();
    logs.unshift(logData);
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
  }
}

module.exports = LogService;
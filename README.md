# 🛡️ HoneyShield - Cybersecurity Honeypot & Threat Monitoring Engine

HoneyShield is a lightweight Node.js/Express security middleware designed to detect, tarpit (delay), and capture malicious attackers targeting sensitive system endpoints (like `/admin`, `/.env`, `/wp-login.php`).

## 🚀 Key Features
- **Honeypot Decoy Traps:** Captures brute-force scanners targeting standard sensitive routes.
- **Tarpit Delay Defense:** Delays attacker response by 3 seconds to exhaust their automated scanning resources.
- **Real-Time SOC Dashboard:** Live threat logging table powered by auto-refresh.
- **Attack Analytics Chart:** Visual breakdown of most targeted attack routes using Chart.js.
- **Log Export:** Download threat logs directly into `.csv` format for forensic investigation.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js, Helmet, Express-Rate-Limit
- **Frontend:** HTML5, CSS3, Vanilla JS, Chart.js

## ⚙️ How to Run
1. Install dependencies:
   ```bash
   npm install express helmet express-rate-limit
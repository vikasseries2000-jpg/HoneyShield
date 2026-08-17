const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// 1. Open Login Portal by default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// 2. Open Dashboard Portal
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Serve static assets (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'frontend')));

// 3. Fallback Route (Safe for Express/Node)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`🛡️ HoneyShield Engine running on port ${PORT}`);
});
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// 1. Dashboard Page Route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// 2. Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'frontend')));

// 3. Default Root & Fallback Route -> Login Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`🛡️ HoneyShield Engine running on port ${PORT}`);
});
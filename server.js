const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// Static files serve karein
app.use(express.static(path.join(__dirname, 'frontend')));

// Direct Open Login Page at '/'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// Explicit Route for Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Express v5 compatible fallback route
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`🛡️ HoneyShield Engine running on port ${PORT}`);
});
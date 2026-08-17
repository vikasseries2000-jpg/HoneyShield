const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// 1. Static files (CSS, JS) serve karein
app.use(express.static(path.join(__dirname, 'frontend')));

// 2. Direct Root URL -> Always Serve Login Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// 3. Explicit Dashboard Route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// 4. Any other route -> Fallback to Login Page
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`🛡️ HoneyShield Engine running on port ${PORT}`);
});
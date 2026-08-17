const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// Frontend static files serve karein
app.use(express.static(path.join(__dirname, 'frontend')));

// Express v5 compatible fallback route
app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🛡️ HoneyShield Engine running on port ${PORT}`);
});
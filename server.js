const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// 1. Root URL opens Login Portal first
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// 2. Explicit route for Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Static files support (js, css, images)
app.use(express.static(path.join(__dirname, 'frontend')));

// 3. Fallback Route for unmatched requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`🛡️ HoneyShield Engine running on port ${PORT}`);
});
// 🔊 Audio Context Initialization
let audioCtx = null;

function playBeepSound(times = 1) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        let delay = 0;
        for (let i = 0; i < times; i++) {
            setTimeout(() => {
                const oscillator = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz Beep
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);

                oscillator.connect(gain);
                gain.connect(audioCtx.destination);

                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.15); // Beep duration
            }, delay);

            delay += 300; // Gap between beeps
        }
    } catch (e) {
        console.log("Audio error:", e);
    }
}
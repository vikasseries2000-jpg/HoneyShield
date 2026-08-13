const express = require('express');
const router = express.Router();

// Route: /api/login OR /api/auth/login
const handleLogin = (req, res) => {
  const { username, password } = req.body;

  // Temporary hardcoded login check for demo
  if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: 'honeyshield-token-12345'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid username or password'
  });
};

router.post('/login', handleLogin);
router.post('/auth/login', handleLogin);

module.exports = router;
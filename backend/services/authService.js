const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret";
const TOKEN_EXPIRY = "2h";

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

module.exports = { generateToken, verifyToken };

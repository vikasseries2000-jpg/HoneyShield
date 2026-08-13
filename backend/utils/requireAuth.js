const { verifyToken } = require("../services/authService");

// Ye middleware check karta hai ki request ke saath valid session cookie hai ya nahi.
// Agar nahi hai, to dashboard/logs tak access nahi milega - seedha login page pe bhej denge.
function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies.session;

    if (!token) {
        return res.redirect("/");
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.redirect("/");
    }

    req.admin = decoded;
    next();
}

// API routes ke liye same cheez, but redirect ki jagah JSON error dena better hai
function requireAuthApi(req, res, next) {
    const token = req.cookies && req.cookies.session;

    if (!token) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ success: false, error: "Session expired, please login again" });
    }

    req.admin = decoded;
    next();
}

module.exports = { requireAuth, requireAuthApi };

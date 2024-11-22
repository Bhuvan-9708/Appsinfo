const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; 
    if (!token) {
        return res.status(403).json({ status_code: 403, message: 'Token is required' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error("Token verification error:", err);
            return res.status(401).json({ status_code: 401, message: 'Invalid token' });
        }
        req.userId = decoded.id;
        next();
    });
};

module.exports = verifyToken;
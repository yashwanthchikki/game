const jwt = require('jsonwebtoken');
const SECRET_KEY = 'super_secret_key_123'; // Use env var in production

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: 'Null token' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const authenticateSocket = (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
        socket.user = user;
        next();
    });
};

module.exports = { authenticateToken, authenticateSocket, SECRET_KEY };

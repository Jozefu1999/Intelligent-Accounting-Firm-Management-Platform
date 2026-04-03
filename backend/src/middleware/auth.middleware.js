const jwt = require('jsonwebtoken');
const { normalizeRole } = require('../utils/roles');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      ...decoded,
      role: normalizeRole(decoded.role),
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const authorize = (...roles) => {
  const normalizedAllowedRoles = roles.map((role) => normalizeRole(role));

  return (req, res, next) => {
    if (!normalizedAllowedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { authMiddleware, authorize };

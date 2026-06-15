const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'DEV_CHANGE_ME';

function requireAuth(role) {
  return async (req, res, next) => {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(payload.id).select('name email role district phone avatar');
      if (!user) return res.status(401).json({ message: 'User no longer exists' });

      if (role) {
        const allowed = Array.isArray(role) ? role : [role];
        if (!allowed.includes(user.role)) {
          return res.status(403).json({ message: `Access denied. Required role: ${allowed.join(' or ')}` });
        }
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        district: user.district,
        phone: user.phone,
        avatar: user.avatar,
      };
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}

module.exports = { requireAuth };

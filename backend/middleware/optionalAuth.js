const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

async function optionalAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.id).select('name email role district');
    if (user) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        district: user.district,
      };
    }
  } catch { /* ignore invalid tokens */ }
  next();
}

module.exports = { optionalAuth };

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'DEV_CHANGE_ME';

if (!process.env.JWT_SECRET) {
  console.warn('[Security Warning] JWT_SECRET environment variable is not defined. Using default development secret.');
}

function signToken(user, expiresIn = '7d') {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      district: user.district,
    },
    JWT_SECRET,
    { expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  JWT_SECRET,
  signToken,
  verifyToken,
};

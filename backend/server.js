// ── Environment setup ─────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
(() => {
  const rootEnv = path.join(__dirname, '..', '.env');
  const localEnv = path.join(__dirname, '.env');
  if (fs.existsSync(rootEnv)) require('dotenv').config({ path: rootEnv });
  else if (fs.existsSync(localEnv)) require('dotenv').config({ path: localEnv });
  else require('dotenv').config();
})();

const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const reportRoutes   = require('./routes/reports');
const districtRoutes = require('./routes/districts');
const adminRoutes    = require('./routes/admin');
const notifRoutes    = require('./routes/notifications');
const aiRoutes       = require('./routes/ai');
const { optionalAuth } = require('./middleware/optionalAuth');

// ── Seed utility ──────────────────────────────────────────────────────────────
const { seedDistricts } = require('./utils/seedDistricts');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
});

const { JWT_SECRET, verifyToken } = require('./config/jwt');

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Inject io into req for routes to use
app.use((req, _res, next) => { req.io = io; next(); });

// ── MongoDB Connection ─────────────────────────────────────────────────────────
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) { console.error('[Mongo] Missing MONGO_URI'); process.exit(1); }

function maskMongo(uri) {
  return uri.replace(/(mongodb(\+srv)?:\/\/[^:]+:)([^@]+)(@)/, (_, a, _b, _pwd, d) => a + '****' + d);
}
console.log('[Mongo] Connecting to', maskMongo(mongoURI));

mongoose.connect(mongoURI)
  .then(async () => {
    console.log('[Mongo] Connected');
    await seedDistricts();
  })
  .catch(err => console.error('[Mongo] Connection error:', err.message));

// ── Socket.IO Auth + Rooms ─────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    socket.user = payload;
    next();
  } catch {
    next();
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  if (user) {
    socket.join(`user_${user.id}`);
    if (user.role === 'district_admin' && user.district) {
      socket.join(`district_${user.district}`);
    }
    if (user.role === 'super_admin') {
      socket.join('super_admin');
    }
    console.log(`[Socket] ${user.email} (${user.role}) connected`);
  }

  socket.on('disconnect', () => {
    if (user) console.log(`[Socket] ${user.email} disconnected`);
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/reports',       optionalAuth, reportRoutes);
app.use('/api/districts',     districtRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/ai',            aiRoutes);

// ── Health & Debug ─────────────────────────────────────────────────────────────
app.get('/_health', (req, res) => {
  const states = ['disconnected','connected','connecting','disconnecting'];
  res.json({ state: states[mongoose.connection.readyState] || 'unknown', db: mongoose.connection.name });
});

// ── Start ──────────────────────────────────────────────────────────────────────
server.listen(port, () => {
  console.log(`[Server] RoadWatch v2 backend running on port ${port}`);
});

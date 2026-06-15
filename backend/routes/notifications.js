const express = require('express');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', requireAuth(), async (req, res) => {
  try {
    const { limit = 30, unreadOnly } = req.query;
    const query = { userId: req.user.id };
    if (unreadOnly === 'true') query.read = false;
    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .limit(parseInt(limit))
      .lean();
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ notifications, unreadCount });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/notifications/mark-all-read  (must be before /:id/read)
router.patch('/mark-all-read', requireAuth(), async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth(), async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { read: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

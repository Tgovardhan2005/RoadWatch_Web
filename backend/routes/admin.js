const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const District = require('../models/District');
const Report = require('../models/Report');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'DEV_CHANGE_ME';

// GET /api/admin/district-admins
router.get('/district-admins', requireAuth('super_admin'), async (req, res) => {
  try {
    const admins = await User.find({ role: 'district_admin' })
      .populate('district', 'name')
      .select('-passwordHash')
      .sort('name')
      .lean();
    res.json(admins);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/admin/district-admins
router.post('/district-admins', requireAuth('super_admin'), async (req, res) => {
  try {
    const { name, email, password, districtId, phone } = req.body;
    if (!name || !email || !password || !districtId) {
      return res.status(400).json({ message: 'Name, email, password and districtId required' });
    }
    const normalEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalEmail })) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const district = await District.findById(districtId);
    if (!district) return res.status(404).json({ message: 'District not found' });

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await User.create({ name, email: normalEmail, passwordHash, role: 'district_admin', district: districtId, phone: phone || '' });

    await District.findByIdAndUpdate(districtId, { adminId: admin._id });

    const token = jwt.sign({ id: admin._id, email: admin.email, role: admin.role, name: admin.name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ admin: { id: admin._id, name, email: normalEmail, role: 'district_admin', district }, token });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/admin/district-admins/:id
router.patch('/district-admins/:id', requireAuth('super_admin'), async (req, res) => {
  try {
    const { name, email, password, districtId, phone } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone;
    if (districtId) {
      updates.district = districtId;
      await District.updateMany({ adminId: req.params.id }, { adminId: null });
      await District.findByIdAndUpdate(districtId, { adminId: req.params.id });
    }
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);
    const admin = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash').populate('district', 'name');
    res.json(admin);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/admin/district-admins/:id
router.delete('/district-admins/:id', requireAuth('super_admin'), async (req, res) => {
  try {
    const admin = await User.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    await District.updateMany({ adminId: req.params.id }, { adminId: null });
    res.json({ message: 'District admin deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/admin/analytics
router.get('/analytics', requireAuth('super_admin'), async (req, res) => {
  try {
    const [
      totalReports, totalResolved, totalPending, totalCritical,
      byDistrict, bySeverity, byStatus, monthlyTrend,
      topDistricts, recentReports,
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: { $in: ['Resolved', 'Closed'] } }),
      Report.countDocuments({ status: { $nin: ['Resolved', 'Closed', 'Rejected'] } }),
      Report.countDocuments({ severity: 'Critical' }),
      Report.aggregate([{ $group: { _id: '$district', count: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } } } }, { $sort: { count: -1 } }]),
      Report.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Report.aggregate([{ $group: { _id: '$district', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Report.find().sort('-createdAt').limit(10).select('description status severity district createdAt userName').lean(),
    ]);

    const resolutionRate = totalReports > 0 ? Math.round((totalResolved / totalReports) * 100) : 0;

    res.json({
      totalReports, totalResolved, totalPending, totalCritical, resolutionRate,
      byDistrict, bySeverity, byStatus, monthlyTrend, topDistricts, recentReports,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/admin/all-reports
router.get('/all-reports', requireAuth('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, severity, district, search, sort = '-createdAt' } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (severity && severity !== 'All') query.severity = severity;
    if (district && district !== 'All') query.district = district;
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      Report.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Report.countDocuments(query),
    ]);
    res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

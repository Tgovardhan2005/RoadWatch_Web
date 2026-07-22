const express = require('express');
const District = require('../models/District');
const Report = require('../models/Report');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/districts
router.get('/', async (req, res) => {
  try {
    const districts = await District.find()
      .populate('adminId', 'name email')
      .select('-boundary')
      .sort('name')
      .lean();
    res.json(districts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/districts/with-boundary
router.get('/with-boundary', async (req, res) => {
  try {
    const districts = await District.find().select('name code boundary headquarters').lean();
    res.json(districts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/districts/geocode — Backend proxy for OpenStreetMap Nominatim reverse geocoding
router.get('/geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng parameters are required' });
    }
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RoadWatch-App/2.0 (contact@roadwatch.local)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!response.ok) {
      return res.status(500).json({ message: 'Geocoding service unavailable' });
    }
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/districts/:id
router.get('/:id', async (req, res) => {
  const { Types } = require('mongoose');
  if (!Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid district ID' });
  }
  try {
    const d = await District.findById(req.params.id).populate('adminId', 'name email').lean();
    if (!d) return res.status(404).json({ message: 'District not found' });
    res.json(d);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/districts/:id/stats
router.get('/:id/stats', requireAuth(['district_admin', 'super_admin']), async (req, res) => {
  try {
    const { Types } = require('mongoose');
    let districtObjId;
    try { districtObjId = new Types.ObjectId(req.params.id); } catch { return res.status(400).json({ message: 'Invalid district ID' }); }
    const [total, resolved, pending, critical, bySeverity, byStatus, recent] = await Promise.all([
      Report.countDocuments({ districtId: districtObjId }),
      Report.countDocuments({ districtId: districtObjId, status: { $in: ['Resolved', 'Closed'] } }),
      Report.countDocuments({ districtId: districtObjId, status: { $nin: ['Resolved', 'Closed', 'Rejected'] } }),
      Report.countDocuments({ districtId: districtObjId, severity: 'Critical' }),
      Report.aggregate([{ $match: { districtId: districtObjId } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Report.aggregate([{ $match: { districtId: districtObjId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.find({ districtId: districtObjId }).sort('-createdAt').limit(5).select('description status severity createdAt').lean(),
    ]);
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    res.json({ total, resolved, pending, critical, resolutionRate, bySeverity, byStatus, recent });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/districts
router.post('/', requireAuth('super_admin'), async (req, res) => {
  try {
    const { name, code, boundary, headquarters, area_sqkm } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const district = await District.create({ name, code, boundary, headquarters, area_sqkm });
    res.status(201).json(district);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/districts/:id
router.patch('/:id', requireAuth('super_admin'), async (req, res) => {
  try {
    const { adminId, name, boundary, headquarters } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (adminId !== undefined) updates.adminId = adminId || null;
    if (boundary !== undefined) updates.boundary = boundary;
    if (headquarters) updates.headquarters = headquarters;
    const d = await District.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(d);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

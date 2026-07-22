const express = require('express');
const { Types } = require('mongoose');
const Report = require('../models/Report');
const District = require('../models/District');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { findDistrictByCoords, haversineDistance } = require('../utils/geoUtils');

const router = express.Router();

function emitEvent(req, event, data) {
  if (req.io) req.io.emit(event, data);
}

async function createNotification(userId, message, type, reportId, io) {
  try {
    const notif = await Notification.create({ userId, message, type, reportId });
    if (io) io.to(`user_${userId}`).emit('notification', notif);
    return notif;
  } catch { /* non-critical */ }
}

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const auth = req.user;
    const { status, severity, district, limit = 200, page = 1, search, sort = '-createdAt', myReports } = req.query;

    let query = {};

    const isAdmin = auth && ['district_admin', 'super_admin'].includes(auth.role);
    const isFetchingOwnReports = auth && auth.role === 'citizen' && myReports === 'true';

    if (auth) {
      if (auth.role === 'district_admin') {
        query.districtId = auth.district;
      } else if (auth.role === 'citizen') {
        if (myReports === 'true') {
          query.userId = auth.id;
        }
      }
    }

    if (status && status !== 'All') {
      if (status === 'Rejected' && !isAdmin && !isFetchingOwnReports) {
        // Non-admin querying rejected reports of other users -> return empty
        return res.json({ reports: [], total: 0, page: 1, pages: 0 });
      }
      query.status = status;
    } else if (!isAdmin && !isFetchingOwnReports) {
      // Make sure rejected reports are NOT shown to other users / public feeds
      query.status = { $ne: 'Rejected' };
    }

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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/stats
router.get('/stats', requireAuth(), async (req, res) => {
  try {
    const auth = req.user;
    let match = {};
    if (auth.role === 'district_admin' && auth.district) {
      match.districtId = new Types.ObjectId(String(auth.district));
    } else if (auth.role === 'citizen') {
      match.userId = new Types.ObjectId(String(auth.id));
    } else if (auth.role !== 'super_admin') {
      match.status = { $ne: 'Rejected' };
    }

    const [statusCounts, severityCounts, monthlyTrend, totalResolved] = await Promise.all([
      Report.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate([{ $match: match }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Report.aggregate([
        { $match: { ...match, createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Report.countDocuments({ ...match, status: { $in: ['Resolved', 'Closed'] } }),
    ]);

    res.json({ statusCounts, severityCounts, monthlyTrend, totalResolved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/:id
router.get('/:id', async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ message: 'Report not found' });

    if (report.status === 'Rejected') {
      const auth = req.user;
      const isOwner = auth && report.userId.toString() === auth.id;
      const isAdmin = auth && ['district_admin', 'super_admin'].includes(auth.role);
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'Access denied: Rejected reports are not visible to other users.' });
      }
    }

    res.json(report);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/reports
router.post('/', requireAuth(), async (req, res) => {
  try {
    const {
      description, imageUrl, location, severity,
      address, damageType, aiConfidence, aiVerified, repairImageUrl,
    } = req.body;

    if (!description || !location?.latitude || !location?.longitude) {
      return res.status(400).json({ message: 'Description and valid location required' });
    }

    // Resolve district
    const districts = await District.find({ boundary: { $ne: null } }).lean();
    const matchedDistrict = findDistrictByCoords(location.latitude, location.longitude, districts);

    // Look for existing UNRESOLVED report within 100m (rough bounding box ~0.001 deg = 111m)
    const nearbyUnresolved = await Report.find({
      status: { $nin: ['Resolved', 'Closed', 'Rejected'] },
      'location.latitude':  { $gte: location.latitude  - 0.001, $lte: location.latitude  + 0.001 },
      'location.longitude': { $gte: location.longitude - 0.001, $lte: location.longitude + 0.001 },
    }).lean();

    // Find closest one within exactly 100m, excluding same user and already-confirmed
    let closestReport = null;
    let closestDist = Infinity;
    for (const r of nearbyUnresolved) {
      if (r.userId.toString() === req.user.id) continue;
      const alreadyConfirmed = (r.confirmations || []).some(
        c => c.userId?.toString() === req.user.id
      );
      if (alreadyConfirmed) continue;

      const dist = haversineDistance(
        location.latitude, location.longitude,
        r.location.latitude, r.location.longitude
      );
      if (dist < 100 && dist < closestDist) {
        closestDist = dist;
        closestReport = r;
      }
    }

    // MERGE into existing report
    if (closestReport) {
      const parentReport = await Report.findById(closestReport._id);
      if (!parentReport) return res.status(404).json({ message: 'Parent report not found' });

      parentReport.confirmations.push({
        userId:      req.user.id,
        userName:    req.user.name || req.user.email || 'Anonymous',
        description: description || '',
        imageUrl:    imageUrl || '',
        severity:    severity || 'Medium',
        damageType:  damageType || 'Unknown',
        location,
        aiConfidence: aiConfidence || 0,
        submittedAt:  new Date(),
      });
      parentReport.confirmationCount = parentReport.confirmations.length;

      // Escalate severity if new report is higher
      const SEV = { Low: 1, Medium: 2, High: 3, Critical: 4 };
      if ((SEV[severity] || 0) > (SEV[parentReport.severity] || 0)) {
        parentReport.statusHistory.push({
          oldStatus: parentReport.status,
          newStatus: parentReport.status,
          updatedByName: 'System',
          note: `Severity escalated to ${severity} after ${parentReport.confirmationCount} confirmation(s)`,
        });
        parentReport.severity = severity;
      }

      await parentReport.save();

      // Notify district admin
      if (matchedDistrict?.adminId) {
        await createNotification(
          matchedDistrict.adminId,
          `Report "${parentReport.description.slice(0, 50)}..." confirmed by ${parentReport.confirmationCount} additional user(s) (${Math.round(closestDist)}m away).`,
          'new_report', parentReport._id, req.io
        );
      }
      // Notify original reporter
      await createNotification(
        parentReport.userId,
        `Your road damage report has been confirmed by ${parentReport.confirmationCount} other user(s) nearby.`,
        'status_changed', parentReport._id, req.io
      );

      if (req.io) {
        req.io.to(`district_${parentReport.districtId}`).emit('report_confirmed', {
          reportId: parentReport._id, confirmationCount: parentReport.confirmationCount,
        });
        req.io.to('super_admin').emit('report_confirmed', {
          reportId: parentReport._id, confirmationCount: parentReport.confirmationCount,
        });
      }

      return res.status(200).json({
        merged: true,
        parentReportId: parentReport._id,
        confirmationCount: parentReport.confirmationCount,
        distanceMeters: Math.round(closestDist),
        message: `Your report has been merged with an existing report ${Math.round(closestDist)}m away. Thank you for confirming this issue!`,
      });
    }

    // CREATE new report
    const report = await Report.create({
      userId:    req.user.id,
      userName:  req.user.name || req.user.email || 'Anonymous',
      location,
      address:   address || '',
      district:  matchedDistrict?.name || 'Unknown',
      districtId: matchedDistrict?._id || null,
      description,
      severity:   severity || 'Medium',
      damageType: damageType || 'Unknown',
      aiConfidence: aiConfidence || 0,
      aiVerified:   aiVerified || false,
      imageUrl:     imageUrl || '',
      repairImageUrl: repairImageUrl || '',
      status: 'Reported',
      statusHistory: [{ oldStatus: null, newStatus: 'Reported', updatedByName: req.user.name, note: 'Report created' }],
    });

    if (matchedDistrict?.adminId) {
      await createNotification(
        matchedDistrict.adminId,
        `New ${severity || 'Medium'} severity road damage reported in ${matchedDistrict.name}: "${description.slice(0, 60)}${description.length > 60 ? '...' : ''}"`,
        severity === 'Critical' ? 'critical_report' : 'new_report',
        report._id, req.io
      );
    }

    if (severity === 'Critical') {
      const superAdmins = await User.find({ role: 'super_admin' }).select('_id').lean();
      for (const sa of superAdmins) {
        await createNotification(
          sa._id,
          `CRITICAL report in ${matchedDistrict?.name || 'Unknown'}: "${description.slice(0, 60)}..."`,
          'critical_report', report._id, req.io
        );
      }
    }

    if (req.io) {
      if (matchedDistrict) req.io.to(`district_${matchedDistrict._id}`).emit('new_report', report);
      req.io.to('super_admin').emit('new_report', report);
    }

    res.status(201).json({ report, merged: false, duplicateWarning: null });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/reports/:id/status
router.patch('/:id/status', requireAuth(['district_admin', 'super_admin']), async (req, res) => {
  try {
    const { status, note, repairImageUrl } = req.body;
    const validStatuses = ['Reported', 'Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    if (req.user.role === 'district_admin') {
      if (report.districtId?.toString() !== req.user.district?.toString()) {
        return res.status(403).json({ message: 'You can only update reports in your district' });
      }
    }

    const oldStatus = report.status;
    report.status = status;
    if (repairImageUrl) report.repairImageUrl = repairImageUrl;
    if (status === 'Resolved' || status === 'Closed') report.resolvedAt = new Date();

    report.statusHistory.push({
      oldStatus,
      newStatus: status,
      updatedBy: req.user.id,
      updatedByName: req.user.name,
      note: note || '',
    });

    await report.save();

    // Notify original reporter
    await createNotification(
      report.userId,
      `Your road damage report "${report.description.slice(0, 50)}..." status updated: ${oldStatus} -> ${status}`,
      'status_changed', report._id, req.io
    );

    // Notify all users who confirmed the report
    for (const c of report.confirmations || []) {
      if (c.userId && c.userId.toString() !== report.userId.toString()) {
        await createNotification(
          c.userId,
          `A road damage report you confirmed has been updated: ${oldStatus} -> ${status}`,
          'status_changed', report._id, req.io
        );
      }
    }

    if (req.io) {
      req.io.to(`district_${report.districtId}`).emit('status_updated', { reportId: report._id, status });
      req.io.to('super_admin').emit('status_updated', { reportId: report._id, status });
    }

    res.json(report);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', requireAuth(), async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    const isOwner = report.userId.toString() === req.user.id;
    const isAdmin = ['district_admin', 'super_admin'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });
    await report.deleteOne();
    res.json({ message: 'Report deleted', id: req.params.id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

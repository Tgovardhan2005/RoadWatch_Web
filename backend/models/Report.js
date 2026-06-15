const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  oldStatus: String,
  newStatus: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: String,
  note: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: 'Anonymous' },
  userPhone: { type: String, default: '' },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  address: { type: String, default: '' },
  district: { type: String, default: '' },
  districtId: { type: mongoose.Schema.Types.ObjectId, ref: 'District', default: null },
  description: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  damageType: { type: String, default: 'Unknown' },
  aiConfidence: { type: Number, default: 0 },
  aiVerified: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  repairImageUrl: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Reported', 'Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed', 'Rejected'],
    default: 'Reported',
  },
  statusHistory: [statusHistorySchema],
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  timestamp: { type: Date, default: Date.now },
});

reportSchema.index({ description: 'text', userName: 'text', address: 'text', district: 'text' });
reportSchema.index({ districtId: 1, status: 1 });
reportSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('Report', reportSchema);

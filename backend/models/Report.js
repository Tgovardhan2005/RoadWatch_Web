const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  oldStatus: String,
  newStatus: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: String,
  note: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

// Each additional user who reports the same location gets merged here
const confirmationSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName:     { type: String, default: 'Anonymous' },
  description:  { type: String, default: '' },
  imageUrl:     { type: String, default: '' },
  severity:     { type: String, default: 'Medium' },
  damageType:   { type: String, default: 'Unknown' },
  location: {
    latitude:   Number,
    longitude:  Number,
  },
  aiConfidence: { type: Number, default: 0 },
  submittedAt:  { type: Date, default: Date.now },
}, { _id: true });

const reportSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:  { type: String, default: 'Anonymous' },
  userPhone: { type: String, default: '' },
  location: {
    latitude:  { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  address:    { type: String, default: '' },
  district:   { type: String, default: '' },
  districtId: { type: mongoose.Schema.Types.ObjectId, ref: 'District', default: null },
  description: { type: String, required: true },
  severity:    { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  damageType:  { type: String, default: 'Unknown' },
  aiConfidence: { type: Number, default: 0 },
  aiVerified:   { type: Boolean, default: false },
  imageUrl:     { type: String, default: '' },
  repairImageUrl: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Reported', 'Under Review', 'Assigned', 'Repair In Progress', 'Resolved', 'Closed', 'Rejected'],
    default: 'Reported',
  },
  statusHistory: [statusHistorySchema],

  // ── Merge / Confirmation ───────────────────────────────────────────────────
  // When another user reports within 100m of this unresolved report,
  // their submission is stored here instead of creating a duplicate.
  confirmations:     { type: [confirmationSchema], default: [] },
  confirmationCount: { type: Number, default: 0 },  // denormalized for fast sort/filter

  createdAt:  { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  timestamp:  { type: Date, default: Date.now },
});

reportSchema.index({ description: 'text', userName: 'text', address: 'text', district: 'text' });
reportSchema.index({ districtId: 1, status: 1 });
reportSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
reportSchema.index({ confirmationCount: -1 });  // sort by most-confirmed reports

module.exports = mongoose.model('Report', reportSchema);

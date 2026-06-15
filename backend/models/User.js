const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, lowercase: true, trim: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'district_admin', 'super_admin'], default: 'citizen' },
  district: { type: mongoose.Schema.Types.ObjectId, ref: 'District', default: null },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

module.exports = mongoose.model('User', userSchema);

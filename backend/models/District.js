const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, unique: true, trim: true },
  boundary: { type: Object, default: null },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  headquarters: { type: String, default: '' },
  area_sqkm: { type: Number, default: 0 },
});

module.exports = mongoose.model('District', districtSchema);

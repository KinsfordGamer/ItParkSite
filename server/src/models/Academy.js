const mongoose = require('mongoose');

const academySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    address: { type: String },
    phone: { type: String },
    subscriptionStatus: { type: String, enum: ['active', 'trial', 'expired'], default: 'trial' },
    trialEndsAt: { type: Date },
    settings: {
      currency: { type: String, default: 'UZS' },
      teacherShare: { type: Number, default: 40 }, // Default 40%
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Academy', academySchema);

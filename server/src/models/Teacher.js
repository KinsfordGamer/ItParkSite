const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    subject: { type: String, trim: true },
    salary: { type: Number, default: 0 },
    salaryPaid: { type: Number, default: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
    isActive: { type: Boolean, default: true },
    joinDate: { type: Date, default: Date.now },
    avatar: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', teacherSchema);

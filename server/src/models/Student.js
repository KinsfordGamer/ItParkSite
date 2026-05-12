const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
    status: { type: String, enum: ['active', 'inactive', 'graduated', 'pending'], default: 'active' },
    balance: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    monthlyPrice: { type: Number },
    joinDate: { type: Date, default: Date.now },
    avatar: { type: String },
    address: { type: String },
    birthDate: { type: Date },
    parentPhone: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);

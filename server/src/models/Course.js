const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true },
    duration: { type: String, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
    schedule: { type: String },
    startDate: { type: Date },
    maxStudents: { type: Number, default: 20 },
    isActive: { type: Boolean, default: true },
    color: { type: String, default: '#6366f1' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' },
    note: { type: String },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Compound index for unique attendance per student per date per course
attendanceSchema.index({ student: 1, course: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

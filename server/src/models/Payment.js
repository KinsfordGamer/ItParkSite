const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['cash', 'card', 'transfer'], default: 'cash' },
    note: { type: String },
    date: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    month: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);

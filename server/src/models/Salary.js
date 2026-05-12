const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['cash', 'card', 'transfer'], default: 'cash' },
    note: { type: String },
    date: { type: Date, default: Date.now },
    month: { type: String, required: true }, // Format: YYYY-MM
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Salary', salarySchema);

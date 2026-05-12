const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    category: { 
      type: String, 
      required: true, 
      enum: ['rent', 'utilities', 'marketing', 'office', 'other'],
      default: 'other'
    },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true },
    academy: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);

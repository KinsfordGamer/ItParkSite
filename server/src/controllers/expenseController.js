const Expense = require('../models/Expense');
const asyncHandler = require('express-async-handler');

// @desc    Get all expenses
// @route   GET /api/expenses
const getExpenses = asyncHandler(async (req, res) => {
  const { category, startDate, endDate } = req.query;
  const query = {};
  
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  if (category) query.category = category;
  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const expenses = await Expense.find(query)
    .populate('addedBy', 'name')
    .sort('-date');

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  res.json({ success: true, data: expenses, totalAmount });
});

// @desc    Add expense
// @route   POST /api/expenses
const addExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    ...req.body,
    academy: req.user.academy,
    addedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: expense });
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
const updateExpense = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const expense = await Expense.findOneAndUpdate(
    query,
    req.body,
    { new: true, runValidators: true }
  );

  if (!expense) return res.status(404).json({ success: false, message: 'Xarajat topilmadi' });
  res.json({ success: true, data: expense });
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
const deleteExpense = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const expense = await Expense.findOneAndDelete(query);
  if (!expense) return res.status(404).json({ success: false, message: 'Xarajat topilmadi' });
  res.json({ success: true, message: 'Xarajat o\'chirildi' });
});

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense };

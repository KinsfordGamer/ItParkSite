const Salary = require('../models/Salary');
const Teacher = require('../models/Teacher');
const asyncHandler = require('express-async-handler');

// @desc    Get all salary payments
// @route   GET /api/salaries
const getSalaries = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const salaries = await Salary.find(query)
    .populate('teacher', 'name subject phone')
    .sort('-date');
  
  const totalPaid = salaries.reduce((sum, s) => sum + s.amount, 0);

  res.json({ success: true, data: salaries, totalPaid });
});

// @desc    Add a salary payment
// @route   POST /api/salaries
const addSalary = asyncHandler(async (req, res) => {
  const { teacher, amount, type, note, month } = req.body;

  const teacherDoc = await Teacher.findById(teacher);
  if (!teacherDoc) return res.status(404).json({ success: false, message: 'O\'qituvchi topilmadi' });

  const salary = await Salary.create({
    teacher,
    amount,
    type,
    note,
    month,
    academy: teacherDoc.academy, // Use teacher's academy
    paidBy: req.user._id,
  });

  // Update teacher's salaryPaid field (cumulative)
  await Teacher.findByIdAndUpdate(teacher, {
    $inc: { salaryPaid: amount }
  });

  res.status(201).json({ success: true, data: salary });
});

// @desc    Update a salary payment
// @route   PUT /api/salaries/:id
const updateSalary = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const salary = await Salary.findOne(query);
  if (!salary) return res.status(404).json({ success: false, message: 'Topilmadi' });

  const oldAmount = salary.amount;
  const newAmount = Number(req.body.amount) || oldAmount;
  const diff = newAmount - oldAmount;

  // Update salary record
  await Salary.findByIdAndUpdate(req.params.id, req.body);

  // Adjust teacher's salaryPaid
  if (diff !== 0) {
    await Teacher.findByIdAndUpdate(salary.teacher, {
      $inc: { salaryPaid: diff }
    });
  }

  res.json({ success: true, message: "Yangilandi" });
});

// @desc    Delete a salary payment
// @route   DELETE /api/salaries/:id
const deleteSalary = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const salary = await Salary.findOne(query);
  if (!salary) {
    return res.status(404).json({ success: false, message: 'Topilmadi' });
  }

  // Reverse teacher's salaryPaid
  await Teacher.findByIdAndUpdate(salary.teacher, {
    $inc: { salaryPaid: -salary.amount }
  });

  await salary.deleteOne();
  res.json({ success: true, message: "O'chirildi" });
});

module.exports = {
  getSalaries,
  addSalary,
  updateSalary,
  deleteSalary,
};

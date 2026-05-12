const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

// @desc    Get all payments
// @route   GET /api/payments
const getPayments = asyncHandler(async (req, res) => {
  const { student, course, month, page = 1, limit = 50 } = req.query;
  const query = {};
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  if (student) query.student = student;
  if (course) query.course = course;
  if (month) query.month = month;

  const payments = await Payment.find(query)
    .populate('student', 'name phone')
    .populate('course', 'title price')
    .populate('receivedBy', 'name')
    .sort('-date')
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Payment.countDocuments(query);
  const totalAmount = await Payment.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  res.json({
    success: true,
    data: payments,
    total,
    totalAmount: totalAmount[0]?.total || 0,
  });
});

// @desc    Create payment
// @route   POST /api/payments
const createPayment = asyncHandler(async (req, res) => {
  const { student: studentId, amount, ...rest } = req.body;

  const query = { _id: studentId };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const student = await Student.findOne(query);
  if (!student) return res.status(404).json({ success: false, message: 'Talaba topilmadi' });

  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const payment = await Payment.create({
    student: studentId,
    amount,
    month,
    receivedBy: req.user._id,
    course: student.course,
    academy: student.academy, // Use student's academy
    ...rest,
  });

  // Update student balance and totalPaid
  await Student.findOneAndUpdate({ _id: studentId }, {
    $inc: { totalPaid: amount, balance: amount },
  });

  // Calculate teacher's 40% share
  let teacherToCredit = student.teacher;
  if (!teacherToCredit && student.course) {
    const course = await Course.findById(student.course);
    teacherToCredit = course?.teacher;
  }

  if (teacherToCredit) {
    const teacherShare = amount * 0.4;
    await Teacher.findByIdAndUpdate(teacherToCredit, {
      $inc: { salary: teacherShare }
    });
  }

  await payment.populate([
    { path: 'student', select: 'name phone' },
    { path: 'course', select: 'title price' },
  ]);

  res.status(201).json({ success: true, data: payment });
});

// @desc    Delete payment
// @route   DELETE /api/payments/:id
const deletePayment = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const payment = await Payment.findOne(query);
  if (!payment) return res.status(404).json({ success: false, message: 'To\'lov topilmadi' });

  // Reverse the student balance
  await Student.findOneAndUpdate({ _id: payment.student }, {
    $inc: { totalPaid: -payment.amount, balance: -payment.amount },
  });

  // Reverse teacher's share
  const student = await Student.findById(payment.student);
  let teacherToDebit = student?.teacher;
  if (!teacherToDebit && payment.course) {
    const course = await Course.findById(payment.course);
    teacherToDebit = course?.teacher;
  }

  if (teacherToDebit) {
    const teacherShare = payment.amount * 0.4;
    await Teacher.findByIdAndUpdate(teacherToDebit, {
      $inc: { salary: -teacherShare }
    });
  }

  await payment.deleteOne();
  res.json({ success: true, message: 'To\'lov bekor qilindi' });
});

// @desc    Get monthly payment stats
// @route   GET /api/payments/stats
const getPaymentStats = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role !== 'superadmin') {
    query.academy = new mongoose.Types.ObjectId(req.user.academy);
  }

  const stats = await Payment.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$month',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 12 },
  ]);
  res.json({ success: true, data: stats });
});

module.exports = { getPayments, createPayment, deletePayment, getPaymentStats };

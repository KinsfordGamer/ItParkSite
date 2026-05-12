const Student = require('../models/Student');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const { calculateProRataFee } = require('../utils/paymentHelpers');

// @desc    Get all students
// @route   GET /api/students
const getStudents = asyncHandler(async (req, res) => {
  const { status, course, search, month, page = 1, limit = 50 } = req.query;
  const query = {};
  
  if (req.user.role !== 'superadmin') {
    query.academy = new mongoose.Types.ObjectId(req.user.academy);
  }

  if (status) query.status = status;
  if (course) query.course = new mongoose.Types.ObjectId(course);
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const students = await Student.aggregate([
    { $match: query },
    // 1. Get Course details
    {
      $lookup: {
        from: 'courses',
        let: { cId: '$course' },
        pipeline: [
          { $match: { 
              $expr: { 
                $and: [
                  { $ne: ['$$cId', null] },
                  { $eq: ['$_id', { $toObjectId: '$$cId' }] }
                ]
              } 
            } 
          }
        ],
        as: 'courseData'
      }
    },
    { $unwind: { path: '$courseData', preserveNullAndEmptyArrays: true } },
    
    // 2. Determine which teacher ID to use (Student's specific teacher or Course's teacher)
    {
      $addFields: {
        targetTeacherId: { 
          $ifNull: [
            { $cond: [{ $eq: ['$teacher', ''] }, null, '$teacher'] }, 
            '$courseData.teacher'
          ] 
        }
      }
    },
    
    // 3. Get Teacher details (ensuring ObjectId cast for the lookup)
    {
      $lookup: {
        from: 'teachers',
        let: { tId: '$targetTeacherId' },
        pipeline: [
          { $match: { 
              $expr: { 
                $and: [
                  { $ne: ['$$tId', null] },
                  { $eq: ['$_id', { $toObjectId: '$$tId' }] }
                ]
              } 
            } 
          }
        ],
        as: 'teacherData'
      }
    },
    { $unwind: { path: '$teacherData', preserveNullAndEmptyArrays: true } },
    
    // 4. Get Monthly Payments
    {
      $lookup: {
        from: 'payments',
        let: { studentId: '$_id' },
        pipeline: [
          { $match: { 
              $expr: { 
                $and: [
                  { $eq: ['$student', '$$studentId'] },
                  { $eq: ['$month', targetMonth] }
                ] 
              } 
            } 
          }
        ],
        as: 'monthlyPayments'
      }
    },
    
    // 5. Final Mapping
    {
      $addFields: {
        course: '$courseData',
        teacher: '$teacherData',
        paidThisMonth: { $sum: '$monthlyPayments.amount' }
      }
    },
    {
      $addFields: {
        debtThisMonth: { 
          $max: [0, { $subtract: [{ $ifNull: ['$course.price', 0] }, '$paidThisMonth'] }] 
        }
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: (Number(page) - 1) * Number(limit) },
    { $limit: Number(limit) }
  ]);

  // Apply pro-rata calculation to each student
  const processedStudents = students.map(student => {
    const coursePrice = student.course?.price || 0;
    const expectedPrice = calculateProRataFee(student.joinDate, coursePrice, targetMonth);
    const debtThisMonth = Math.max(0, expectedPrice - (student.paidThisMonth || 0));
    
    return {
      ...student,
      expectedPrice,
      debtThisMonth
    };
  });

  const total = await Student.countDocuments(query);
  res.json({ success: true, data: processedStudents, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// @desc    Get single student
// @route   GET /api/students/:id
const getStudent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const student = await Student.findOne(query)
    .populate('course')
    .populate('teacher', 'name subject');
  if (!student) return res.status(404).json({ success: false, message: 'Talaba topilmadi' });
  res.json({ success: true, data: student });
});

// @desc    Create student
// @route   POST /api/students
const createStudent = asyncHandler(async (req, res) => {
  const student = await Student.create({ ...req.body, academy: req.user.academy });
  await student.populate([
    { path: 'course', select: 'title price' },
    { path: 'teacher', select: 'name subject' }
  ]);
  res.status(201).json({ success: true, data: student });
});

// @desc    Update student
// @route   PUT /api/students/:id
const updateStudent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const student = await Student.findOneAndUpdate(
    query,
    req.body,
    { new: true, runValidators: true }
  ).populate([
    { path: 'course', select: 'title price' },
    { path: 'teacher', select: 'name subject' }
  ]);

  if (!student) return res.status(404).json({ success: false, message: 'Talaba topilmadi' });
  res.json({ success: true, data: student });
});

// @desc    Delete student
// @route   DELETE /api/students/:id
const deleteStudent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const student = await Student.findOneAndDelete(query);
  if (!student) return res.status(404).json({ success: false, message: 'Talaba topilmadi' });
  res.json({ success: true, message: "Talaba o'chirildi" });
});

// @desc    Get student payments
// @route   GET /api/students/:id/payments
const getStudentPayments = asyncHandler(async (req, res) => {
  const query = { student: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const payments = await Payment.find(query)
    .populate('course', 'title')
    .sort('-date');
  res.json({ success: true, data: payments });
});

// @desc    Charge student for the month
// @route   POST /api/students/:id/charge
const chargeStudent = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const student = await Student.findOne(query).populate('course');
  if (!student) return res.status(404).json({ success: false, message: 'Talaba topilmadi' });

  const targetMonth = new Date().toISOString().slice(0, 7);
  const coursePrice = student.course?.price || 0;
  const amount = calculateProRataFee(student.joinDate, coursePrice, targetMonth);
  
  if (amount <= 0) return res.status(400).json({ success: false, message: 'Ushbu oy uchun to\'lov hisoblanmadi' });

  student.balance -= amount;
  await student.save();

  res.json({ success: true, message: 'To\'lov hisoblandi', balance: student.balance });
});

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent, getStudentPayments, chargeStudent };

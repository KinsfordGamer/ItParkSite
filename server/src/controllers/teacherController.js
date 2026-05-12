const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Get all teachers
// @route   GET /api/teachers
const getTeachers = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const teachers = await Teacher.find(query).sort('-createdAt');
  const teachersWithCourses = await Promise.all(
    teachers.map(async (teacher) => {
      const courses = await Course.find({ teacher: teacher._id }).select('title isActive');
      return { ...teacher.toObject(), courses };
    })
  );
  res.json({ success: true, data: teachersWithCourses });
});

// @desc    Get single teacher
// @route   GET /api/teachers/:id
const getTeacher = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const teacher = await Teacher.findOne(query);
  if (!teacher) return res.status(404).json({ success: false, message: 'O\'qituvchi topilmadi' });

  const courses = await Course.find({ teacher: teacher._id });
  res.json({ success: true, data: { ...teacher.toObject(), courses } });
});

// @desc    Create teacher
// @route   POST /api/teachers
const createTeacher = asyncHandler(async (req, res) => {
  const { name, password, phone, subject, email } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Telefon raqam va parol kiritilishi shart' });
  }

  // Check if user already exists
  const userExists = await User.findOne({ phone });
  if (userExists) {
    return res.status(400).json({ success: false, message: 'Ushbu telefon raqam bilan foydalanuvchi allaqachon mavjud' });
  }

  // Create User
  const user = await User.create({
    name,
    phone,
    password,
    role: 'teacher',
    academy: req.user.academy
  });

  // Create Teacher linked to User
  const teacher = await Teacher.create({
    name,
    phone,
    subject,
    user: user._id,
    academy: req.user.academy
  });

  res.status(201).json({ success: true, data: teacher });
});

// @desc    Update teacher
// @route   PUT /api/teachers/:id
const updateTeacher = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const teacher = await Teacher.findOneAndUpdate(
    query,
    req.body,
    { new: true, runValidators: true }
  );

  if (!teacher) return res.status(404).json({ success: false, message: 'O\'qituvchi topilmadi' });
  res.json({ success: true, data: teacher });
});

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
const deleteTeacher = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const teacher = await Teacher.findOne(query);
  if (!teacher) return res.status(404).json({ success: false, message: 'O\'qituvchi topilmadi' });

  const courseCount = await Course.countDocuments({ teacher: req.params.id });
  if (courseCount > 0) {
    return res.status(400).json({ success: false, message: 'Bu o\'qituvchining kurslari mavjud. Avval kurslarni boshqa ustozga biriktiring yoki o\'chiring.' });
  }

  // Delete associated user if exists
  if (teacher.user) {
    await User.findByIdAndDelete(teacher.user);
  }

  await teacher.deleteOne();
  res.json({ success: true, message: 'O\'qituvchi va uning akkaunti o\'chirildi' });
});

module.exports = { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher };

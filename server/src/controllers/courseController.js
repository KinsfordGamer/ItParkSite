const Course = require('../models/Course');
const Student = require('../models/Student');
const asyncHandler = require('express-async-handler');

// @desc    Get all courses
// @route   GET /api/courses
const getCourses = asyncHandler(async (req, res) => {
  const { isActive, teacher } = req.query;
  const query = {};
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (teacher) query.teacher = teacher;

  const courses = await Course.find(query).populate('teacher', 'name phone').sort('-createdAt');

  // Add student count to each course
  const coursesWithCount = await Promise.all(
    courses.map(async (course) => {
      const count = await Student.countDocuments({ course: course._id, status: 'active' });
      return { ...course.toObject(), studentCount: count };
    })
  );

  res.json({ success: true, data: coursesWithCount });
});

// @desc    Get single course
// @route   GET /api/courses/:id
const getCourse = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const course = await Course.findOne(query).populate('teacher', 'name phone email');
  if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });

  const students = await Student.find({ course: course._id }).select('name phone status');
  res.json({ success: true, data: { ...course.toObject(), students } });
});

// @desc    Create course
// @route   POST /api/courses
const createCourse = asyncHandler(async (req, res) => {
  const course = await Course.create({ ...req.body, academy: req.user.academy });
  await course.populate('teacher', 'name phone');
  res.status(201).json({ success: true, data: course });
});

// @desc    Update course
// @route   PUT /api/courses/:id
const updateCourse = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const course = await Course.findOneAndUpdate(
    query,
    req.body,
    { new: true, runValidators: true }
  ).populate('teacher', 'name phone');

  if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
  res.json({ success: true, data: course });
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
const deleteCourse = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const course = await Course.findOne(query);
  if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });

  const studentCount = await Student.countDocuments({ course: req.params.id });
  if (studentCount > 0) {
    return res.status(400).json({ success: false, message: 'Bu kursda talabalar mavjud, o\'chirib bo\'lmaydi' });
  }

  await course.deleteOne();
  res.json({ success: true, message: 'Kurs o\'chirildi' });
});

module.exports = { getCourses, getCourse, createCourse, updateCourse, deleteCourse };

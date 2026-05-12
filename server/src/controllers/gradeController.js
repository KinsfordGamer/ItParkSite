const Grade = require('../models/Grade');
const Student = require('../models/Student');
const asyncHandler = require('express-async-handler');

// @desc    Get grades by student or course
// @route   GET /api/grades
const getGrades = asyncHandler(async (req, res) => {
  const { student, course } = req.query;
  const query = {};
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  if (student) query.student = student;
  if (course) query.course = course;

  const grades = await Grade.find(query)
    .populate('student', 'name')
    .populate('course', 'title')
    .populate('teacher', 'name')
    .sort('-date');

  res.json({ success: true, data: grades });
});

// @desc    Add grade
// @route   POST /api/grades
const addGrade = asyncHandler(async (req, res) => {
  const { student, course, grade, comment } = req.body;

  const studentDoc = await Student.findById(student);
  if (!studentDoc) return res.status(404).json({ success: false, message: 'Talaba topilmadi' });

  const gradeEntry = await Grade.create({
    student,
    course,
    grade,
    comment,
    teacher: req.user._id,
    academy: studentDoc.academy,
  });

  res.status(201).json({ success: true, data: gradeEntry });
});

// @desc    Delete grade
// @route   DELETE /api/grades/:id
const deleteGrade = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const grade = await Grade.findOne(query);
  if (!grade) return res.status(404).json({ success: false, message: 'Baholash topilmadi' });

  // Only the teacher who added it or admin can delete
  const isAuthorized = grade.teacher.toString() === req.user._id.toString() || 
                      ['admin', 'superadmin', 'manager'].includes(req.user.role);
  
  if (!isAuthorized) {
    return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
  }

  await grade.deleteOne();
  res.json({ success: true, message: 'Baholash o\'chirildi' });
});

module.exports = { getGrades, addGrade, deleteGrade };

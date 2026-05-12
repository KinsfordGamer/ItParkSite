const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

// @desc    Get attendance by course and date
// @route   GET /api/attendance
const getAttendance = asyncHandler(async (req, res) => {
  const { course, date, student, startDate, endDate } = req.query;
  const query = { academy: req.user.academy };

  if (course) query.course = course;
  if (student) query.student = student;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  } else if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const records = await Attendance.find(query)
    .populate('student', 'name phone')
    .populate('course', 'title')
    .populate('markedBy', 'name')
    .sort('-date');

  res.json({ success: true, data: records });
});

// @desc    Mark attendance (bulk)
// @route   POST /api/attendance/bulk
const markBulkAttendance = asyncHandler(async (req, res) => {
  const { records } = req.body; // [{ student, course, date, status, note }]

  const ops = records.map((r) => ({
    updateOne: {
      filter: {
        student: r.student,
        course: r.course,
        academy: req.user.academy,
        date: new Date(new Date(r.date).setHours(0, 0, 0, 0)),
      },
      update: {
        $set: {
          status: r.status || 'present',
          note: r.note || '',
          markedBy: req.user._id,
          academy: req.user.academy,
        },
      },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(ops);
  res.json({ success: true, message: 'Davomat saqlandi' });
});

// @desc    Get attendance stats for a student
// @route   GET /api/attendance/stats/:studentId
const getStudentAttendanceStats = asyncHandler(async (req, res) => {
  const stats = await Attendance.aggregate([
    { 
      $match: { 
        student: new mongoose.Types.ObjectId(req.params.studentId),
        academy: new mongoose.Types.ObjectId(req.user.academy)
      } 
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const result = { present: 0, absent: 0, late: 0, excused: 0 };
  stats.forEach((s) => { result[s._id] = s.count; });
  const total = Object.values(result).reduce((a, b) => a + b, 0);
  result.total = total;
  result.percentage = total > 0 ? Math.round((result.present / total) * 100) : 0;

  res.json({ success: true, data: result });
});

// @desc    Get today's absentees (for administrator/office manager)
// @route   GET /api/attendance/absentees
const getAbsentees = asyncHandler(async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const query = {
    date: { $gte: start, $lte: end },
    status: 'absent'
  };

  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const absentees = await Attendance.find(query)
    .populate('student', 'name phone')
    .populate('course', 'title schedule')
    .sort('-createdAt');

  res.json({ success: true, data: absentees });
});

// @desc    Update attendance note
// @route   PATCH /api/attendance/note/:id
const updateAttendanceNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  const query = { _id: req.params.id };

  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const attendance = await Attendance.findOneAndUpdate(
    query,
    { note: note || '' },
    { new: true }
  );

  if (!attendance) {
    return res.status(404).json({ success: false, message: 'Davomat topilmadi' });
  }

  res.json({ success: true, data: attendance });
});

// @desc    Delete attendance record
// @route   DELETE /api/attendance/delete/:id
const deleteAttendance = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (req.user.role !== 'superadmin') {
    query.academy = req.user.academy;
  }

  const attendance = await Attendance.findOneAndDelete(query);

  if (!attendance) {
    return res.status(404).json({ success: false, message: 'Davomat topilmadi' });
  }

  res.json({ success: true, message: 'Davomat o\'chirildi' });
});

module.exports = { 
  getAttendance, 
  markBulkAttendance, 
  getStudentAttendanceStats, 
  getAbsentees,
  updateAttendanceNote,
  deleteAttendance
};


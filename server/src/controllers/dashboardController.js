const Student = require('../models/Student');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const Grade = require('../models/Grade');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
const getDashboardStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let teacherFilter = {};
    let studentFilter = {};
    let courseFilter = {};
    let paymentFilter = {};
    let gradeFilter = {};
    let expenseFilter = {};

    if (req.user.role !== 'superadmin') {
      const academyId = new mongoose.Types.ObjectId(req.user.academy);
      teacherFilter.academy = academyId;
      studentFilter.academy = academyId;
      courseFilter.academy = academyId;
      paymentFilter.academy = academyId;
      gradeFilter.academy = academyId;
      expenseFilter.academy = academyId;

      // If user is a teacher, filter everything by their ID
      if (req.user.role === 'teacher') {
        const teacher = await Teacher.findOne({ user: req.user._id, academy: academyId });
        if (teacher) {
          teacherFilter = { _id: teacher._id, academy: academyId };
          studentFilter = { teacher: teacher._id, academy: academyId };
          courseFilter = { teacher: teacher._id, academy: academyId };
          gradeFilter = { teacher: req.user._id, academy: academyId }; // Grade uses User ID
          paymentFilter = { academy: academyId, $or: [
            { student: { $in: await Student.find({ teacher: teacher._id }).distinct('_id') } },
            { course: { $in: await Course.find({ teacher: teacher._id }).distinct('_id') } }
          ]};
          expenseFilter = { _id: null }; // Teachers don't see general expenses
        }
      }
    }

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let end = endDate ? new Date(endDate) : new Date();
    if (endDate) end.setHours(23, 59, 59, 999);

    const [
      totalStudents,
      activeStudents,
      totalCourses,
      activeCourses,
      totalTeachers,
      allAcademyCourses,
    ] = await Promise.all([
      Student.countDocuments(studentFilter),
      Student.countDocuments({ ...studentFilter, status: 'active' }),
      Course.countDocuments(courseFilter),
      Course.countDocuments({ ...courseFilter, isActive: true }),
      Teacher.countDocuments(teacherFilter),
      Course.find(courseFilter).select('title'),
    ]);

    // Period Income (Total Payments)
    const periodPayments = await Payment.aggregate([
      { $match: { ...paymentFilter, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Period Salaries
    const periodSalaries = await Salary.aggregate([
      { $match: { ...teacherFilter, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Period Other Expenses
    const periodExpenses = await Expense.aggregate([
      { $match: { ...expenseFilter, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Last 6 months income chart ending at endDate
    const sixMonthsAgo = new Date(end);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const incomeChart = await Payment.aggregate([
      { $match: { ...paymentFilter, date: { $gte: sixMonthsAgo, $lte: end } } },
      { $group: { _id: '$month', income: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]);

    // Student status distribution
    const studentStats = await Student.aggregate([
      { $match: studentFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Attendance Rate (filtered by date range)
    const attendanceStats = await Attendance.aggregate([
      { $match: { ...studentFilter, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const totalAttendance = attendanceStats.reduce((sum, s) => sum + s.count, 0);
    const presentCount = attendanceStats.find(s => s._id === 'present')?.count || 0;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // Recent payments
    const recentPayments = await Payment.find(paymentFilter)
      .populate({
        path: 'student',
        select: 'name',
        populate: { path: 'teacher', select: 'name' }
      })
      .populate({
        path: 'course',
        select: 'title',
        populate: { path: 'teacher', select: 'name' }
      })
      .sort('-date')
      .limit(8);

    // Debtors using the new monthly logic based on start date's month
    const targetMonth = start.toISOString().slice(0, 7);
    const studentDebts = await Student.aggregate([
      { $match: { ...studentFilter, status: 'active' } },
      
      // 1. Course Lookup
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
      
      // 2. Teacher Fallback Logic
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

      // 3. Payments Lookup
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
      
      // 4. Calculations
      {
        $addFields: {
          paidThisMonth: { $sum: '$monthlyPayments.amount' }
        }
      },
      {
        $addFields: {
          debtThisMonth: { 
            $max: [0, { $subtract: [{ $ifNull: ['$courseData.price', 0] }, '$paidThisMonth'] }] 
          }
        }
      },
      { $match: { debtThisMonth: { $gt: 0 } } },
      { $sort: { debtThisMonth: -1 } }
    ]);

    const totalDebt = studentDebts.reduce((sum, s) => sum + s.debtThisMonth, 0);
    const debtors = studentDebts.slice(0, 8).map(s => ({
      _id: s._id,
      name: s.name,
      phone: s.phone,
      course: s.courseData,
      teacher: s.teacherData,
      balance: -s.debtThisMonth
    }));

    // Smart Insights
    const absentStats = await Attendance.aggregate([
      { $match: { ...studentFilter, date: { $gte: start, $lte: end }, status: 'absent' } },
      { $group: { _id: '$student', count: { $sum: 1 } } },
      { $match: { count: { $gt: 2 } } },
      { $limit: 5 }
    ]);
    const atRiskStudents = await Student.find({ ...studentFilter, _id: { $in: absentStats.map(s => s._id) } }).select('name phone');

    const teachersOwed = await Teacher.find({ 
      ...teacherFilter, 
      isActive: true,
      $expr: { $gt: ["$salary", "$salaryPaid"] }
    }).limit(5);

    const pendingSalaries = teachersOwed.map(t => ({
      _id: t._id,
      name: t.name,
      amount: t.salary - t.salaryPaid
    }));

    // Performance Stats (Average grades per course)
    const performanceStats = await Grade.aggregate([
      { $match: { ...gradeFilter, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$course',
          averageGrade: { $avg: '$grade' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $project: {
          courseTitle: '$course.title',
          averageGrade: { $round: ['$averageGrade', 1] },
          count: 1
        }
      }
    ]);

    // Student specific monthly performance - Improved
    const studentPerformance = await Student.aggregate([
      { $match: studentFilter },
      {
        $lookup: {
          from: 'grades',
          let: { studentId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$student', '$$studentId'] },
                    { $gte: ['$date', start] },
                    { $lte: ['$date', end] }
                  ] 
                } 
              } 
            }
          ],
          as: 'studentGrades'
        }
      },
      {
        $addFields: {
          averageGrade: { $avg: '$studentGrades.grade' },
          count: { $size: '$studentGrades' }
        }
      },
      { $match: { count: { $gt: 0 } } },
      {
        $project: {
          name: 1,
          phone: 1,
          course: { $toString: '$course' },
          averageGrade: { $round: ['$averageGrade', 1] },
          count: 1
        }
      },
      { $sort: { averageGrade: -1 } }
    ]);

    // Recent grades
    const recentGrades = await Grade.find(gradeFilter)
      .populate('student', 'name')
      .populate('course', 'title')
      .populate('teacher', 'name')
      .sort('-date')
      .limit(8);

    const totalIncome = periodPayments[0]?.total || 0;
    const totalSalaries = periodSalaries[0]?.total || 0;
    const totalOtherExpenses = periodExpenses[0]?.total || 0;
    const totalExpenditure = totalSalaries + totalOtherExpenses;

    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        totalCourses,
        activeCourses,
        totalTeachers,
        periodIncome: totalIncome,
        periodExpenditure: totalExpenditure,
        totalDebt: totalDebt || 0,
        attendanceRate,
        incomeChart,
        studentStats,
        recentPayments,
        debtors,
        performanceStats,
        studentPerformance,
        recentGrades,
        allCourses: allAcademyCourses,
        insights: {
          atRiskStudents,
          pendingSalaries,
        }
      },
    });
});

module.exports = { getDashboardStats };

const express = require('express');
const router = express.Router();
const { getAttendance, markBulkAttendance, getStudentAttendanceStats, getAbsentees, updateAttendanceNote, deleteAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', getAttendance);
router.post('/bulk', markBulkAttendance);
router.get('/absentees', authorize('admin', 'administrator', 'manager', 'superadmin'), getAbsentees);
router.get('/stats/:studentId', getStudentAttendanceStats);
router.patch('/note/:id', authorize('admin', 'administrator', 'manager', 'superadmin'), updateAttendanceNote);
router.delete('/delete/:id', authorize('admin', 'administrator', 'manager', 'superadmin'), deleteAttendance);

module.exports = router;

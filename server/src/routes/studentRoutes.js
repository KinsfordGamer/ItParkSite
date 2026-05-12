const express = require('express');
const router = express.Router();
const { getStudents, getStudent, createStudent, updateStudent, deleteStudent, getStudentPayments, chargeStudent } = require('../controllers/studentController');
const { protect, adminOnly, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getStudents).post(authorize('admin', 'teacher', 'administrator'), createStudent);
router.route('/:id').get(getStudent).put(authorize('admin', 'manager', 'superadmin', 'teacher', 'administrator'), updateStudent).delete(authorize('admin', 'manager', 'superadmin'), deleteStudent);
router.get('/:id/payments', getStudentPayments);
router.post('/:id/charge', authorize('admin', 'administrator'), chargeStudent);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher } = require('../controllers/teacherController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getTeachers).post(adminOnly, createTeacher);
router.route('/:id').get(getTeacher).put(adminOnly, updateTeacher).delete(adminOnly, deleteTeacher);

module.exports = router;

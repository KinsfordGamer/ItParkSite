const express = require('express');
const router = express.Router();
const { getGrades, addGrade, deleteGrade } = require('../controllers/gradeController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'teacher', 'administrator'), getGrades)
  .post(authorize('admin', 'teacher'), addGrade);

router.route('/:id')
  .delete(authorize('admin', 'teacher'), deleteGrade);

module.exports = router;

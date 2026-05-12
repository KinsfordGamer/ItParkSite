const express = require('express');
const router = express.Router();
const { getSalaries, addSalary, updateSalary, deleteSalary } = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'manager', 'superadmin'));

router.route('/')
  .get(getSalaries)
  .post(addSalary);

router.route('/:id')
  .put(updateSalary)
  .delete(deleteSalary);

module.exports = router;

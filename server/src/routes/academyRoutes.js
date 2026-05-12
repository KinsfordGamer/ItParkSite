const express = require('express');
const router = express.Router();
const { getAcademies, createAcademy, updateAcademy } = require('../controllers/academyController');
const { protect, superadminOnly } = require('../middleware/auth');

router.use(protect);
router.use(superadminOnly);

router.route('/')
  .get(getAcademies)
  .post(createAcademy);

router.route('/:id')
  .put(updateAcademy);

module.exports = router;

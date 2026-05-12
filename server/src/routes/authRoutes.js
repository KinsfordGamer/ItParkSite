const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMe, changePassword, getUsers, seedAdmin } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/seed-admin', seedAdmin);
router.post('/login', login);
router.post('/register', protect, adminOnly, register);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);
router.get('/users', protect, adminOnly, getUsers);

module.exports = router;

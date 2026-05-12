const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// @desc    Register user (admin only action)
// @route   POST /api/auth/register
// @access  Private/Admin
const register = asyncHandler(async (req, res) => {
  const { name, phone, password, role, email } = req.body;

  const userExists = await User.findOne({ phone });
  if (userExists) {
    return res.status(400).json({ success: false, message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan' });
  }

  const user = await User.create({ 
    name, 
    phone, 
    password, 
    role: role || 'teacher', 
    email,
    academy: req.user.role === 'superadmin' ? req.body.academy : req.user.academy
  });
  res.status(201).json({
    success: true,
    data: { ...user.toJSON(), token: generateToken(user._id) },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Telefon raqam va parol talab qilinadi' });
  }

  const user = await User.findOne({ phone }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Telefon raqam yoki parol noto\'g\'ri' });
  }

  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Hisobingiz bloklangan' });
  }

  res.json({
    success: true,
    data: { ...user.toJSON(), token: generateToken(user._id) },
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;

  // Check if new phone is already taken by another user
  if (phone) {
    const existingUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu telefon raqam allaqachon boshqa foydalanuvchi tomonidan ishlatilmoqda' });
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, ...(email && { email }) },
    { new: true, runValidators: true }
  );
  
  // Return fresh token so user can login with new email
  res.json({ success: true, data: { ...user.toJSON(), token: generateToken(user._id) } });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(400).json({ success: false, message: 'Joriy parol noto\'g\'ri' });
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi' });
});

// @desc    Get all users (admin)
// @route   GET /api/auth/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const query = req.user.role === 'superadmin' ? {} : { academy: req.user.academy };
  const users = await User.find(query).sort('-createdAt');
  res.json({ success: true, data: users });
});

// @desc    Seed admin (first time setup)
// @route   POST /api/auth/seed-admin
// @access  Public (only works if no admin exists)
const seedAdmin = asyncHandler(async (req, res) => {
  const adminExists = await User.findOne({ role: 'superadmin' });
  if (adminExists) {
    return res.status(400).json({ success: false, message: 'Super Admin allaqachon mavjud' });
  }

  const admin = await User.create({
    name: 'Main Super Admin',
    phone: '998901234567', // Default super admin phone
    password: 'superpassword',
    role: 'superadmin',
  });

  res.status(201).json({
    success: true,
    message: 'Super Admin yaratildi',
    data: { phone: '998901234567', password: 'superpassword', token: generateToken(admin._id) },
  });
});

module.exports = { register, login, getMe, updateMe, changePassword, getUsers, seedAdmin };

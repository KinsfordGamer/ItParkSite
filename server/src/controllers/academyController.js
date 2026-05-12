const Academy = require('../models/Academy');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Get all academies (Super Admin only)
// @route   GET /api/academies
const getAcademies = asyncHandler(async (req, res) => {
  const academies = await Academy.find().populate('owner', 'name email');
  res.json({ success: true, data: academies });
});

// @desc    Create academy
// @route   POST /api/academies
const createAcademy = asyncHandler(async (req, res) => {
  const { name, slug, ownerPhone, ownerName, ownerPassword } = req.body;

  // 1. Create owner user if not exists
  let owner = await User.findOne({ phone: ownerPhone });
  if (!owner) {
    owner = await User.create({
      name: ownerName,
      phone: ownerPhone,
      password: ownerPassword,
      role: 'manager',
    });
  }

  // 2. Create academy
  const academy = await Academy.create({
    name,
    slug,
    owner: owner._id,
  });

  // 3. Link owner to academy
  owner.academy = academy._id;
  await owner.save();

  res.status(201).json({ success: true, data: academy });
});

// @desc    Update academy
// @route   PUT /api/academies/:id
const updateAcademy = asyncHandler(async (req, res) => {
  const academy = await Academy.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, data: academy });
});

module.exports = { getAcademies, createAcademy, updateAcademy };

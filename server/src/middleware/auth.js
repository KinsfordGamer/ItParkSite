const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Avtorizatsiya talab qilinadi' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token yaroqsiz' });
  }
};

const superadminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Faqat Super Admin uchun' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Faqat admin uchun' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Superadmin has access to everything
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Faqat ${roles.join(', ')} rollari uchun ruxsat berilgan`,
      });
    }
    next();
  };
};

const teacherOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
  }
};

module.exports = { protect, adminOnly, teacherOrAdmin, authorize, superadminOnly };

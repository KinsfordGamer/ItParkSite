require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const academyRoutes = require('./routes/academyRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

// Connect to MongoDB
connectDB();

const path = require('path');
const app = express();

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for easier deployment if needed, or configure properly
}));

app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Allow all or specific client URL from env
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }); // Increased max requests for prod
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/academies', academyRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/expenses', expenseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🚀 IT Park Surxondaryo CRM API is running!', timestamp: new Date() });
});

// Serve Static Assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client', 'dist', 'index.html'));
  });
} else {
  // 404 for API in development
  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route topilmadi' });
  });
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

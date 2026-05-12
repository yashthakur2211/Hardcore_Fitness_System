import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import membershipRoutes from './routes/memberships.js';
import paymentRoutes from './routes/payments.js';
import attendanceRoutes from './routes/attendance.js';
import trainerRoutes from './routes/trainers.js';
import trainerAttendanceRoutes from './routes/trainerAttendance.js';
import enquiryRoutes from './routes/enquiries.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';
import pool from './config/database.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set. Set it in your .env file before starting the server.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware - CORS configuration
const extraOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);

    const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    const isNetlify = origin.endsWith('.netlify.app');
    const isAllowed = extraOrigins.includes(origin);

    if (isLocalhost || isNetlify || isAllowed) {
      callback(null, true);
    } else {
      console.error('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Increase body limits because we accept base64 images during development
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static files for uploaded member photos
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/trainer-attendance', trainerAttendanceRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gym Master API is running' });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as test');
    res.json({ status: 'connected', data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed', message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

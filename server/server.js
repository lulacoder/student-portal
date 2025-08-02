const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Robustly load environment variables regardless of CWD
dotenv.config({ path: path.join(__dirname, '.env') });

// Safe diagnostics (masked)
const nodeEnv = process.env.NODE_ENV || 'undefined';
const atlasUriPresent = Boolean(process.env.ATLAS_URI);
console.log(`Environment: ${nodeEnv}`);
console.log(`ATLAS_URI present: ${atlasUriPresent ? 'yes' : 'no'}`);

const { connectDB } = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'ROUTE_NOT_FOUND'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  res.status(error.status || 500).json({
    success: false,
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
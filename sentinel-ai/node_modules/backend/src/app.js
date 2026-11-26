const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure database is connected before handling API requests
const connectDB = require('./config/db');
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    // If DB fails to connect, log and let the controller handle it gracefully
    console.error('Request DB connection check failed:', err.message);
  }
  next();
});

// Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;

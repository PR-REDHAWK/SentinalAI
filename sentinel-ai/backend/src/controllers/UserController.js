const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_scaffold_key', {
    expiresIn: '30d'
  });
};

const connectDB = require('../config/db');

const ensureDBConnected = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined in Vercel project settings. Please add it and redeploy.');
  }
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
};

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  try {
    await ensureDBConnected();
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: `Database connection error: ${err.message}. If using MongoDB Atlas, make sure you allowed IP 0.0.0.0/0 in Atlas Network Access.`,
      errors: []
    });
  }


  const { name, email, password, role } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email',
      errors: []
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'Engineer'
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Engineer registered successfully',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    }
  });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  try {
    await ensureDBConnected();
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: `Database connection error: ${err.message}. If using MongoDB Atlas, make sure you allowed IP 0.0.0.0/0 in Atlas Network Access.`,
      errors: []
    });
  }

  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an email and password',
      errors: []
    });
  }

  // Check for user (include password in selection)
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
      errors: []
    });
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
      errors: []
    });
  }

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'User logged in successfully',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    }
  });
});

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully',
    data: user
  });
});

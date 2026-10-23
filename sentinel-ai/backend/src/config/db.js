const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');

let cachedPromise = null;
let lastError = null;

const connectDB = async () => {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const msg = "MONGODB_URI is not defined in environment variables.";
    console.warn(`⚠️ Warning: ${msg}`);
    lastError = msg;
    return null;
  }

  // If a connection is already in flight, reuse that promise
  if (cachedPromise) {
    try {
      return await cachedPromise;
    } catch (err) {
      cachedPromise = null;
    }
  }

  try {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      bufferCommands: false, // In serverless, fail fast rather than hanging for 30s
    };
    cachedPromise = mongoose.connect(uri, opts);
    const conn = await cachedPromise;
    lastError = null;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    cachedPromise = null; // Clear so subsequent requests can retry
    lastError = error.message;
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

const getDBStatus = () => {
  const readyStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    state: readyStates[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    isConnected: mongoose.connection.readyState === 1,
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    host: mongoose.connection.host || null,
    lastError
  };
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.getDBStatus = getDBStatus;


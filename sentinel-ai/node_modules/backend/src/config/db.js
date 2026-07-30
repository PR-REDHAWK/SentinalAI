const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.warn("Server is running without a database connection. Please update MONGODB_URI in backend/.env");
    // process.exit(1); removed to prevent crash during MVP phase
  }
};

module.exports = connectDB;

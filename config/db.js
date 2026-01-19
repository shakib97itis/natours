/* eslint-disable no-console */
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing in environment variables');

  try {
    mongoose.connection.on('connected', () => console.log('MongoDB connected'));
    mongoose.connection.on('error', (err) =>
      console.error('MongoDB error:', err),
    );
    mongoose.connection.on('disconnected', () =>
      console.log('MongoDB disconnected'),
    );

    await mongoose.connect(uri);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    throw err;
  }
}

module.exports = connectDB;

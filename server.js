/* eslint-disable no-console */
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

dotenv.config({ path: './config.env' });
const app = require('./app');

const PORT = process.env.PORT || 3000;

console.log(`Server is running on "${process.env.NODE_ENV}" mode.`);

let server;

(async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  } catch (e) {
    process.exit(1);
  }
})();

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`${signal} received. Shutting down...`);

  // Stop accepting new requests
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log('HTTP server closed.');
  }

  // Close DB
  await mongoose.connection.close();
  console.log('MongoDB connection closed.');

  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

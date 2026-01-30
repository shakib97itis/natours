const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

/**
 * Express application configuration and route registration.
 */
const app = express();
app.set('query parser', 'extended');

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Middleware
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

// Routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// Handle unhandled routes
app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find on this server! ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
/**
 * Placeholder user handlers until the user resource is implemented.
 */

exports.updateMyProfile = catchAsync(async (req, res, next) => {
  // 0) validate provided fields
  const { currentPassword, password, confirmPassword, name, email } = req.body;

  // 1) Create error if user POSTs password data
  if (currentPassword || password || confirmPassword) {
    return next(new AppError('You can not update your password here.', 400));
  }

  // 2) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name,
      email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMyProfile = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.user._id);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find();

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: "This route hasn't implemented yet.",
  });
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: "This route hasn't implemented yet.",
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: "This route hasn't implemented yet.",
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: "This route hasn't implemented yet.",
  });
};

const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

/**
 * User routes (currently stubbed in user controller).
 */
const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch(
  '/updatePassword',
  authController.protect,
  authController.updatePassword,
);

router.patch(
  '/updateMyProfile',
  authController.protect,
  userController.updateMyProfile,
);

router.delete(
  '/deleteMyProfile',
  authController.protect,
  userController.deleteMe,
);

router
  .route('/')
  .get(authController.protect, userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

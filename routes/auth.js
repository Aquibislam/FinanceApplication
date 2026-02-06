const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} = require('../middleware/validation');

// Public routes
router.post(
  '/register',
  validateRegister,
  handleValidationErrors,
  authController.register
);

router.post(
  '/login',
  validateLogin,
  handleValidationErrors,
  authController.login
);

router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/me', protect, authController.getCurrentUser);

module.exports = router;
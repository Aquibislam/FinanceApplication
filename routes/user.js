const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');
const {
  validateUpdateProfile,
  handleValidationErrors,
} = require('../middleware/validation');

// Save or update financial profile
router.post(
  '/financial-profile',
  protect,
  userController.saveFinancialProfile
);

// Get current user profile (including financial data)
router.get('/profile', protect, userController.getProfile);

// Get user profile by email (including financial data)
router.get('/profile/:email', protect, userController.getProfileByEmail);

// Update user profile (name and financial data)
router.put(
  '/profile/:email',
  protect,
  validateUpdateProfile,
  handleValidationErrors,
  userController.updateProfile
);

module.exports = router;


const { body, validationResult } = require('express-validator');

// Registration validation
exports.validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phoneNumber')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
];

// Login validation
exports.validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .exists()
    .withMessage('Password is required'),
];

// Update profile validation
exports.validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty'),
  body('netPay')
    .optional()
    .isNumeric()
    .withMessage('Net pay must be a number')
    .custom((value) => value >= 0)
    .withMessage('Net pay cannot be negative'),
  body('mutualFundSips')
    .optional()
    .isNumeric()
    .withMessage('Mutual fund SIPs must be a number')
    .custom((value) => value >= 0)
    .withMessage('Mutual fund SIPs cannot be negative'),
  body('personalExpenses')
    .optional()
    .isNumeric()
    .withMessage('Personal expenses must be a number')
    .custom((value) => value >= 0)
    .withMessage('Personal expenses cannot be negative'),
  body('miscellaneousExpenses')
    .optional()
    .isNumeric()
    .withMessage('Miscellaneous expenses must be a number')
    .custom((value) => value >= 0)
    .withMessage('Miscellaneous expenses cannot be negative'),
];

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};
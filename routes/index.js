const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./user');
const expenseRoutes = require('./expense');

// Mount routes
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/expenses', expenseRoutes);

module.exports = router;
const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./user');
const expenseRoutes = require('./expense');
const epfRoutes = require('./epf');

// Mount routes
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/user', userRoutes);
router.use('/expenses', expenseRoutes);
router.use('/epf', epfRoutes);

module.exports = router;
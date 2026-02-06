const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const expenseController = require('../controllers/expenseController');

// All routes are protected
router.use(protect);

// Routes for monthly expenses
router.get('/:email', expenseController.getAllUserExpenses);
router.post('/:email/:month', expenseController.addExpense);
router.get('/:email/:month', expenseController.getMonthlyExpenses);
router.delete('/:email/:month', expenseController.deleteMonthlyRecord);
router.put('/:email/:month/:expenseId', expenseController.updateExpenseItem);
router.delete('/:email/:month/:expenseId', expenseController.deleteExpenseItem);

module.exports = router;

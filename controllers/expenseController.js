const Expense = require('../models/Expense');
const User = require('../models/User');

// @desc    Add an expense item for a specific month
// @route   POST /api/expenses/:email/:month
// @access  Private
exports.addExpense = async (req, res, next) => {
    try {
        const { email, month } = req.params;
        const { title, amount, subExpenses, expenses, netSalary } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Security check: Ensure authenticated user matches requested user
        if (user._id.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to modify this user\'s record',
            });
        }

        // Find or create the Expense document for this user and month
        let monthlyExpense = await Expense.findOne({ user: user._id, month });

        if (!monthlyExpense) {
            monthlyExpense = new Expense({
                user: user._id,
                month,
                netSalary: netSalary || 0,
                expenses: [],
            });
        }

        // Update netSalary if provided
        if (netSalary !== undefined) {
            monthlyExpense.netSalary = netSalary;
        }

        // Helper to normalize an expense payload into the nested structure.
        const normalizeExpenseItem = (item) => {
            const {
                title: itemTitle,
                amount: itemAmount,
                subExpenses: itemSubExpenses,
                date: itemDate,
            } = item;

            const normalizedSubExpenses = Array.isArray(itemSubExpenses)
                ? itemSubExpenses.map((sub) => ({
                    title: sub.title,
                    amount: sub.amount,
                    date: sub.date,
                }))
                : [];

            // If sub-expenses are provided, header amount is derived from them.
            const headerAmount =
                normalizedSubExpenses.length > 0
                    ? normalizedSubExpenses.reduce(
                        (total, sub) => total + (sub.amount || 0),
                        0
                    )
                    : itemAmount;

            return {
                title: itemTitle,
                amount: headerAmount,
                date: itemDate,
                subExpenses: normalizedSubExpenses,
            };
        };

        // Handle single expense item (supports optional subExpenses)
        if (title && (amount !== undefined || Array.isArray(subExpenses))) {
            const singleItem = normalizeExpenseItem({
                title,
                amount,
                subExpenses,
            });
            monthlyExpense.expenses.push(singleItem);
        }

        // Handle array of expense items
        if (Array.isArray(expenses)) {
            const normalized = expenses.map((item) => normalizeExpenseItem(item));
            monthlyExpense.expenses.push(...normalized);
        }

        await monthlyExpense.save();

        res.status(200).json({
            success: true,
            data: monthlyExpense,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all expenses for a specific month
// @route   GET /api/expenses/:email/:month
// @access  Private
exports.getMonthlyExpenses = async (req, res, next) => {
    try {
        const { email, month } = req.params;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Security check: Ensure authenticated user matches requested user
        if (user._id.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this record',
            });
        }

        const monthlyExpense = await Expense.findOne({ user: user._id, month });

        if (!monthlyExpense) {
            return res.status(200).json({
                success: true,
                data: {
                    user: user._id,
                    month,
                    expenses: [],
                    totalMonthlyExpense: 0,
                },
            });
        }

        res.status(200).json({
            success: true,
            data: monthlyExpense,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all monthly entries for a user
// @route   GET /api/expenses/:email
// @access  Private
exports.getAllUserExpenses = async (req, res, next) => {
    try {
        const { email } = req.params;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const allExpenses = await Expense.find({ user: user._id }).sort({ month: -1 });

        res.status(200).json({
            success: true,
            count: allExpenses.length,
            data: allExpenses,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a specific expense item
// @route   PUT /api/expenses/:email/:month/:expenseId
// @access  Private
exports.updateExpenseItem = async (req, res, next) => {
    try {
        const { email, month, expenseId } = req.params;
        const { title, amount, subExpenses } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Security check: Ensure authenticated user matches requested user
        if (user._id.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to modify this record',
            });
        }

        // Find the monthly expense document
        const monthlyExpense = await Expense.findOne({ user: user._id, month });
        if (!monthlyExpense) {
            return res.status(404).json({
                success: false,
                message: 'Expense record for this month not found',
            });
        }

        // Find the specific expense item in the array
        const expenseItem = monthlyExpense.expenses.id(expenseId);
        if (!expenseItem) {
            return res.status(404).json({
                success: false,
                message: 'Specific expense item not found',
            });
        }

        // Update fields if provided
        if (title) {
            expenseItem.title = title;
        }

        // If sub-expenses are provided, replace them and let the model
        // recalculate the header amount from the sub-level items.
        if (Array.isArray(subExpenses)) {
            expenseItem.subExpenses = subExpenses.map((sub) => ({
                title: sub.title,
                amount: sub.amount,
                date: sub.date,
            }));
        } else if (amount !== undefined && (!expenseItem.subExpenses || expenseItem.subExpenses.length === 0)) {
            // Only allow direct header amount update when there are no sub-expenses
            expenseItem.amount = amount;
        }

        // Save the document (pre-save hook will recalculate header and totalMonthlyExpense)
        await monthlyExpense.save();

        res.status(200).json({
            success: true,
            message: 'Expense item updated successfully',
            data: monthlyExpense,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a specific expense item
// @route   DELETE /api/expenses/:email/:month/:expenseId
// @access  Private
exports.deleteExpenseItem = async (req, res, next) => {
    try {
        const { email, month, expenseId } = req.params;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Security check: Ensure authenticated user matches requested user
        if (user._id.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to modify this record',
            });
        }

        // Find the monthly expense document
        const monthlyExpense = await Expense.findOne({ user: user._id, month });
        if (!monthlyExpense) {
            return res.status(404).json({
                success: false,
                message: 'Expense record for this month not found',
            });
        }

        // Find the specific expense item in the array
        const expenseItem = monthlyExpense.expenses.id(expenseId);
        if (!expenseItem) {
            return res.status(404).json({
                success: false,
                message: 'Specific expense item not found',
            });
        }

        // Remove the item using pull
        monthlyExpense.expenses.pull(expenseId);

        // Save the document (pre-save hook will recalculate totalMonthlyExpense)
        await monthlyExpense.save();

        res.status(200).json({
            success: true,
            message: 'Expense item deleted successfully',
            data: monthlyExpense,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an entire monthly expense record
// @route   DELETE /api/expenses/:email/:month
// @access  Private
exports.deleteMonthlyRecord = async (req, res, next) => {
    try {
        const { email, month } = req.params;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Security check: Ensure authenticated user matches requested user
        if (user._id.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to delete this record',
            });
        }

        // Find and delete the monthly expense document
        const deletedRecord = await Expense.findOneAndDelete({ user: user._id, month });

        if (!deletedRecord) {
            return res.status(404).json({
                success: false,
                message: 'Expense record for this month not found',
            });
        }

        res.status(200).json({
            success: true,
            message: `All expenses for ${month} deleted successfully`,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a UPI expense automatically (for Shortcuts)
// @route   POST /api/expenses/:email/:month/upi
// @access  Private
exports.addUpiExpense = async (req, res, next) => {
    try {
        const { email, month } = req.params;
        const { amount, date } = req.body;

        if (!amount || !date) {
            return res.status(400).json({
                success: false,
                message: 'Amount and date are required',
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Security check removed for this public endpoint as requested
        // intended for simple automation where user authentication is not available
        // if (user._id.toString() !== req.user.id) { ... }

        // Find or create the Expense document for this user and month
        let monthlyExpense = await Expense.findOne({ user: user._id, month });

        if (!monthlyExpense) {
            monthlyExpense = new Expense({
                user: user._id,
                month,
                netSalary: user.netPay || 0, // Populate from user profile
                expenses: [],
            });

            // Automated Investment Entry (SIPs)
            // Triggered only when creating the month record for the first time via UPI
            if (user.mutualFundSips && user.mutualFundSips > 0) {
                monthlyExpense.expenses.push({
                    title: 'Investments',
                    amount: user.mutualFundSips,
                    subExpenses: [
                        {
                            title: 'Mutual Fund SIPs',
                            amount: user.mutualFundSips,
                            date: new Date() // Use current date
                        }
                    ]
                });
            }
        }

        // Find existing "UPI" expense
        let upiExpense = monthlyExpense.expenses.find(e => e.title === 'UPI');

        const newSubExpense = {
            title: date,
            amount: Number(amount)
        };

        if (upiExpense) {
            // Append to existing UPI expense
            upiExpense.subExpenses.push(newSubExpense);
        } else {
            // Create new UPI expense
            monthlyExpense.expenses.push({
                title: 'UPI',
                amount: Number(amount), // Initial amount
                subExpenses: [newSubExpense]
            });
        }

        await monthlyExpense.save();

        // Update user flow status
        if (!user.isUPIconfigured) {
            user.isUPIconfigured = true;
            await user.save();
        }

        res.status(200).json({
            success: true,
            data: monthlyExpense,
        });
    } catch (error) {
        next(error);
    }
};

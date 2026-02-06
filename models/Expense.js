const mongoose = require('mongoose');

// Sub-expense schema represents the lowest level items, e.g. "Milk"
const subExpenseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Sub-expense title is required'],
            trim: true,
        },
        amount: {
            type: Number,
            required: [true, 'Sub-expense amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

// Header-level expense schema, e.g. "Household"
// `amount` is always derived as the sum of all `subExpenses.amount`
const expenseItemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Expense title is required'],
            trim: true,
        },
        amount: {
            type: Number,
            required: [true, 'Expense amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
        date: {
            type: Date,
            default: Date.now,
        },
        subExpenses: {
            type: [subExpenseSchema],
            default: [],
        },
    },
    { _id: true }
);

const expenseSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        month: {
            type: String, // Format: "YYYY-MM"
            required: true,
        },
        netSalary: {
            type: Number,
            default: 0,
        },
        expenses: [expenseItemSchema],
        totalMonthlyExpense: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Index for quick lookup and uniqueness per user/month
expenseSchema.index({ user: 1, month: 1 }, { unique: true });

// Pre-save hook to calculate:
// 1. Each header expense `amount` as the sum of its `subExpenses`
// 2. The overall `totalMonthlyExpense` as the sum of all header amounts
expenseSchema.pre('save', function (next) {
    // Ensure header amounts reflect sum of sub-expenses
    if (Array.isArray(this.expenses)) {
        this.expenses.forEach((item) => {
            if (Array.isArray(item.subExpenses) && item.subExpenses.length > 0) {
                const subTotal = item.subExpenses.reduce(
                    (total, sub) => total + (sub.amount || 0),
                    0
                );
                item.amount = subTotal;
            }
        });
    }

    this.totalMonthlyExpense = (this.expenses || []).reduce(
        (total, item) => total + (item.amount || 0),
        0
    );

    next();
});

module.exports = mongoose.model('Expense', expenseSchema);

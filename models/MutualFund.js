const mongoose = require('mongoose');

const mutualFundSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        fundId: {
            type: String,
            required: [true, 'Fund ID is required'],
            trim: true,
        },
        schemeName: {
            type: String,
            required: [true, 'Scheme Name is required'],
            trim: true,
        },
        sipAmount: {
            type: Number,
            required: [true, 'SIP Amount is required'],
            min: [100, 'SIP Amount must be at least 100'],
        },
        startDate: {
            type: Date,
            required: [true, 'Start Date is required'],
        },
        sipDate: {
            type: Number,
            default: 1, // Default SIP date is 1st of every month
            min: 1,
            max: 31,
        },
        lumpsumAmount: {
            type: Number,
            default: 0,
            min: [0, 'Lumpsum Amount cannot be negative'],
        },
        // Optional: Date of lumpsum investment. If not provided, assume startDate.
        lumpsumDate: {
            type: Date,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('MutualFund', mutualFundSchema);

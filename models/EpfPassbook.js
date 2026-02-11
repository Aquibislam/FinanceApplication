const mongoose = require('mongoose');

const EpfPassbookSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        // Removed unique: true to allow one user to manage multiple passbooks (identified by email)
    },
    email: {
        type: String,
        required: true,
        unique: true, // Unique identifier for the passbook
        lowercase: true,
        trim: true
    },
    memberInfo: {
        establishmentId: String,
        establishmentName: String,
        memberId: String,
        memberName: String,
        uan: String,
        dateOfBirth: String,
        financialYear: String
    },
    contributions: [{
        wageMonth: String,
        creditDate: String,
        transactionType: String,
        particulars: String,
        contributionType: String, // regular, transfer_in, etc.
        oldMemberId: String,
        wages: {
            epf: Number,
            eps: Number
        },
        contributions: {
            employee: Number,
            employer: Number,
            pension: Number
        },
        totalContribution: Number,
        rawLine: String
    }],
    summary: {
        openingBalance: Object,
        totalContributions: Object,
        totalTransferIns: Object,
        totalWithdrawals: Object,
        interestDetails: Object,
        closingBalance: Object
    },
    taxableData: {
        monthlyBreakdown: Array,
        closingBalance: Object
    },
    insights: {
        totalContributionRecords: Number,
        regularContributions: Object,
        transferIns: Object,
        missingMonths: Array,
        accountStatus: String
    },
    metadata: {
        parsedAt: Date,
        totalRecords: Number,
        pdfType: String,
        printedOn: String
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('EpfPassbook', EpfPassbookSchema);

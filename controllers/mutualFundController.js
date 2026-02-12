// const axios = require('axios'); // Unused, using native fetch
const MutualFund = require('../models/MutualFund');

// Search Funds via mfapi.in
// Search Funds via mfapi.in
exports.searchFunds = async (req, res) => {
    try {
        const query = req.query.q || req.query.query;
        if (!query) {
            return res.status(400).json({ success: false, message: 'Query parameter is required' });
        }

        const response = await fetch(`https://api.mfapi.in/mf/search?q=${query}`);
        const data = await response.json();

        res.status(200).json({
            success: true,
            data: data,
        });
    } catch (error) {
        console.error('Error searching funds:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Add a Mutual Fund to Portfolio
exports.addFund = async (req, res) => {
    try {
        const { fundId, schemeName, sipAmount, startDate, sipDate, lumpsumAmount, lumpsumDate } = req.body;

        const newFund = new MutualFund({
            user: req.user.id,
            fundId,
            schemeName,
            sipAmount,
            startDate,
            sipDate: sipDate || 1,
            lumpsumAmount: lumpsumAmount || 0,
            lumpsumDate: lumpsumDate || null
        });

        await newFund.save();

        res.status(201).json({
            success: true,
            message: 'Mutual Fund added to portfolio',
            data: newFund,
        });
    } catch (error) {
        console.error('Error adding fund:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Get Portfolio with Calculated Returns
exports.getPortfolio = async (req, res) => {
    try {
        const funds = await MutualFund.find({ user: req.user.id });

        if (!funds || funds.length === 0) {
            return res.status(200).json({
                success: true,
                summary: { totalInvested: 0, currentValue: 0, totalProfit: 0, returns: 0 },
                portfolio: [],
            });
        }

        const portfolioWithReturns = await Promise.all(funds.map(async (fund) => {
            // Helper to parse "dd-mm-yyyy"
            const parseApiDate = (dateStr) => {
                const [d, m, y] = dateStr.split('-');
                return new Date(`${y}-${m}-${d}`);
            }

            // Fetch historical NAV data for this fund
            const response = await fetch(`https://api.mfapi.in/mf/${fund.fundId}`);
            const navData = await response.json();

            if (!navData || !navData.data) {
                // Fallback if API fails
                return {
                    ...fund.toObject(),
                    totalInvested: 0,
                    currentValue: 0,
                    profit: 0,
                    units: 0,
                    error: 'Failed to fetch NAV data'
                };
            }

            const historicalNav = navData.data; // Array of { date: 'dd-mm-yyyy', nav: 'string' }
            const latestNAV = parseFloat(historicalNav[0].nav);

            let totalUnits = 0;
            let totalInvested = 0;
            let sipInvested = 0; // Breakdown
            let lumpsumInvested = 0; // Breakdown

            // Handle Lumpsum
            const start = new Date(fund.startDate);
            const lumpsum = fund.lumpsumAmount || 0;

            if (lumpsum > 0) {
                // Assume lumpsum was invested on start date
                // Find NAV for start date
                const lumpsumDate = fund.lumpsumDate ? new Date(fund.lumpsumDate) : start;

                const navEntry = historicalNav.find(entry => parseApiDate(entry.date) <= lumpsumDate);
                if (navEntry) {
                    const nav = parseFloat(navEntry.nav);
                    if (!isNaN(nav) && nav > 0) {
                        const units = lumpsum / nav;
                        totalUnits += units;
                        totalInvested += lumpsum;
                        lumpsumInvested = lumpsum;
                    }
                }
            }

            // Calculate SIP installments
            const now = new Date();
            let currentDate = new Date(start);
            // Ensure we start from the correct month/year but align to sipDate
            currentDate.setDate(fund.sipDate);

            // If start date's day is after sipDate, move to next month for first installment
            if (new Date(fund.startDate).getDate() > fund.sipDate) {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            while (currentDate <= now) {
                // Find NAV for this date
                // Format date to dd-mm-yyyy for matching
                // Since API dates might not match exactly (weekends/holidays), we might need to find closest previous

                // Optimization: Convert API dates to comparable timestamps for efficiency? 
                // Or just lazy search since array is reverse chronological (newest first).

                // Simple helper to parse "dd-mm-yyyy" (Already defined above if lumpsum block runs, but let's redefine safe or move up)
                // Moving helper up to scope of map function to avoid redeclaration if I did move it. 
                // Actually, let's just use the one I likely defined above or define it once at top of map.
                // To be safe and clean, I will define it once at the start of map callback.

                // Oops, multi-replace might make this tricky if I don't see the whole file. 
                // I'll just use the function I defined in the previous block if I can, but scope...
                // Let's just define it again or rely on it being hoisted if it was a function declaration (it was const).
                // It was const inside an if block in my previous chunk, so it's NOT available here.
                // I need to define it outside.

                // We need NAV on 'currentDate'. 
                // finding the record where date <= currentDate. 
                // Since array is sorted descending (newest first), we look for first record where date <= currentDate

                const installDate = new Date(currentDate);

                // Find matching NAV
                const navEntry = historicalNav.find(entry => parseApiDate(entry.date) <= installDate);

                if (navEntry) {
                    const nav = parseFloat(navEntry.nav);
                    if (!isNaN(nav) && nav > 0) {
                        const units = fund.sipAmount / nav;
                        totalUnits += units;
                        totalInvested += fund.sipAmount;
                        sipInvested += fund.sipAmount;
                    }
                }

                // Move to next month
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            const currentValue = totalUnits * latestNAV;
            const profit = currentValue - totalInvested;

            return {
                ...fund.toObject(),
                totalInvested: Math.round(totalInvested),
                sipInvested: Math.round(sipInvested),
                lumpsumInvested: Math.round(lumpsumInvested),
                currentValue: Math.round(currentValue),
                profit: Math.round(profit),
                totalUnits: parseFloat(totalUnits.toFixed(4)),
                latestNAV,
                latestNAVDate: historicalNav[0].date
            };
        }));

        // Calculate Totals
        const summary = portfolioWithReturns.reduce((acc, curr) => {
            acc.totalInvested += curr.totalInvested;
            acc.currentValue += curr.currentValue;
            acc.totalProfit += curr.profit;
            return acc;
        }, { totalInvested: 0, currentValue: 0, totalProfit: 0 });

        // Calculate overall return percentage
        summary.returns = summary.totalInvested > 0
            ? ((summary.totalProfit / summary.totalInvested) * 100).toFixed(2)
            : 0;

        res.status(200).json({
            success: true,
            summary,
            portfolio: portfolioWithReturns,
        });

    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Delete a Fund
exports.deleteFund = async (req, res) => {
    try {
        const fund = await MutualFund.findById(req.params.id);

        if (!fund) {
            return res.status(404).json({ success: false, message: 'Fund not found' });
        }

        // Ensure user owns the fund
        if (fund.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        await fund.deleteOne();

        res.status(200).json({ success: true, message: 'Fund removed' });
    } catch (error) {
        console.error('Error deleting fund:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const express = require('express');
const router = express.Router();
const { searchFunds, addFund, getPortfolio, deleteFund } = require('../controllers/mutualFundController');
const { protect } = require('../middleware/auth'); // Assuming you have an auth middleware

// Protect all routes
router.use(protect);

router.get('/search', searchFunds);
router.post('/add', addFund);
router.get('/portfolio', getPortfolio);
router.delete('/:id', deleteFund);

module.exports = router;

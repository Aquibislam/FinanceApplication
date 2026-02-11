const express = require('express');
const router = express.Router();
const multer = require('multer');
const epfController = require('../controllers/epfController');

// Import auth middleware (adjust path as needed)
// Assuming auth middleware is in ../middleware/auth
const auth = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Routes
// POST /api/epf/parse - Upload & Parse & Save
// Protected: user ID needed for saving to DB
router.post('/parse', auth.protect, upload.single('pdf'), epfController.parseEpfPassbook);

// GET /api/epf/ - Fetch saved data
// Protected: user ID needed for fetching from DB
router.get('/', auth.protect, epfController.getEpfData);

// DELETE /api/epf/ - Delete saved data
// Protected: user ID needed for deletion
router.delete('/', auth.protect, epfController.deleteEpfData);

router.get('/health', epfController.healthCheck);

module.exports = router;

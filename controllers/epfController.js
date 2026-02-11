const parser = require('../utils/pdfParser');
const EpfPassbook = require('../models/EpfPassbook');

exports.parseEpfPassbook = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        // Determine the target email for this passbook
        // Prioritize email passed in body, fallback to logged-in user's email
        // Note: req.body will be populated by multer if text fields are sent
        const targetEmail = req.body.email || req.user.email;

        if (!targetEmail) {
            return res.status(400).json({ error: 'Email identifier is required (in body or token)' });
        }

        const buffer = req.file.buffer;
        const data = await parser.parse(buffer);

        // Save to Database (Upsert based on EMAIL)
        // We link it to req.user.id (so we know who uploaded it)
        const savedPassbook = await EpfPassbook.findOneAndUpdate(
            { email: targetEmail }, // Find by email
            {
                user: req.user.id,
                email: targetEmail,
                memberInfo: data.memberInfo,
                contributions: data.contributions,
                summary: data.summary,
                taxableData: data.taxableData,
                insights: data.insights,
                metadata: data.metadata,
                updatedAt: new Date()
            },
            { new: true, upsert: true } // Return new doc, create if needed
        );

        res.json({ success: true, message: 'EPF Validation Successful', email: targetEmail, data: savedPassbook });

    } catch (error) {
        console.error('EPF Parsing Error:', error);
        res.status(500).json({ error: 'Failed to parse EPF passbook', details: error.message });
    }
};

exports.getEpfData = async (req, res) => {
    try {
        // Determine target email from query param or fallback to token email
        const targetEmail = req.query.email || req.user.email;

        if (!targetEmail) {
            return res.status(400).json({ error: 'Email identifier is required (query param or token)' });
        }

        const passbook = await EpfPassbook.findOne({ email: targetEmail });

        if (!passbook) {
            return res.status(404).json({ error: 'No EPF data found for this email', email: targetEmail });
        }
        res.json({ success: true, email: targetEmail, data: passbook });
    } catch (error) {
        console.error('Fetch EPF Data Error:', error);
        res.status(500).json({ error: 'Failed to fetch EPF data' });
    }
};

exports.deleteEpfData = async (req, res) => {
    try {
        // Determine target email from query param or body or fallback to token email
        const targetEmail = req.query.email || req.body.email || req.user.email;

        if (!targetEmail) {
            return res.status(400).json({ error: 'Email identifier is required (query param, body, or token)' });
        }

        const deletedPassbook = await EpfPassbook.findOneAndDelete({ email: targetEmail });

        if (!deletedPassbook) {
            return res.status(404).json({ error: 'No EPF data found for this email', email: targetEmail });
        }

        res.json({ success: true, message: 'EPF data deleted successfully', email: targetEmail });
    } catch (error) {
        console.error('Delete EPF Data Error:', error);
        res.status(500).json({ error: 'Failed to delete EPF data' });
    }
};

exports.healthCheck = (req, res) => {
    res.json({ status: 'EPF Service Running' });
};

const express = require('express');
const router = express.Router();
const Register = require('../models/registers');

// Get user profile information
router.get('/profile', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Find user by ID
        const user = await Register.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Return user data (excluding sensitive information)
        res.json({
            success: true,
            name: user.name,
            email: user.email,
            currency: user.currency,
            dateFormat: user.dateFormat,
            theme: user.theme
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Error fetching user profile' });
    }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const ReminderService = require('../services/reminderService');

// Create a new reminder
router.post('/create', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in first!' });
        }

        const reminder = await ReminderService.createReminder(req.session.userId, req.body);
        res.json({ success: true, reminder });
    } catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({ success: false, message: 'Error creating reminder' });
    }
});

// Get all reminders for the logged-in user
router.get('/all', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in first!' });
        }

        const reminders = await ReminderService.getUserReminders(req.session.userId);
        res.json({ success: true, reminders });
    } catch (error) {
        console.error('Error getting reminders:', error);
        res.status(500).json({ success: false, message: 'Error getting reminders' });
    }
});

// Update a reminder
router.put('/update/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in first!' });
        }

        const reminder = await ReminderService.updateReminder(req.params.id, req.session.userId, req.body);
        if (!reminder) {
            return res.status(404).json({ success: false, message: 'Reminder not found' });
        }
        res.json({ success: true, reminder });
    } catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({ success: false, message: 'Error updating reminder' });
    }
});

// Delete a reminder
router.delete('/delete/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Please log in first!' });
        }

        const reminder = await ReminderService.deleteReminder(req.params.id, req.session.userId);
        if (!reminder) {
            return res.status(404).json({ success: false, message: 'Reminder not found' });
        }
        res.json({ success: true, message: 'Reminder deleted successfully' });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ success: false, message: 'Error deleting reminder' });
    }
});

module.exports = router; 
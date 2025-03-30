const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const { generateTransactionPDF } = require('../utils/pdfGenerator');

// Get all transactions for the logged-in user
router.get('/list', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const transactions = await Transaction.find({ userId: req.session.userId }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Add a new transaction
router.post('/add', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const { type, personName, amount, date, description } = req.body;
        
        // Validate required fields
        if (!type || !personName || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create new transaction
        const transaction = new Transaction({
            userId: req.session.userId,
            type,
            personName,
            amount: parseFloat(amount),
            date: date || new Date(),
            description: description || ''
        });

        // Save to database
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        console.error('Error adding transaction:', error);
        res.status(500).json({ error: 'Failed to add transaction' });
    }
});

// Get transactions by person name for the logged-in user
router.get('/person/:name', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const transactions = await Transaction.find({
            userId: req.session.userId,
            personName: req.params.name
        }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions for person:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Update a transaction
router.put('/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const { type, personName, amount, description } = req.body;
        
        // Validate required fields
        if (!type || !personName || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const transaction = await Transaction.findOne({
            _id: req.params.id,
            userId: req.session.userId
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Update transaction fields
        transaction.type = type;
        transaction.personName = personName;
        transaction.amount = parseFloat(amount);
        transaction.description = description || '';

        // Save to database
        await transaction.save();
        res.json(transaction);
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const transaction = await Transaction.findOneAndDelete({
            _id: req.params.id,
            userId: req.session.userId
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

// Generate PDF of transactions
router.get('/export-pdf', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Please log in first!' });
        }

        // Get all transactions for the user
        const transactions = await Transaction.find({ userId: req.session.userId })
            .sort({ date: -1 }); // Sort by date descending

        // Generate and send PDF
        generateTransactionPDF(transactions, res);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: 'Error generating PDF' });
    }
});

module.exports = router; 
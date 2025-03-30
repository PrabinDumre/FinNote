const express = require('express');
const router = express.Router();
const { generateTransactionPDF } = require('../utils/pdfGenerator');
const Transaction = require('../models/transaction');
const Expense = require('../models/expense');

router.get('/transactions/export-pdf', async (req, res) => {
    try {
        console.log('PDF export request received');
        
        // Check if user is logged in
        if (!req.session || !req.session.userId) {
            console.log('No user session found');
            return res.status(401).json({ message: 'Please log in first!' });
        }

        const userId = req.session.userId;
        console.log('User ID:', userId);

        // Fetch all transactions and expenses
        const [transactions, expenses] = await Promise.all([
            Transaction.find({ userId }).lean(),
            Expense.find({ userId }).lean()
        ]);

        console.log('Raw data fetched:', {
            transactionsCount: transactions.length,
            expensesCount: expenses.length
        });

        if (!transactions.length && !expenses.length) {
            console.log('No transactions or expenses found');
            return res.status(404).json({ message: 'No transactions or expenses found' });
        }

        // Format transactions
        const formattedTransactions = transactions.map(t => ({
            date: t.date,
            amount: parseFloat(t.amount) || 0,
            description: t.description || '',
            personName: t.personName || '',
            type: t.type // 'give' or 'take'
        }));

        // Format expenses
        const formattedExpenses = expenses.map(e => ({
            date: e.date,
            amount: parseFloat(e.amount) || 0,
            description: e.description || '',
            category: e.category || 'Other',
            type: 'expense',
            expenseType: e.expenseType || 'personal'
        }));

        console.log('Formatted data:', {
            transactionsCount: formattedTransactions.length,
            expensesCount: formattedExpenses.length
        });

        // Combine and sort all transactions
        const allTransactions = [...formattedTransactions, ...formattedExpenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log('Combined transactions count:', allTransactions.length);

        // Set proper PDF response headers
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="transaction-history.pdf"',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': 0
        });

        // Generate and send PDF
        console.log('Generating PDF...');
        await generateTransactionPDF(allTransactions, res);
        console.log('PDF generation completed');

    } catch (error) {
        console.error('Error in PDF export:', error);
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error generating PDF', error: error.message });
        }
    }
});

module.exports = router; 
/**
 * ML API Routes
 * Provides REST endpoints for ML features
 */

const express = require('express');
const router = express.Router();
const mlService = require('../services/mlService');
const Transaction = require('../../models/transaction');

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Please log in to access this feature' });
    }
    next();
};

/**
 * Initialize ML models with user's transaction data
 * GET /api/ml/initialize
 */
router.get('/initialize', requireLogin, async (req, res) => {
    try {
        // Get user's transactions
        const transactions = await Transaction.find({ userId: req.session.userId });
        
        if (transactions.length === 0) {
            return res.status(400).json({ 
                error: 'Not enough transaction data',
                message: 'You need to have some transactions before using AI features'
            });
        }
        
        // Initialize ML models
        const results = await mlService.initialize(transactions);
        
        res.json({
            success: true,
            message: 'ML models initialized successfully',
            results
        });
    } catch (error) {
        console.error('Error initializing ML models:', error);
        res.status(500).json({ 
            error: 'Failed to initialize ML models',
            message: error.message
        });
    }
});

/**
 * Get expense predictions
 * GET /api/ml/predict-expenses
 * Query params:
 *   - days: Number of days to predict (default: 7)
 */
router.get('/predict-expenses', requireLogin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        
        // Get predictions
        const predictions = mlService.predictExpenses(days);
        
        res.json({
            success: true,
            predictions
        });
    } catch (error) {
        console.error('Error predicting expenses:', error);
        res.status(500).json({ 
            error: 'Failed to predict expenses',
            message: error.message
        });
    }
});

/**
 * Categorize uncategorized transactions
 * POST /api/ml/categorize
 * Body:
 *   - transactions: Array of transaction objects to categorize (optional)
 */
router.post('/categorize', requireLogin, async (req, res) => {
    try {
        let transactions;
        
        // If transactions provided in request body, use those
        if (req.body.transactions && Array.isArray(req.body.transactions)) {
            transactions = req.body.transactions;
        } else {
            // Otherwise, get user's uncategorized transactions
            transactions = await Transaction.find({ 
                userId: req.session.userId,
                category: { $exists: false }
            });
        }
        
        if (transactions.length === 0) {
            return res.json({
                success: true,
                message: 'No transactions to categorize',
                categorizedTransactions: []
            });
        }
        
        // Categorize transactions
        const categorizedTransactions = mlService.categorizeTransactions(transactions);
        
        res.json({
            success: true,
            categorizedTransactions
        });
    } catch (error) {
        console.error('Error categorizing transactions:', error);
        res.status(500).json({ 
            error: 'Failed to categorize transactions',
            message: error.message
        });
    }
});

/**
 * Apply ML categories to transactions in database
 * POST /api/ml/apply-categories
 * Body:
 *   - transactions: Array of transaction IDs with predicted categories
 */
router.post('/apply-categories', requireLogin, async (req, res) => {
    try {
        const { transactions } = req.body;
        
        if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({ error: 'No transactions provided' });
        }
        
        const updates = [];
        
        // Update each transaction with its predicted category
        for (const tx of transactions) {
            if (tx._id && tx.predictedCategory) {
                updates.push(
                    Transaction.updateOne(
                        { _id: tx._id, userId: req.session.userId },
                        { $set: { category: tx.predictedCategory } }
                    )
                );
            }
        }
        
        // Execute all updates
        const results = await Promise.all(updates);
        
        res.json({
            success: true,
            message: `Categories applied to ${results.length} transactions`,
            results
        });
    } catch (error) {
        console.error('Error applying categories:', error);
        res.status(500).json({ 
            error: 'Failed to apply categories',
            message: error.message
        });
    }
});

/**
 * Detect anomalies in transactions
 * GET /api/ml/detect-anomalies
 * Query params:
 *   - limit: Number of transactions to check (default: 50)
 */
router.get('/detect-anomalies', requireLogin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        
        // Get recent transactions
        const transactions = await Transaction.find({ userId: req.session.userId })
            .sort({ date: -1 })
            .limit(limit);
        
        if (transactions.length === 0) {
            return res.json({
                success: true,
                message: 'No transactions to check for anomalies',
                anomalies: []
            });
        }
        
        // Detect anomalies
        const transactionsWithAnomalies = mlService.detectAnomalies(transactions);
        
        // Filter to only return anomalies
        const anomalies = transactionsWithAnomalies.filter(tx => 
            tx.isAnomaly || tx.isOutlier || tx.overallAnomalyScore > 0.5
        );
        
        res.json({
            success: true,
            anomalies,
            totalChecked: transactions.length
        });
    } catch (error) {
        console.error('Error detecting anomalies:', error);
        res.status(500).json({ 
            error: 'Failed to detect anomalies',
            message: error.message
        });
    }
});

/**
 * Get budget recommendations
 * GET /api/ml/budget-recommendations
 */
router.get('/budget-recommendations', requireLogin, async (req, res) => {
    try {
        // Get budget recommendations
        const recommendations = mlService.recommendBudgets();
        
        res.json({
            success: true,
            recommendations
        });
    } catch (error) {
        console.error('Error getting budget recommendations:', error);
        res.status(500).json({ 
            error: 'Failed to get budget recommendations',
            message: error.message
        });
    }
});

/**
 * Get expense optimization suggestions
 * GET /api/ml/optimize-expenses
 */
router.get('/optimize-expenses', requireLogin, async (req, res) => {
    try {
        // Get optimization suggestions
        const optimizations = mlService.optimizeExpenses();
        
        res.json({
            success: true,
            optimizations
        });
    } catch (error) {
        console.error('Error getting expense optimizations:', error);
        res.status(500).json({ 
            error: 'Failed to get expense optimizations',
            message: error.message
        });
    }
});

/**
 * Generate savings plan
 * GET /api/ml/savings-plan
 * Query params:
 *   - target: Target savings amount (required)
 */
router.get('/savings-plan', requireLogin, async (req, res) => {
    try {
        const targetSavings = parseFloat(req.query.target);
        
        if (isNaN(targetSavings) || targetSavings <= 0) {
            return res.status(400).json({ error: 'Valid target savings amount is required' });
        }
        
        // Generate savings plan
        const savingsPlan = mlService.generateSavingsPlan(targetSavings);
        
        res.json({
            success: true,
            targetSavings,
            savingsPlan
        });
    } catch (error) {
        console.error('Error generating savings plan:', error);
        res.status(500).json({ 
            error: 'Failed to generate savings plan',
            message: error.message
        });
    }
});

module.exports = router; 
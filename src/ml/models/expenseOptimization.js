/**
 * Expense Optimization Model
 * Recommends ways to reduce spending in specific categories
 */

/**
 * Spending pattern analyzer for finding optimization opportunities
 */
class SpendingPatternOptimizer {
    constructor() {
        this.categoryAnalysis = {};
        this.merchantFrequency = {};
        this.subscriptionPatterns = [];
        this.trained = false;
    }

    /**
     * Detect potential subscription payments
     * @param {Array} transactions - Transaction objects for a merchant
     * @returns {boolean} Whether the pattern indicates a subscription
     */
    detectSubscriptionPattern(transactions) {
        if (transactions.length < 2) return false;
        
        // Sort by date
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calculate intervals between payments
        const intervals = [];
        for (let i = 1; i < sorted.length; i++) {
            const prevDate = new Date(sorted[i-1].date);
            const currDate = new Date(sorted[i].date);
            const daysDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
            intervals.push(daysDiff);
        }
        
        // Check if amounts are consistent
        const amounts = sorted.map(t => t.amount);
        const uniqueAmounts = new Set(amounts);
        const amountConsistency = uniqueAmounts.size <= 2; // Allow for small variations
        
        // Check if intervals are consistent (approximately)
        const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const intervalConsistency = intervals.every(interval => {
            return Math.abs(interval - averageInterval) <= 5 || // Within 5 days
                   Math.abs(interval - 30) <= 5 || // Monthly
                   Math.abs(interval - 90) <= 10 || // Quarterly
                   Math.abs(interval - 365) <= 15; // Yearly
        });
        
        return amountConsistency && intervalConsistency;
    }

    /**
     * Determine subscription frequency
     * @param {Array} transactions - Transaction objects for a merchant
     * @returns {string} Subscription frequency (weekly, monthly, etc.)
     */
    getSubscriptionFrequency(transactions) {
        if (transactions.length < 2) return 'unknown';
        
        // Sort by date
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calculate average interval
        let totalDays = 0;
        for (let i = 1; i < sorted.length; i++) {
            const prevDate = new Date(sorted[i-1].date);
            const currDate = new Date(sorted[i].date);
            totalDays += Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
        }
        
        const avgInterval = totalDays / (sorted.length - 1);
        
        if (avgInterval <= 9) return 'weekly';
        if (avgInterval <= 15) return 'biweekly';
        if (avgInterval <= 40) return 'monthly';
        if (avgInterval <= 100) return 'quarterly';
        if (avgInterval <= 200) return 'biannual';
        return 'annual';
    }

    /**
     * Train the optimizer on transaction data
     * @param {Array} transactions - Array of transaction objects
     */
    train(transactions) {
        if (!transactions || transactions.length === 0) {
            throw new Error('No transaction data provided');
        }
        
        // Group by merchant and category
        const merchantTransactions = {};
        const categoryTransactions = {};
        
        transactions.forEach(transaction => {
            const merchant = this.extractMerchant(transaction);
            const category = transaction.category || 'uncategorized';
            
            if (!merchantTransactions[merchant]) {
                merchantTransactions[merchant] = [];
            }
            merchantTransactions[merchant].push(transaction);
            
            if (!categoryTransactions[category]) {
                categoryTransactions[category] = [];
            }
            categoryTransactions[category].push(transaction);
        });
        
        // Analyze merchant frequency
        this.merchantFrequency = {};
        Object.keys(merchantTransactions).forEach(merchant => {
            this.merchantFrequency[merchant] = {
                count: merchantTransactions[merchant].length,
                totalSpent: merchantTransactions[merchant].reduce((sum, t) => sum + Math.abs(t.amount), 0)
            };
        });
        
        // Analyze category spending
        this.categoryAnalysis = {};
        Object.keys(categoryTransactions).forEach(category => {
            const txs = categoryTransactions[category];
            
            this.categoryAnalysis[category] = {
                count: txs.length,
                totalSpent: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0),
                averageAmount: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0) / txs.length,
                topMerchants: this.getTopMerchants(txs, 5)
            };
        });
        
        // Detect subscription patterns
        this.subscriptionPatterns = [];
        Object.keys(merchantTransactions).forEach(merchant => {
            const txs = merchantTransactions[merchant];
            
            // Check for subscription pattern
            if (txs.length >= 2 && this.detectSubscriptionPattern(txs)) {
                // Get most recent amount
                const sortedTxs = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
                const recentAmount = Math.abs(sortedTxs[0].amount);
                
                this.subscriptionPatterns.push({
                    merchant,
                    frequency: this.getSubscriptionFrequency(txs),
                    amount: recentAmount,
                    annualCost: this.estimateAnnualCost(recentAmount, this.getSubscriptionFrequency(txs)),
                    transactions: txs
                });
            }
        });
        
        this.trained = true;
        
        return {
            categoryAnalysis: this.categoryAnalysis,
            merchantFrequency: this.merchantFrequency,
            subscriptionPatterns: this.subscriptionPatterns
        };
    }

    /**
     * Extract merchant name from transaction
     * @param {Object} transaction - Transaction object
     * @returns {string} Merchant name
     */
    extractMerchant(transaction) {
        if (!transaction.description) return 'unknown';
        
        // Simple merchant extraction - take first word
        const words = transaction.description.toLowerCase().split(/\s+/);
        return words[0] || 'unknown';
    }

    /**
     * Get top merchants by spending
     * @param {Array} transactions - Transaction objects
     * @param {number} limit - Number of merchants to return
     * @returns {Array} Top merchants
     */
    getTopMerchants(transactions, limit = 5) {
        const merchantTotals = {};
        
        transactions.forEach(transaction => {
            const merchant = this.extractMerchant(transaction);
            if (!merchantTotals[merchant]) {
                merchantTotals[merchant] = 0;
            }
            merchantTotals[merchant] += Math.abs(transaction.amount);
        });
        
        // Convert to array and sort
        const sortedMerchants = Object.keys(merchantTotals)
            .map(merchant => ({
                merchant,
                total: merchantTotals[merchant]
            }))
            .sort((a, b) => b.total - a.total);
            
        return sortedMerchants.slice(0, limit);
    }

    /**
     * Estimate annual cost of subscription
     * @param {number} amount - Transaction amount
     * @param {string} frequency - Subscription frequency
     * @returns {number} Estimated annual cost
     */
    estimateAnnualCost(amount, frequency) {
        switch (frequency) {
            case 'weekly':
                return amount * 52;
            case 'biweekly':
                return amount * 26;
            case 'monthly':
                return amount * 12;
            case 'quarterly':
                return amount * 4;
            case 'biannual':
                return amount * 2;
            case 'annual':
                return amount;
            default:
                return amount * 12; // Default to monthly
        }
    }

    /**
     * Generate optimization recommendations
     * @returns {Object} Optimization recommendations
     */
    generateRecommendations() {
        if (!this.trained) {
            throw new Error('Model must be trained before generating recommendations');
        }
        
        const recommendations = {
            subscriptions: [],
            highFrequencySpending: [],
            categoryOptimizations: []
        };
        
        // Subscription recommendations
        this.subscriptionPatterns.sort((a, b) => b.annualCost - a.annualCost);
        recommendations.subscriptions = this.subscriptionPatterns.map(sub => ({
            merchant: sub.merchant,
            frequency: sub.frequency,
            amount: sub.amount,
            annualCost: sub.annualCost,
            suggestion: `Consider if you're getting value from this ${sub.frequency} ${sub.merchant} subscription. Cancelling would save you approximately ${sub.annualCost.toFixed(2)} per year.`
        }));
        
        // High frequency merchant spending
        const merchantEntries = Object.entries(this.merchantFrequency);
        const highFrequencyMerchants = merchantEntries
            .filter(([_, data]) => data.count >= 5)
            .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
            .slice(0, 5);
            
        recommendations.highFrequencySpending = highFrequencyMerchants.map(([merchant, data]) => ({
            merchant,
            count: data.count,
            totalSpent: data.totalSpent,
            averagePerTransaction: data.totalSpent / data.count,
            suggestion: `You spent ${data.totalSpent.toFixed(2)} across ${data.count} transactions at ${merchant}. Consider reducing frequency or finding alternatives.`
        }));
        
        // Category optimizations
        const categoryEntries = Object.entries(this.categoryAnalysis);
        const topCategories = categoryEntries
            .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
            .slice(0, 3);
            
        recommendations.categoryOptimizations = topCategories.map(([category, data]) => {
            const topMerchantsText = data.topMerchants
                .map(m => `${m.merchant} (${m.total.toFixed(2)})`)
                .join(', ');
                
            return {
                category,
                totalSpent: data.totalSpent,
                transactionCount: data.count,
                averageAmount: data.averageAmount,
                topMerchants: data.topMerchants,
                suggestion: `Your highest spending in ${category} is with ${topMerchantsText}. Look for alternatives or ways to reduce these expenses.`
            };
        });
        
        return recommendations;
    }

    /**
     * Generate savings suggestions
     * @param {number} targetSavings - Target savings amount
     * @returns {Array} Savings suggestions
     */
    suggestSavings(targetSavings) {
        if (!this.trained) {
            throw new Error('Model must be trained before suggesting savings');
        }
        
        const suggestions = [];
        let potentialSavings = 0;
        
        // Suggest cancelling subscriptions
        this.subscriptionPatterns.sort((a, b) => b.annualCost - a.annualCost);
        for (const sub of this.subscriptionPatterns) {
            suggestions.push({
                type: 'subscription',
                merchant: sub.merchant,
                action: 'Cancel or reduce',
                savingsAmount: sub.annualCost,
                timeframe: 'year',
                explanation: `Cancelling your ${sub.frequency} ${sub.merchant} subscription would save ${sub.annualCost.toFixed(2)} per year.`
            });
            
            potentialSavings += sub.annualCost;
            if (potentialSavings >= targetSavings) break;
        }
        
        // If we still need more savings, suggest reducing high-frequency spending
        if (potentialSavings < targetSavings) {
            const merchantEntries = Object.entries(this.merchantFrequency);
            const highSpendMerchants = merchantEntries
                .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
                .slice(0, 10);
                
            for (const [merchant, data] of highSpendMerchants) {
                // Suggest 30% reduction
                const reductionAmount = data.totalSpent * 0.3;
                
                suggestions.push({
                    type: 'frequency',
                    merchant,
                    action: 'Reduce spending',
                    savingsAmount: reductionAmount,
                    timeframe: 'based on history',
                    explanation: `Reducing your spending at ${merchant} by 30% would save approximately ${reductionAmount.toFixed(2)}.`
                });
                
                potentialSavings += reductionAmount;
                if (potentialSavings >= targetSavings) break;
            }
        }
        
        // Add a summary suggestion
        suggestions.push({
            type: 'summary',
            potentialSavings,
            targetSavings,
            achievable: potentialSavings >= targetSavings,
            explanation: potentialSavings >= targetSavings ? 
                `Following these recommendations could save you ${potentialSavings.toFixed(2)}, meeting your target of ${targetSavings.toFixed(2)}.` :
                `These recommendations could save you ${potentialSavings.toFixed(2)}, which is short of your target of ${targetSavings.toFixed(2)}. Consider more aggressive reductions or finding additional income.`
        });
        
        return suggestions;
    }
}

/**
 * Comparative spending analyzer
 * Compares user spending to references/averages
 */
class ComparativeSpendingAnalyzer {
    constructor(referenceData = null) {
        this.referenceData = referenceData || this.getDefaultReferenceData();
        this.userCategorySpending = {};
        this.trained = false;
    }

    /**
     * Get default reference data for comparisons
     * @returns {Object} Reference spending data
     */
    getDefaultReferenceData() {
        // This would ideally come from a database of average spending
        // Here we're using placeholder data
        return {
            food: { average: 500, lowBound: 300, highBound: 800 },
            transportation: { average: 400, lowBound: 200, highBound: 600 },
            shopping: { average: 300, lowBound: 150, highBound: 500 },
            entertainment: { average: 200, lowBound: 100, highBound: 350 },
            utilities: { average: 350, lowBound: 250, highBound: 450 },
            housing: { average: 1200, lowBound: 800, highBound: 1800 }
        };
    }

    /**
     * Train analyzer on user transaction data
     * @param {Array} transactions - Array of transaction objects
     * @param {number} periodDays - Number of days to analyze
     */
    train(transactions, periodDays = 30) {
        if (!transactions || transactions.length === 0) {
            throw new Error('No transaction data provided');
        }
        
        // Calculate date threshold (only analyze recent transactions)
        const now = new Date();
        const threshold = new Date(now);
        threshold.setDate(now.getDate() - periodDays);
        
        // Filter recent transactions
        const recentTransactions = transactions.filter(t => 
            new Date(t.date) >= threshold
        );
        
        // Group by category
        this.userCategorySpending = {};
        recentTransactions.forEach(transaction => {
            const category = transaction.category || 'uncategorized';
            const amount = Math.abs(transaction.amount);
            
            if (!this.userCategorySpending[category]) {
                this.userCategorySpending[category] = {
                    total: 0,
                    count: 0,
                    transactions: []
                };
            }
            
            this.userCategorySpending[category].total += amount;
            this.userCategorySpending[category].count++;
            this.userCategorySpending[category].transactions.push(transaction);
        });
        
        // Calculate averages
        Object.keys(this.userCategorySpending).forEach(category => {
            this.userCategorySpending[category].average = 
                this.userCategorySpending[category].total / (periodDays / 30); // Monthly average
        });
        
        this.trained = true;
        
        return this.userCategorySpending;
    }

    /**
     * Compare user spending to reference data
     * @returns {Object} Comparison results
     */
    compareToReference() {
        if (!this.trained) {
            throw new Error('Model must be trained before comparison');
        }
        
        const comparisons = {};
        
        // For each category present in both user and reference data
        Object.keys(this.userCategorySpending).forEach(category => {
            if (this.referenceData[category]) {
                const userMonthly = this.userCategorySpending[category].average;
                const reference = this.referenceData[category];
                const percentDiff = ((userMonthly - reference.average) / reference.average) * 100;
                
                let status;
                if (userMonthly <= reference.lowBound) {
                    status = 'below_average';
                } else if (userMonthly >= reference.highBound) {
                    status = 'above_average';
                } else {
                    status = 'average';
                }
                
                comparisons[category] = {
                    userMonthly,
                    referenceAverage: reference.average,
                    percentDifference: percentDiff,
                    status,
                    potential: status === 'above_average' ? 
                        userMonthly - reference.average : 0
                };
            }
        });
        
        return comparisons;
    }

    /**
     * Generate optimization suggestions based on comparisons
     * @returns {Array} Optimization suggestions
     */
    generateOptimizationSuggestions() {
        if (!this.trained) {
            throw new Error('Model must be trained before generating suggestions');
        }
        
        const comparisons = this.compareToReference();
        const suggestions = [];
        
        // For categories where user is spending above average
        Object.keys(comparisons)
            .filter(category => comparisons[category].status === 'above_average')
            .sort((a, b) => comparisons[b].potential - comparisons[a].potential)
            .forEach(category => {
                const comparison = comparisons[category];
                const saveAmount = comparison.potential;
                
                suggestions.push({
                    category,
                    currentSpending: comparison.userMonthly,
                    averageSpending: comparison.referenceAverage,
                    percentAbove: comparison.percentDifference,
                    potentialSavings: saveAmount,
                    suggestion: `Your ${category} spending is ${Math.abs(comparison.percentDifference).toFixed(0)}% above average. Reducing to the average could save you ${saveAmount.toFixed(2)} per month.`
                });
            });
        
        return suggestions;
    }
}

module.exports = {
    SpendingPatternOptimizer,
    ComparativeSpendingAnalyzer
}; 
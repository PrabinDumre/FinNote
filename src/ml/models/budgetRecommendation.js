/**
 * Budget Recommendation Model
 * Suggests personalized budget limits based on spending history
 */

/**
 * Percentile-based budget recommender
 * Recommends budgets based on historical spending patterns
 */
class PercentileBudgetRecommender {
    constructor(buffer = 0.2) {
        this.buffer = buffer; // Buffer percentage to add to recommendations
        this.categoryStats = {};
        this.totalStats = {
            min: 0,
            max: 0,
            avg: 0,
            median: 0,
            p90: 0 // 90th percentile
        };
        this.trained = false;
    }

    /**
     * Calculate percentile of sorted array
     * @param {Array<number>} sortedData - Sorted array of values
     * @param {number} percentile - Percentile to calculate (0-1)
     * @returns {number} Percentile value
     */
    calculatePercentile(sortedData, percentile) {
        if (!sortedData || sortedData.length === 0) return 0;
        
        const index = Math.ceil(percentile * sortedData.length) - 1;
        return sortedData[Math.max(0, Math.min(index, sortedData.length - 1))];
    }

    /**
     * Calculate statistics for an array
     * @param {Array<number>} data - Array of values
     * @returns {Object} Statistics object
     */
    calculateStats(data) {
        if (!data || data.length === 0) return {
            min: 0, max: 0, avg: 0, median: 0, p90: 0
        };
        
        const sortedData = [...data].sort((a, b) => a - b);
        const sum = data.reduce((total, val) => total + val, 0);
        
        return {
            min: sortedData[0],
            max: sortedData[sortedData.length - 1],
            avg: sum / data.length,
            median: this.calculatePercentile(sortedData, 0.5),
            p90: this.calculatePercentile(sortedData, 0.9)
        };
    }

    /**
     * Train the recommender on historical spending data
     * @param {Array} transactions - Array of transaction objects
     */
    train(transactions) {
        if (!transactions || transactions.length === 0) {
            throw new Error('No transaction data provided');
        }
        
        // Group spending by category
        const categoryAmounts = {};
        const totalAmounts = [];
        
        transactions.forEach(transaction => {
            const category = transaction.category || 'uncategorized';
            const amount = Math.abs(transaction.amount);
            
            if (!categoryAmounts[category]) {
                categoryAmounts[category] = [];
            }
            
            categoryAmounts[category].push(amount);
            totalAmounts.push(amount);
        });
        
        // Calculate statistics for each category
        this.categoryStats = {};
        Object.keys(categoryAmounts).forEach(category => {
            this.categoryStats[category] = {
                ...this.calculateStats(categoryAmounts[category]),
                count: categoryAmounts[category].length,
                total: categoryAmounts[category].reduce((sum, val) => sum + val, 0)
            };
        });
        
        // Calculate overall statistics
        this.totalStats = {
            ...this.calculateStats(totalAmounts),
            count: totalAmounts.length,
            total: totalAmounts.reduce((sum, val) => sum + val, 0)
        };
        
        this.trained = true;
        
        return {
            categoryStats: this.categoryStats,
            totalStats: this.totalStats
        };
    }

    /**
     * Generate budget recommendations based on spending history
     * @returns {Object} Budget recommendations by category
     */
    recommendBudgets() {
        if (!this.trained) {
            throw new Error('Model must be trained before making recommendations');
        }
        
        const recommendations = {};
        
        // For each category, recommend a budget
        Object.keys(this.categoryStats).forEach(category => {
            const stats = this.categoryStats[category];
            
            // Skip categories with too few transactions
            if (stats.count < 3) return;
            
            // Calculate monthly average (assuming data covers enough time)
            const monthlyEstimate = stats.avg * 30; // Rough estimate
            
            // Use 90th percentile with buffer for recommendations
            const bufferMultiplier = 1 + this.buffer;
            
            recommendations[category] = {
                conservative: Math.round(stats.median * bufferMultiplier),
                moderate: Math.round(stats.avg * bufferMultiplier),
                aggressive: Math.round(stats.p90 * bufferMultiplier),
                monthly: Math.round(monthlyEstimate * bufferMultiplier)
            };
        });
        
        // Add overall recommendation
        recommendations.total = {
            conservative: Math.round(this.totalStats.median * (1 + this.buffer)),
            moderate: Math.round(this.totalStats.avg * (1 + this.buffer)),
            aggressive: Math.round(this.totalStats.p90 * (1 + this.buffer)),
            monthly: Math.round(this.totalStats.avg * 30 * (1 + this.buffer))
        };
        
        return recommendations;
    }

    /**
     * Recommend a specific budget level for a category
     * @param {string} category - Expense category
     * @param {string} level - Budget level (conservative, moderate, aggressive)
     * @returns {number} Recommended budget amount
     */
    recommendCategoryBudget(category, level = 'moderate') {
        if (!this.trained) {
            throw new Error('Model must be trained before making recommendations');
        }
        
        // If category doesn't exist, use total
        const stats = this.categoryStats[category] || this.totalStats;
        const bufferMultiplier = 1 + this.buffer;
        
        switch (level) {
            case 'conservative':
                return Math.round(stats.median * bufferMultiplier);
            case 'aggressive':
                return Math.round(stats.p90 * bufferMultiplier);
            case 'monthly':
                return Math.round(stats.avg * 30 * bufferMultiplier);
            case 'moderate':
            default:
                return Math.round(stats.avg * bufferMultiplier);
        }
    }
}

/**
 * Trend-aware budget recommender
 * Considers spending trends over time for recommendations
 */
class TrendAwareBudgetRecommender {
    constructor(weightRecent = 0.7, safetyMargin = 0.15) {
        this.weightRecent = weightRecent; // Weight for recent spending (0-1)
        this.safetyMargin = safetyMargin; // Safety margin percentage
        this.categoryTrends = {};
        this.trained = false;
        this.monthlyData = {}; // Track monthly spending
    }

    /**
     * Group transactions by month and category
     * @param {Array} transactions - Transaction objects with date and amount
     * @returns {Object} Grouped data by month and category
     */
    groupByMonthAndCategory(transactions) {
        const grouped = {};
        
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const month = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const category = transaction.category || 'uncategorized';
            const amount = Math.abs(transaction.amount);
            
            if (!grouped[month]) {
                grouped[month] = {};
            }
            
            if (!grouped[month][category]) {
                grouped[month][category] = {
                    total: 0,
                    count: 0,
                    transactions: []
                };
            }
            
            grouped[month][category].total += amount;
            grouped[month][category].count++;
            grouped[month][category].transactions.push(transaction);
        });
        
        return grouped;
    }

    /**
     * Train the recommender on historical spending data
     * @param {Array} transactions - Array of transaction objects
     */
    train(transactions) {
        if (!transactions || transactions.length === 0) {
            throw new Error('No transaction data provided');
        }
        
        // Sort transactions by date
        const sortedTransactions = [...transactions].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );
        
        // Group by month and category
        this.monthlyData = this.groupByMonthAndCategory(sortedTransactions);
        
        // Extract months in chronological order
        const months = Object.keys(this.monthlyData).sort();
        
        // Calculate trends per category
        this.categoryTrends = {};
        
        // Get all unique categories
        const allCategories = new Set();
        Object.values(this.monthlyData).forEach(monthData => {
            Object.keys(monthData).forEach(category => {
                allCategories.add(category);
            });
        });
        
        // For each category, analyze trend
        allCategories.forEach(category => {
            const monthlySeries = [];
            
            months.forEach(month => {
                if (this.monthlyData[month][category]) {
                    monthlySeries.push({
                        month,
                        total: this.monthlyData[month][category].total,
                        count: this.monthlyData[month][category].count,
                        average: this.monthlyData[month][category].total / this.monthlyData[month][category].count
                    });
                } else {
                    monthlySeries.push({
                        month,
                        total: 0,
                        count: 0,
                        average: 0
                    });
                }
            });
            
            // Calculate trend: recent months vs older months
            const halfPoint = Math.max(1, Math.floor(monthlySeries.length / 2));
            const recentMonths = monthlySeries.slice(-halfPoint);
            const olderMonths = monthlySeries.slice(0, -halfPoint);
            
            // Calculate recent and old averages, handling empty arrays
            const recentMonthsWithData = recentMonths.filter(m => m.count > 0);
            const olderMonthsWithData = olderMonths.filter(m => m.count > 0);
            
            const recentAvg = recentMonthsWithData.length > 0 ? 
                recentMonthsWithData.reduce((sum, m) => sum + m.total, 0) / recentMonthsWithData.length : 0;
                
            const olderAvg = olderMonthsWithData.length > 0 ? 
                olderMonthsWithData.reduce((sum, m) => sum + m.total, 0) / olderMonthsWithData.length : 0;
            
            // Calculate trend percentage
            let trendPercentage = 0;
            if (olderAvg > 0 && recentAvg > 0) {
                trendPercentage = (recentAvg - olderAvg) / olderAvg;
            }
            
            // Last month's spending
            const lastMonth = monthlySeries[monthlySeries.length - 1];
            
            this.categoryTrends[category] = {
                monthlySeries,
                recentAvg,
                olderAvg,
                trendPercentage,
                lastMonthTotal: lastMonth ? lastMonth.total : 0,
                monthsWithData: monthlySeries.filter(m => m.count > 0).length
            };
        });
        
        this.trained = true;
        
        return this.categoryTrends;
    }

    /**
     * Generate budget recommendations considering trends
     * @returns {Object} Budget recommendations
     */
    recommendBudgets() {
        if (!this.trained) {
            throw new Error('Model must be trained before making recommendations');
        }
        
        const recommendations = {};
        
        Object.keys(this.categoryTrends).forEach(category => {
            const trend = this.categoryTrends[category];
            
            // Skip categories with insufficient data
            if (trend.monthsWithData < 2) return;
            
            // Weight recent spending more than older spending
            const weightedAvg = (trend.recentAvg * this.weightRecent) + 
                              (trend.olderAvg * (1 - this.weightRecent));
            
            // Apply safety margin
            const safetyMultiplier = 1 + this.safetyMargin;
            
            // Adjust for trend
            let trendMultiplier = 1;
            if (trend.trendPercentage > 0) {
                // Upward trend, add a bit more buffer
                trendMultiplier += Math.min(trend.trendPercentage, 0.2);
            }
            
            // Generate recommendations
            recommendations[category] = {
                conservative: Math.round(weightedAvg * safetyMultiplier),
                trendAware: Math.round(weightedAvg * safetyMultiplier * trendMultiplier),
                lastMonth: Math.round(trend.lastMonthTotal),
                trend: trend.trendPercentage > 0 ? 'increasing' : 
                       (trend.trendPercentage < 0 ? 'decreasing' : 'stable'),
                trendPercent: Math.abs(Math.round(trend.trendPercentage * 100))
            };
        });
        
        return recommendations;
    }

    /**
     * Get spending trend analysis by category
     * @returns {Object} Trend analysis by category
     */
    getTrendAnalysis() {
        if (!this.trained) {
            throw new Error('Model must be trained before analysis');
        }
        
        const analysis = {};
        
        Object.keys(this.categoryTrends).forEach(category => {
            const trend = this.categoryTrends[category];
            
            // Skip categories with insufficient data
            if (trend.monthsWithData < 2) return;
            
            // Classify the trend
            let trendType = 'stable';
            if (trend.trendPercentage > 0.1) {
                trendType = 'significantly_increasing';
            } else if (trend.trendPercentage > 0.03) {
                trendType = 'slightly_increasing';
            } else if (trend.trendPercentage < -0.1) {
                trendType = 'significantly_decreasing';
            } else if (trend.trendPercentage < -0.03) {
                trendType = 'slightly_decreasing';
            }
            
            analysis[category] = {
                trendType,
                trendPercentage: trend.trendPercentage,
                monthsAnalyzed: trend.monthsWithData,
                lastMonthSpending: trend.lastMonthTotal,
                averageMonthlySpending: (trend.recentAvg + trend.olderAvg) / 2
            };
        });
        
        return analysis;
    }
}

module.exports = {
    PercentileBudgetRecommender,
    TrendAwareBudgetRecommender
}; 
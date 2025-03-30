/**
 * Anomaly Detection Model
 * Identifies unusual spending patterns that might indicate fraud or mistakes
 */

const { normalizeData } = require('../utils/dataPreprocessing');

/**
 * Statistical anomaly detector using Z-score method
 */
class ZScoreAnomalyDetector {
    constructor(threshold = 2.5) {
        this.threshold = threshold; // Z-score threshold for anomaly
        this.mean = 0;
        this.stdDev = 0;
        this.trained = false;
    }

    /**
     * Calculate mean of an array
     * @param {Array<number>} data - Numeric array
     * @returns {number} Mean value
     */
    calculateMean(data) {
        if (!data || data.length === 0) return 0;
        return data.reduce((sum, val) => sum + val, 0) / data.length;
    }

    /**
     * Calculate standard deviation of an array
     * @param {Array<number>} data - Numeric array
     * @param {number} mean - Mean value
     * @returns {number} Standard deviation
     */
    calculateStdDev(data, mean) {
        if (!data || data.length <= 1) return 0;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        return Math.sqrt(variance);
    }

    /**
     * Train the detector on historical transaction data
     * @param {Array<number>} data - Array of transaction amounts
     */
    train(data) {
        if (!data || data.length < 2) {
            throw new Error('Insufficient data for training');
        }
        
        this.mean = this.calculateMean(data);
        this.stdDev = this.calculateStdDev(data, this.mean);
        this.trained = true;

        return {
            mean: this.mean,
            stdDev: this.stdDev
        };
    }

    /**
     * Calculate z-score for a value
     * @param {number} value - Value to check
     * @returns {number} Z-score
     */
    calculateZScore(value) {
        if (this.stdDev === 0) return 0;
        return Math.abs((value - this.mean) / this.stdDev);
    }

    /**
     * Detect anomalies in a dataset
     * @param {Array<number>} data - Array of values to check
     * @returns {Array<Object>} Array of anomalies with indices and scores
     */
    detect(data) {
        if (!this.trained) {
            throw new Error('Model must be trained before anomaly detection');
        }
        
        const anomalies = [];
        
        data.forEach((value, index) => {
            const zScore = this.calculateZScore(value);
            const isAnomaly = zScore > this.threshold;
            
            if (isAnomaly) {
                anomalies.push({
                    index,
                    value,
                    zScore,
                    deviation: value - this.mean
                });
            }
        });
        
        return anomalies;
    }

    /**
     * Detect anomalies in transaction data
     * @param {Array} transactions - Array of transaction objects
     * @param {string} amountField - Field name for the amount
     * @returns {Array} Transactions with anomaly flags
     */
    detectTransactionAnomalies(transactions, amountField = 'amount') {
        if (!this.trained) {
            throw new Error('Model must be trained before anomaly detection');
        }
        
        return transactions.map(transaction => {
            const amount = transaction[amountField] || 0;
            const zScore = this.calculateZScore(amount);
            const isAnomaly = zScore > this.threshold;
            
            return {
                ...transaction,
                isAnomaly,
                anomalyScore: zScore,
                deviation: amount - this.mean
            };
        });
    }
}

/**
 * IQR-based anomaly detector
 * Uses interquartile range to detect outliers
 */
class IQROutlierDetector {
    constructor(iqrMultiplier = 1.5) {
        this.iqrMultiplier = iqrMultiplier;
        this.q1 = 0;
        this.q3 = 0;
        this.iqr = 0;
        this.lowerBound = 0;
        this.upperBound = 0;
        this.trained = false;
    }

    /**
     * Calculate quartiles of a sorted array
     * @param {Array<number>} sortedData - Sorted array of values
     * @returns {Object} Q1, Q3, and IQR values
     */
    calculateQuartiles(sortedData) {
        if (!sortedData || sortedData.length === 0) {
            return { q1: 0, q3: 0, iqr: 0 };
        }
        
        const n = sortedData.length;
        const q1Index = Math.floor(n * 0.25);
        const q3Index = Math.floor(n * 0.75);
        
        const q1 = sortedData[q1Index];
        const q3 = sortedData[q3Index];
        const iqr = q3 - q1;
        
        return { q1, q3, iqr };
    }

    /**
     * Train the detector on historical transaction data
     * @param {Array<number>} data - Array of transaction amounts
     */
    train(data) {
        if (!data || data.length < 4) {
            throw new Error('Insufficient data for IQR calculation');
        }
        
        // Sort data for quartile calculation
        const sortedData = [...data].sort((a, b) => a - b);
        
        const { q1, q3, iqr } = this.calculateQuartiles(sortedData);
        this.q1 = q1;
        this.q3 = q3;
        this.iqr = iqr;
        
        // Calculate bounds
        this.lowerBound = q1 - (iqr * this.iqrMultiplier);
        this.upperBound = q3 + (iqr * this.iqrMultiplier);
        
        this.trained = true;
        
        return {
            q1: this.q1,
            q3: this.q3,
            iqr: this.iqr,
            lowerBound: this.lowerBound,
            upperBound: this.upperBound
        };
    }

    /**
     * Detect outliers in a dataset
     * @param {Array<number>} data - Array of values to check
     * @returns {Array<Object>} Array of outliers with indices and values
     */
    detect(data) {
        if (!this.trained) {
            throw new Error('Model must be trained before outlier detection');
        }
        
        const outliers = [];
        
        data.forEach((value, index) => {
            const isOutlier = value < this.lowerBound || value > this.upperBound;
            
            if (isOutlier) {
                outliers.push({
                    index,
                    value,
                    isHigh: value > this.upperBound,
                    isLow: value < this.lowerBound
                });
            }
        });
        
        return outliers;
    }

    /**
     * Detect outliers in transaction data
     * @param {Array} transactions - Array of transaction objects
     * @param {string} amountField - Field name for the amount
     * @returns {Array} Transactions with outlier flags
     */
    detectTransactionOutliers(transactions, amountField = 'amount') {
        if (!this.trained) {
            throw new Error('Model must be trained before outlier detection');
        }
        
        return transactions.map(transaction => {
            const amount = transaction[amountField] || 0;
            const isOutlier = amount < this.lowerBound || amount > this.upperBound;
            const isHigh = amount > this.upperBound;
            const isLow = amount < this.lowerBound;
            
            return {
                ...transaction,
                isOutlier,
                isHighOutlier: isHigh,
                isLowOutlier: isLow,
                deviation: isHigh ? amount - this.upperBound : (isLow ? amount - this.lowerBound : 0)
            };
        });
    }
}

/**
 * Pattern-based anomaly detector for spending patterns
 */
class SpendingPatternDetector {
    constructor() {
        this.userPatterns = {
            dailyAverages: Array(7).fill(0), // Daily spending patterns
            merchantFrequency: {}, // How often user uses each merchant
            averageAmountByMerchant: {}, // Average spend by merchant
            timeBetweenTransactions: 0, // Average days between transactions
            lastTransactionDates: {} // Last transaction date by merchant
        };
        this.trained = false;
    }

    /**
     * Extract merchant name from transaction
     * @param {Object} transaction - Transaction object
     * @returns {string} Merchant name or null
     */
    extractMerchant(transaction) {
        if (!transaction.description) return 'unknown';
        
        // Simple merchant extraction - take first word of description
        const words = transaction.description.toLowerCase().split(/\s+/);
        return words[0] || 'unknown';
    }

    /**
     * Train the detector on historical transaction data
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
        
        // Initialize counters
        const dailyTotals = Array(7).fill(0);
        const dailyCounts = Array(7).fill(0);
        const merchantTotals = {};
        const merchantCounts = {};
        const merchantLastDates = {};
        const timeBetweenTxs = [];
        
        // Process each transaction
        sortedTransactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const dayOfWeek = date.getDay();
            const amount = Math.abs(transaction.amount);
            const merchant = this.extractMerchant(transaction);
            
            // Update daily patterns
            dailyTotals[dayOfWeek] += amount;
            dailyCounts[dayOfWeek]++;
            
            // Update merchant patterns
            if (!merchantTotals[merchant]) {
                merchantTotals[merchant] = 0;
                merchantCounts[merchant] = 0;
            }
            merchantTotals[merchant] += amount;
            merchantCounts[merchant]++;
            
            // Calculate time between transactions for same merchant
            if (merchantLastDates[merchant]) {
                const lastDate = new Date(merchantLastDates[merchant]);
                const daysBetween = (date - lastDate) / (1000 * 60 * 60 * 24);
                if (daysBetween > 0) {
                    timeBetweenTxs.push(daysBetween);
                }
            }
            merchantLastDates[merchant] = date;
        });
        
        // Calculate averages
        for (let i = 0; i < 7; i++) {
            this.userPatterns.dailyAverages[i] = dailyCounts[i] > 0 ? 
                dailyTotals[i] / dailyCounts[i] : 0;
        }
        
        Object.keys(merchantTotals).forEach(merchant => {
            this.userPatterns.merchantFrequency[merchant] = merchantCounts[merchant] / sortedTransactions.length;
            this.userPatterns.averageAmountByMerchant[merchant] = merchantTotals[merchant] / merchantCounts[merchant];
        });
        
        this.userPatterns.timeBetweenTransactions = timeBetweenTxs.length > 0 ? 
            timeBetweenTxs.reduce((sum, val) => sum + val, 0) / timeBetweenTxs.length : 0;
            
        this.userPatterns.lastTransactionDates = merchantLastDates;
        
        this.trained = true;
        
        return this.userPatterns;
    }

    /**
     * Detect anomalies in new transactions
     * @param {Array} transactions - New transactions to check
     * @returns {Array} Transactions with anomaly scores
     */
    detectAnomalies(transactions) {
        if (!this.trained) {
            throw new Error('Model must be trained before anomaly detection');
        }
        
        return transactions.map(transaction => {
            const anomalyScores = {};
            let overallScore = 0;
            const date = new Date(transaction.date);
            const dayOfWeek = date.getDay();
            const amount = Math.abs(transaction.amount);
            const merchant = this.extractMerchant(transaction);
            
            // Check amount vs daily average
            const dailyAvg = this.userPatterns.dailyAverages[dayOfWeek];
            if (dailyAvg > 0) {
                const dailyRatio = amount / dailyAvg;
                anomalyScores.dailyPattern = dailyRatio > 3 ? (dailyRatio - 3) / 7 : 0;
                overallScore += anomalyScores.dailyPattern;
            }
            
            // Check merchant spending pattern
            if (this.userPatterns.averageAmountByMerchant[merchant]) {
                const merchantAvg = this.userPatterns.averageAmountByMerchant[merchant];
                const merchantRatio = amount / merchantAvg;
                anomalyScores.merchantAmount = merchantRatio > 2 ? (merchantRatio - 2) / 8 : 0;
                overallScore += anomalyScores.merchantAmount * 1.5; // Higher weight for merchant anomalies
            } else {
                // New merchant is slightly anomalous
                anomalyScores.newMerchant = 0.3;
                overallScore += anomalyScores.newMerchant;
            }
            
            // Check transaction frequency
            if (this.userPatterns.lastTransactionDates[merchant]) {
                const lastDate = new Date(this.userPatterns.lastTransactionDates[merchant]);
                const daysBetween = (date - lastDate) / (1000 * 60 * 60 * 24);
                
                if (daysBetween < 1 && this.userPatterns.timeBetweenTransactions > 7) {
                    // Unusually frequent transaction
                    anomalyScores.frequency = 0.5;
                    overallScore += anomalyScores.frequency;
                }
            }
            
            // Normalize overall score to 0-1 range
            overallScore = Math.min(overallScore, 1);
            
            return {
                ...transaction,
                anomalyScores,
                overallAnomalyScore: overallScore,
                isAnomaly: overallScore > 0.5
            };
        });
    }
}

module.exports = {
    ZScoreAnomalyDetector,
    IQROutlierDetector,
    SpendingPatternDetector
}; 
/**
 * ML Service
 * Coordinates ML models and provides a unified interface for the application
 */

// Import ML models
const { SimpleLinearRegression, MovingAverageModel, SeasonalExpensePrediction } = require('../models/expensePrediction');
const { NaiveBayesClassifier, RuleBasedCategorizer } = require('../models/smartCategorization');
const { ZScoreAnomalyDetector, IQROutlierDetector, SpendingPatternDetector } = require('../models/anomalyDetection');
const { PercentileBudgetRecommender, TrendAwareBudgetRecommender } = require('../models/budgetRecommendation');
const { SpendingPatternOptimizer, ComparativeSpendingAnalyzer } = require('../models/expenseOptimization');
const { prepareTransactionData } = require('../utils/dataPreprocessing');

/**
 * ML Service class
 * Manages all ML models and provides a unified interface for the application
 */
class MLService {
    constructor() {
        // Initialize models
        this.expensePrediction = {
            seasonal: new SeasonalExpensePrediction(),
            linear: new SimpleLinearRegression(),
            movingAvg: new MovingAverageModel(5) // 5-day window
        };
        
        this.categorization = {
            naiveBayes: new NaiveBayesClassifier(),
            rulebased: new RuleBasedCategorizer()
        };
        
        this.anomalyDetection = {
            zscore: new ZScoreAnomalyDetector(2.5), // 2.5 std dev threshold
            iqr: new IQROutlierDetector(1.5), // 1.5 IQR multiplier
            pattern: new SpendingPatternDetector()
        };
        
        this.budgetRecommendation = {
            percentile: new PercentileBudgetRecommender(0.15), // 15% buffer
            trend: new TrendAwareBudgetRecommender(0.7, 0.1) // 70% weight on recent, 10% margin
        };
        
        this.optimization = {
            patterns: new SpendingPatternOptimizer(),
            comparative: new ComparativeSpendingAnalyzer()
        };
        
        this.modelsInitialized = false;
        this.trainingData = null;
    }

    /**
     * Initialize all models with the provided transaction data
     * @param {Array} transactions - Array of transaction objects
     * @returns {Object} Training results
     */
    async initialize(transactions) {
        if (!transactions || transactions.length === 0) {
            throw new Error('No transaction data provided for initialization');
        }
        
        this.trainingData = prepareTransactionData(transactions);
        const results = {};
        
        // Train expense prediction models
        try {
            results.expensePrediction = await this.trainExpensePredictionModels(transactions);
        } catch (error) {
            console.error('Error training expense prediction models:', error);
            results.expensePrediction = { error: error.message };
        }
        
        // Train categorization models
        try {
            results.categorization = await this.trainCategorizationModels(transactions);
        } catch (error) {
            console.error('Error training categorization models:', error);
            results.categorization = { error: error.message };
        }
        
        // Train anomaly detection models
        try {
            results.anomalyDetection = await this.trainAnomalyDetectionModels(transactions);
        } catch (error) {
            console.error('Error training anomaly detection models:', error);
            results.anomalyDetection = { error: error.message };
        }
        
        // Train budget recommendation models
        try {
            results.budgetRecommendation = await this.trainBudgetRecommendationModels(transactions);
        } catch (error) {
            console.error('Error training budget recommendation models:', error);
            results.budgetRecommendation = { error: error.message };
        }
        
        // Train optimization models
        try {
            results.optimization = await this.trainOptimizationModels(transactions);
        } catch (error) {
            console.error('Error training optimization models:', error);
            results.optimization = { error: error.message };
        }
        
        this.modelsInitialized = true;
        return results;
    }

    /**
     * Train expense prediction models
     * @param {Array} transactions - Transaction data
     * @returns {Object} Training results
     */
    async trainExpensePredictionModels(transactions) {
        // Train seasonal prediction model
        this.expensePrediction.seasonal.train(transactions);
        
        // Train linear regression model using time series data
        if (transactions.length >= 10) {
            const amounts = transactions.map(t => t.amount);
            const indices = Array.from({ length: amounts.length }, (_, i) => i);
            this.expensePrediction.linear.train(indices, amounts);
        }
        
        // Update moving average model
        if (transactions.length >= 3) {
            const amounts = transactions.map(t => t.amount);
            this.expensePrediction.movingAvg.update(amounts);
        }
        
        return {
            seasonal: true,
            linear: transactions.length >= 10,
            movingAvg: transactions.length >= 3
        };
    }

    /**
     * Train categorization models
     * @param {Array} transactions - Transaction data
     * @returns {Object} Training results
     */
    async trainCategorizationModels(transactions) {
        // Filter transactions with categories for training
        const categorizedTransactions = transactions.filter(t => t.category);
        
        if (categorizedTransactions.length >= 10) {
            // Prepare training data for naive bayes
            const trainingData = categorizedTransactions.map(t => ({
                description: t.description || '',
                category: t.category
            }));
            
            // Train naive bayes classifier
            this.categorization.naiveBayes.train(trainingData);
        }
        
        // Train rule-based categorizer
        this.categorization.rulebased.train(categorizedTransactions);
        
        return {
            naiveBayes: categorizedTransactions.length >= 10,
            rulebased: true
        };
    }

    /**
     * Train anomaly detection models
     * @param {Array} transactions - Transaction data
     * @returns {Object} Training results
     */
    async trainAnomalyDetectionModels(transactions) {
        const amounts = transactions.map(t => Math.abs(t.amount));
        
        // Train z-score detector
        if (amounts.length >= 10) {
            this.anomalyDetection.zscore.train(amounts);
        }
        
        // Train IQR detector
        if (amounts.length >= 10) {
            this.anomalyDetection.iqr.train(amounts);
        }
        
        // Train pattern detector
        if (transactions.length >= 10) {
            this.anomalyDetection.pattern.train(transactions);
        }
        
        return {
            zscore: amounts.length >= 10,
            iqr: amounts.length >= 10,
            pattern: transactions.length >= 10
        };
    }

    /**
     * Train budget recommendation models
     * @param {Array} transactions - Transaction data
     * @returns {Object} Training results
     */
    async trainBudgetRecommendationModels(transactions) {
        // Train percentile-based recommender
        if (transactions.length >= 10) {
            this.budgetRecommendation.percentile.train(transactions);
        }
        
        // Train trend-aware recommender
        if (transactions.length >= 15) {
            this.budgetRecommendation.trend.train(transactions);
        }
        
        return {
            percentile: transactions.length >= 10,
            trend: transactions.length >= 15
        };
    }

    /**
     * Train optimization models
     * @param {Array} transactions - Transaction data
     * @returns {Object} Training results
     */
    async trainOptimizationModels(transactions) {
        // Train spending pattern optimizer
        if (transactions.length >= 10) {
            this.optimization.patterns.train(transactions);
        }
        
        // Train comparative spending analyzer
        if (transactions.length >= 15) {
            this.optimization.comparative.train(transactions, 90); // 90-day period
        }
        
        return {
            patterns: transactions.length >= 10,
            comparative: transactions.length >= 15
        };
    }

    /**
     * Predict future expenses
     * @param {number} days - Number of days to predict
     * @returns {Object} Predictions
     */
    predictExpenses(days = 7) {
        if (!this.modelsInitialized) {
            throw new Error('Models must be initialized before making predictions');
        }
        
        const predictions = {
            seasonal: this.expensePrediction.seasonal.predictNextDays(days),
            movingAverage: this.expensePrediction.movingAvg.predict(days)
        };
        
        // Add linear regression predictions if possible
        if (this.trainingData && this.trainingData.amounts.length >= 10) {
            const lastIndex = this.trainingData.amounts.length - 1;
            const futureDays = Array.from({ length: days }, (_, i) => lastIndex + i + 1);
            predictions.linear = this.expensePrediction.linear.predict(futureDays);
        }
        
        return predictions;
    }

    /**
     * Categorize transactions automatically
     * @param {Array} transactions - Transactions to categorize
     * @returns {Array} Categorized transactions
     */
    categorizeTransactions(transactions) {
        if (!this.modelsInitialized) {
            throw new Error('Models must be initialized before categorization');
        }
        
        // Use rule-based categorizer as fallback
        const results = this.categorization.rulebased.categorizeBatch(transactions);
        
        // If naive bayes is trained, use it for higher confidence
        if (this.categorization.naiveBayes.trained) {
            const nbResults = this.categorization.naiveBayes.predictBatch(transactions);
            
            // Merge results, preferring naive bayes when confidence is high
            return results.map((result, i) => {
                const nbResult = nbResults[i];
                if (nbResult.confidence > 0.7 && nbResult.confidence > result.confidence) {
                    return {
                        ...result,
                        predictedCategory: nbResult.category,
                        confidence: nbResult.confidence,
                        method: 'naive_bayes'
                    };
                } else {
                    return {
                        ...result,
                        method: 'rule_based'
                    };
                }
            });
        }
        
        return results;
    }

    /**
     * Detect anomalies in transactions
     * @param {Array} transactions - Transactions to check for anomalies
     * @returns {Array} Transactions with anomaly flags
     */
    detectAnomalies(transactions) {
        if (!this.modelsInitialized) {
            throw new Error('Models must be initialized before anomaly detection');
        }
        
        let results = [];
        
        // Start with pattern-based detection for better context-aware detection
        if (this.anomalyDetection.pattern.trained) {
            results = this.anomalyDetection.pattern.detectAnomalies(transactions);
        } else if (this.anomalyDetection.zscore.trained) {
            // Fallback to z-score detection
            results = this.anomalyDetection.zscore.detectTransactionAnomalies(transactions);
        } else if (this.anomalyDetection.iqr.trained) {
            // Fallback to IQR detection
            results = this.anomalyDetection.iqr.detectTransactionOutliers(transactions);
        } else {
            // No trained models, return original transactions
            results = transactions;
        }
        
        return results;
    }

    /**
     * Generate budget recommendations
     * @returns {Object} Budget recommendations
     */
    recommendBudgets() {
        if (!this.modelsInitialized) {
            throw new Error('Models must be initialized before recommending budgets');
        }
        
        const recommendations = {};
        
        // Get percentile-based recommendations
        if (this.budgetRecommendation.percentile.trained) {
            recommendations.standard = this.budgetRecommendation.percentile.recommendBudgets();
        }
        
        // Get trend-aware recommendations if available
        if (this.budgetRecommendation.trend.trained) {
            recommendations.trendAware = this.budgetRecommendation.trend.recommendBudgets();
            recommendations.trendAnalysis = this.budgetRecommendation.trend.getTrendAnalysis();
        }
        
        return recommendations;
    }

    /**
     * Generate expense optimization suggestions
     * @returns {Object} Optimization suggestions
     */
    optimizeExpenses() {
        if (!this.modelsInitialized) {
            throw new Error('Models must be initialized before optimization');
        }
        
        const results = {};
        
        // Get pattern-based optimization recommendations
        if (this.optimization.patterns.trained) {
            results.patterns = this.optimization.patterns.generateRecommendations();
        }
        
        // Get comparative optimization suggestions if available
        if (this.optimization.comparative.trained) {
            results.comparative = this.optimization.comparative.generateOptimizationSuggestions();
        }
        
        return results;
    }

    /**
     * Generate savings plan to reach a target amount
     * @param {number} targetSavings - Target savings amount
     * @returns {Array} Savings suggestions
     */
    generateSavingsPlan(targetSavings) {
        if (!this.modelsInitialized) {
            throw new Error('Models must be initialized before generating savings plan');
        }
        
        if (!this.optimization.patterns.trained) {
            throw new Error('Optimization models must be trained before generating savings plan');
        }
        
        return this.optimization.patterns.suggestSavings(targetSavings);
    }
}

module.exports = new MLService(); 
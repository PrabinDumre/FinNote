/**
 * Expense Prediction Model
 * Predicts future expenses based on historical spending patterns
 */

const { normalizeData, createTimeSeriesData } = require('../utils/dataPreprocessing');

/**
 * Linear regression model without external libraries
 * Simple implementation that can run in Node.js without TensorFlow
 */
class SimpleLinearRegression {
    constructor() {
        this.slope = 0;
        this.intercept = 0;
        this.trained = false;
    }

    /**
     * Train the model on historical data
     * @param {Array<number>} x - Independent variables (e.g., time indices)
     * @param {Array<number>} y - Dependent variables (e.g., expense amounts)
     */
    train(x, y) {
        if (x.length !== y.length || x.length === 0) {
            throw new Error('Input arrays must have the same non-zero length');
        }

        const n = x.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumXX += x[i] * x[i];
        }

        this.slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        this.intercept = (sumY - this.slope * sumX) / n;
        this.trained = true;

        return {
            slope: this.slope,
            intercept: this.intercept
        };
    }

    /**
     * Predict future values
     * @param {Array<number>|number} x - Input value(s) to predict
     * @returns {Array<number>|number} - Predicted value(s)
     */
    predict(x) {
        if (!this.trained) {
            throw new Error('Model must be trained before making predictions');
        }

        if (Array.isArray(x)) {
            return x.map(val => this.slope * val + this.intercept);
        }
        return this.slope * x + this.intercept;
    }
}

/**
 * Moving Average model for time series forecasting
 */
class MovingAverageModel {
    constructor(windowSize = 3) {
        this.windowSize = windowSize;
        this.data = [];
    }

    /**
     * Update model with new data
     * @param {Array<number>} data - Historical expense data
     */
    update(data) {
        this.data = data.slice(-this.windowSize * 3); // Keep a reasonable amount of history
    }

    /**
     * Predict the next n values
     * @param {number} steps - Number of steps to predict ahead
     * @returns {Array<number>} Predicted values
     */
    predict(steps = 1) {
        if (this.data.length === 0) {
            throw new Error('No data available for prediction');
        }

        const result = [];
        const workingData = [...this.data];

        for (let i = 0; i < steps; i++) {
            // Calculate moving average of the last windowSize elements
            const lastWindow = workingData.slice(-this.windowSize);
            const prediction = lastWindow.reduce((sum, val) => sum + val, 0) / this.windowSize;
            
            // Add prediction to result and working data
            result.push(prediction);
            workingData.push(prediction);
        }

        return result;
    }
}

/**
 * Seasonal expense prediction model
 * Accounts for weekly and monthly patterns
 */
class SeasonalExpensePrediction {
    constructor() {
        this.dailyAverages = Array(7).fill(0); // One for each day of week
        this.monthlyAverages = Array(12).fill(0); // One for each month
        this.overallAverage = 0;
        this.dailyCounts = Array(7).fill(0);
        this.monthlyCounts = Array(12).fill(0);
        this.totalCount = 0;
    }

    /**
     * Train the model on historical transaction data
     * @param {Array} transactions - Array of transaction objects with date and amount
     */
    train(transactions) {
        if (!transactions || transactions.length === 0) {
            throw new Error('No transaction data provided');
        }

        // Calculate averages by day of week and month
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const dayOfWeek = date.getDay();
            const month = date.getMonth();
            const amount = Math.abs(transaction.amount); // Use absolute value for expenses
            
            this.dailyAverages[dayOfWeek] += amount;
            this.monthlyAverages[month] += amount;
            this.overallAverage += amount;
            
            this.dailyCounts[dayOfWeek]++;
            this.monthlyCounts[month]++;
            this.totalCount++;
        });

        // Normalize averages
        for (let i = 0; i < 7; i++) {
            this.dailyAverages[i] = this.dailyCounts[i] > 0 ? 
                this.dailyAverages[i] / this.dailyCounts[i] : this.overallAverage / this.totalCount;
        }

        for (let i = 0; i < 12; i++) {
            this.monthlyAverages[i] = this.monthlyCounts[i] > 0 ? 
                this.monthlyAverages[i] / this.monthlyCounts[i] : this.overallAverage / this.totalCount;
        }

        this.overallAverage /= this.totalCount;
    }

    /**
     * Predict expense for a future date
     * @param {Date} date - Date to predict expense for
     * @returns {number} Predicted expense amount
     */
    predict(date) {
        const dayOfWeek = date.getDay();
        const month = date.getMonth();
        
        // Combine daily and monthly patterns
        const dailyFactor = this.dailyAverages[dayOfWeek] / this.overallAverage;
        const monthlyFactor = this.monthlyAverages[month] / this.overallAverage;
        
        // Return prediction as a weighted average
        return this.overallAverage * 0.4 + 
               this.dailyAverages[dayOfWeek] * 0.3 + 
               this.monthlyAverages[month] * 0.3;
    }

    /**
     * Predict expenses for the next n days
     * @param {number} days - Number of days to predict ahead
     * @returns {Array} Array of predicted amounts with dates
     */
    predictNextDays(days = 7) {
        const predictions = [];
        const today = new Date();
        
        for (let i = 1; i <= days; i++) {
            const nextDate = new Date(today);
            nextDate.setDate(today.getDate() + i);
            const amount = this.predict(nextDate);
            
            predictions.push({
                date: nextDate,
                predictedAmount: amount
            });
        }
        
        return predictions;
    }
}

module.exports = {
    SimpleLinearRegression,
    MovingAverageModel,
    SeasonalExpensePrediction
}; 
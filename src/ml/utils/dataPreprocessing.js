/**
 * Data preprocessing utilities for ML models
 */

/**
 * Normalizes numeric data to range [0,1]
 * @param {Array<number>} data - Array of numeric values
 * @returns {Array<number>} Normalized data
 */
function normalizeData(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (max === min) return data.map(() => 0.5);
    return data.map(val => (val - min) / (max - min));
}

/**
 * Creates time series data for prediction models
 * @param {Array} data - Original data array
 * @param {number} timeSteps - Number of time steps to look back
 * @returns {Array} Arrays of [inputs, outputs] for training
 */
function createTimeSeriesData(data, timeSteps) {
    const X = [];
    const y = [];
    
    for (let i = timeSteps; i < data.length; i++) {
        X.push(data.slice(i - timeSteps, i));
        y.push(data[i]);
    }
    
    return [X, y];
}

/**
 * Extracts features from transaction descriptions using simple keyword analysis
 * @param {string} description - Transaction description
 * @returns {Object} Features extracted from description
 */
function extractTextFeatures(description) {
    const text = description.toLowerCase();
    
    // Category keywords
    const categories = {
        food: ['restaurant', 'food', 'grocery', 'meal', 'breakfast', 'lunch', 'dinner', 'cafe', 'snack'],
        transportation: ['transport', 'train', 'bus', 'uber', 'lyft', 'taxi', 'gas', 'fuel', 'car', 'auto'],
        shopping: ['shop', 'store', 'mall', 'amazon', 'purchase', 'buy', 'clothes', 'retail'],
        entertainment: ['movie', 'theater', 'game', 'subscription', 'netflix', 'spotify', 'entertainment'],
        utilities: ['utility', 'electric', 'water', 'gas', 'bill', 'phone', 'internet', 'service'],
        health: ['health', 'doctor', 'medicine', 'pharmacy', 'medical', 'hospital', 'clinic'],
        education: ['education', 'school', 'college', 'university', 'course', 'tuition', 'book'],
        housing: ['rent', 'mortgage', 'housing', 'apartment', 'repair', 'furniture']
    };
    
    // Check which categories match
    const features = {};
    Object.keys(categories).forEach(category => {
        features[category] = categories[category].some(keyword => text.includes(keyword)) ? 1 : 0;
    });
    
    return features;
}

/**
 * Prepares transaction data for training ML models
 * @param {Array} transactions - Raw transaction data
 * @returns {Object} Processed data ready for ML models
 */
function prepareTransactionData(transactions) {
    // Sort by date
    const sortedData = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Extract amounts and dates
    const amounts = sortedData.map(t => t.amount);
    const dates = sortedData.map(t => new Date(t.date));
    
    // Get day of week and month for each transaction
    const dayOfWeek = dates.map(d => d.getDay());
    const month = dates.map(d => d.getMonth());
    
    // Create time features
    const timeFeatures = dates.map((date, i) => ({
        amount: amounts[i],
        dayOfWeek: dayOfWeek[i],
        month: month[i],
        dayOfMonth: date.getDate(),
        // Add more features as needed
    }));
    
    return {
        rawData: sortedData,
        amounts,
        dates,
        timeFeatures
    };
}

module.exports = {
    normalizeData,
    createTimeSeriesData,
    extractTextFeatures,
    prepareTransactionData
}; 
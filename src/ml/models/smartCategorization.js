/**
 * Smart Categorization Model
 * Automatically categorizes transactions based on descriptions and patterns
 */

const { extractTextFeatures } = require('../utils/dataPreprocessing');

/**
 * Naive Bayes Classifier for transaction categorization
 */
class NaiveBayesClassifier {
    constructor() {
        this.categories = [];
        this.wordFrequencies = {};
        this.categoryCounts = {};
        this.vocabularySize = 0;
        this.totalDocuments = 0;
        this.trained = false;
    }

    /**
     * Tokenize and clean a transaction description
     * @param {string} description - Transaction description
     * @returns {Array<string>} Array of tokens
     */
    tokenize(description) {
        if (!description) return [];
        
        // Clean text: lowercase, remove special chars, split by spaces
        const text = description.toLowerCase().replace(/[^\w\s]/g, ' ');
        return text.split(/\s+/).filter(word => word.length > 1);
    }

    /**
     * Train the classifier on labeled transaction data
     * @param {Array} trainingData - Array of {description, category} objects
     */
    train(trainingData) {
        if (!trainingData || trainingData.length === 0) {
            throw new Error('No training data provided');
        }

        // Initialize data structures
        this.wordFrequencies = {};
        this.categoryCounts = {};
        this.vocabularySize = 0;
        this.totalDocuments = trainingData.length;
        
        // Count frequencies
        trainingData.forEach(({ description, category }) => {
            // Add category if not seen before
            if (!this.categories.includes(category)) {
                this.categories.push(category);
                this.wordFrequencies[category] = {};
                this.categoryCounts[category] = 0;
            }
            
            // Increment category count
            this.categoryCounts[category]++;
            
            // Process words in description
            const words = this.tokenize(description);
            words.forEach(word => {
                if (!this.wordFrequencies[category][word]) {
                    this.wordFrequencies[category][word] = 0;
                }
                this.wordFrequencies[category][word]++;
                this.vocabularySize++;
            });
        });
        
        this.trained = true;
    }

    /**
     * Calculate probability of a category
     * @param {string} category - Category name
     * @returns {number} Probability
     */
    calculatePriorProbability(category) {
        return this.categoryCounts[category] / this.totalDocuments;
    }

    /**
     * Calculate probability of a word given a category
     * @param {string} word - Word to evaluate
     * @param {string} category - Category name
     * @returns {number} Conditional probability
     */
    calculateWordProbability(word, category) {
        // Laplace smoothing to avoid zero probabilities
        const wordCount = this.wordFrequencies[category][word] || 0;
        const categoryWordCount = Object.values(this.wordFrequencies[category]).reduce((sum, count) => sum + count, 0);
        return (wordCount + 1) / (categoryWordCount + this.vocabularySize);
    }

    /**
     * Classify a transaction description
     * @param {string} description - Description to classify
     * @returns {Object} Classification result with category and confidence
     */
    classify(description) {
        if (!this.trained) {
            throw new Error('Model must be trained before classification');
        }

        const words = this.tokenize(description);
        const scores = {};
        
        // Calculate score for each category
        this.categories.forEach(category => {
            // Start with prior probability (in log space to avoid underflow)
            scores[category] = Math.log(this.calculatePriorProbability(category));
            
            // Add word probabilities
            words.forEach(word => {
                scores[category] += Math.log(this.calculateWordProbability(word, category));
            });
        });
        
        // Find category with highest score
        let bestCategory = this.categories[0];
        let bestScore = scores[bestCategory];
        
        this.categories.forEach(category => {
            if (scores[category] > bestScore) {
                bestScore = scores[category];
                bestCategory = category;
            }
        });
        
        // Calculate confidence score (normalize to 0-1)
        const totalScore = Object.values(scores).reduce((sum, score) => sum + Math.exp(score), 0);
        const confidence = Math.exp(bestScore) / totalScore;
        
        return {
            category: bestCategory,
            confidence
        };
    }

    /**
     * Predict categories for a batch of transactions
     * @param {Array} transactions - Array of transaction objects
     * @returns {Array} Transactions with predicted categories
     */
    predictBatch(transactions) {
        return transactions.map(transaction => {
            const description = transaction.description || '';
            const { category, confidence } = this.classify(description);
            
            return {
                ...transaction,
                predictedCategory: category,
                confidence
            };
        });
    }
}

/**
 * Rule-based classifier that uses keywords and patterns
 */
class RuleBasedCategorizer {
    constructor() {
        // Define category rules with keywords
        this.categoryRules = {
            food: ['restaurant', 'food', 'grocery', 'meal', 'breakfast', 'lunch', 'dinner', 'cafe', 'snack'],
            transportation: ['transport', 'train', 'bus', 'uber', 'lyft', 'taxi', 'gas', 'fuel', 'car', 'auto'],
            shopping: ['shop', 'store', 'mall', 'amazon', 'purchase', 'buy', 'clothes', 'retail'],
            entertainment: ['movie', 'theater', 'game', 'subscription', 'netflix', 'spotify', 'entertainment'],
            utilities: ['utility', 'electric', 'water', 'gas', 'bill', 'phone', 'internet', 'service'],
            health: ['health', 'doctor', 'medicine', 'pharmacy', 'medical', 'hospital', 'clinic'],
            education: ['education', 'school', 'college', 'university', 'course', 'tuition', 'book'],
            housing: ['rent', 'mortgage', 'housing', 'apartment', 'repair', 'furniture']
        };
        
        // Define common merchant mappings
        this.merchantMappings = {
            'amazon': 'shopping',
            'netflix': 'entertainment',
            'spotify': 'entertainment',
            'uber': 'transportation',
            'lyft': 'transportation',
            'starbucks': 'food',
            'mcdonald': 'food',
            'walmart': 'shopping',
            'target': 'shopping',
            'cvs': 'health',
            'walgreens': 'health'
        };
    }

    /**
     * Train the model with additional merchant mappings
     * @param {Array} transactions - Historical transactions with categories
     */
    train(transactions) {
        transactions.forEach(transaction => {
            if (transaction.description && transaction.category) {
                const merchantName = this.extractMerchantName(transaction.description);
                if (merchantName && !this.merchantMappings[merchantName]) {
                    this.merchantMappings[merchantName] = transaction.category;
                }
            }
        });
    }

    /**
     * Extract potential merchant name from description
     * @param {string} description - Transaction description
     * @returns {string|null} Merchant name or null
     */
    extractMerchantName(description) {
        if (!description) return null;
        
        // Try to extract merchant name: take first word, remove specials
        const words = description.toLowerCase().split(/\s+/);
        if (words.length > 0) {
            return words[0].replace(/[^\w]/g, '');
        }
        return null;
    }

    /**
     * Categorize a transaction based on its description
     * @param {string} description - Transaction description
     * @returns {Object} Classification with category and confidence
     */
    categorize(description) {
        if (!description) {
            return { category: 'other', confidence: 0 };
        }
        
        const text = description.toLowerCase();
        const merchantName = this.extractMerchantName(text);
        
        // Check direct merchant mapping first
        if (merchantName && this.merchantMappings[merchantName]) {
            return {
                category: this.merchantMappings[merchantName],
                confidence: 0.9 // High confidence for direct mapping
            };
        }
        
        // Check keyword matches
        const matches = {};
        let totalMatches = 0;
        
        Object.keys(this.categoryRules).forEach(category => {
            const keywords = this.categoryRules[category];
            let categoryMatches = 0;
            
            keywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    categoryMatches++;
                }
            });
            
            matches[category] = categoryMatches;
            totalMatches += categoryMatches;
        });
        
        // Find best category
        if (totalMatches === 0) {
            return { category: 'other', confidence: 0 };
        }
        
        let bestCategory = 'other';
        let maxMatches = 0;
        
        Object.keys(matches).forEach(category => {
            if (matches[category] > maxMatches) {
                maxMatches = matches[category];
                bestCategory = category;
            }
        });
        
        // Calculate confidence
        const confidence = totalMatches > 0 ? matches[bestCategory] / totalMatches : 0;
        
        return {
            category: bestCategory,
            confidence
        };
    }

    /**
     * Categorize a batch of transactions
     * @param {Array} transactions - Transactions to categorize
     * @returns {Array} Categorized transactions
     */
    categorizeBatch(transactions) {
        return transactions.map(transaction => {
            const { category, confidence } = this.categorize(transaction.description || '');
            
            return {
                ...transaction,
                predictedCategory: category,
                confidence
            };
        });
    }
}

module.exports = {
    NaiveBayesClassifier,
    RuleBasedCategorizer
}; 
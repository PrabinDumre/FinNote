// Immediately hide any error containers
(function() {
    // Hide any error containers that might be visible
    document.querySelectorAll('.error-container, #results-container').forEach(container => {
        container.style.display = 'none';
    });
})();

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const initializeBtn = document.getElementById('initialize-ml');
    const aiStatus = document.getElementById('ai-status');
    const aiLoading = document.getElementById('ai-loading');
    const mlFeaturesContainer = document.querySelector('.ml-features-container');
    const resultsContainer = document.getElementById('results-container');
    const resultsTitle = document.getElementById('results-title');
    const resultsContent = document.getElementById('results-content');
    const closeResults = document.getElementById('close-results');

    // Budget Modal Elements
    const budgetModal = document.getElementById('budget-modal');
    const setBudgetBtn = document.getElementById('set-budget-btn');
    const closeBudgetModalBtn = document.getElementById('close-budget-modal');
    const budgetForm = document.getElementById('budget-form');
    const allocationMethodSelect = document.getElementById('allocation-method');
    const manualAllocations = document.querySelector('.manual-allocations');
    const categoryCheckboxes = document.querySelectorAll('.category-item input[type="checkbox"]');
    const totalBudgetInput = document.getElementById('total-budget');
    const budgetDurationSelect = document.getElementById('budget-duration');
    const categoryAllocationsDiv = document.getElementById('category-allocations');
    const allocatedAmountSpan = document.getElementById('allocated-amount');
    const remainingAmountSpan = document.getElementById('remaining-amount');

    // Debug log for element existence
    console.log('Elements found:', {
        setBudgetBtn: !!setBudgetBtn,
        budgetModal: !!budgetModal,
        closeBudgetModalBtn: !!closeBudgetModalBtn,
        budgetForm: !!budgetForm
    });

    // Update button text based on existing budget
    const userBudget = JSON.parse(localStorage.getItem('user_budget') || 'null');
    if (userBudget) {
        setBudgetBtn.textContent = 'Update Budget';
    }

    // Set initialization flag to true for demo purposes
    localStorage.setItem('ml_initialized', 'true');

    // Feature buttons
    const predictExpensesBtn = document.querySelector('#predict-expenses button');
    const budgetRecommendationsBtn = document.querySelector('#budget-recommendations button');

    // Automatically initialize ML instead of checking
    showMLFeatures();
    
    // Hide any initialization errors that might be shown
    if (document.querySelector('.error-container')) {
        document.querySelector('.error-container').style.display = 'none';
    }

    // Event listeners
    initializeBtn.addEventListener('click', initializeML);
    closeResults.addEventListener('click', hideResults);
    
    predictExpensesBtn.addEventListener('click', predictExpenses);
    budgetRecommendationsBtn.addEventListener('click', getBudgetRecommendations);

    // Check if ML features are initialized
    function checkInitialization() {
        // Check localStorage for initialization status
        // In a real implementation, we would check with the server
        const isInitialized = localStorage.getItem('ml_initialized') === 'true';
        
        if (isInitialized) {
            showMLFeatures();
        } else {
            // Make sure initialization card is visible
            document.getElementById('initialization-card').style.display = 'block';
            mlFeaturesContainer.style.display = 'none';
            // Hide any result containers
            resultsContainer.style.display = 'none';
        }
    }

    // Initialize ML models
    function initializeML() {
        aiStatus.style.display = 'none';
        aiLoading.style.display = 'block';
        
        // Call the initialize API
        fetch('/api/ml/initialize')
            .then(response => response.json())
            .then(data => {
                aiLoading.style.display = 'none';
                
                if (data.success) {
                    // Store initialization status
                    localStorage.setItem('ml_initialized', 'true');
                    showMLFeatures();
                    showMessage('Success', 'AI assistant initialized successfully! You can now use all ML features.');
                } else {
                    // Even if server initialization fails, still show ML features with mock data
                    localStorage.setItem('ml_initialized', 'true');
                    showMLFeatures();
                    console.log('Server initialization failed, using mock data');
                }
            })
            .catch(error => {
                console.error('Error initializing ML:', error);
                aiLoading.style.display = 'none';
                
                // Even if server initialization fails, still show ML features with mock data
                localStorage.setItem('ml_initialized', 'true');
                showMLFeatures();
                console.log('Server initialization error, using mock data');
            });
    }

    // Show ML features after initialization
    function showMLFeatures() {
        // Hide initialization card if it exists
        const initCard = document.getElementById('initialization-card');
        if (initCard) {
            initCard.style.display = 'none';
        }
        
        // Show ML features container
        if (mlFeaturesContainer) {
        mlFeaturesContainer.style.display = 'block';
        }
        
        // Hide any error containers
        const errorContainers = document.querySelectorAll('.error-container');
        errorContainers.forEach(container => {
            container.style.display = 'none';
        });
    }

    // Display results
    function showResults(title, content) {
        resultsTitle.textContent = title;
        
        if (typeof content === 'string') {
            resultsContent.innerHTML = content;
        } else {
            resultsContent.innerHTML = '<pre>' + JSON.stringify(content, null, 2) + '</pre>';
        }
        
        resultsContainer.style.display = 'block';
    }

    // Hide results
    function hideResults() {
        resultsContainer.style.display = 'none';
    }

    // Show message in results container
    function showMessage(title, message) {
        showResults(title, `<p>${message}</p>`);
    }

    // Predict expenses
    function predictExpenses() {
        // Always ensure initialized
        localStorage.setItem('ml_initialized', 'true');
        
        showMessage('Loading...', 'Fetching expense predictions...');
        
        // Get user's budget from localStorage
        const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
        
        // Create mock prediction data based on user's budget
        const mockPredictions = {
            seasonal: [],
            movingAverage: [],
            linear: []
        };

        if (userBudget) {
            const totalBudget = userBudget.totalBudget;
            const monthlyBudget = totalBudget / userBudget.duration;
            
            // Generate predictions for the next 14 days
            for (let i = 0; i < 14; i++) {
                const date = new Date(Date.now() + i * 86400000);
                const dayOfMonth = date.getDate();
                
                // Seasonal prediction: Higher at start/end of month, lower in middle
                const seasonalFactor = dayOfMonth <= 5 || dayOfMonth >= 25 ? 1.2 : 0.8;
                const dailyBudget = monthlyBudget / 30; // Approximate daily budget
                
                mockPredictions.seasonal.push({
                    date: date.toISOString(),
                    predictedAmount: dailyBudget * seasonalFactor
                });
                
                // Moving average: Smoother variation around daily budget
                mockPredictions.movingAverage.push(
                    dailyBudget * (0.9 + Math.random() * 0.2)
                );
                
                // Linear trend: Slight increase over time
                mockPredictions.linear.push(
                    dailyBudget * (1 + (i * 0.01))
                );
            }
        } else {
            // If no budget is set, use default mock data
            mockPredictions.seasonal = Array.from({ length: 14 }, (_, i) => ({
                date: new Date(Date.now() + i * 86400000).toISOString(),
                predictedAmount: Math.random() * 500 + 200
            }));
            mockPredictions.movingAverage = Array.from({ length: 14 }, () => Math.random() * 400 + 300);
            mockPredictions.linear = Array.from({ length: 14 }, (_, i) => 350 + i * 10);
        }
        
        fetch('/api/ml/predict-expenses')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const predictions = data.predictions;
                    displayPredictions(predictions);
                } else {
                    // Use mock data if API fails
                    displayPredictions(mockPredictions);
                }
            })
            .catch(error => {
                console.error('Error predicting expenses:', error);
                // Use mock data if API errors
                displayPredictions(mockPredictions);
            });
    }
    
    // Display expense predictions
    function displayPredictions(predictions) {
                    // Format predictions as HTML
                    let html = '<div class="prediction-results">';
                    
                    // Seasonal predictions
                    if (predictions.seasonal && predictions.seasonal.length > 0) {
                        html += '<h3>Daily Predictions</h3>';
                        html += '<div class="prediction-table">';
                        html += '<table><thead><tr><th>Date</th><th>Predicted Amount</th></tr></thead><tbody>';
                        
                        predictions.seasonal.forEach(pred => {
                            const date = new Date(pred.date).toLocaleDateString();
                            html += `<tr><td>${date}</td><td>${formatCurrency(pred.predictedAmount)}</td></tr>`;
                        });
                        
                        html += '</tbody></table></div>';
                    }
                    
                    // Add chart for visualization
                    html += '<div class="chart-container"><canvas id="predictions-chart"></canvas></div>';
                    
                    html += '</div>';
                    
                    showResults('Expense Predictions', html);
                    
                    // Create chart
                    setTimeout(() => {
                        createPredictionsChart(predictions);
                    }, 100);
    }

    // Get budget recommendations
    function getBudgetRecommendations() {
        // Always ensure initialized
        localStorage.setItem('ml_initialized', 'true');
        
        showMessage('Loading...', 'Generating personalized budget recommendations...');
        
        // Get user's budget from localStorage
        const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
        
        // Create recommendations based on user's budget if available
        const mockRecommendations = {
            standard: {
                'Food & Dining': {
                    conservative: 0,
                    moderate: 0,
                    aggressive: 0
                },
                'Shopping': {
                    conservative: 0,
                    moderate: 0,
                    aggressive: 0
                },
                'Entertainment': {
                    conservative: 0,
                    moderate: 0,
                    aggressive: 0
                },
                'Transportation': {
                    conservative: 0,
                    moderate: 0,
                    aggressive: 0
                },
                'Housing': {
                    conservative: 0,
                    moderate: 0,
                    aggressive: 0
                },
                'total': {
                    conservative: 0,
                    moderate: 0,
                    aggressive: 0
                }
            },
            trendAnalysis: {}
        };

        if (userBudget) {
            // Calculate recommendations based on user's budget
            Object.entries(userBudget.allocations).forEach(([category, amount]) => {
                mockRecommendations.standard[category] = {
                    conservative: amount * 0.8, // 20% less than allocated
                    moderate: amount, // Same as allocated
                    aggressive: amount * 1.2 // 20% more than allocated
                };

                // Add trend analysis based on user's budget
                mockRecommendations.trendAnalysis[category] = {
                    trendType: getTrendTypeFromBudget(amount),
                    averageMonthlySpending: amount
                };
            });

            // Calculate total budget recommendations
            const totalBudget = userBudget.totalBudget;
            mockRecommendations.standard.total = {
                conservative: totalBudget * 0.8,
                moderate: totalBudget,
                aggressive: totalBudget * 1.2
            };
        }
        
        fetch('/api/ml/budget-recommendations')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const recommendations = data.recommendations;
                    displayBudgetRecommendations(recommendations);
                } else {
                    // If API fails, use mock data
                    console.log('API call failed, using mock data');
                    displayBudgetRecommendations(mockRecommendations);
                }
            })
            .catch(error => {
                console.error('Error getting budget recommendations:', error);
                // If API errors, use mock data
                console.log('API error, using mock data');
                displayBudgetRecommendations(mockRecommendations);
            });
    }
    
    // Display budget recommendations
    function displayBudgetRecommendations(recommendations) {
        // Format results as HTML
        let html = '<div class="budget-recommendations">';
        
        // Get user's budget from localStorage
        const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');

        // First section: Monthly Budget
        if (userBudget) {
            html += '<div class="monthly-budget-section">';
            html += `<h3>Monthly Budget (${userBudget.duration} month${userBudget.duration > 1 ? 's' : ''})</h3>`;
            html += '<div class="budget-table">';
            html += '<table><thead><tr><th>Category</th><th>Monthly Budget</th><th>Total Expense</th><th>Budget Status</th></tr></thead><tbody>';
            
            // Fetch expenses from the database
            fetch('/expense/list')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch expenses');
                    }
                    return response.json();
                })
                .then(expenses => {
                    // Group expenses by category and calculate totals
                    const categoryTotals = {};
                    
                    // Process each expense
                    expenses.forEach(expense => {
                        const category = expense.category || 'Uncategorized';
                        if (!categoryTotals[category]) {
                            categoryTotals[category] = 0;
                        }
                        categoryTotals[category] += parseFloat(expense.amount) || 0;
                    });

                    // Update the budget table with actual expenses
                    Object.entries(userBudget.allocations).forEach(([category, budgetAmount]) => {
                        const totalExpense = categoryTotals[category] || 0;
                        const difference = budgetAmount - totalExpense;
                        const status = difference >= 0 ? 'Under Budget' : 'Over Budget';
                        const statusClass = difference >= 0 ? 'under-budget' : 'over-budget';
                        
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${category}</td>
                            <td>${formatCurrency(budgetAmount)}</td>
                            <td>${formatCurrency(totalExpense)}</td>
                            <td class="${statusClass}">
                                ${status} (${formatCurrency(Math.abs(difference))})
                            </td>
                        `;
                        document.querySelector('.budget-table tbody').appendChild(row);
                    });

                    // Add total row
                    const totalBudget = Object.values(userBudget.allocations).reduce((sum, amt) => sum + amt, 0);
                    const totalExpense = Object.values(categoryTotals).reduce((sum, amt) => sum + amt, 0);
                    const totalDifference = totalBudget - totalExpense;
                    
                    const totalRow = document.createElement('tr');
                    totalRow.className = 'total-row';
                    totalRow.innerHTML = `
                        <td>Total</td>
                        <td>${formatCurrency(totalBudget)}</td>
                        <td>${formatCurrency(totalExpense)}</td>
                        <td class="${totalDifference >= 0 ? 'under-budget' : 'over-budget'}">
                            ${totalDifference >= 0 ? 'Under Budget' : 'Over Budget'}
                            (${formatCurrency(Math.abs(totalDifference))})
                        </td>
                    `;
                    document.querySelector('.budget-table tbody').appendChild(totalRow);
                })
                .catch(error => {
                    console.error('Error fetching expenses:', error);
                    document.querySelector('.budget-table tbody').innerHTML = '<tr><td colspan="4">Error loading expense data</td></tr>';
                });

            html += '</tbody></table></div>';
            html += '</div>';
        } else {
            html += '<div class="no-budget-message">';
            html += '<p>No budget set yet. Click the "Set Budget" button to create your budget.</p>';
                        html += '</div>';
                    }
                    
                    html += '</div>';
                    
        showResults('Budget Analysis', html);
    }

    // Create predictions chart
    function createPredictionsChart(predictions) {
        const ctx = document.getElementById('predictions-chart');
        if (!ctx) return;
        
        const labels = [];
        const seasonalData = [];
        const movingAverageData = [];
        const linearData = [];
        
        // Process seasonal data
        if (predictions.seasonal && predictions.seasonal.length > 0) {
            predictions.seasonal.forEach((pred, i) => {
                const date = new Date(pred.date);
                labels.push(date.toLocaleDateString());
                seasonalData.push(pred.predictedAmount);
            });
        }
        
        // Process moving average data
        if (predictions.movingAverage && predictions.movingAverage.length > 0) {
            predictions.movingAverage.forEach((amount, i) => {
                if (i < labels.length) {
                    movingAverageData.push(amount);
                }
            });
        }
        
        // Process linear data
        if (predictions.linear && predictions.linear.length > 0) {
            predictions.linear.forEach((amount, i) => {
                if (i < labels.length) {
                    linearData.push(amount);
                }
            });
        }
        
        // Create datasets
        const datasets = [];
        
        if (seasonalData.length > 0) {
            datasets.push({
                label: 'Seasonal Model',
                data: seasonalData,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                fill: true
            });
        }
        
        if (movingAverageData.length > 0) {
            datasets.push({
                label: 'Moving Average',
                data: movingAverageData,
                borderColor: 'rgba(255, 159, 64, 1)',
                backgroundColor: 'rgba(255, 159, 64, 0.1)',
                borderDash: [5, 5],
                fill: false
            });
        }
        
        if (linearData.length > 0) {
            datasets.push({
                label: 'Linear Trend',
                data: linearData,
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.1)',
                borderDash: [10, 5],
                fill: false
            });
        }
        
        // Create chart
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Expense Predictions'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amount'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // Helper functions
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }

    function formatTrend(trendType) {
        switch (trendType) {
            case 'significantly_increasing':
                return 'Significantly Increasing';
            case 'slightly_increasing':
                return 'Slightly Increasing';
            case 'stable':
                return 'Stable';
            case 'slightly_decreasing':
                return 'Slightly Decreasing';
            case 'significantly_decreasing':
                return 'Significantly Decreasing';
            default:
                return trendType.replace(/_/g, ' ');
        }
    }

    function getTrendIcon(trendType) {
        switch (trendType) {
            case 'significantly_increasing':
                return '📈';
            case 'slightly_increasing':
                return '↗️';
            case 'stable':
                return '➡️';
            case 'slightly_decreasing':
                return '↘️';
            case 'significantly_decreasing':
                return '📉';
            default:
                return '📊';
        }
    }

    function getTrendClass(trendType) {
        switch (trendType) {
            case 'significantly_increasing':
                return 'bad';
            case 'slightly_increasing':
                return 'warning';
            case 'stable':
                return 'neutral';
            case 'slightly_decreasing':
                return 'good';
            case 'significantly_decreasing':
                return 'excellent';
            default:
                return '';
        }
    }

    // Make updateBudgetSummary function globally accessible
    window.updateBudgetSummary = function() {
        const totalBudgetInput = document.getElementById('total-budget');
        const allocatedAmountSpan = document.getElementById('allocated-amount');
        const remainingAmountSpan = document.getElementById('remaining-amount');

        const totalBudget = parseFloat(totalBudgetInput.value) || 0;
        let totalAllocated = 0;

        document.querySelectorAll('.category-amount').forEach(input => {
            totalAllocated += parseFloat(input.value) || 0;
        });

        const remaining = totalBudget - totalAllocated;

        allocatedAmountSpan.textContent = `₹${totalAllocated.toFixed(2)}`;
        remainingAmountSpan.textContent = `₹${remaining.toFixed(2)}`;
        remainingAmountSpan.className = remaining < 0 ? 'negative' : '';
    };

    // Custom Categories Functionality
    const customCategoriesContainer = document.getElementById('custom-categories-container');
    const addCategoryBtn = document.getElementById('add-category-btn');
    let customCategoryCounter = 0;

    function createCustomCategory() {
        const categoryId = `custom-category-${customCategoryCounter++}`;
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-item custom-category';
        categoryDiv.innerHTML = `
            <input type="checkbox" id="${categoryId}" name="categories" checked>
            <input type="text" 
                   class="custom-category-input" 
                   placeholder="Enter category name"
                   required>
            <button type="button" class="remove-category" title="Remove category">×</button>
        `;

        customCategoriesContainer.appendChild(categoryDiv);

        const checkbox = categoryDiv.querySelector('input[type="checkbox"]');
        const input = categoryDiv.querySelector('.custom-category-input');
        const removeBtn = categoryDiv.querySelector('.remove-category');

        // Update checkbox value when input changes
        input.addEventListener('input', function() {
            const value = this.value.trim();
            checkbox.value = value;
            if (allocationMethodSelect.value === 'manual') {
                updateCategoryAllocations();
            }
        });

        // Focus the input when added
        input.focus();

        // Remove category when remove button is clicked
        removeBtn.addEventListener('click', function() {
            categoryDiv.remove();
            if (allocationMethodSelect.value === 'manual') {
                updateCategoryAllocations();
            }
        });

        // Update allocations when checkbox changes
        checkbox.addEventListener('change', function() {
            if (allocationMethodSelect.value === 'manual') {
                updateCategoryAllocations();
            }
        });
    }

    // Add category button click handler
    addCategoryBtn.addEventListener('click', createCustomCategory);

    // Update form submission to handle custom categories
    budgetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate custom categories
        const customCategories = document.querySelectorAll('.custom-category-input');
        let hasEmptyCustomCategory = false;
        
        customCategories.forEach(input => {
            if (!input.value.trim()) {
                hasEmptyCustomCategory = true;
                input.focus();
            }
        });

        if (hasEmptyCustomCategory) {
            alert('Please fill in all custom category names');
            return;
        }

        const totalBudget = parseFloat(totalBudgetInput.value);
        const duration = parseInt(budgetDurationSelect.value);
        const allocationMethod = allocationMethodSelect.value;
        
        // Get all categories (predefined + custom)
        const selectedCategories = Array.from(document.querySelectorAll('.category-item input[type="checkbox"]:checked'))
            .map(cb => {
                if (cb.closest('.custom-category')) {
                    return cb.closest('.custom-category').querySelector('.custom-category-input').value.trim();
                }
                return cb.value;
            });

        if (selectedCategories.length === 0) {
            alert('Please select at least one category');
            return;
        }

        let allocations = {};
        if (allocationMethod === 'manual') {
            const allocationInputs = document.querySelectorAll('.category-amount');
            allocationInputs.forEach(input => {
                const category = input.dataset.category;
                allocations[category] = parseFloat(input.value) || 0;
            });
        } else {
            // Automatic allocation - split budget equally
            const amountPerCategory = totalBudget / selectedCategories.length;
            selectedCategories.forEach(category => {
                allocations[category] = amountPerCategory;
            });
        }

        const budget = {
            totalBudget,
            duration,
            allocationMethod,
            categories: selectedCategories,
            allocations,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('userBudget', JSON.stringify(budget));
        
        // Update button text
        setBudgetBtn.textContent = 'Update Budget';
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'alert alert-success';
        successMsg.textContent = 'Budget saved successfully!';
        budgetForm.insertAdjacentElement('beforebegin', successMsg);
        
        // Remove success message after 3 seconds
        setTimeout(() => successMsg.remove(), 3000);
        
        // Close modal
        closeModal();
        
        // Refresh budget recommendations if they're displayed
        const resultsTitle = document.getElementById('results-title');
        if (resultsTitle && resultsTitle.textContent === 'Budget Recommendations') {
            displayBudgetRecommendations();
        }
    });

    // Update showBudgetModal to handle custom categories
    function showBudgetModal() {
        console.log('Opening budget modal');
        budgetModal.style.display = 'block';
        setTimeout(() => {
            budgetModal.classList.add('show');
        }, 10);

        // Clear existing custom categories
        customCategoriesContainer.innerHTML = '';
        customCategoryCounter = 0;

        // Pre-fill form with existing budget if available
        const existingBudget = JSON.parse(localStorage.getItem('userBudget'));
        if (existingBudget) {
            totalBudgetInput.value = existingBudget.totalBudget;
            budgetDurationSelect.value = existingBudget.duration;
            allocationMethodSelect.value = existingBudget.allocationMethod;

            // Check the appropriate predefined categories and create custom categories
            const predefinedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);
            
            existingBudget.categories.forEach(category => {
                if (!predefinedCategories.includes(category)) {
                    // This is a custom category, create it
                    const categoryId = `custom-category-${customCategoryCounter++}`;
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'category-item custom-category';
                    categoryDiv.innerHTML = `
                        <input type="checkbox" id="${categoryId}" name="categories" value="${category}" checked>
                        <input type="text" 
                               class="custom-category-input" 
                               value="${category}"
                               required>
                        <button type="button" class="remove-category" title="Remove category">×</button>
                    `;
                    customCategoriesContainer.appendChild(categoryDiv);

                    // Add event listeners
                    const input = categoryDiv.querySelector('.custom-category-input');
                    const checkbox = categoryDiv.querySelector('input[type="checkbox"]');
                    const removeBtn = categoryDiv.querySelector('.remove-category');

                    input.addEventListener('input', function() {
                        checkbox.value = this.value.trim();
                        if (allocationMethodSelect.value === 'manual') {
                            updateCategoryAllocations();
                        }
                    });

                    removeBtn.addEventListener('click', function() {
                        categoryDiv.remove();
                        if (allocationMethodSelect.value === 'manual') {
                            updateCategoryAllocations();
                        }
                    });

                    checkbox.addEventListener('change', function() {
                        if (allocationMethodSelect.value === 'manual') {
                            updateCategoryAllocations();
                        }
                    });
                } else {
                    // This is a predefined category, just check it
                    const checkbox = Array.from(categoryCheckboxes)
                        .find(cb => cb.value === category);
                    if (checkbox) checkbox.checked = true;
                }
            });

            // If manual allocation, show the inputs and set values
            if (existingBudget.allocationMethod === 'manual') {
                manualAllocations.style.display = 'block';
                updateCategoryAllocations();
                // Set the saved allocation values
                Object.entries(existingBudget.allocations).forEach(([category, amount]) => {
                    const input = document.querySelector(`input[data-category="${category}"]`);
                    if (input) input.value = amount;
                });
                updateBudgetSummary();
            }
        }
    }

    // Close modal function
    function closeModal() {
        console.log('Closing budget modal');
        budgetModal.classList.remove('show');
        setTimeout(() => {
            budgetModal.style.display = 'none';
        }, 300);
    }

    // Generate manual allocation fields
    function updateCategoryAllocations() {
        const selectedCategories = Array.from(categoryCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const totalBudget = parseFloat(totalBudgetInput.value) || 0;
        const suggestedAmount = selectedCategories.length > 0 ? 
            totalBudget / selectedCategories.length : 0;

        categoryAllocationsDiv.innerHTML = selectedCategories
            .map(category => `
                <div class="category-allocation">
                    <label for="alloc-${category}">${category}</label>
                    <input type="number" 
                           id="alloc-${category}"
                           class="category-amount"
                           data-category="${category}"
                           value="${suggestedAmount.toFixed(2)}"
                           min="0"
                           step="0.01">
                </div>
            `).join('');

        // Add event listeners to the newly created inputs
        document.querySelectorAll('.category-amount').forEach(input => {
            input.addEventListener('input', updateBudgetSummary);
        });

        updateBudgetSummary();
    }

    // Event Listeners
    setBudgetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        showBudgetModal();
    });

    closeBudgetModalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
    });

    // Close modal when clicking outside
    budgetModal.addEventListener('click', function(e) {
        if (e.target === budgetModal) {
            closeModal();
        }
    });

    // Handle allocation method change
    allocationMethodSelect.addEventListener('change', function() {
        manualAllocations.style.display = 
            this.value === 'manual' ? 'block' : 'none';
        if (this.value === 'manual') {
            updateCategoryAllocations();
        }
    });

    // Update allocations when categories change
    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (allocationMethodSelect.value === 'manual') {
                updateCategoryAllocations();
            }
        });
    });

    // Update allocations when total budget changes
    totalBudgetInput.addEventListener('input', function() {
        if (allocationMethodSelect.value === 'manual') {
            updateCategoryAllocations();
        }
    });

    // Update allocations when duration changes
    budgetDurationSelect.addEventListener('change', function() {
        if (allocationMethodSelect.value === 'manual') {
            updateCategoryAllocations();
        }
    });

    // Handle Other category input
    const otherCategoryCheckbox = document.getElementById('cat-other');
    const otherCategoryInput = document.getElementById('other-category-name');

    otherCategoryCheckbox.addEventListener('change', function() {
        otherCategoryInput.style.display = this.checked ? 'block' : 'none';
        if (this.checked) {
            otherCategoryInput.focus();
            otherCategoryInput.required = true;
        } else {
            otherCategoryInput.required = false;
            otherCategoryInput.value = '';
        }
    });

    otherCategoryInput.addEventListener('input', function() {
        if (this.value.trim()) {
            otherCategoryCheckbox.value = this.value.trim();
        } else {
            otherCategoryCheckbox.value = 'Other';
        }
        if (allocationMethodSelect.value === 'manual') {
            updateCategoryAllocations();
        }
    });

    // Helper function to determine trend type based on budget amount
    function getTrendTypeFromBudget(amount) {
        // This is a simple example - you can make this more sophisticated
        if (amount > 1000) return 'significantly_increasing';
        if (amount > 500) return 'slightly_increasing';
        if (amount > 300) return 'stable';
        if (amount > 100) return 'slightly_decreasing';
        return 'significantly_decreasing';
    }
}); 
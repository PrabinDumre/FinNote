class DashboardManager {
    constructor() {
        this.initializeEventListeners();
        this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            const transactionsResponse = await fetch('/transactions/list');

            if (transactionsResponse.ok) {
                const transactions = await transactionsResponse.json();
                this.updateTransactionCharts(transactions);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateTransactionCharts(transactions) {
        // Update Daily Expenses Chart
        const dailyData = this.calculateDailyTrends(transactions);
        if (window.dailyExpensesChart) {
            window.dailyExpensesChart.data.datasets[0].data = dailyData.given;
            window.dailyExpensesChart.data.datasets[1].data = dailyData.taken;
            window.dailyExpensesChart.update();
        }
    }

    calculateDailyTrends(transactions) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyGiven = new Array(7).fill(0);
        const dailyTaken = new Array(7).fill(0);

        // Get transactions from the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        transactions
            .filter(t => new Date(t.date) >= oneWeekAgo)
            .forEach(transaction => {
                const date = new Date(transaction.date);
                const dayIndex = date.getDay();
                if (transaction.type === 'give') {
                    dailyGiven[dayIndex] += transaction.amount;
                } else {
                    dailyTaken[dayIndex] += transaction.amount;
                }
            });

        return {
            given: dailyGiven,
            taken: dailyTaken
        };
    }

    initializeEventListeners() {
        // Add any dashboard-specific event listeners here
        window.addEventListener('focus', () => this.loadDashboardData());
    }
}

// Initialize dashboard manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Preload data for immediate display 
    preloadBudgetData();
    window.dashboardManager = new DashboardManager();
    
    // Initialize fixed alert message with a welcome message
    initializeFixedAlert();
    
    // Directly fetch expenses for prediction
    fetchExpensesForPrediction();
    
    // Load and display username
    loadUserName();
    
    // Show login notification
    showLoginNotification();
});

// Function to initialize the fixed alert with a welcome message
function initializeFixedAlert() {
    const aiInsightsElement = document.getElementById('aiInsightsMessage');
    if (aiInsightsElement) {
        // Set a welcoming default message
        aiInsightsElement.className = 'ai-insights-message info';
        aiInsightsElement.innerHTML = `
            <span class="ai-icon">🤖</span>
            <span class="prediction-text">
                <strong>Welcome to Budget Insights!</strong> I'll provide smart predictions about your spending patterns and budget status.
            </span>
        `;
    }
}

// Globals for budget carousel
let currentSlideIndex = 0;
let slideInterval;
let categories = [];
let preloadedExpenses = null;

// Preload budget data to avoid delay
function preloadBudgetData() {
    const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
    if (!userBudget) {
        const budgetBox = document.querySelector('.budget-insights-box');
        if (budgetBox) {
            budgetBox.innerHTML = `
                <div class="no-budget-message">
                    <h3>No Budget Set</h3>
                    <p>Set a budget to see detailed insights and track your spending.</p>
                    <button class="set-budget-btn" onclick="window.location.href='/expense'">Set Budget</button>
                </div>
            `;
        }
        return;
    }

    // Start preloading expense data
    fetch('/expense/list')
        .then(response => response.json())
        .then(expenses => {
            preloadedExpenses = expenses;
            initializeBudgetCarousel(expenses);
        })
        .catch(error => {
            console.error('Error fetching expenses:', error);
            // Continue with initialization even if there's an error
            initializeBudgetCarousel([]);
        });
}

function initializeBudgetCarousel(expenses) {
    const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
    if (!userBudget) return;

    categories = Object.keys(userBudget.allocations);
    
    // Create slides with preloaded data
    createCategorySlides(expenses || []);
    
    // Create indicators
    createCarouselIndicators();
    
    // Start auto-sliding
    startCarouselInterval();
    
    // Show first slide
    showSlide(0);
}

function createCategorySlides(expenses) {
    const slideContainer = document.getElementById('categorySlides');
    if (!slideContainer) return;
    
    slideContainer.innerHTML = '';
    
    const userBudget = JSON.parse(localStorage.getItem('userBudget'));
    if (!userBudget) return;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Current month expenses
    const currentMonthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
    });
    
    // Create a slide for each category
    categories.forEach((category, index) => {
        const budget = userBudget.allocations[category];
        
        const categoryExpenses = currentMonthExpenses
            .filter(e => e.category === category)
            .reduce((sum, e) => sum + e.amount, 0);
        
        const percentageUsed = (categoryExpenses / budget) * 100;
        const remaining = budget - categoryExpenses;
        const dailyAverage = categoryExpenses / currentDate.getDate();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const projectedTotal = dailyAverage * daysInMonth;
        
        const slide = document.createElement('div');
        slide.className = 'category-slide';
        slide.dataset.index = index;
        
        // Determine alert type and message
        let alertType = 'info';
        let alertMessage = `You have ${formatCurrency(remaining)} remaining`;
        
        if (percentageUsed >= 90) {
            alertType = 'danger';
            alertMessage = `Critical! Budget at ${percentageUsed.toFixed(1)}%`;
        } else if (percentageUsed >= 75) {
            alertType = 'warning';
            alertMessage = `Warning: ${percentageUsed.toFixed(1)}% used`;
        } else if (percentageUsed <= 20) {
            alertType = 'success';
            alertMessage = `Excellent! Only ${percentageUsed.toFixed(1)}% used`;
        }
        
        if (projectedTotal > budget) {
            alertType = 'warning';
            alertMessage = `At this rate, will exceed by ${formatCurrency(projectedTotal - budget)}`;
        }
        
        if (remaining < 0) {
            alertType = 'danger';
            alertMessage = `Exceeded by ${formatCurrency(Math.abs(remaining))}!`;
        }
        
        // Create and append all the HTML content at once for better performance
        const progressClass = getProgressClass(percentageUsed);
        
        // Calculate the progress circle values
        const normalizedPercentage = Math.min(percentageUsed, 100);
        const circleRadius = 40;
        const circleCx = 50;
        const circleCy = 50;
        const circumference = 2 * Math.PI * circleRadius;
        const dashOffset = circumference - (normalizedPercentage / 100) * circumference;
        const progressColor = percentageUsed >= 90 ? '#e74c3c' : percentageUsed >= 75 ? '#f39c12' : '#8BC48A';
        const remainingColor = '#E8E8E8';
        
        slide.innerHTML = `
            <div class="category-header">${category}</div>
            <div class="category-subheader">Monthly Budget: ${formatCurrency(budget)}</div>
            
            <div class="progress-container">
                <!-- Dual-color Progress Ring -->
                <div class="progress-ring-container">
                    <svg class="progress-ring" width="100" height="100" viewBox="0 0 100 100">
                        <!-- Drop shadow filter -->
                        <defs>
                            <filter id="shadow-${index}" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.3" />
                            </filter>
                        </defs>
                        
                        <!-- Remaining budget background circle -->
                        <circle class="progress-ring-circle-bg" 
                            cx="${circleCx}" cy="${circleCy}" r="${circleRadius}" 
                            stroke="${remainingColor}" 
                            stroke-width="14" 
                            fill="transparent" />
                            
                        <!-- Used budget circle -->
                        <circle class="progress-ring-circle" 
                            cx="${circleCx}" cy="${circleCy}" r="${circleRadius}" 
                            stroke="${progressColor}" 
                            stroke-width="14" 
                            fill="transparent" 
                            stroke-dasharray="${circumference}" 
                            stroke-dashoffset="${dashOffset}" 
                            transform="rotate(-90 ${circleCx} ${circleCy})"
                            stroke-linecap="round" />
                            
                        <!-- Percentage text in center -->
                        <text x="${circleCx}" y="${circleCy}" 
                            text-anchor="middle" 
                            dominant-baseline="middle" 
                            fill="${progressColor}"
                            font-size="22"
                            font-weight="500"
                            class="progress-text">${normalizedPercentage.toFixed(0)}%</text>
                    </svg>
                </div>
            </div>
            
            <div class="category-stats">
                <div class="stat-item">
                    <div class="stat-label">Spent</div>
                    <div class="stat-value">${formatCurrency(categoryExpenses)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Remaining</div>
                    <div class="stat-value">${formatCurrency(remaining)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Avg/Day</div>
                    <div class="stat-value">${formatCurrency(dailyAverage)}</div>
                </div>
            </div>
            
            <div class="category-alert ${alertType}">
                <span class="alert-icon">
                    ${alertType === 'danger' ? '⚠️' : alertType === 'warning' ? '⚠️' : alertType === 'success' ? '✅' : 'ℹ️'}
                </span>
                <span class="alert-message">${alertMessage}</span>
            </div>
        `;
        
        slideContainer.appendChild(slide);
    });
}

function createCarouselIndicators() {
    const indicatorContainer = document.getElementById('carouselIndicators');
    if (!indicatorContainer) return;
    
    indicatorContainer.innerHTML = '';
    
    categories.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'indicator-dot';
        dot.dataset.index = index;
        
        dot.addEventListener('click', () => {
            showSlide(index);
            resetCarouselInterval();
        });
        
        indicatorContainer.appendChild(dot);
    });
}

function startCarouselInterval() {
    // Clear any existing interval
    if (slideInterval) {
        clearInterval(slideInterval);
    }
    
    // Start new interval - change slides every 5 seconds (increased from 3 for better readability)
    slideInterval = setInterval(() => {
        showSlide(currentSlideIndex + 1);
    }, 5000);
}

function resetCarouselInterval() {
    clearInterval(slideInterval);
    startCarouselInterval();
}

function showSlide(index) {
    // Handle wrapping around at the end
    if (index >= categories.length) {
        index = 0;
    } else if (index < 0) {
        index = categories.length - 1;
    }
    
    currentSlideIndex = index;
    
    // Update slides - make all slides inactive first
    const slides = document.querySelectorAll('.category-slide');
    slides.forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Only make the current slide active
    const currentSlide = document.querySelector(`.category-slide[data-index="${currentSlideIndex}"]`);
    if (currentSlide) {
        currentSlide.classList.add('active');
        
        // Update the budget status message based on this slide
        updateBudgetStatusMessage(currentSlide);
    }
    
    // Update indicators
    const indicators = document.querySelectorAll('.indicator-dot');
    indicators.forEach(dot => {
        dot.classList.remove('active');
        if (parseInt(dot.dataset.index) === currentSlideIndex) {
            dot.classList.add('active');
        }
    });
    
    // Update the AI Insights message based on the active slide's category
    const aiInsightsElement = document.getElementById('aiInsightsMessage');
    if (aiInsightsElement && currentSlide) {
        const category = currentSlide.querySelector('.category-header')?.textContent || '';
        generateAIPredictionForInsights(category, aiInsightsElement);
    }
}

// Function to update the budget status message
function updateBudgetStatusMessage(activeSlide) {
    const statusMsgElement = document.getElementById('budgetStatusMessage');
    if (!statusMsgElement) return;
    
    // Get data from the active slide
    const category = activeSlide.querySelector('.category-header')?.textContent || '';
    const usedPercentage = parseFloat(activeSlide.querySelector('.stat-value:nth-child(2)')?.textContent || '0');
    const remainingText = activeSlide.querySelector('.stat-value:first-child')?.textContent || '';
    const remaining = parseFloat(remainingText.replace(/[^\d.-]/g, ''));
    
    let message = '';
    let statusClass = 'info';
    let statusIcon = '💰';
    
    // Determine status message based on budget vs expenses
    if (remaining < 0) {
        // Expenses exceed budget
        statusClass = 'danger';
        statusIcon = '⚠️';
        message = `You are in danger! Your expenses have exceeded the budget for ${category}. Please review your spending immediately.`;
    } else if (usedPercentage >= 85) {
        // Expenses close to budget
        statusClass = 'warning';
        statusIcon = '⚠️';
        message = `Warning! Your expenses are getting close to your budget for ${category} (${usedPercentage.toFixed(1)}%). Consider reducing spending to avoid running out of money.`;
    } else if (usedPercentage <= 40) {
        // Expenses well below budget
        statusClass = 'success';
        statusIcon = '👏';
        message = `Great job! Your expense ratio for ${category} is excellent. You're managing your budget well!`;
    } else {
        // Normal range
        statusClass = 'info';
        statusIcon = '📊';
        message = `Your spending for ${category} is within normal range. Keep monitoring to stay on track.`;
    }
    
    // Update the message
    statusMsgElement.className = `budget-status-message ${statusClass}`;
    statusMsgElement.innerHTML = `${statusIcon} ${message}`;
}

// Generate AI-style prediction specifically for the AI Insights message at top
function generateAIPredictionForInsights(category, aiElement) {
    if (!preloadedExpenses || preloadedExpenses.length === 0) {
        // If no data yet, show a default message
        aiElement.className = 'ai-insights-message info';
        aiElement.innerHTML = `
            <span class="ai-icon">🤖</span>
            <span class="prediction-text">
                No spending data yet for ${category || 'this category'}. As you add expenses, I'll provide insights.
            </span>
        `;
        return;
    }
    
    const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
    if (!userBudget) {
        aiElement.className = 'ai-insights-message info';
        aiElement.innerHTML = `
            <span class="ai-icon">🤖</span>
            <span class="prediction-text">
                Please set a budget to receive personalized spending insights and recommendations.
            </span>
        `;
        return;
    }
    
    const expenses = preloadedExpenses;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate current month's spending
    const currentMonthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear &&
               (!category || expense.category === category);
    });
    
    // Calculate previous month's spending
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const previousMonthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === previousMonth && 
               expenseDate.getFullYear() === previousYear &&
               (!category || expense.category === category);
    });
    
    // Current spending metrics
    const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const currentDayOfMonth = currentDate.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Calculate daily spending rate
    const currentDailyRate = currentDayOfMonth > 0 ? currentTotal / currentDayOfMonth : 0;
    const projectedMonthTotal = currentDailyRate * daysInMonth;
    
    // Previous month metrics
    const previousTotal = previousMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    
    // Get budget for this category
    const budget = category && userBudget.allocations ? userBudget.allocations[category] : 
        Object.values(userBudget.allocations || {}).reduce((sum, val) => sum + parseFloat(val || 0), 0);
    
    // Generate prediction
    let message = '';
    let alertType = 'info';
    let aiEmoji = '🤖';
    
    // If we don't have previous month data to compare
    if (previousTotal === 0) {
        const remainingBudget = budget - currentTotal;
        const remainingDays = daysInMonth - currentDayOfMonth;
        const dailyBudget = remainingDays > 0 ? remainingBudget / remainingDays : remainingBudget;
        
        if (currentTotal > budget) {
            message = `You've exceeded your ${category || 'total'} budget by ${formatCurrency(currentTotal - budget)}. Consider adjusting your spending.`;
            alertType = 'danger';
            aiEmoji = '🤖‼️';
        } else if (currentTotal > budget * 0.8) {
            message = `You've used ${((currentTotal / budget) * 100).toFixed(0)}% of your ${category || 'total'} budget. You can spend about ${formatCurrency(dailyBudget)} this month and stay on track.`;
            alertType = 'warning';
            aiEmoji = '🤖⚠️';
        } else {
            message = `You've used ${((currentTotal / budget) * 100).toFixed(0)}% of your ${category || 'total'} budget. You can spend about ${formatCurrency(dailyBudget)} this month and stay on track.`;
            alertType = 'info';
            aiEmoji = '🤖💡';
        }
    }
    // Compare with previous month if we have the data
    else if (currentDailyRate > (previousTotal / daysInMonth) * 1.2) {
        // Spending at least 20% more per day than last month
        const percentIncrease = (((currentDailyRate * daysInMonth) / previousTotal) - 1) * 100;
        
        if (projectedMonthTotal > budget) {
            message = `You're spending ${percentIncrease.toFixed(0)}% more than last month in ${category || 'total'}. At this rate, you'll exceed your budget.`;
            alertType = 'danger';
            aiEmoji = '🤖‼️';
        } else {
            message = `Your ${category || 'overall'} spending is ${percentIncrease.toFixed(0)}% higher than last month. Consider adjusting to maintain financial health.`;
            alertType = 'warning';
            aiEmoji = '🤖📊';
        }
    } 
    // Spending significantly less
    else if (currentDailyRate < (previousTotal / daysInMonth) * 0.8) {
        const percentDecrease = ((1 - (currentDailyRate * daysInMonth) / previousTotal)) * 100;
        
        message = `Great job! You're spending ${percentDecrease.toFixed(0)}% less in ${category || 'total'} than last month.`;
        alertType = 'success';
        aiEmoji = '🤖✅';
    }
    // On track with previous month
    else {
        const remainingBudget = budget - currentTotal;
        const remainingDays = daysInMonth - currentDayOfMonth;
        const dailyBudget = remainingDays > 0 ? remainingBudget / remainingDays : remainingBudget;
        
        message = `Your ${category || 'spending'} is similar to last month. You have ${formatCurrency(dailyBudget)} available per day.`;
        alertType = 'info';
        aiEmoji = '🤖💡';
    }
    
    // Update the alert
    aiElement.className = `ai-insights-message ${alertType}`;
    aiElement.innerHTML = `
        <span class="ai-icon">${aiEmoji}</span>
        <span class="prediction-text">${message}</span>
    `;
}

function getProgressClass(percentage) {
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'good';
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Update when expenses change
document.addEventListener('expensesUpdated', function() {
    // Refresh data immediately
    fetch('/expense/list')
        .then(response => response.json())
        .then(expenses => {
            preloadedExpenses = expenses;
            createCategorySlides(expenses);
            setTimeout(() => showSlide(currentSlideIndex), 50);
        })
        .catch(error => {
            console.error('Error updating expenses:', error);
        });
});

function updateBudgetAlerts() {
    const alertContainer = document.getElementById('budgetAlertMessages');
    if (!alertContainer) return;

    // Clear existing messages
    alertContainer.innerHTML = '';

    const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
    if (!userBudget) {
        showAlertMessage('info', '📊 No budget set. Set a budget to get personalized insights.');
        return;
    }

    fetch('/expense/list')
        .then(response => response.json())
        .then(expenses => {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();

            // Filter current month's expenses
            const currentMonthExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() === currentMonth && 
                       expenseDate.getFullYear() === currentYear;
            });

            // Analyze overall budget status
            const totalBudget = Object.values(userBudget.allocations).reduce((sum, amount) => sum + amount, 0);
            const totalExpenses = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            const budgetUsagePercent = (totalExpenses / totalBudget) * 100;

            // Show overall budget status
            if (budgetUsagePercent >= 100) {
                showAlertMessage('danger', '⚠️ Overall budget exceeded! Consider reviewing your expenses.');
            } else if (budgetUsagePercent >= 80) {
                showAlertMessage('warning', '⚠️ You\'ve used ' + budgetUsagePercent.toFixed(1) + '% of your total budget.');
            } else if (budgetUsagePercent <= 20) {
                showAlertMessage('success', '👏 Great job! You\'re well within your budget.');
            } else {
                showAlertMessage('info', '✅ Your spending is on track.');
            }

            // Check individual categories
            Object.entries(userBudget.allocations).forEach(([category, budget]) => {
                const categoryExpenses = currentMonthExpenses
                    .filter(e => e.category === category)
                    .reduce((sum, e) => sum + e.amount, 0);
                
                const categoryUsagePercent = (categoryExpenses / budget) * 100;

                if (categoryUsagePercent >= 90) {
                    showAlertMessage('danger', `📈 ${category}: Critical! ${categoryUsagePercent.toFixed(1)}% of budget used.`);
                } else if (categoryUsagePercent >= 75) {
                    showAlertMessage('warning', `⚠️ ${category}: Approaching limit (${categoryUsagePercent.toFixed(1)}%)`);
                }
            });

            // Check for unusual patterns
            const averageDaily = totalExpenses / new Date().getDate();
            const recentExpenses = currentMonthExpenses
                .filter(e => new Date(e.date).getDate() >= currentDate.getDate() - 3)
                .reduce((sum, e) => sum + e.amount, 0);
            
            if (recentExpenses > averageDaily * 3 * 1.5) {
                showAlertMessage('warning', '📊 Higher than usual spending detected in the last 3 days.');
            }

            // Add savings potential message if under budget
            if (budgetUsagePercent < 50 && currentDate.getDate() > 15) {
                showAlertMessage('success', '💰 Great savings potential this month! Consider investing the surplus.');
            }
        })
        .catch(error => {
            console.error('Error updating budget alerts:', error);
            showAlertMessage('danger', '❌ Error analyzing budget status.');
        });

    function showAlertMessage(type, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert-message ${type}`;
        messageDiv.textContent = message;
        alertContainer.appendChild(messageDiv);
    }
}

let currentCategoryIndex = 0;

function initializeCategoryCarousel() {
    const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
    if (!userBudget) return;

    categories = Object.keys(userBudget.allocations);
    updateCategoryDisplay();

    document.getElementById('prevCategory').addEventListener('click', () => {
        if (currentCategoryIndex > 0) {
            currentCategoryIndex--;
            updateCategoryDisplay();
        }
    });

    document.getElementById('nextCategory').addEventListener('click', () => {
        if (currentCategoryIndex < categories.length - 1) {
            currentCategoryIndex++;
            updateCategoryDisplay();
        }
    });
}

function updateCategoryDisplay() {
    const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
    if (!userBudget) return;

    const category = categories[currentCategoryIndex];
    const budget = userBudget.allocations[category];

    fetch('/expense/list')
        .then(response => response.json())
        .then(expenses => {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();

            const categoryExpenses = expenses
                .filter(e => e.category === category &&
                    new Date(e.date).getMonth() === currentMonth &&
                    new Date(e.date).getFullYear() === currentYear)
                .reduce((sum, e) => sum + e.amount, 0);

            const percentageUsed = (categoryExpenses / budget) * 100;
            const remaining = budget - categoryExpenses;
            const dailyAverage = categoryExpenses / currentDate.getDate();
            
            // Update category info
            const infoHtml = `
                <div class="category-header">
                    ${category} ${formatCurrency(categoryExpenses)} / ${formatCurrency(budget)}
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill ${getProgressClass(percentageUsed)}"
                             style="width: ${Math.min(percentageUsed, 100)}%"></div>
                    </div>
                </div>
                
                <div class="category-stats">
                    <div class="stat-item">
                        <span class="stat-label">Remaining</span>
                        <span class="stat-value">${formatCurrency(remaining)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Daily Avg Spend</span>
                        <span class="stat-value">${formatCurrency(dailyAverage)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Used</span>
                        <span class="stat-value">${percentageUsed.toFixed(1)}%</span>
                    </div>
                </div>
            `;

            document.getElementById('categoryStatusInfo').innerHTML = infoHtml;

            // Update navigation buttons
            document.getElementById('prevCategory').disabled = currentCategoryIndex === 0;
            document.getElementById('nextCategory').disabled = currentCategoryIndex === categories.length - 1;

            // Update category-specific alerts
            updateCategoryAlerts(category, percentageUsed, remaining, dailyAverage);
        });
}

function updateCategoryAlerts(category, percentageUsed, remaining, dailyAverage) {
    const alertContainer = document.getElementById('budgetAlertMessages');
    alertContainer.innerHTML = '';

    // Category-specific alerts
    if (percentageUsed >= 90) {
        showAlertMessage('danger', `⚠️ Critical: ${category} budget is almost depleted (${percentageUsed.toFixed(1)}% used)`);
    } else if (percentageUsed >= 75) {
        showAlertMessage('warning', `⚠️ Warning: ${category} spending is high (${percentageUsed.toFixed(1)}% used)`);
    } else if (percentageUsed <= 20) {
        showAlertMessage('success', `👏 Excellent budgeting in ${category}! You're well under budget.`);
    }

    // Daily average analysis
    const daysInMonth = new Date(new Date().getYear(), new Date().getMonth() + 1, 0).getDate();
    const projectedTotal = dailyAverage * daysInMonth;
    
    if (projectedTotal > budget) {
        showAlertMessage('warning', `📊 At current rate, ${category} expenses might exceed budget by month end.`);
    }

    if (remaining < 0) {
        showAlertMessage('danger', `💸 ${category} budget exceeded by ${formatCurrency(Math.abs(remaining))}`);
    } else if (remaining > 0 && percentageUsed > 50) {
        showAlertMessage('info', `💰 ${formatCurrency(remaining)} remaining in ${category} budget`);
    }
}

function updateFixedAlertMessage(expenses, categories) {
    const fixedAlertContainer = document.querySelector('.fixed-alert-message');
    if (!fixedAlertContainer) return;
    
    const predictionTextElement = fixedAlertContainer.querySelector('.prediction-text');
    const aiIconElement = fixedAlertContainer.querySelector('.ai-icon');
    if (!predictionTextElement || !aiIconElement) return;

    // Calculate overall spending and total budget
    let totalBudget = 0;
    let totalSpent = 0;
    let highestOverspendCategory = null;
    let maxOverspendAmount = 0;
    let overBudgetCount = 0;
    let nearLimitCount = 0;

    categories.forEach(category => {
        const budget = parseFloat(category.budget) || 0;
        totalBudget += budget;
        
        const categoryExpenses = expenses.filter(expense => expense.category === category.name);
        const spent = categoryExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        totalSpent += spent;
        
        const diff = budget - spent;
        if (diff < 0 && Math.abs(diff) > maxOverspendAmount) {
            maxOverspendAmount = Math.abs(diff);
            highestOverspendCategory = category.name;
        }
        
        if (diff < 0) {
            overBudgetCount++;
        } else if (diff <= budget * 0.2 && budget > 0) {
            nearLimitCount++;
        }
    });

    // Calculate spending trend (compare with previous month)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = currentDate.getFullYear();
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Get expenses from current month
    const currentMonthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
    
    // Get expenses from previous month
    const previousMonthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === previousMonth && expenseDate.getFullYear() === previousYear;
    });
    
    const currentMonthTotal = currentMonthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const previousMonthTotal = previousMonthExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    
    // Calculate spending velocity (average daily spend)
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysPassed = Math.min(currentDate.getDate(), daysInCurrentMonth);
    const dailyAverage = currentMonthTotal / daysPassed;
    const projectedMonthTotal = dailyAverage * daysInCurrentMonth;
    
    let trendIcon = '🤖';
    let trendDescription = '';
    let alertClass = 'info';
    let alertMessage = '';
    
    // Generate the predictive AI analysis message
    if (totalSpent > totalBudget) {
        alertClass = 'danger';
        trendIcon = '🤖‼️';
        
        if (projectedMonthTotal > previousMonthTotal * 1.3) {
            trendDescription = 'significantly higher';
        } else if (projectedMonthTotal > previousMonthTotal * 1.1) {
            trendDescription = 'higher';
        } else {
            trendDescription = 'similar';
        }
        
        if (overBudgetCount > 1) {
            alertMessage = `<strong>AI Prediction:</strong> You're already over budget by <strong>$${(totalSpent - totalBudget).toFixed(2)}</strong> with ${overBudgetCount} categories exceeding limits. Based on your spending pattern, I predict you're on track to spend <strong>${trendDescription}</strong> than last month. Consider reviewing your ${highestOverspendCategory} expenses immediately.`;
        } else if (highestOverspendCategory) {
            alertMessage = `<strong>AI Prediction:</strong> You've exceeded your budget in ${highestOverspendCategory} by <strong>$${maxOverspendAmount.toFixed(2)}</strong>. At your current rate, your total spending will be <strong>${trendDescription}</strong> than last month. Adjusting now could help avoid further overspending.`;
        }
    } else if (totalSpent > totalBudget * 0.8) {
        alertClass = 'warning';
        trendIcon = '🤖⚠️';
        
        const daysLeft = daysInCurrentMonth - daysPassed;
        const budgetLeft = totalBudget - totalSpent;
        const dailyBudgetLeft = budgetLeft / daysLeft;
        
        if (dailyAverage > dailyBudgetLeft * 1.5) {
            alertMessage = `<strong>AI Prediction:</strong> You've spent <strong>${(totalSpent / totalBudget * 100).toFixed(0)}%</strong> of your monthly budget. At your current spending rate of <strong>$${dailyAverage.toFixed(2)}/day</strong>, you'll exceed your budget in approximately <strong>${Math.floor(budgetLeft / dailyAverage)}</strong> days.`;
        } else {
            alertMessage = `<strong>AI Prediction:</strong> You've used <strong>${(totalSpent / totalBudget * 100).toFixed(0)}%</strong> of your monthly budget. If you maintain your current pace, you should stay within budget, but ${nearLimitCount > 0 ? `watch your spending in ${nearLimitCount} categories that are nearing their limits.` : 'continue to monitor your expenses closely.'}`;
        }
    } else {
        alertClass = 'success';
        trendIcon = '🤖✅';
        
        const percentUsed = (totalSpent / totalBudget * 100).toFixed(0);
        const estimatedSavings = totalBudget - projectedMonthTotal;
        
        if (estimatedSavings > 0) {
            alertMessage = `<strong>AI Prediction:</strong> You've used <strong>${percentUsed}%</strong> of your budget and are on track to save approximately <strong>$${estimatedSavings.toFixed(2)}</strong> this month. Your spending is ${currentMonthTotal < previousMonthTotal * 0.9 ? 'significantly lower' : 'well managed'} compared to last month.`;
        } else {
            alertMessage = `<strong>AI Prediction:</strong> You've used <strong>${percentUsed}%</strong> of your budget. Your spending is well controlled, but I'm noticing an upward trend that may require attention soon.`;
        }
    }
    
    aiIconElement.innerHTML = trendIcon;
    predictionTextElement.innerHTML = alertMessage;
    
    // Update class and add animation
    fixedAlertContainer.className = `fixed-alert-message ${alertClass}`;
    
    // Trigger animation by removing and re-adding the animate-update class
    fixedAlertContainer.classList.remove('animate-update');
    setTimeout(() => {
        fixedAlertContainer.classList.add('animate-update');
    }, 10);
}

async function updateBudgetInsights() {
    try {
        const expensesResponse = await fetch('/expense/list');
        if (!expensesResponse.ok) throw new Error('Failed to fetch expenses');
        const expenses = await expensesResponse.json();

        const categoriesResponse = await fetch('/budget/list');
        if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
        const categories = await categoriesResponse.json();

        // Generate slides with category budget data
        createCategorySlides(expenses);
        
        // Update the active slide
        const activeSlide = document.querySelector('.category-slide.active');
        if (activeSlide) {
            // Update the AI insights message
            const aiInsightsElement = document.getElementById('aiInsightsMessage');
            if (aiInsightsElement) {
                const category = activeSlide.querySelector('.category-header')?.textContent || '';
                generateAIPredictionForInsights(category, aiInsightsElement);
            }
            
            // Update the budget status message
            updateBudgetStatusMessage(activeSlide);
        }

        // Start the carousel if it's not already running
        if (!slideInterval) {
            startCarouselInterval();
        }
    } catch (error) {
        console.error('Error updating budget insights:', error);
    }
}

// Function to get expenses for prediction
async function fetchExpensesForPrediction() {
    try {
        // Only proceed if we still don't have preloaded expenses
        if (!preloadedExpenses) {
            const response = await fetch('/expense/list');
            if (response.ok) {
                preloadedExpenses = await response.json();
                
                // Get the active slide and update AI prediction
                const activeSlide = document.querySelector('.category-slide.active');
                if (activeSlide) {
                    const aiInsightsElement = document.getElementById('aiInsightsMessage');
                    if (aiInsightsElement) {
                        const category = activeSlide.querySelector('.category-header')?.textContent || '';
                        generateAIPredictionForInsights(category, aiInsightsElement);
                    }
                    
                    // Also update the budget status message
                    updateBudgetStatusMessage(activeSlide);
                }
            }
        }
        return preloadedExpenses || [];
    } catch (error) {
        console.error('Error fetching expenses for prediction:', error);
        return [];
    }
}

// Function to show login notification popup
function showLoginNotification() {
    const notification = document.getElementById('loginNotification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (!notification || !notificationMessage) return;
    
    // Get user spending data to show relevant notification
    fetchExpensesForPrediction()
        .then(() => {
            if (preloadedExpenses && preloadedExpenses.length > 0) {
                // Generate a contextual notification based on spending patterns
                const message = generateSpendingNotification();
                notificationMessage.innerHTML = message.text;
                
                // Apply style based on notification type
                notification.className = 'login-notification show ' + message.type;
                
                // Hide the notification after 5 seconds
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 5000);
            } else {
                // If no data, show a welcome message
                notificationMessage.innerHTML = "Welcome to FinNote! Start tracking your expenses to get personalized insights.";
                notification.className = 'login-notification show';
                
                // Hide the notification after 5 seconds
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 5000);
            }
        });
}

// Function to generate contextual notification based on spending patterns
function generateSpendingNotification() {
    if (!preloadedExpenses || preloadedExpenses.length === 0) {
        return { 
            text: "Welcome to FinNote! Start tracking your expenses for personalized insights.", 
            type: "info" 
        };
    }
    
    const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
    if (!userBudget) {
        return { 
            text: "Set up your budget to receive personalized spending insights!", 
            type: "info" 
        };
    }
    
    // Get current and previous month data
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Find categories with significant changes in spending patterns
    const categoriesWithWarnings = [];
    const categoriesWithGoodPerformance = [];
    
    Object.keys(userBudget.allocations).forEach(category => {
        const categoryBudget = userBudget.allocations[category];
        
        // Current month expenses for this category
        const currentMonthCategoryExpenses = preloadedExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear &&
                   expense.category === category;
        });
        
        // Previous month expenses for this category
        const previousMonthCategoryExpenses = preloadedExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === previousMonth && 
                   expenseDate.getFullYear() === previousYear &&
                   expense.category === category;
        });
        
        const currentTotal = currentMonthCategoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const previousTotal = previousMonthCategoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        
        // Skip categories with no previous data for comparison
        if (previousTotal === 0) return;
        
        // Calculate daily rates for fair comparison
        const currentDayOfMonth = currentDate.getDate();
        const daysInPreviousMonth = new Date(previousYear, previousMonth + 1, 0).getDate();
        
        const currentDailyRate = currentDayOfMonth > 0 ? currentTotal / currentDayOfMonth : 0;
        const previousDailyRate = previousTotal / daysInPreviousMonth;
        
        // Check if current spending rate is significantly higher than previous month
        if (currentDailyRate > previousDailyRate * 1.3) {
            categoriesWithWarnings.push({
                name: category,
                increase: ((currentDailyRate / previousDailyRate) - 1) * 100
            });
        }
        
        // Check if current spending rate is significantly lower (good performance)
        if (currentDailyRate < previousDailyRate * 0.7 && currentTotal > 0) {
            categoriesWithGoodPerformance.push({
                name: category,
                decrease: (1 - (currentDailyRate / previousDailyRate)) * 100
            });
        }
    });
    
    // Prioritize warnings
    if (categoriesWithWarnings.length > 0) {
        // Sort by highest increase
        categoriesWithWarnings.sort((a, b) => b.increase - a.increase);
        const worstCategory = categoriesWithWarnings[0];
        
        // Calculate category specific data
        const categoryBudget = userBudget.allocations[worstCategory.name];
        const categoryExpenses = preloadedExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear &&
                   expense.category === worstCategory.name;
        });
        const categoryTotal = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const percentageUsed = (categoryTotal / categoryBudget) * 100;
        
        return {
            text: `You have spent ${percentageUsed.toFixed(0)}% of your ${worstCategory.name} budget. Please spend carefully.`,
            type: "warning"
        };
    }
    
    // Show positive feedback if good performance
    if (categoriesWithGoodPerformance.length > 0) {
        // Sort by highest decrease
        categoriesWithGoodPerformance.sort((a, b) => b.decrease - a.decrease);
        const bestCategory = categoriesWithGoodPerformance[0];
        
        // Calculate category specific data
        const categoryBudget = userBudget.allocations[bestCategory.name];
        const categoryExpenses = preloadedExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear &&
                   expense.category === bestCategory.name;
        });
        const categoryTotal = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const percentageUsed = (categoryTotal / categoryBudget) * 100;
        
        return {
            text: `Great job! You've used only ${percentageUsed.toFixed(0)}% of your ${bestCategory.name} budget. Keep it up!`,
            type: "success"
        };
    }
    
    // Default message - highest usage category
    let highestUsageCategory = null;
    let highestPercentage = 0;
    
    Object.keys(userBudget.allocations).forEach(category => {
        const categoryBudget = userBudget.allocations[category];
        const categoryExpenses = preloadedExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear &&
                   expense.category === category;
        });
        const categoryTotal = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const percentageUsed = (categoryTotal / categoryBudget) * 100;
        
        if (percentageUsed > highestPercentage) {
            highestPercentage = percentageUsed;
            highestUsageCategory = {
                name: category,
                percentage: percentageUsed
            };
        }
    });
    
    if (highestUsageCategory) {
        return {
            text: `You have spent ${highestUsageCategory.percentage.toFixed(0)}% of your ${highestUsageCategory.name} budget. Please spend carefully.`,
            type: "info"
        };
    }
    
    return {
        text: "Welcome to FinNote! Start tracking your categories to get personalized insights.",
        type: "info"
    };
}

// Function to load and display the user's name
function loadUserName() {
    // The username is already server-side rendered in the template
    // No need to fetch it from an API
    const usernameElement = document.getElementById('username');
    
    // Only modify if it contains the default value
    if (usernameElement && usernameElement.textContent === 'FinNote') {
        // The server-side rendered username will be used instead
        // If no server-side username is provided, it will keep "FinNote"
        console.log("Username already set by server-side rendering");
    }
} 
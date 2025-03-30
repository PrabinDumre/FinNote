document.addEventListener('DOMContentLoaded', function() {
    // Check for browser notification permission
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    // Initialize notification checks
    initializeBudgetAlerts();
    initializeSpendingPatternAlerts();

    // Budget Threshold Alerts
    function initializeBudgetAlerts() {
        const checkBudgetThresholds = () => {
            const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
            if (!userBudget) return;

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

                    // Check each category
                    Object.entries(userBudget.allocations).forEach(([category, budget]) => {
                        const categoryExpenses = currentMonthExpenses
                            .filter(e => e.category === category)
                            .reduce((sum, e) => sum + e.amount, 0);

                        const usagePercentage = (categoryExpenses / budget) * 100;

                        // Alert at 80% and 100% of budget
                        if (usagePercentage >= 100) {
                            showNotification(
                                'Budget Exceeded!',
                                `You have exceeded your ${category} budget for this month.`
                            );
                            showToast('error', `Budget Alert: ${category} budget exceeded!`);
                        } else if (usagePercentage >= 80 && usagePercentage < 100) {
                            showNotification(
                                'Budget Warning',
                                `You have used ${Math.round(usagePercentage)}% of your ${category} budget.`
                            );
                            showToast('warning', `Budget Warning: ${category} at ${Math.round(usagePercentage)}%`);
                        }
                    });
                })
                .catch(error => console.error('Error checking budget thresholds:', error));
        };

        // Check initially and then every 12 hours
        checkBudgetThresholds();
        setInterval(checkBudgetThresholds, 12 * 60 * 60 * 1000);
    }

    // Unusual Spending Pattern Alerts
    function initializeSpendingPatternAlerts() {
        const checkUnusualSpending = () => {
            fetch('/expense/list')
                .then(response => response.json())
                .then(expenses => {
                    const currentDate = new Date();
                    const currentMonth = currentDate.getMonth();
                    const currentYear = currentDate.getFullYear();

                    // Get current month's expenses
                    const currentMonthExpenses = expenses.filter(expense => {
                        const expenseDate = new Date(expense.date);
                        return expenseDate.getMonth() === currentMonth && 
                               expenseDate.getFullYear() === currentYear;
                    });

                    // Get previous months' expenses for comparison
                    const previousMonths = {};
                    expenses.forEach(expense => {
                        const expenseDate = new Date(expense.date);
                        const monthKey = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`;
                        if (!previousMonths[monthKey]) {
                            previousMonths[monthKey] = {
                                total: 0,
                                byCategory: {}
                            };
                        }
                        previousMonths[monthKey].total += expense.amount;
                        
                        const category = expense.category;
                        if (!previousMonths[monthKey].byCategory[category]) {
                            previousMonths[monthKey].byCategory[category] = 0;
                        }
                        previousMonths[monthKey].byCategory[category] += expense.amount;
                    });

                    // Calculate averages
                    const monthsData = Object.values(previousMonths);
                    const categories = [...new Set(expenses.map(e => e.category))];

                    categories.forEach(category => {
                        const currentMonthTotal = currentMonthExpenses
                            .filter(e => e.category === category)
                            .reduce((sum, e) => sum + e.amount, 0);

                        // Calculate average for this category from previous months
                        const previousMonthsAvg = monthsData
                            .reduce((sum, month) => sum + (month.byCategory[category] || 0), 0) / monthsData.length;

                        // Check if current spending is 50% more than average
                        if (currentMonthTotal > previousMonthsAvg * 1.5) {
                            showNotification(
                                'Unusual Spending Pattern',
                                `Your ${category} spending this month is significantly higher than usual.`
                            );
                            showToast('warning', `Unusual spending detected in ${category}`);
                        }
                    });
                })
                .catch(error => console.error('Error checking spending patterns:', error));
        };

        // Check initially and then daily
        checkUnusualSpending();
        setInterval(checkUnusualSpending, 24 * 60 * 60 * 1000);
    }

    // Helper function to show browser notifications
    function showNotification(title, message) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/images/notification-icon.png'
            });
        }
    }

    // Helper function to show toast notifications
    function showToast(type, message) {
        Toastify({
            text: message,
            duration: 5000,
            gravity: "top",
            position: "right",
            backgroundColor: type === 'error' ? '#e74c3c' : 
                           type === 'warning' ? '#f1c40f' : '#2ecc71',
            stopOnFocus: true
        }).showToast();
    }

    // Update checks when new expenses are added
    document.addEventListener('expensesUpdated', function() {
        initializeBudgetAlerts();
        initializeSpendingPatternAlerts();
    });
}); 
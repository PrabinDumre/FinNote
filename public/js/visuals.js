document.addEventListener('DOMContentLoaded', function() {
    // Chart color scheme
    const colors = {
        primary: '#46997D',
        secondary: '#e67e22',
        accent1: '#3498db',
        accent2: '#9b59b6',
        accent3: '#f1c40f',
        accent4: '#e74c3c',
        background: 'rgba(70, 153, 125, 0.1)',
        give: '#2ecc71',     // Green for give money
        take: '#e74c3c'      // Red for take money
    };

    // Currency formatter
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Initialize all charts
    initializeGivenVsTakenChart();      // New chart
    initializePersonTransactionChart(); // New chart
    initializeBudgetVsExpenseChart();
    initializeCategoryPieChart();
    initializeMonthlyTrendChart();
    initializeDailyExpensesChart();
    initializeBudgetUtilizationChart();
    initializeExpenseDistributionChart();
    initializeYearComparisonChart();
    initializeWeeklyPatternChart();
    initializeSavingsTrendChart();
    initializeCategoryGrowthChart();

    // Given vs Taken Money Comparison Chart
    function initializeGivenVsTakenChart() {
        const ctx = document.getElementById('givenVsTakenChart').getContext('2d');
        
        fetch('/transactions/list')
            .then(response => response.json())
            .then(transactions => {
                // Group transactions by month
                const monthlyData = {};
                
                transactions.forEach(transaction => {
                    const date = new Date(transaction.date);
                    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                    
                    if (!monthlyData[month]) {
                        monthlyData[month] = { given: 0, taken: 0 };
                    }
                    
                    if (transaction.type === 'give') {
                        monthlyData[month].given += transaction.amount;
                    } else if (transaction.type === 'take') {
                        monthlyData[month].taken += transaction.amount;
                    }
                });
                
                // Sort months chronologically
                const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
                    const dateA = new Date(`1 ${a}`);
                    const dateB = new Date(`1 ${b}`);
                    return dateA - dateB;
                });
                
                // Extract data for chart
                const givenData = sortedMonths.map(month => monthlyData[month].given);
                const takenData = sortedMonths.map(month => monthlyData[month].taken);
                
                // Create stacked bar chart
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: sortedMonths,
                        datasets: [
                            {
                                label: 'Money Given',
                                data: givenData,
                                backgroundColor: colors.give,
                                borderColor: colors.give,
                                borderWidth: 1
                            },
                            {
                                label: 'Money Taken',
                                data: takenData,
                                backgroundColor: colors.take,
                                borderColor: colors.take,
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Monthly Given vs Taken Money',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Month'
                                }
                            },
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching transaction data:', error);
                // Display error message on the chart
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        datasets: []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Error loading transaction data',
                                font: { size: 16 }
                            }
                        }
                    }
                });
            });
    }

    // Person-wise Transaction Summary Chart
    function initializePersonTransactionChart() {
        const ctx = document.getElementById('personTransactionChart').getContext('2d');
        
        fetch('/transactions/list')
            .then(response => response.json())
            .then(transactions => {
                // Group transactions by person
                const personData = {};
                
                transactions.forEach(transaction => {
                    const personName = transaction.personName;
                    if (!personName) return;
                    
                    if (!personData[personName]) {
                        personData[personName] = { given: 0, taken: 0 };
                    }
                    
                    if (transaction.type === 'give') {
                        personData[personName].given += transaction.amount;
                    } else if (transaction.type === 'take') {
                        personData[personName].taken += transaction.amount;
                    }
                });
                
                // Calculate net amount and prepare data for chart
                const people = [];
                const netAmounts = [];
                const colors = [];
                
                for (const person in personData) {
                    const given = personData[person].given;
                    const taken = personData[person].taken;
                    const net = taken - given; // Positive means you owe them, negative means they owe you
                    
                    people.push(person);
                    netAmounts.push(net);
                    colors.push(net >= 0 ? '#2ecc71' : '#e74c3c');
                }
                
                // Sort by absolute value of net amount (highest debt/credit first)
                const sortedIndices = netAmounts.map((_, i) => i)
                    .sort((a, b) => Math.abs(netAmounts[b]) - Math.abs(netAmounts[a]));
                
                const sortedPeople = sortedIndices.map(i => people[i]).slice(0, 10); // Top 10 people
                const sortedAmounts = sortedIndices.map(i => netAmounts[i]).slice(0, 10);
                const sortedColors = sortedIndices.map(i => colors[i]).slice(0, 10);
                
                // Create horizontal bar chart
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: sortedPeople,
                        datasets: [{
                            axis: 'y',
                            label: 'Net Amount',
                            data: sortedAmounts,
                            backgroundColor: sortedColors,
                            borderColor: sortedColors,
                            borderWidth: 1
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Person-wise Transaction Summary',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const value = context.raw;
                                        if (value > 0) {
                                            return `They owe you: ${formatCurrency(Math.abs(value))}`;
                                        } else {
                                            return `You owe them: ${formatCurrency(Math.abs(value))}`;
                                        }
                                    }
                                }
                            },
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Net Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching person transaction data:', error);
                // Display error message on the chart
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        datasets: []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Error loading person transaction data',
                                font: { size: 16 }
                            }
                        }
                    }
                });
            });
    }

    // Budget vs Expense Overview Chart
    function initializeBudgetVsExpenseChart() {
        const ctx = document.getElementById('budgetVsExpenseChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
                if (!userBudget) return;

                const categories = Object.keys(userBudget.allocations);
                const budgetData = categories.map(cat => userBudget.allocations[cat]);
                const expenseData = categories.map(cat => {
                    return expenses
                        .filter(e => e.category === cat)
                        .reduce((sum, e) => sum + e.amount, 0);
                });

                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: categories,
                        datasets: [
                            {
                                label: 'Budget Allocated',
                                data: budgetData,
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                                borderWidth: 1
                            },
                            {
                                label: 'Actual Expense',
                                data: expenseData,
                                backgroundColor: colors.accent4,
                                borderColor: colors.accent4,
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Budget vs Actual Expenses by Category',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            });
    }

    // Category-wise Expenses Pie Chart
    function initializeCategoryPieChart() {
        const ctx = document.getElementById('categoryPieChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const categoryTotals = {};
                expenses.forEach(expense => {
                    const category = expense.category || 'Other';
                    categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
                });

                const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(categoryTotals),
                        datasets: [{
                            data: Object.values(categoryTotals),
                            backgroundColor: [
                                colors.primary,
                                colors.secondary,
                                colors.accent1,
                                colors.accent2,
                                colors.accent3,
                                colors.accent4
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Expense Distribution by Category',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const value = context.raw;
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                    }
                                }
                            },
                            legend: {
                                position: 'right',
                                labels: {
                                    font: { size: 12 }
                                }
                            }
                        }
                    }
                });
            });
    }

    // Monthly Trend Line Chart
    function initializeMonthlyTrendChart() {
        const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const monthlyTotals = {};
                expenses.forEach(expense => {
                    const date = new Date(expense.date);
                    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                    monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.amount;
                });

                const sortedMonths = Object.keys(monthlyTotals).sort((a, b) => {
                    const dateA = new Date(a);
                    const dateB = new Date(b);
                    return dateA - dateB;
                });

                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: sortedMonths,
                        datasets: [{
                            label: 'Monthly Expenses',
                            data: sortedMonths.map(month => monthlyTotals[month]),
                            borderColor: colors.accent1,
                            backgroundColor: colors.background,
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Monthly Expense Trend',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `Total Expenses: ${formatCurrency(context.raw)}`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            });
    }

    // Daily Expenses Bar Chart
    function initializeDailyExpensesChart() {
        const ctx = document.getElementById('dailyExpensesChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const last7Days = Array.from({length: 7}, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0];
                }).reverse();

                const dailyTotals = last7Days.map(date => {
                    return expenses
                        .filter(e => e.date.startsWith(date))
                        .reduce((sum, e) => sum + e.amount, 0);
                });

                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: last7Days.map(date => {
                            const d = new Date(date);
                            return d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
                        }),
                        datasets: [{
                            label: 'Daily Expenses',
                            data: dailyTotals,
                            backgroundColor: colors.accent2,
                            borderColor: colors.accent2,
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Daily Expenses (Last 7 Days)',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `Total: ${formatCurrency(context.raw)}`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            });
    }

    // Budget Utilization Chart
    function initializeBudgetUtilizationChart() {
        const ctx = document.getElementById('budgetUtilizationChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
                if (!userBudget) return;

                const categories = Object.keys(userBudget.allocations);
                const utilizationData = categories.map(cat => {
                    const budget = userBudget.allocations[cat];
                    const spent = expenses
                        .filter(e => e.category === cat)
                        .reduce((sum, e) => sum + e.amount, 0);
                    return (spent / budget) * 100;
                });

                new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: categories,
                        datasets: [{
                            label: 'Budget Utilization',
                            data: utilizationData,
                            backgroundColor: colors.background,
                            borderColor: colors.accent3,
                            borderWidth: 2,
                            pointBackgroundColor: colors.accent3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Budget Utilization by Category (%)',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `${context.label}: ${context.raw.toFixed(1)}%`
                                }
                            }
                        },
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: (value) => `${value}%`
                                }
                            }
                        }
                    }
                });
            });
    }

    // Expense Distribution Chart
    function initializeExpenseDistributionChart() {
        const ctx = document.getElementById('expenseDistributionChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const expenseRanges = {
                    '₹0-1,000': 0,
                    '₹1,001-5,000': 0,
                    '₹5,001-10,000': 0,
                    '₹10,000+': 0
                };

                expenses.forEach(expense => {
                    if (expense.amount <= 1000) expenseRanges['₹0-1,000']++;
                    else if (expense.amount <= 5000) expenseRanges['₹1,001-5,000']++;
                    else if (expense.amount <= 10000) expenseRanges['₹5,001-10,000']++;
                    else expenseRanges['₹10,000+']++;
                });

                const total = Object.values(expenseRanges).reduce((sum, val) => sum + val, 0);

                new Chart(ctx, {
                    type: 'polarArea',
                    data: {
                        labels: Object.keys(expenseRanges),
                        datasets: [{
                            data: Object.values(expenseRanges),
                            backgroundColor: [
                                colors.primary,
                                colors.secondary,
                                colors.accent1,
                                colors.accent4
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Distribution of Expenses by Amount Range',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const value = context.raw;
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${context.label}: ${value} transactions (${percentage}%)`;
                                    }
                                }
                            },
                            legend: {
                                position: 'right',
                                labels: {
                                    font: { size: 12 }
                                }
                            }
                        }
                    }
                });
            });
    }

    // Year-over-Year Comparison Chart
    function initializeYearComparisonChart() {
        const ctx = document.getElementById('yearComparisonChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const yearlyData = {};
                expenses.forEach(expense => {
                    const date = new Date(expense.date);
                    const year = date.getFullYear();
                    const month = date.getMonth();
                    
                    if (!yearlyData[year]) {
                        yearlyData[year] = Array(12).fill(0);
                    }
                    yearlyData[year][month] += expense.amount;
                });

                const years = Object.keys(yearlyData).sort();
                const datasets = years.map(year => ({
                    label: `Year ${year}`,
                    data: yearlyData[year],
                    borderColor: colors[`accent${years.indexOf(year) + 1}`],
                    fill: false,
                    tension: 0.4
                }));

                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Year-over-Year Monthly Expense Comparison',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            });
    }

    // Weekly Spending Pattern Chart
    function initializeWeeklyPatternChart() {
        const ctx = document.getElementById('weeklyPatternChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const weekdayTotals = Array(7).fill(0);
                const weekdayCounts = Array(7).fill(0);

                expenses.forEach(expense => {
                    const date = new Date(expense.date);
                    const dayOfWeek = date.getDay();
                    weekdayTotals[dayOfWeek] += expense.amount;
                    weekdayCounts[dayOfWeek]++;
                });

                const averages = weekdayTotals.map((total, index) => 
                    weekdayCounts[index] ? total / weekdayCounts[index] : 0
                );

                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                        datasets: [{
                            label: 'Average Spending by Day',
                            data: averages,
                            backgroundColor: colors.accent2,
                            borderColor: colors.accent2,
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Average Daily Spending Pattern',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `Average: ${formatCurrency(context.raw)}`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Average Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            });
    }

    // Savings Trend Chart (assuming income is stored in localStorage)
    function initializeSavingsTrendChart() {
        const ctx = document.getElementById('savingsTrendChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const monthlyIncome = JSON.parse(localStorage.getItem('monthlyIncome') || '50000'); // Default assumption
                const monthlyData = {};

                expenses.forEach(expense => {
                    const date = new Date(expense.date);
                    const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + expense.amount;
                });

                const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
                    const dateA = new Date(a);
                    const dateB = new Date(b);
                    return dateA - dateB;
                });

                const savings = sortedMonths.map(month => monthlyIncome - monthlyData[month]);

                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: sortedMonths,
                        datasets: [
                            {
                                label: 'Income',
                                data: Array(sortedMonths.length).fill(monthlyIncome),
                                borderColor: colors.primary,
                                borderDash: [5, 5],
                                fill: false
                            },
                            {
                                label: 'Expenses',
                                data: sortedMonths.map(month => monthlyData[month]),
                                borderColor: colors.accent4,
                                fill: false
                            },
                            {
                                label: 'Savings',
                                data: savings,
                                borderColor: colors.accent3,
                                backgroundColor: colors.background,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Monthly Income, Expenses & Savings Trend',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            });
    }

    // Category Growth Chart
    function initializeCategoryGrowthChart() {
        const ctx = document.getElementById('categoryGrowthChart').getContext('2d');
        fetch('/expense/list')
            .then(response => response.json())
            .then(expenses => {
                const categoryGrowth = {};
                
                expenses.forEach(expense => {
                    const date = new Date(expense.date);
                    const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                    const category = expense.category || 'Other';

                    if (!categoryGrowth[category]) {
                        categoryGrowth[category] = {};
                    }
                    categoryGrowth[category][monthKey] = (categoryGrowth[category][monthKey] || 0) + expense.amount;
                });

                const months = [...new Set(expenses.map(e => {
                    const date = new Date(e.date);
                    return date.toLocaleString('default', { month: 'short', year: '2-digit' });
                }))].sort((a, b) => new Date(a) - new Date(b));

                const datasets = Object.keys(categoryGrowth).map((category, index) => ({
                    label: category,
                    data: months.map(month => categoryGrowth[category][month] || 0),
                    borderColor: colors[`accent${(index % 4) + 1}`],
                    fill: false
                }));

                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: months,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Category-wise Expense Growth Over Time',
                                font: { size: 16 }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Amount (₹)'
                                },
                                ticks: {
                                    callback: (value) => formatCurrency(value)
                                }
                            }
                        }
                    }
                });
            });
    }

    // Update event listeners to include new charts
    window.addEventListener('budgetUpdated', function() {
        initializeBudgetVsExpenseChart();
        initializeBudgetUtilizationChart();
        initializeSavingsTrendChart();
    });

    document.addEventListener('expensesUpdated', function() {
        initializeBudgetVsExpenseChart();
        initializeCategoryPieChart();
        initializeMonthlyTrendChart();
        initializeDailyExpensesChart();
        initializeBudgetUtilizationChart();
        initializeExpenseDistributionChart();
        initializeYearComparisonChart();
        initializeWeeklyPatternChart();
        initializeSavingsTrendChart();
        initializeCategoryGrowthChart();
    });
}); 
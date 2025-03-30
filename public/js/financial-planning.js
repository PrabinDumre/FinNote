document.addEventListener('DOMContentLoaded', function() {
    const budgetAnalysisContainer = document.querySelector('.budget-analysis-container');

    // Function to display budget analysis
    function displayBudgetAnalysis() {
        // Get user's budget from localStorage
        const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');

        // Format results as HTML
        let html = '<div class="budget-recommendations">';
        
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
                        
                        html += `
                            <tr>
                                <td>${category}</td>
                                <td>${formatCurrency(budgetAmount)}</td>
                                <td>${formatCurrency(totalExpense)}</td>
                                <td class="${statusClass}">
                                    ${status} (${formatCurrency(Math.abs(difference))})
                                </td>
                            </tr>
                        `;
                    });

                    // Add total row
                    const totalBudget = Object.values(userBudget.allocations).reduce((sum, amt) => sum + amt, 0);
                    const totalExpense = Object.values(categoryTotals).reduce((sum, amt) => sum + amt, 0);
                    const totalDifference = totalBudget - totalExpense;
                    
                    html += `
                        <tr class="total-row">
                            <td>Total</td>
                            <td>${formatCurrency(totalBudget)}</td>
                            <td>${formatCurrency(totalExpense)}</td>
                            <td class="${totalDifference >= 0 ? 'under-budget' : 'over-budget'}">
                                ${totalDifference >= 0 ? 'Under Budget' : 'Over Budget'}
                                (${formatCurrency(Math.abs(totalDifference))})
                            </td>
                        </tr>
                    `;

                    html += '</tbody></table></div>';
                    html += '</div>';
                    html += '</div>';

                    // Update the container with the analysis
                    budgetAnalysisContainer.innerHTML = html;
                })
                .catch(error => {
                    console.error('Error fetching expenses:', error);
                    budgetAnalysisContainer.innerHTML = '<div class="error-message">Error loading budget analysis</div>';
                });
        } else {
            budgetAnalysisContainer.innerHTML = `
                <div class="no-budget-message">
                    <p>No budget set yet. Click the "Set Budget" button to create your budget.</p>
                </div>
            `;
        }
    }

    // Helper function to format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Initial display of budget analysis
    displayBudgetAnalysis();

    // Listen for budget updates
    window.addEventListener('budgetUpdated', function() {
        displayBudgetAnalysis();
    });

    // Update budget analysis when the page loads and when expenses change
    document.addEventListener('expensesUpdated', function() {
        displayBudgetAnalysis();
    });
}); 
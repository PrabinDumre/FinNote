// Store transactions in localStorage
const STORAGE_KEY = 'transactions';

class TransactionManager {
    constructor() {
        this.transactions = [];
        this.initializeEventListeners();
        this.loadTransactions();
    }

    async loadTransactions() {
        try {
            const response = await fetch('/transactions/list');
            if (response.ok) {
                this.transactions = await response.json();
                this.updateUI();
                this.updateCharts();
                this.updatePeopleSummary();
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    async addTransaction(type, data) {
        try {
            const response = await fetch('/transactions/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type,
                    ...data
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add transaction');
            }

            // Reload transactions from server
            await this.loadTransactions();
            
            // Show success message
            alert('Transaction saved successfully!');
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Failed to add transaction. Please try again.');
        }
    }

    async updateTransaction(transactionId, data) {
        try {
            const response = await fetch(`/transactions/${transactionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to update transaction');
            }

            await this.loadTransactions();
            alert('Transaction updated successfully!');
        } catch (error) {
            console.error('Error updating transaction:', error);
            alert('Failed to update transaction. Please try again.');
        }
    }

    async deleteTransaction(transactionId) {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            const response = await fetch(`/transactions/${transactionId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }

            await this.loadTransactions();
            alert('Transaction deleted successfully!');
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Failed to delete transaction. Please try again.');
        }
    }

    openEditModal(transaction) {
        // If transaction is a string (from the onclick handler), parse it
        if (typeof transaction === 'string') {
            try {
                transaction = JSON.parse(transaction);
            } catch (e) {
                console.error('Error parsing transaction data:', e);
                return;
            }
        }

        // Hide any currently visible modals
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.style.visibility = 'hidden';
        });

        const editModal = document.getElementById('editTransactionModal');
        const editForm = document.getElementById('editTransactionForm');
        const personNameInput = editForm.querySelector('#editPersonName');
        const amountInput = editForm.querySelector('#editAmount');
        const descriptionInput = editForm.querySelector('#editDescription');
        const transactionIdInput = editForm.querySelector('#editTransactionId');
        const typeInput = editForm.querySelector('#editType');

        personNameInput.value = transaction.personName;
        amountInput.value = transaction.amount;
        descriptionInput.value = transaction.description || '';
        transactionIdInput.value = transaction._id;
        typeInput.value = transaction.type;

        editModal.classList.add('show');
        editModal.style.zIndex = '1001';
        editModal.style.visibility = 'visible';
    }

    // Initialize all event listeners
    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.updateUI();
            
            // Add event listener for edit form submission
            const editForm = document.getElementById('editTransactionForm');
            if (editForm) {
                editForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const transactionId = document.getElementById('editTransactionId').value;
                    const type = document.getElementById('editType').value;
                    const personName = document.getElementById('editPersonName').value;
                    const amount = parseFloat(document.getElementById('editAmount').value);
                    const description = document.getElementById('editDescription').value;

                    try {
                        await this.updateTransaction(transactionId, {
                            type,
                            personName,
                            amount,
                            description
                        });

                        // Close edit modal
                        const editModal = document.getElementById('editTransactionModal');
                        editModal.classList.remove('show');
                        editModal.style.visibility = 'hidden';

                        // Show other modals that were hidden
                        document.querySelectorAll('.modal').forEach(modal => {
                            if (modal !== editModal) {
                                modal.style.visibility = 'visible';
                            }
                        });

                        // Reload the page to show updated data
                        window.location.reload();
                    } catch (error) {
                        console.error('Error updating transaction:', error);
                    }
                });
            }

            // Add event listeners for modal close buttons
            document.querySelectorAll('.modal .close-btn, .modal .cancel-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const modal = btn.closest('.modal');
                    if (modal) {
                        modal.classList.remove('show');
                        modal.style.visibility = 'hidden';
                        
                        // Show other modals that were hidden
                        document.querySelectorAll('.modal').forEach(otherModal => {
                            if (otherModal !== modal) {
                                otherModal.style.visibility = 'visible';
                            }
                        });
                    }
                });
            });
        });
    }

    // Update the Recent Transactions UI
    updateUI() {
        const transactionList = document.querySelector('.transaction-list');
        if (!transactionList) return;

        const recentTransactions = this.transactions.slice(0, 2);

        transactionList.innerHTML = recentTransactions.map(transaction => {
            const isGive = transaction.type === 'give';
            const isTake = transaction.type === 'take';
            
            return `
                <div class="transaction-card ${transaction.type}">
                    <div class="transaction-info">
                        <h4>${transaction.personName || 'Split Transaction'}</h4>
                        <p class="description">${transaction.description || 'No description'}</p>
                        <span class="date">${new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                    <div class="transaction-amount">
                        <span class="amount">₹${transaction.amount}</span>
                        <span class="status">${isGive ? 'Given' : isTake ? 'Taken' : 'Split'}</span>
                    </div>
                </div>
            `;
        }).join('');

        this.updateSummary();
    }

    // Update the summary cards at the top
    updateSummary() {
        const given = this.transactions
            .filter(t => t.type === 'give')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const taken = this.transactions
            .filter(t => t.type === 'take')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const netBalance = given - taken;

        // Update the summary cards with calculated values
        const givenElement = document.querySelector('.summary-card:nth-child(1) .amount');
        const takenElement = document.querySelector('.summary-card:nth-child(2) .amount');
        const netBalanceElement = document.querySelector('.summary-card:nth-child(3) .amount');

        if (givenElement) givenElement.textContent = `₹${given.toFixed(2)}`;
        if (takenElement) takenElement.textContent = `₹${taken.toFixed(2)}`;
        if (netBalanceElement) {
            netBalanceElement.textContent = `₹${Math.abs(netBalance).toFixed(2)}`;
            netBalanceElement.className = `amount ${netBalance >= 0 ? 'positive' : 'negative'}`;
        }
    }

    getMonthlyData() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const currentMonth = new Date().getMonth();
        
        // Get last 6 months
        const monthsToShow = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1);
        
        const monthlyGiven = new Array(monthsToShow.length).fill(0);
        const monthlyTaken = new Array(monthsToShow.length).fill(0);
        const monthlyNet = new Array(monthsToShow.length).fill(0);

        this.transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            const monthIndex = monthsToShow.indexOf(months[transactionDate.getMonth()]);
            
            if (monthIndex !== -1) {
                const amount = Number(transaction.amount);
                if (transaction.type === 'give') {
                    monthlyGiven[monthIndex] += amount;
                    monthlyNet[monthIndex] += amount;
                } else if (transaction.type === 'take') {
                    monthlyTaken[monthIndex] += amount;
                    monthlyNet[monthIndex] -= amount;
                }
            }
        });

        return {
            labels: monthsToShow,
            given: monthlyGiven,
            taken: monthlyTaken,
            net: monthlyNet
        };
    }

    getDailyData() {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyGiven = new Array(7).fill(0);
        const dailyTaken = new Array(7).fill(0);

        // Get transactions from the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        this.transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.date);
            if (transactionDate >= oneWeekAgo) {
                // Fix: Convert to 0-6 range where 0 is Monday
                const dayIndex = (transactionDate.getDay() + 6) % 7;
                const amount = Number(transaction.amount);
                
                if (transaction.type === 'give') {
                    dailyGiven[dayIndex] += amount;
                } else if (transaction.type === 'take') {
                    dailyTaken[dayIndex] += amount;
                }
            }
        });

        return {
            labels: days,
            given: dailyGiven,
            taken: dailyTaken
        };
    }

    updateCharts() {
        const monthlyData = this.getMonthlyData();
        const dailyData = this.getDailyData();

        // Update Monthly Trend Chart
        if (window.monthlyTrendChart) {
            window.monthlyTrendChart.data.labels = monthlyData.labels;
            window.monthlyTrendChart.data.datasets[0].data = monthlyData.net;
            window.monthlyTrendChart.update();
        }

        // Update Daily Expenses Chart
        if (window.dailyExpensesChart) {
            window.dailyExpensesChart.data.labels = dailyData.labels;
            window.dailyExpensesChart.data.datasets[0].data = dailyData.given;
            window.dailyExpensesChart.data.datasets[1].data = dailyData.taken;
            window.dailyExpensesChart.update();
        }
    }

    updatePeopleSummary() {
        const peopleSummary = {};
        
        // Helper function to normalize names
        const normalizeName = (name) => {
            return name.trim().replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        };
        
        // Calculate totals for each person
        this.transactions.forEach(transaction => {
            const personName = transaction.personName;
            if (!personName) return;

            const normalizedName = normalizeName(personName);

            if (!peopleSummary[normalizedName]) {
                peopleSummary[normalizedName] = {
                    given: 0,
                    taken: 0,
                    lastTransaction: transaction.date
                };
            }

            const amount = Number(transaction.amount);
            if (transaction.type === 'give') {
                peopleSummary[normalizedName].given += amount;
            } else if (transaction.type === 'take') {
                peopleSummary[normalizedName].taken += amount;
            }
            
            // Update last transaction date if this one is more recent
            if (new Date(transaction.date) > new Date(peopleSummary[normalizedName].lastTransaction)) {
                peopleSummary[normalizedName].lastTransaction = transaction.date;
            }
        });

        // Convert to array and prepare both recent and alphabetical lists
        const allPeople = Object.entries(peopleSummary)
            .map(([name, data]) => ({
                name,
                given: data.given,
                taken: data.taken,
                net: data.given - data.taken,
                lastTransaction: data.lastTransaction
            }))
            // Sort by most recent transaction first
            .sort((a, b) => new Date(b.lastTransaction) - new Date(a.lastTransaction))
            .slice(0, 4); // Show last 4 transactions

        // Update the UI
        const summaryContainer = document.querySelector('.people-summary');
        if (!summaryContainer) return;

        const createPersonHTML = (person) => `
            <div class="person-item">
                <div class="person-info">
                    <span class="person-name">
                        <span class="person-dot" style="background-color: ${person.net >= 0 ? '#2ecc71' : '#e74c3c'}"></span>
                        ${person.name}
                    </span>
                </div>
                <div class="person-actions">
                    <span class="person-amount ${person.net >= 0 ? 'amount-given' : 'amount-taken'}">
                        ₹${Math.abs(person.net).toFixed(2)}
                    </span>
                </div>
            </div>
        `;

        // Create legend HTML
        const legendHTML = `
            <div class="summary-header">
                <div class="summary-legend">
                    <div class="legend-item">
                        <span class="legend-dot" style="background-color: #2ecc71"></span>
                        <span class="legend-text">Given</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot" style="background-color: #e74c3c"></span>
                        <span class="legend-text">Taken</span>
                    </div>
                </div>
            </div>
        `;

        const summaryHTML = allPeople.length > 0 
            ? `
                ${legendHTML}
                <div class="people-list">
                    ${allPeople.map(person => createPersonHTML(person)).join('')}
                </div>
            ` 
            : '<div class="no-transactions">No transactions yet</div>';

        summaryContainer.innerHTML = summaryHTML;

        // Update legend styles
        const style = document.createElement('style');
        style.textContent = `
            .summary-header {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 10px;
                margin-top: -20px;
            }
            .summary-legend {
                display: flex;
                gap: 12px;
                padding: 4px 8px;
                border-radius: 4px;
            }
            .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .legend-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
            }
            .legend-text {
                font-size: 12px;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }

    updatePeopleDetailsList() {
        const peopleSummary = {};
        
        // Helper function to normalize names
        const normalizeName = (name) => {
            return name.trim().replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        };
        
        // Calculate totals for each person
        this.transactions.forEach(transaction => {
            const personName = transaction.personName;
            if (!personName) return;

            const normalizedName = normalizeName(personName);

            if (!peopleSummary[normalizedName]) {
                peopleSummary[normalizedName] = {
                    transactions: [],
                    given: 0,
                    taken: 0
                };
            }

            peopleSummary[normalizedName].transactions.push(transaction);
            
            const amount = Number(transaction.amount);
            if (transaction.type === 'give') {
                peopleSummary[normalizedName].given += amount;
            } else if (transaction.type === 'take') {
                peopleSummary[normalizedName].taken += amount;
            }
        });

        // Convert to array and prepare the list
        const allPeople = Object.entries(peopleSummary)
            .map(([name, data]) => ({
                name,
                transactions: data.transactions,
                given: data.given,
                taken: data.taken,
                net: data.given - data.taken
            }))
            .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

        // Update the UI
        const detailsContainer = document.querySelector('.people-details-list');
        if (!detailsContainer) return;

        const createTransactionHTML = (transaction) => `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-info">
                    <span class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</span>
                    <span class="transaction-description">${transaction.description || ''}</span>
                </div>
                <div class="transaction-actions">
                    <span class="transaction-amount ${transaction.type === 'give' ? 'negative' : 'positive'}">
                        ₹${transaction.amount.toFixed(2)}
                    </span>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="window.transactionManager.openEditModal(${JSON.stringify(transaction).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="window.transactionManager.deleteTransaction('${transaction._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const createPersonDetailsHTML = (person) => `
            <div class="person-details-section">
                <div class="person-header">
                    <div class="person-info">
                        <span class="person-dot" style="background-color: ${person.net >= 0 ? '#2ecc71' : '#e74c3c'}"></span>
                        <span class="person-name">${person.name}</span>
                    </div>
                    <span class="person-net-amount ${person.net >= 0 ? 'positive' : 'negative'}">
                        ${person.net >= 0 ? 'To Take' : 'To Give'}: ₹${Math.abs(person.net).toFixed(2)}
                    </span>
                </div>
                <div class="person-transactions">
                    ${person.transactions
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(transaction => createTransactionHTML(transaction))
                        .join('')}
                </div>
            </div>
        `;

        const detailsHTML = allPeople
            .map(person => createPersonDetailsHTML(person))
            .join('');

        detailsContainer.innerHTML = allPeople.length > 0 
            ? detailsHTML 
            : '<div class="no-transactions">No transactions yet</div>';
    }
}

// Replace the toggle function with this new version
function togglePeopleSummary() {
    const modal = document.getElementById('summaryModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Initialize transaction manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.transactionManager = new TransactionManager();
    window.transactionManager.updateUI();
});

// Add this style to the document
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .modal.show {
            display: flex;
        }

        #editTransactionModal {
            z-index: 1001;
        }

        .modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        }

        .summary-modal {
            max-width: 800px;
        }
    </style>
`); 
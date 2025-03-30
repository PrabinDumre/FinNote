class ExpenseManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const expenseForm = document.getElementById('expenseForm');
        const editExpenseForm = document.getElementById('editExpenseForm');
        
        if (expenseForm) {
            expenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleExpenseSubmission(e);
            });
        }

        if (editExpenseForm) {
            editExpenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleExpenseEdit(e);
            });
        }

        // Initialize category change handlers
        const expenseCategory = document.getElementById('expenseCategory');
        const editExpenseCategory = document.getElementById('editExpenseCategory');

        if (expenseCategory) {
            expenseCategory.addEventListener('change', () => this.handleCategoryChange(expenseCategory, 'otherCategoryGroup'));
        }

        if (editExpenseCategory) {
            editExpenseCategory.addEventListener('change', () => this.handleCategoryChange(editExpenseCategory, 'editOtherCategoryGroup'));
        }
    }

    handleCategoryChange(selectElement, otherGroupId) {
        const otherGroup = document.getElementById(otherGroupId);
        if (otherGroup) {
            otherGroup.style.display = selectElement.value === 'other' ? 'block' : 'none';
        }
    }

    async handleExpenseSubmission(e) {
        const form = e.target;
        const category = document.getElementById('expenseCategory').value === 'other' 
            ? document.getElementById('otherCategory').value 
            : document.getElementById('expenseCategory').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const date = document.getElementById('expenseDate').value;

        if (!category || !amount || amount <= 0 || !date) {
            alert('Please fill in all required fields with valid values');
            return;
        }

        try {
            const response = await fetch('/expense/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category,
                    amount,
                    date
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add expense');
            }

            const result = await response.json();
            
            // Close modal and reset form
            document.getElementById('expenseModal').classList.remove('show');
            form.reset();
            document.getElementById('otherCategoryGroup').style.display = 'none';

            // Show success message
            alert('Expense added successfully!');

            // Refresh the page to show updated data
            window.location.reload();
        } catch (error) {
            console.error('Error adding expense:', error);
            alert('Failed to add expense. Please try again.');
        }
    }

    async handleExpenseEdit(e) {
        e.preventDefault();
        const form = e.target;
        const expenseId = document.getElementById('editExpenseId').value;
        const category = document.getElementById('editExpenseCategory').value === 'other'
            ? document.getElementById('editOtherCategory').value
            : document.getElementById('editExpenseCategory').value;
        const amount = parseFloat(document.getElementById('editExpenseAmount').value);

        if (!category || !amount || amount <= 0) {
            alert('Please fill in all required fields with valid values');
            return;
        }

        try {
            const response = await fetch(`/expense/${expenseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category,
                    amount
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update expense');
            }

            // Close edit modal
            const editModal = document.getElementById('editExpenseModal');
            editModal.classList.remove('show');
            editModal.style.visibility = 'hidden';

            // Show other modals that were hidden
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal !== editModal) {
                    modal.style.visibility = 'visible';
                }
            });

            // Show success message
            alert('Expense updated successfully!');

            // Refresh the page to show updated data
            window.location.reload();
        } catch (error) {
            console.error('Error updating expense:', error);
            alert('Failed to update expense. Please try again.');
        }
    }

    async deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        try {
            const response = await fetch(`/expense/${expenseId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete expense');
            }

            alert('Expense deleted successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Failed to delete expense. Please try again.');
        }
    }

    openEditModal(expense) {
        // Hide any currently visible modals
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.style.visibility = 'hidden';
        });

        const editExpenseModal = document.getElementById('editExpenseModal');
        const editExpenseId = document.getElementById('editExpenseId');
        const editExpenseCategory = document.getElementById('editExpenseCategory');
        const editOtherCategory = document.getElementById('editOtherCategory');
        const editOtherCategoryGroup = document.getElementById('editOtherCategoryGroup');
        const editExpenseAmount = document.getElementById('editExpenseAmount');

        // Set the expense ID
        editExpenseId.value = expense._id;

        // Set the category
        if (editExpenseCategory.querySelector(`option[value="${expense.category}"]`)) {
            editExpenseCategory.value = expense.category;
            editOtherCategoryGroup.style.display = 'none';
        } else {
            editExpenseCategory.value = 'other';
            editOtherCategory.value = expense.category;
            editOtherCategoryGroup.style.display = 'block';
        }

        // Set the amount
        editExpenseAmount.value = expense.amount;

        // Show the modal with proper z-index
        editExpenseModal.classList.add('show');
        editExpenseModal.style.zIndex = '1001';
        editExpenseModal.style.visibility = 'visible';
    }
}

// Initialize expense manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.expenseManager = new ExpenseManager();
}); 
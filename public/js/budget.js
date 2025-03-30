document.addEventListener('DOMContentLoaded', function() {
    // Elements
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
    console.log('Budget elements found:', {
        setBudgetBtn: !!setBudgetBtn,
        budgetModal: !!budgetModal,
        closeBudgetModalBtn: !!closeBudgetModalBtn,
        budgetForm: !!budgetForm
    });

    // Update button text based on existing budget
    const userBudget = JSON.parse(localStorage.getItem('userBudget') || 'null');
    if (userBudget) {
        setBudgetBtn.textContent = 'Update Budget';
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

    // Form submission handler
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
    });

    // Show budget modal
    function showBudgetModal() {
        console.log('Opening budget modal');
        budgetModal.style.visibility = 'visible';
        budgetModal.style.display = 'block';
        requestAnimationFrame(() => {
            budgetModal.classList.add('show');
        });

        // Clear existing custom categories
        customCategoriesContainer.innerHTML = '';
        customCategoryCounter = 0;

        // Pre-fill form with existing budget if available
        const existingBudget = JSON.parse(localStorage.getItem('userBudget'));
        if (existingBudget) {
            totalBudgetInput.value = existingBudget.totalBudget;
            budgetDurationSelect.value = existingBudget.duration;
            allocationMethodSelect.value = existingBudget.allocationMethod;

            // Uncheck all checkboxes first
            categoryCheckboxes.forEach(cb => cb.checked = false);

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
            budgetModal.style.visibility = 'hidden';
        }, 300);
    }

    // Generate manual allocation fields
    function updateCategoryAllocations() {
        const selectedCategories = Array.from(document.querySelectorAll('.category-item input[type="checkbox"]:checked'))
            .map(cb => {
                if (cb.closest('.custom-category')) {
                    return cb.closest('.custom-category').querySelector('.custom-category-input').value.trim();
                }
                return cb.value;
            })
            .filter(category => category); // Remove empty categories

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

    // Update budget summary
    function updateBudgetSummary() {
        const totalBudget = parseFloat(totalBudgetInput.value) || 0;
        let totalAllocated = 0;

        document.querySelectorAll('.category-amount').forEach(input => {
            totalAllocated += parseFloat(input.value) || 0;
        });

        const remaining = totalBudget - totalAllocated;

        allocatedAmountSpan.textContent = formatCurrency(totalAllocated);
        remainingAmountSpan.textContent = formatCurrency(remaining);
        remainingAmountSpan.className = remaining < 0 ? 'negative' : '';
    }

    // Helper function to format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }
}); 
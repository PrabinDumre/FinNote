class ReminderManager {
    constructor() {
        this.reminders = [];
        this.initializeEventListeners();
        this.loadReminders();
        this.setupNotificationPermission();
    }

    setupNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
        }
    }

    async loadReminders() {
        try {
            const response = await fetch('/api/reminders/all');
            const data = await response.json();
            if (data.success) {
                this.reminders = data.reminders;
                this.renderReminders();
            } else {
                console.error('Failed to load reminders:', data.message);
            }
        } catch (error) {
            console.error('Error loading reminders:', error);
        }
    }

    async addReminder(reminder) {
        try {
            const response = await fetch('/api/reminders/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reminder)
            });

            const data = await response.json();
            if (data.success) {
                this.reminders.push(data.reminder);
                this.renderReminders();
                if (reminder.enableNotification) {
                    this.scheduleNotification(data.reminder);
                }
            } else {
                console.error('Failed to add reminder:', data.message);
            }
        } catch (error) {
            console.error('Error adding reminder:', error);
        }
    }

    async updateReminder(id, updateData) {
        try {
            const response = await fetch(`/api/reminders/update/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();
            if (data.success) {
                const index = this.reminders.findIndex(r => r._id === id);
                if (index !== -1) {
                    this.reminders[index] = data.reminder;
                    this.renderReminders();
                }
            } else {
                console.error('Failed to update reminder:', data.message);
            }
        } catch (error) {
            console.error('Error updating reminder:', error);
        }
    }

    async deleteReminder(id) {
        try {
            const response = await fetch(`/api/reminders/delete/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                this.reminders = this.reminders.filter(r => r._id !== id);
                this.renderReminders();
            } else {
                console.error('Failed to delete reminder:', data.message);
            }
        } catch (error) {
            console.error('Error deleting reminder:', error);
        }
    }

    initializeEventListeners() {
        // Add Reminder Button
        const addBtn = document.querySelector('.add-reminder-btn');
        const modal = document.getElementById('addReminderModal');
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        const addReminderForm = document.getElementById('addReminderForm');

        addBtn.addEventListener('click', () => {
            modal.querySelector('h2').textContent = 'Add New Reminder';
            addReminderForm.reset();
            modal.classList.add('show');
        });
        
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            addReminderForm.reset();
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            addReminderForm.reset();
        });

        // Form Submission
        addReminderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reminderData = {
                title: document.getElementById('reminderTitle').value,
                type: document.getElementById('reminderType').value,
                dueDate: document.getElementById('reminderDate').value,
                amount: document.getElementById('reminderAmount').value ? parseFloat(document.getElementById('reminderAmount').value) : null,
                description: document.getElementById('reminderDescription').value,
                priority: document.getElementById('reminderPriority').value,
                completed: false,
                enableNotification: document.getElementById('enableNotification').checked
            };

            try {
                const isEdit = modal.querySelector('h2').textContent === 'Edit Reminder';
                if (isEdit) {
                    const reminderId = addReminderForm.dataset.editingId;
                    await this.updateReminder(reminderId, reminderData);
                } else {
                    await this.addReminder(reminderData);
                }
                modal.classList.remove('show');
                addReminderForm.reset();
                delete addReminderForm.dataset.editingId;
            } catch (error) {
                console.error('Error saving reminder:', error);
                alert('Failed to save reminder. Please try again.');
            }
        });

        // Category Filters
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.category-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.filterReminders(btn.textContent);
            });
        });

        // Search Functionality
        const searchInput = document.getElementById('searchReminders');
        searchInput.addEventListener('input', () => {
            this.searchReminders(searchInput.value);
        });

        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.filter-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.filterReminders(btn.dataset.filter);
            });
        });

        // Update menu toggle functionality
        document.addEventListener('click', (e) => {
            // Close all menus when clicking outside
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
            
            // Handle menu button click
            if (e.target.matches('.menu-btn')) {
                e.stopPropagation();
                const reminderId = e.target.dataset.id;
                const menu = document.getElementById(`menu-${reminderId}`);
                
                // Close other open menus
                document.querySelectorAll('.dropdown-menu.show').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });
                
                menu.classList.toggle('show');
            }

            // Handle menu item clicks
            if (e.target.closest('.edit-btn')) {
                const reminderId = e.target.closest('.edit-btn').dataset.id;
                this.editReminder(reminderId);
                document.getElementById(`menu-${reminderId}`).classList.remove('show');
            }

            if (e.target.closest('.pin-btn')) {  // Changed from star-btn to pin-btn
                const reminderId = e.target.closest('.pin-btn').dataset.id;
                this.toggleStar(reminderId);
                document.getElementById(`menu-${reminderId}`).classList.remove('show');
            }

            if (e.target.closest('.delete-btn')) {
                const reminderId = e.target.closest('.delete-btn').dataset.id;
                if (confirm('Are you sure you want to delete this reminder?')) {
                    this.deleteReminder(reminderId);
                }
                document.getElementById(`menu-${reminderId}`).classList.remove('show');
            }
        });
    }

    renderReminders() {
        const remindersGrid = document.getElementById('remindersGrid');
        const activeCategory = document.querySelector('.category-btn.active').textContent;
        
        const filteredReminders = this.filterRemindersByCategory(activeCategory);

        remindersGrid.innerHTML = filteredReminders.map(reminder => this.createReminderCard(reminder)).join('');
    }

    filterRemindersByCategory(category) {
        if (category === 'All') return this.reminders;
        if (category === 'Today') {
            const today = new Date().toDateString();
            return this.reminders.filter(reminder => 
                new Date(reminder.dueDate).toDateString() === today);
        }
        if (category === 'Upcoming') {
            const now = new Date();
            return this.reminders.filter(reminder => 
                new Date(reminder.dueDate) > now && !reminder.completed);
        }
        if (category === 'Completed') {
            return this.reminders.filter(reminder => reminder.completed);
        }
        return this.reminders;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getReminderStatus(reminder) {
        if (reminder.completed) return 'completed';
        const now = new Date();
        const reminderDate = new Date(reminder.dueDate);
        return reminderDate < now ? 'overdue' : 'upcoming';
    }

    getStatusText(reminder) {
        if (reminder.completed) return '✅ Completed';
        const now = new Date();
        const reminderDate = new Date(reminder.dueDate);
        return reminderDate < now ? '⚠️ Overdue' : '⏳ Upcoming';
    }

    scheduleNotification(reminder) {
        if (!reminder.enableNotification) return;

        const reminderDate = new Date(reminder.dueDate);
        const now = new Date();
        
        if (reminderDate > now) {
            const timeUntilReminder = reminderDate - now;
            setTimeout(() => {
                if (!reminder.completed) {
                    this.showNotification(reminder);
                }
            }, timeUntilReminder);

            // Also schedule a notification 1 hour before
            const oneHourBefore = reminderDate - (60 * 60 * 1000);
            if (oneHourBefore > now) {
                setTimeout(() => {
                    if (!reminder.completed) {
                        this.showNotification(reminder, true);
                    }
                }, oneHourBefore - now);
            }
        }
    }

    showNotification(reminder, isPreNotification = false) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const title = isPreNotification ? 
            `Upcoming Reminder in 1 hour: ${reminder.title}` :
            `Reminder: ${reminder.title}`;

        const options = {
            body: `${reminder.description}\n${reminder.amount ? `Amount: ₹${reminder.amount}` : ''}`,
            icon: '/path/to/icon.png',
            badge: '/path/to/badge.png',
            tag: `reminder-${reminder.id}`,
            renotify: true,
            requireInteraction: true
        };

        const notification = new Notification(title, options);
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }

    checkForDueReminders() {
        setInterval(() => {
            const now = new Date();
            this.reminders.forEach(reminder => {
                const reminderDate = new Date(reminder.dueDate);
                if (!reminder.completed && reminderDate <= now && !reminder.notified) {
                    this.showNotification(reminder);
                    reminder.notified = true;
                    this.loadReminders();
                }
            });
        }, 60000); // Check every minute
    }

    showRemindersForDate(date) {
        const dateReminders = this.reminders.filter(reminder => {
            const reminderDate = new Date(reminder.dueDate);
            return reminderDate.toDateString() === date.toDateString();
        });

        const remindersList = document.getElementById('remindersList');
        if (dateReminders.length === 0) {
            remindersList.innerHTML = `
                <div class="no-reminders">
                    No reminders for ${date.toLocaleDateString()}
                </div>
            `;
            return;
        }

        this.renderRemindersList(dateReminders);
    }

    renderRemindersList(reminders) {
        const remindersList = document.getElementById('remindersList');
        remindersList.innerHTML = reminders.map(reminder => this.createReminderCard(reminder)).join('');
    }

    createReminderCard(reminder) {
        const status = this.getReminderStatus(reminder);
        return `
            <div class="reminder-card ${status} ${reminder.priority}-priority">
                <div class="card-header">
                    <div class="title-section">
                        <h3>${reminder.title}</h3>
                        <span class="type-badge">${reminder.type}</span>
                    </div>
                    <div class="dropdown">
                        <button class="menu-btn" data-id="${reminder._id}">⋮</button>
                        <div class="dropdown-menu" id="menu-${reminder._id}">
                            <button class="menu-item edit-btn" data-id="${reminder._id}">
                                <span class="icon">✏️</span> Edit
                            </button>
                            <button class="menu-item delete-btn" data-id="${reminder._id}">
                                <span class="icon">🗑️</span> Delete
                            </button>
                        </div>
                    </div>
                </div>
                ${reminder.amount ? `<div class="amount">₹${reminder.amount}</div>` : ''}
                <div class="date-time">${this.formatDateTime(reminder.dueDate)}</div>
                ${reminder.description ? `<p>${reminder.description}</p>` : ''}
                <div class="status ${status}">
                    ${this.getStatusText(reminder)}
                </div>
            </div>
        `;
    }

    filterReminders(filter) {
        let filteredReminders;
        const now = new Date();

        switch(filter) {
            case 'today':
                filteredReminders = this.reminders.filter(reminder => 
                    new Date(reminder.dueDate).toDateString() === now.toDateString());
                break;
            case 'upcoming':
                filteredReminders = this.reminders.filter(reminder => 
                    new Date(reminder.dueDate) > now && !reminder.completed);
                break;
            case 'completed':
                filteredReminders = this.reminders.filter(reminder => reminder.completed);
                break;
            default:
                filteredReminders = this.reminders;
        }

        this.renderRemindersList(filteredReminders);
    }

    toggleStar(id) {
        const reminder = this.reminders.find(r => r._id === id);
        if (reminder) {
            reminder.starred = !reminder.starred;
            this.loadReminders();
        }
    }

    editReminder(id) {
        const reminder = this.reminders.find(r => r._id === id);
        if (!reminder) return;

        const modal = document.getElementById('addReminderModal');
        const form = document.getElementById('addReminderForm');
        
        // Fill form with reminder data
        document.getElementById('reminderTitle').value = reminder.title;
        document.getElementById('reminderType').value = reminder.type;
        document.getElementById('reminderDate').value = new Date(reminder.dueDate).toISOString().slice(0, 16);
        document.getElementById('reminderAmount').value = reminder.amount || '';
        document.getElementById('reminderDescription').value = reminder.description || '';
        document.getElementById('reminderPriority').value = reminder.priority;
        document.getElementById('enableNotification').checked = reminder.enableNotification || false;
        
        // Set form to edit mode
        modal.querySelector('h2').textContent = 'Edit Reminder';
        form.dataset.editingId = id;
        modal.classList.add('show');
    }
}

// Initialize Reminder Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.reminderManager = new ReminderManager();
}); 
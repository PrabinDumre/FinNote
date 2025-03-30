// Utility functions for shared functionality
class UserManager {
    static getUserName() {
        const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        return settings.name || 'John Doe'; // Default name if none set
    }

    static updateNavbarName() {
        const navbarName = document.querySelector('.side-navbar .welcome-text h3');
        if (navbarName) {
            navbarName.textContent = this.getUserName();
        }
    }
}

// Add this to every page to update the navbar name
document.addEventListener('DOMContentLoaded', () => {
    UserManager.updateNavbarName();
}); 
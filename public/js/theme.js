// Theme handling functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get the theme toggle element
    const themeToggle = document.getElementById('theme-toggle');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply the saved theme
    applyTheme(savedTheme);
    
    // Set the toggle state
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';
    }
    
    // Add event listener for theme changes
    if (themeToggle) {
        themeToggle.addEventListener('change', function(e) {
            const selectedTheme = e.target.checked ? 'dark' : 'light';
            applyTheme(selectedTheme);
            localStorage.setItem('theme', selectedTheme);
            
            // Send theme preference to server
            updateThemePreference(selectedTheme);
        });
    }
});

// Function to apply theme
function applyTheme(theme) {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('light-mode', 'dark-mode');
    
    // Add the new theme class
    if (theme === 'dark') {
        body.classList.add('dark-mode');
    } else {
        body.classList.add('light-mode');
    }
}

// Function to update theme preference on server
async function updateThemePreference(theme) {
    try {
        const response = await fetch('/update-theme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update theme preference');
        }
    } catch (error) {
        console.error('Error updating theme preference:', error);
    }
} 
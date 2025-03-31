document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navbar = document.querySelector('.side-navbar');
    const overlay = document.querySelector('.menu-overlay');

    function toggleMenu() {
        hamburger.classList.toggle('active');
        navbar.classList.toggle('show');
        overlay.classList.toggle('show');
        document.body.style.overflow = navbar.classList.contains('show') ? 'hidden' : '';
    }

    hamburger.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Close menu when clicking a nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbar.classList.contains('show')) {
                toggleMenu();
            }
        });
    });

    // Close menu when window is resized to larger screen
    window.addEventListener('resize', () => {
        if (window.innerWidth > 968 && navbar.classList.contains('show')) {
            toggleMenu();
        }
    });
}); 
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effects to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.querySelector('.feature-hover').style.opacity = '1';
        });
        
        card.addEventListener('mouseleave', () => {
            card.querySelector('.feature-hover').style.opacity = '0';
        });
    });
}); 
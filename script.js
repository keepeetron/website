document.addEventListener('DOMContentLoaded', function() {
    const colorSquare = document.getElementById('colorSquare');
    
    // Array of colors to cycle through
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6'];
    let currentColorIndex = 0;

    colorSquare.addEventListener('mouseover', function() {
        // Change to next color in the array
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        this.style.backgroundColor = colors[currentColorIndex];
    });

    // Reset color when mouse leaves
    colorSquare.addEventListener('mouseout', function() {
        this.style.backgroundColor = '#3498db';
    });
}); 
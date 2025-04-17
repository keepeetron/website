document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('colorSquare');
    const circle = document.createElement('div');
    circle.className = 'mouse-circle';
    container.appendChild(circle);

    container.addEventListener('mousemove', function(e) {
        // Get mouse position relative to the container
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update circle position
        circle.style.left = x + 'px';
        circle.style.top = y + 'px';
    });

    // Hide circle when mouse leaves the container
    container.addEventListener('mouseleave', function() {
        circle.style.display = 'none';
    });

    // Show circle when mouse enters the container
    container.addEventListener('mouseenter', function() {
        circle.style.display = 'block';
    });
}); 


import { Vector } from './vector.js';
import { Actor } from './actor.js';
import { Dog } from './dog.js';

// Add operator overloading support
Object.defineProperty(Vector.prototype, Symbol.operator, {
    value: function(b, op) {
        return Vector[Symbol.operator](this, b, op);
    }
});



// Game setup
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.objects = [];
        
        // Fixed update settings
        this.fixedTimeStep = 1 / 60; // 60 updates per second (in seconds)
        this.accumulator = 0;
        this.lastTime = performance.now() / 1000; // Convert to seconds
        
        // Mouse position
        this.mousePos = new Vector(0, 0);
        
        // Set canvas size
        this.canvas.width = 768;
        this.canvas.height = 768;
        
        // Create the dog
        this.dog = this.addObject(new Dog(384, 384));
        
        // Set up mouse tracking
        this.setupMouseTracking();
        
        // Start game loop
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }

    setupMouseTracking() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = new Vector(
                e.clientX - rect.left,
                e.clientY - rect.top
            );
        });
    }

    gameLoop(currentTime) {
        // Calculate delta time in seconds
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime / 1000;

        // Prevent spiral of death by limiting max frame time
        const frameTime = Math.min(deltaTime, 0.25); // 250ms in seconds
        
        // Add to accumulator
        this.accumulator += frameTime;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Run fixed updates
        while (this.accumulator >= this.fixedTimeStep) {
            // Update physics and game logic
            for (const obj of this.objects) {
                if (obj.fixedUpdate) obj.fixedUpdate(this.fixedTimeStep, this);
            }
            this.accumulator -= this.fixedTimeStep;
        }

        // Calculate interpolation factor (alpha) for smooth rendering
        const alpha = this.accumulator / this.fixedTimeStep;

        // Draw all objects
        for (const obj of this.objects) {
            if (obj.draw) obj.draw(this.ctx, alpha);
        }

        // Continue game loop
        requestAnimationFrame(this.gameLoop);
    }

    addObject(obj) {
        this.objects.push(obj);
        return obj;
    }
}

// Initialize game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
}); 
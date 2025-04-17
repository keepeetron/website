class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Basic arithmetic operations
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    mult(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    div(scalar) {
        if (scalar === 0) throw new Error("Division by zero");
        return new Vector(this.x / scalar, this.y / scalar);
    }

    // Vector properties
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    // Vector operations
    normalize() {
        const m = this.mag();
        if (m !== 0) {
            return this.div(m);
        }
        return new Vector(0, 0);
    }

    limit(max) {
        const mSq = this.magSq();
        if (mSq > max * max) {
            return this.normalize().mult(max);
        }
        return this.copy();
    }

    // Utility methods
    copy() {
        return new Vector(this.x, this.y);
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    // Static methods for common operations
    static dist(v1, v2) {
        return v1.sub(v2).mag();
    }

    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    static angle(v1, v2) {
        return Math.acos(Vector.dot(v1, v2) / (v1.mag() * v2.mag()));
    }

    // Operator overloading
    [Symbol.toPrimitive](hint) {
        if (hint === 'number') {
            return this.mag();
        }
        return `Vector(${this.x}, ${this.y})`;
    }

    [Symbol.iterator]() {
        return [this.x, this.y][Symbol.iterator]();
    }

    // Custom operators
    static [Symbol.hasInstance](instance) {
        return instance instanceof Vector;
    }

    static [Symbol.operator](a, b, op) {
        if (op === '+') {
            if (typeof b === 'number') {
                return new Vector(a.x + b, a.y + b);
            }
            return a.add(b);
        }
        if (op === '-') {
            if (typeof b === 'number') {
                return new Vector(a.x - b, a.y - b);
            }
            return a.sub(b);
        }
        if (op === '*') {
            if (typeof b === 'number') {
                return a.mult(b);
            }
            return new Vector(a.x * b.x, a.y * b.y);
        }
        if (op === '/') {
            if (typeof b === 'number') {
                return a.div(b);
            }
            return new Vector(a.x / b.x, a.y / b.y);
        }
        return null;
    }
}

// Add operator overloading support
Object.defineProperty(Vector.prototype, Symbol.operator, {
    value: function(b, op) {
        return Vector[Symbol.operator](this, b, op);
    }
});

// Base Actor class for game entities
class Actor {
    constructor(x, y, radius, color = '#e74c3c') {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.radius = radius;
        this.color = color;
        
        // For interpolation
        this.prevPos = this.pos.copy();
        this.nextPos = this.pos.copy();
    }

    fixedUpdate(deltaTime) {
        // Store previous position for interpolation
        this.prevPos = this.pos.copy();
        
        // Update position (deltaTime is now in seconds)
        this.pos = this.pos.add(this.vel.mult(deltaTime));
        
        // Store next position for interpolation
        this.nextPos = this.pos.copy();
    }

    draw(ctx, alpha) {
        // Interpolate position for smooth rendering
        const interpPos = this.prevPos.mult(1 - alpha).add(this.nextPos.mult(alpha));
        
        // Calculate velocity magnitude for stretch amount
        const velMag = this.vel.mag();
        const stretchFactor = 1.0 + velMag * 0.005;
        
        // Calculate angle from velocity
        const angle = Math.atan2(this.vel.y, this.vel.x);
        
        // Save current context state
        ctx.save();
        
        // Move to position and rotate
        ctx.translate(interpPos.x, interpPos.y);
        ctx.rotate(angle);
        
        // Draw stretched circle
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * stretchFactor, this.radius / stretchFactor, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Restore context state
        ctx.restore();
    }

    // Check if this actor overlaps with another actor
    overlaps(other) {
        const distance = Vector.dist(this.pos, other.pos);
        return distance < (this.radius + other.radius);
    }

    // Get the distance to another actor
    distanceTo(other) {
        return Vector.dist(this.pos, other.pos);
    }

    // Get the direction to another actor (normalized vector)
    directionTo(other) {
        return other.pos.sub(this.pos).normalize();
    }
}

// Dog class for player control
class Dog extends Actor {
    constructor(x, y) {
        super(x, y, 16, '#ffffff'); // White color, 16px radius
    }

    fixedUpdate(deltaTime, game) {
        const freq = 5.0;
        const damp = 5.0;
        
        const toMouse = game.mousePos.sub(this.pos);
        
        this.vel = this.vel.add(toMouse.mult(freq * deltaTime));
        this.vel = this.vel.sub(this.vel.mult(damp * deltaTime));
        
        super.fixedUpdate(deltaTime);
    }

    draw(ctx, alpha) {
        super.draw(ctx, alpha);
        
        // Draw a simple face
        const interpPos = this.prevPos.mult(1 - alpha).add(this.nextPos.mult(alpha));
        ctx.beginPath();
        ctx.arc(interpPos.x - 4, interpPos.y - 4, 2, 0, Math.PI * 2); // Left eye
        ctx.arc(interpPos.x + 4, interpPos.y - 4, 2, 0, Math.PI * 2); // Right eye
        ctx.fillStyle = '#000000';
        ctx.fill();
    }
}

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
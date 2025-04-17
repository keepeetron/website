import { Vector } from './vector.js';

export class Actor {
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
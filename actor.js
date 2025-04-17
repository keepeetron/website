import { Vector } from './vector.js';

export class Actor {
    constructor(x, y, radius, color = '#e74c3c') {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.radius = radius;
        this.color = color;
    }

    fixedUpdate(deltaTime) {
        // Update position (deltaTime is now in seconds)
        this.pos = this.pos.add(this.vel.mult(deltaTime));
    }

    draw(ctx, alpha) {
        // Calculate velocity magnitude for stretch amount
        const velMag = this.vel.mag();
        const stretchFactor = 1.0 + velMag / 1400;
        
        // Calculate angle from velocity
        const angle = Math.atan2(this.vel.y, this.vel.x);

        // Save current context state
        ctx.save();
        
        // Move to position and rotate
        ctx.translate(this.pos.x, this.pos.y);
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
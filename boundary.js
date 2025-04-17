import { Vector } from './vector.js';

export class Boundary {
    constructor(x, y, canvasSize) {
        this.pos = new Vector(x, y);
        // For a circle to touch all sides of a square, its radius must be half the square's width
        this.radius = canvasSize / 2;
        this.color = 'hsl(0, 0.00%, 25.50%)';
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    fixedUpdate(dt, game) {
        // Constrain all actors within boundary
        for (const obj of game.objects) {
            if (!obj.pos || !obj.vel) continue; // Skip objects without position or velocity

            // Calculate vector from center to object
            const toObj = obj.pos.sub(this.pos);
            const dist = toObj.mag();

            // If object is outside boundary
            if (dist > this.radius - obj.radius) {
                // Move object back inside boundary
                const normal = toObj.normalize();
                obj.pos = this.pos.add(normal.mult(this.radius - obj.radius));

                // Calculate dot product to find velocity in direction of normal
                const dot = Vector.dot(obj.vel, normal);
                
                // If object is moving outward, reflect the velocity
                if (dot > 0) {
                    // Remove velocity in normal direction (towards boundary)
                    obj.vel = obj.vel.sub(normal.mult(dot));
                }
            }
        }
    }
} 
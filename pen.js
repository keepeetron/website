import { Vector } from './vector.js';
import { Dog } from './dog.js';

export class Pen {
    static thickness = 8;

    constructor(x, y, radius) {
        this.pos = new Vector(x, y);
        this.radius = radius;
        this.color = '#ffffff'; // White color for the pen outline
    }

    draw(ctx, alpha) {
        // Draw circle outline
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Pen.thickness;
        ctx.stroke();
    }

    fixedUpdate(dt, game) {
        // Check all dogs using the static list
        for (const dog of Dog.dogs) {
            // Calculate vector from center to dog
            const toDog = dog.pos.sub(this.pos);
            const dist = toDog.mag();

            // If dog is inside pen
            if (dist < this.radius + dog.radius) {
                // Move dog outside pen
                const normal = toDog.normalize();
                dog.pos = this.pos.add(normal.mult(this.radius + dog.radius));

                // Calculate dot product to find velocity in direction of normal
                const dot = Vector.dot(dog.vel, normal);
                
                // If dog is moving inward, reflect the velocity
                if (dot < 0) {
                    // Remove velocity in normal direction (towards pen center)
                    dog.vel = dog.vel.sub(normal.mult(dot));
                }
            }
        }
    }
} 
import { Vector } from '../engine/vector.js';
import { Dog } from './dog.js';
import { Duck } from './duck.js';

export class Boundary {
    constructor(radius) {
        this.radius = radius;
        this.color = 'hsl(0, 0.00%, 25.50%)';
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    constrainActor(actor) {
        if (!actor.pos || !actor.vel) return;

        // Calculate vector from center to actor
        const toActor = actor.pos;
        const dist = toActor.mag();

        // If actor is outside boundary
        if (dist > this.radius - actor.radius) {
            // Move actor back inside boundary
            const normal = toActor.normalize();
            actor.pos = normal.mult(this.radius - actor.radius);

            // Calculate dot product to find velocity in direction of normal
            const dot = Vector.dot(actor.vel, normal);
            
            // If actor is moving outward, reflect the velocity
            if (dot > 0) {
                // Remove velocity in normal direction (towards boundary)
                actor.vel = actor.vel.sub(normal.mult(dot));
            }
        }
    }

    fixedUpdate(dt, game) {
        // Constrain dogs
        for (const dog of Dog.dogs) {
            this.constrainActor(dog);
        }

        // Constrain ducks
        for (const duck of Duck.ducks) {
            this.constrainActor(duck);
        }
    }

    update(dt) {
        // dont need to do anything but we'll put the function here for consistency
    }
} 
import { Actor } from './actor.js';

export class Dog extends Actor {
    static dogs = [];

    constructor(x, y) {
        super(x, y, 16, '#ffffff'); // White color, 16px radius
        Dog.dogs.push(this);
    }

    fixedUpdate(deltaTime, game) {
        const freq = 1000.0;
        const damp = 40.0;
        
        const toMouse = game.mousePos.sub(this.pos);
        
        this.vel = this.vel.add(toMouse.mult(freq * deltaTime));
        this.vel = this.vel.sub(this.vel.mult(damp * deltaTime));
        
        // Store toMouse for debugging visualization
        this.toMouse = toMouse;
        
        // Let Actor handle the position update
        super.fixedUpdate(deltaTime);
    }

    draw(ctx, alpha) {
        // Let Actor draw the main circle with stretching/rotation
        super.draw(ctx, alpha);
    }
} 
import { Actor } from './actor.js';

export class Dog extends Actor {
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
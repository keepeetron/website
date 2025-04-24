import { Vector } from '../engine/vector.js';
import { Dog } from './dog.js';
import { GameState } from './game.js';

export class Pen {
    static thickness = 2;

    constructor(radius) {
        this.radius = radius;
        this.color = 'hsl(0, 0%, 40%)';
    }

    draw(ctx, alpha) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    fixedUpdate(dt, game) {
        for (const dog of Dog.dogs) {
            const toDog = dog.pos;
            const dist = toDog.mag();
            if (dist < this.radius + dog.radius) {
                if (game.state === GameState.PREGAME) {
                    game.startGame();
                    return;
                }
            }
        }
    }

    update(dt) {
        // dont need to do anything but we'll put the function here for consistency
    }
} 
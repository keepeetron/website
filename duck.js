import { Actor } from './actor.js';
import { Vector } from './vector.js';
import { Dog } from './dog.js';

export class Duck extends Actor {
    constructor(x, y) {
        super(x, y, 12, '#f1c40f'); // Yellow color, 12px radius
        this.active = true;
        this.isSorted = true;
        this.closestOtherDuck = null;
        this.avgPosOfNearbyGroup = new Vector(0, 0);
    }

    getClosestOtherDuck(game) {
        let closest = null;
        let minDist = Infinity;
        
        for (const obj of game.objects) {
            if (obj instanceof Duck && obj !== this) {
                const dist = this.distanceTo(obj);
                if (dist < minDist) {
                    minDist = dist;
                    closest = obj;
                }
            }
        }
        
        return closest;
    }

    getClosestNOtherDucks(game, n) {
        const ducks = [];
        
        for (const obj of game.objects) {
            if (obj instanceof Duck && obj !== this) {
                ducks.push({
                    duck: obj,
                    dist: this.distanceTo(obj)
                });
            }
        }
        
        ducks.sort((a, b) => a.dist - b.dist);
        return ducks.slice(0, n).map(d => d.duck);
    }

    getAvgPos(ducks) {
        if (ducks.length === 0) return this.pos.copy();
        
        let sum = new Vector(0, 0);
        for (const duck of ducks) {
            sum = sum.add(duck.pos);
        }
        return sum.div(ducks.length);
    }

    fixedUpdate(dt, game) {
        if (!this.active) return;

        const centerForce = 1.6;
        const damping = 5.0;
        const separationForce = 100.0;
        const groupForce = 4.0;
        const dogForce = 350.0;

        // Center force (pull towards origin, matching Godot's -pos)
        const center = new Vector(game.canvas.width / 2, game.canvas.height / 2);
        this.vel = this.vel.add(center.sub(this.pos).mult(centerForce * dt));

        // Separation from closest duck
        const closestDuck = this.getClosestOtherDuck(game);
        this.closestOtherDuck = closestDuck;
        
        if (closestDuck) {
            const proximity = 1.0 / (this.distanceTo(closestDuck) + 1.0);
            const separationDir = this.directionTo(closestDuck);
            this.vel = this.vel.add(separationDir.mult(-separationForce * proximity));
        }

        // Group cohesion with nearby ducks
        const closestNDucks = this.getClosestNOtherDucks(game, 2);
        this.isSorted = true;
        
        for (const duck of closestNDucks) {
            if (duck.color !== this.color) {
                this.isSorted = false;
            }
        }

        const avgPos = this.getAvgPos(closestNDucks);
        this.avgPosOfNearbyGroup = avgPos;
        this.vel = this.vel.add(avgPos.sub(this.pos).mult(groupForce * dt));

        // Avoid dogs
        for (const dog of Dog.dogs) {
            const dogProximity = 1.0 / (this.distanceTo(dog) / 7.0 + 1.0);
            const avoidDir = this.directionTo(dog);
            this.vel = this.vel.add(avoidDir.mult(-dogForce * dogProximity));
        }

        // Apply damping
        this.vel = this.vel.sub(this.vel.mult(damping * dt));
        super.fixedUpdate(dt);
    }

    draw(ctx, alpha) {
        super.draw(ctx, alpha);
        
        // Draw a simple beak
        ctx.beginPath();
        ctx.moveTo(this.pos.x + 8, this.pos.y);
        ctx.lineTo(this.pos.x + 12, this.pos.y - 4);
        ctx.lineTo(this.pos.x + 12, this.pos.y + 4);
        ctx.closePath();
        ctx.fillStyle = '#e67e22';
        ctx.fill();
    }
} 
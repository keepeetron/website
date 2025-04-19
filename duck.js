import { Actor } from './actor.js';
import { Vector } from './vector.js';
import { Dog } from './dog.js';

export class Duck extends Actor {
    static ducks = [];

    constructor(x, y) {
        super(x, y, 12, '#f1c40f'); // Default to yellow, but color will be changed later
        this.active = true;
        this.isSorted = true;
        this.closestOtherDuck = null;
        this.avgPosOfNearbyGroup = new Vector(0, 0);
        
        // Customize head properties for duck
        this.headSize = new Vector(this.radius * 1.0, this.radius * 0.5);
        this.headOffset = this.radius * 0.8;
        
        // Set beak properties - square and as wide as head
        this.mouthSize = new Vector(this.headSize.y, this.headSize.y);
        this.mouthColor = '#ffffff';
        
        Duck.ducks.push(this);
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

        const centerForce = 1.4;
        const damping = 5.0;
        const separationForce = 5000.0;
        const groupForce = 2.5;
        const dogForce = 20000.0;

        // Initialize total force
        let totalForce = new Vector(0, 0);

        // Center force (pull towards origin, matching Godot's -pos)
        const center = new Vector(game.canvas.width / 2, game.canvas.height / 2);
        totalForce = totalForce.add(center.sub(this.pos).mult(centerForce));

        // Separation from closest duck
        const closestDuck = this.getClosestOtherDuck(game);
        this.closestOtherDuck = closestDuck;
        
        if (closestDuck) {
            const proximity = 1.0 / (this.distanceTo(closestDuck) + 1.0);
            const separationDir = this.directionTo(closestDuck);
            totalForce = totalForce.add(separationDir.mult(-separationForce * proximity));
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
        totalForce = totalForce.add(avgPos.sub(this.pos).mult(groupForce));

        // Avoid dogs
        for (const dog of Dog.dogs) {
            const dogProximity = 1.0 / (this.distanceTo(dog) / 7.0 + 1.0);
            const avoidDir = this.directionTo(dog);
            totalForce = totalForce.add(avoidDir.mult(-dogForce * dogProximity));
        }

        // Apply damping and total force together
        const dampingForce = this.vel.mult(damping);
        totalForce = totalForce.sub(dampingForce);
        
        // Apply accumulated force to velocity
        this.vel = this.vel.add(totalForce.mult(dt));
        
        // Let Actor handle position update and default angle targets
        super.fixedUpdate(dt);
        
        // For ducks, both body and head face velocity direction
        const velAngle = Math.atan2(this.vel.y, this.vel.x);
        this.targetBodyAngle = velAngle;
        this.targetHeadAngle = velAngle;
    }

    update(deltaTime) {
        if (!this.active) return;
        
        // Let Actor handle visual interpolation
        super.update(deltaTime);
    }

    draw(ctx, alpha) {
        // Draw the base actor (body and head)
        super.draw(ctx, alpha);
        
        // Save context for beak drawing
        ctx.save();
        
        // Move to actor position
        ctx.translate(this.pos.x, this.pos.y);
        
        // Calculate body angle from velocity
        const bodyAngle = Math.atan2(this.vel.y, this.vel.x);
        ctx.rotate(bodyAngle);
        
        // Move to head position
        ctx.translate(this.headOffset, 0);
        
        // Apply head rotation relative to body
        ctx.rotate(this.headAngle - bodyAngle);
        
        ctx.restore();
    }
} 
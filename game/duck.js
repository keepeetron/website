import { Actor } from './actor.js';
import { Vector } from '../engine/vector.js';
import { Dog } from './dog.js';
import { angleLerp } from '../engine/utils.js';
import { DebugDraw } from '../engine/debugDraw.js';

export class Duck extends Actor {
    static ducks = [];

    static Wing = class {
        constructor(localPos) {
            this.localPos = localPos; // Position relative to duck
            this.angle = 0;
            this.targetAngle = 0;
            this.color = '#000000'; // Default wing color
        }

        draw(ctx, duckPos, duckAngle) {
            ctx.save();
            
            // Move to wing's global position
            const globalPos = duckPos.add(this.localPos.rotate(duckAngle));
            ctx.translate(globalPos.x, globalPos.y);
            
            // Apply wing rotation (no need to subtract duckAngle since angle is already in global space)
            ctx.rotate(this.angle);
            
            // Draw wing
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.moveTo(0, 0);
            ctx.lineTo(16, 0); // Wing length
            ctx.stroke();
            
            ctx.restore();
        }
    }

    constructor(x, y, color) {
        super(x, y, 10, color); // Default to yellow, but color will be changed later
        this.active = true;
        this.isSorted = false;
        this.closestOtherDuck = null;
        this.avgPosOfNearbyGroup = new Vector(0, 0);
        
        // Customize head properties for duck
        this.headSize = new Vector(this.radius * 1.0, this.radius * 0.5);
        this.headOffset = this.radius * 0.8;
        
        // Set beak properties - square and as wide as head
        this.mouthSize = new Vector(this.headSize.y, this.headSize.y);
        this.mouthColor = '#ffffff';

        // Create wings
        var wingOffset = this.radius * 0.8;
        this.leftWing = new Duck.Wing(new Vector(0, -wingOffset));
        this.rightWing = new Duck.Wing(new Vector(0, wingOffset));
        
        // Set wing colors to match duck
        this.leftWing.color = this.color;
        this.rightWing.color = this.color;
        
        Duck.ducks.push(this);
    }

    getClosestOtherDuck() {
        let closest = null;
        let minDist = Infinity;
        
        for (const duck of Duck.ducks) {
            if (duck !== this) {
                const dist = this.distanceTo(duck);
                if (dist < minDist) {
                    minDist = dist;
                    closest = duck;
                }
            }
        }
        
        return closest;
    }

    getClosestNOtherDucks(n) {
        const ducks = [];
        
        for (const duck of Duck.ducks) {
            if (duck !== this) {
                ducks.push({
                    duck: duck,
                    dist: this.distanceTo(duck)
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

        const centerForce = 1.8;
        const damping = 5.0;
        const separationForce = 7000.0;
        const groupForce = 3.0;
        const dogForce = 20000.0;

        // Initialize total force
        let totalForce = new Vector(0, 0);

        // Center force (pull towards origin, matching Godot's -pos)
        const center = new Vector(game.engine.canvas.width / 2, game.engine.canvas.height / 2);
        totalForce = totalForce.add(center.sub(this.pos).mult(centerForce));

        // Separation from closest duck
        const closestDuck = this.getClosestOtherDuck();
        this.closestOtherDuck = closestDuck;
        
        if (closestDuck) {
            const proximity = 1.0 / (this.distanceTo(closestDuck) + 1.0);
            const separationDir = this.directionTo(closestDuck);
            totalForce = totalForce.add(separationDir.mult(-separationForce * proximity));
        }

        // Group cohesion with nearby ducks
        const closestNDucks = this.getClosestNOtherDucks(2);
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
        const velAngle = this.vel.angle();
        this.targetBodyAngle = velAngle;
        this.targetHeadAngle = velAngle;
    }

    update(deltaTime) {
        // Calculate point behind duck based on its angle
        const behindDistance = this.radius * 2.0;
        const behindPoint = this.pos.add(new Vector(1, 0).rotate(this.angle + Math.PI).mult(behindDistance));
        
        // Wing lerp speed
        const wingLerpSpeed = 12.0;
        // Update left wing
        const leftWingPos = this.pos.add(this.leftWing.localPos.rotate(this.angle));
        this.leftWing.targetAngle = leftWingPos.angleTo(behindPoint);
        this.leftWing.angle = angleLerp(this.leftWing.angle, this.leftWing.targetAngle, deltaTime * wingLerpSpeed);
        
        // Update right wing
        const rightWingPos = this.pos.add(this.rightWing.localPos.rotate(this.angle));
        this.rightWing.targetAngle = rightWingPos.angleTo(behindPoint);
        this.rightWing.angle = angleLerp(this.rightWing.angle, this.rightWing.targetAngle, deltaTime * wingLerpSpeed);
        
        // Let Actor handle visual interpolation
        super.update(deltaTime);
    }

    draw(ctx, alpha) {
        // Draw the base actor (body and head)
        super.draw(ctx, alpha);
        
        // Draw wings
        this.leftWing.draw(ctx, this.pos, this.angle);
        this.rightWing.draw(ctx, this.pos, this.angle);
    }
} 
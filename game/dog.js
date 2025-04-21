import { Actor } from './actor.js';
import { Vector } from '../engine/vector.js';
import { angleDiff } from '../engine/utils.js';

export class Dog extends Actor {
    static dogs = [];

    constructor(pos) {
        super(pos, 8, '#ffffff'); // White color, 16px radius
        Dog.dogs.push(this);
        
        // Customize head properties for dog
        this.headSize = new Vector(this.radius * 1.2, this.radius * 0.5);
        this.headOffset = this.radius * 1.0;
        
        // Set nose properties - wide but short
        this.mouthSize = new Vector(4.0, this.headSize.y);
        this.mouthColor = '#000000';

        // Tail properties
        const tailBase = pos.copy();
        const tailEnd = pos.add(new Vector(0, 20));
        this.tail = {
            p0: tailBase, // Tail base position (follows dog)
            p1: tailEnd, // Tail end position
            v0: new Vector(0, 0), // Tail base velocity
            v1: new Vector(0, 0), // Tail end velocity
            springTargetLength: 8.0,
            springFreq: 200.0,
            maxLength: 20.0,
            drag: 6.0,
            color: '#ffffff', // White color for tail
            volume: 100.0, // Controls tail thickness
            wagCycle: 0.0,
            prevP0: tailBase.copy()
        };
    }

    fixedUpdate(deltaTime, game) {
        // Calculate velocity based on position change
        this.vel = this.pos.sub(this.prevPos).div(deltaTime);
        
        // Store previous position for next frame's velocity calculation
        this.prevPos = this.pos;
        
        // Override target angles - body follows velocity, head follows mouse
        this.targetBodyAngle = this.vel.angle();
        this.targetHeadAngle = this.vel.angle();
    }

    update(deltaTime) {
        // Let Actor handle visual interpolation
        super.update(deltaTime);
        
        // Update tail physics
        this.updateTail(deltaTime);
    }

    updateTail(dt) {
        const tail = this.tail;
        const TAU = Math.PI * 2;

        // Use interpolated body angle instead of calculating from velocity
        const bodyAngle = this.angle;
        const velMag = this.vel.mag();
        const stretchFactor = 1.0 + velMag / 1400;

        // Calculate tail base position offset from body center
        const tailOffset = -this.radius * 0.8; // Negative to position at back
        const baseOffset = new Vector(
            tailOffset * stretchFactor,  // Stretch the offset with body
            0
        ).rotate(bodyAngle);  // Rotate to match body angle

        // Update tail base position to follow dog with offset
        const newP0 = this.pos.add(baseOffset);
        
        // Calculate base velocity based on position change
        tail.v0 = newP0.sub(tail.p0).div(dt);
        tail.p0 = newP0;
        
        // Update tail end velocity with drag
        tail.v1 = tail.v1.add(tail.v1.mult(-tail.drag * dt));
        
        const length = Vector.dist(tail.p0, tail.p1);
        const dir = tail.p1.sub(tail.p0).normalize();

        // Wagging animation
        const wagFreq = 4.0;
        tail.wagCycle += dt * wagFreq;
        if (tail.wagCycle > 1.0) tail.wagCycle -= 1.0;
        const wagSide = Math.sign(tail.wagCycle - 0.5);
        
        // Add perpendicular wag force
        const wagForce = dir.rotate(TAU/4 * wagSide).mult(3000.0 * dt);
        // tail.v1 = tail.v1.add(wagForce);

        // Return to center behind dog
        const centerAngle = bodyAngle; // Point tail opposite to body direction
        const currentAngle = Vector.angle(tail.p1, tail.p0);
        
        // Calculate angle difference using utility function
        const diff = angleDiff(centerAngle, currentAngle);
        
        // Apply centering force - proportional to angle difference
        const tangentDir = dir.rotate(TAU/4);
        const centerForce = 3000.0; 
        tail.v1 = tail.v1.sub(tangentDir.mult(centerForce * Math.sin(diff) * dt));

        // Constrain length
        if (length > tail.maxLength) {
            tail.p1 = tail.p0.add(dir.mult(tail.maxLength));
            const relativeVelocity = tail.v1.sub(tail.v0);
            const spdAwayFromDir = Vector.dot(relativeVelocity, dir);
            const velAwayFromDir = dir.mult(spdAwayFromDir);
            tail.v1 = tail.v1.sub(velAwayFromDir.mult(dt));
        }

        // Apply spring force
        tail.v1 = tail.v1.add(dir.mult(tail.springFreq * (tail.springTargetLength - length) * dt));
        tail.p1 = tail.p1.add(tail.v1.mult(dt));
        tail.prevP0 = tail.p0.copy();
    }

    draw(ctx, alpha) {

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        // Draw circle for body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();



        // Draw the base actor (body and head)
        // super.draw(ctx, alpha);

        // Draw tail
        // const tail = this.tail;
        // const length = Vector.dist(tail.p0, tail.p1);
        // const thickness = tail.volume / Math.max(length, tail.springTargetLength);

        // // Draw tail with proper stroke settings
        // ctx.save();
        // ctx.lineCap = 'round';  // Add rounded ends to the tail
        // ctx.beginPath();
        // ctx.moveTo(tail.p0.x, tail.p0.y);
        // ctx.lineTo(tail.p1.x, tail.p1.y);
        // ctx.strokeStyle = tail.color;
        // ctx.lineWidth = thickness;
        // ctx.stroke();
        // ctx.restore();

        ctx.restore();

    }
} 
import { Actor } from './actor.js';
import { Vector } from '../engine/vector.js';

export class Dog extends Actor {
    static dogs = [];

    constructor(x, y) {
        super(x, y, 16, '#ffffff'); // White color, 16px radius
        Dog.dogs.push(this);
        this.target_pos = new Vector(x, y); // Initialize target position to current position
        
        // Customize head properties for dog
        this.headSize = new Vector(this.radius * 1.2, this.radius * 0.5);
        this.headOffset = this.radius * 1.0;
        
        // Set nose properties - wide but short
        this.mouthSize = new Vector(4.0, this.headSize.y);
        this.mouthColor = '#000000';

        // Tail properties
        const tailBase = new Vector(x, y);
        const tailEnd = new Vector(x, y + 20);
        this.tail = {
            p0: tailBase, // Tail base position (follows dog)
            p1: tailEnd, // Tail end position
            v0: new Vector(0, 0), // Tail base velocity
            v1: new Vector(0, 0), // Tail end velocity
            springTargetLength: 12.0,
            springFreq: 200.0,
            maxLength: 32.0,
            drag: 6.0,
            color: '#ffffff', // White color for tail
            volume: 200.0, // Controls tail thickness
            wagCycle: 0.0,
            prevP0: tailBase.copy()
        };
    }

    fixedUpdate(deltaTime, game) {
        const freq = 250.0;
        const damp = 25.0;
        
        const toTarget = this.target_pos.sub(this.pos);
        
        // Calculate total force
        const springForce = toTarget.mult(freq);
        const dampingForce = this.vel.mult(damp);
        const totalForce = springForce.sub(dampingForce);
        
        // Apply force with single deltaTime scaling
        this.vel = this.vel.add(totalForce.mult(deltaTime));
        
        // Store toTarget for debugging visualization
        this.toMouse = toTarget; // Keep the same name for backwards compatibility
        
        // Let Actor handle basic position update and default angle targets
        super.fixedUpdate(deltaTime);
        
        // Override target angles - body follows velocity, head follows target
        this.targetBodyAngle = this.vel.angle();
        this.targetHeadAngle = toTarget.angle();
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
        
        // Calculate base velocity based on position change, avoiding division by zero
        if (dt > 0) {
            tail.v0 = newP0.sub(tail.p0).div(dt);
        } else {
            tail.v0 = new Vector(0, 0);
        }
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
        tail.v1 = tail.v1.add(wagForce);

        // Return to center behind dog
        const centerAngle = bodyAngle; // Point tail opposite to body direction
        const currentAngle = Vector.angle(tail.p1, tail.p0);
        
        // Calculate angle difference and normalize to [-PI, PI]
        let angleDiff = ((centerAngle - currentAngle + TAU) % TAU);
        if (angleDiff > Math.PI) angleDiff -= TAU;
        
        // Apply centering force - proportional to angle difference
        const tangentDir = dir.rotate(TAU/4);
        const centerForce = 3000.0; 
        tail.v1 = tail.v1.sub(tangentDir.mult(centerForce * Math.sin(angleDiff) * dt));

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
        // Draw the base actor (body and head)
        super.draw(ctx, alpha);

        // Draw tail
        const tail = this.tail;
        const length = Vector.dist(tail.p0, tail.p1);
        const thickness = tail.volume / Math.max(length, tail.springTargetLength);

        // Draw tail with proper stroke settings
        ctx.save();
        ctx.lineCap = 'round';  // Add rounded ends to the tail
        ctx.beginPath();
        ctx.moveTo(tail.p0.x, tail.p0.y);
        ctx.lineTo(tail.p1.x, tail.p1.y);
        ctx.strokeStyle = tail.color;
        ctx.lineWidth = thickness;
        ctx.stroke();
        ctx.restore();

    }
} 
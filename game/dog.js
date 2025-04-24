import { Vector } from '../engine/vector.js';
import { angleDiff, angleLerp } from '../engine/utils.js';
import { DebugDraw } from '../engine/debugDraw.js';

export class Dog {
    static dogs = [];

    constructor(pos) {
        this.pos = pos;
        this.prevPos = pos;
        this.vel = new Vector(0, 0);
        this.radius = 8;
        this.velAng = 0;
        this.angle = 0;
        this.color = '#ffffff';

        // Head properties
        this.headSize = new Vector(this.radius * 1.0, this.radius * 0.5);
        this.headOffset = this.radius;
        this.headAngle = 0;
        this.headColor = 'black';
        
        // Eye properties
        this.eyeRadius = this.radius * 0.25;
        this.eyeOffset = new Vector(this.headSize.x * -0.25, this.headSize.y * 0.5);
        this.eyeColor = '#000000';
        
        // Mouth/nose properties
        this.mouthSize = new Vector(2.0, this.headSize.y);
        this.mouthColor = '#000000';

        this.buttPos = pos.copy();
        this.interpolatedPos = pos.copy();
        this.interpolationFactor = 1.0/3.0;

        // Tail properties
        const tailBase = pos.copy();
        const tailEnd = pos.add(new Vector(0, 20));
        this.tail = {
            p0: tailBase,
            p1: tailEnd,
            v0: new Vector(0, 0),
            v1: new Vector(0, 0),
            springTargetLength: 4.0,
            springFreq: 200.0,
            maxLength: 12.0,
            drag: 6.0,
            color: '#ffffff',
            volume: 30.0,
            wagCycle: 0.0,
            prevP0: tailBase.copy()
        };

        Dog.dogs.push(this);
    }

    fixedUpdate(deltaTime, game) {
        // dogs position is set directly so we calculate velocity based on position change
        this.vel = this.pos.sub(this.prevPos).div(deltaTime);
        this.prevPos = this.pos;
    }

    update(deltaTime) {
        this.interpolatedPos = this.interpolatedPos.add(this.pos.sub(this.interpolatedPos).mult(this.interpolationFactor));

        // Lerp butt position towards interpolated position
        const buttLerpSpeed = 30.0;
        this.buttPos = this.buttPos.add(this.interpolatedPos.sub(this.buttPos).mult(deltaTime * buttLerpSpeed));

        // Update tail physics
        this.updateTail(deltaTime);

        if (this.vel.mag() > 0.01) {
            this.velAng = this.vel.angle();
        }
        const velMag = this.vel.mag();
        // angleLerp towards velAng proportional to velMag, so we dont turn quickly when slow
        this.angle = angleLerp(this.angle, this.velAng, velMag / 1000.0);
        console.log(this.angle, this.velAng);
        // DebugDraw.line(this.pos, this.pos.add(Vector.fromAngle(this.velAng).mult(10)), 'red');
        DebugDraw.line(this.pos, this.pos.add(Vector.fromAngle(this.angle).mult(10)), 'blue');
    }

    updateTail(dt) {
        const tail = this.tail;
        const stretchFactor = 1.0 + this.vel.mag() / 1400;
        // Calculate tail base position offset from body center
        const tailOffset = this.radius * 1.0; // Negative to position at back
        const baseOffset = new Vector(
            tailOffset * -stretchFactor,  // Stretch the offset with body
            0
        ).rotate(this.angle);  // Rotate to match body angle
        
        // Update tail base position to follow dog with offset
        const newP0 = this.pos.add(baseOffset);
        DebugDraw.circle(newP0, 4, 'blue');
        
        // Calculate base velocity based on position change
        tail.v0 = newP0.sub(tail.p0).div(dt);
        tail.p0 = newP0;
        
        // Update tail end velocity with drag
        tail.v1 = tail.v1.add(tail.v1.mult(-tail.drag * dt));
        
        const length = Vector.dist(tail.p0, tail.p1);
        const dir = Vector.dir(tail.p0, tail.p1);

        // // Wagging animation
        // const wagFreq = 4.0;
        // tail.wagCycle += dt * wagFreq;
        // if (tail.wagCycle > 1.0) tail.wagCycle -= 1.0;
        // const wagSide = Math.sign(tail.wagCycle - 0.5);
        
        // // Add perpendicular wag force
        // const wagForce = dir.rotate(Math.PI/2 * wagSide).mult(3000.0 * dt);
        // // tail.v1 = tail.v1.add(wagForce);

        // // Return to center behind dog
        // const centerAngle = this.angle; // Point tail opposite to body direction
        // const currentAngle = Vector.angle(tail.p1, tail.p0);
        
        // // Calculate angle difference using utility function
        // const diff = angleDiff(centerAngle, currentAngle);
        
        // // Apply centering force - proportional to angle difference
        // const tangentDir = dir.rotate(Math.PI/2);
        // const centerForce = 3000.0; 
        // tail.v1 = tail.v1.sub(tangentDir.mult(centerForce * Math.sin(diff) * dt));

        // // Constrain length
        // if (length > tail.maxLength) {
        //     tail.p1 = tail.p0.add(dir.mult(tail.maxLength));
        //     const relativeVelocity = tail.v1.sub(tail.v0);
        //     const spdAwayFromDir = Vector.dot(relativeVelocity, dir);
        //     const velAwayFromDir = dir.mult(spdAwayFromDir);
        //     tail.v1 = tail.v1.sub(velAwayFromDir.mult(dt));
        // }

        // Apply spring force
        const force = -dir.mult(tail.springFreq * (tail.springTargetLength - length) * dt);
        tail.v1 = tail.v1.add(force);
        tail.p1 = tail.p1.add(tail.v1.mult(dt));
        tail.prevP0 = tail.p0.copy();

        DebugDraw.line(tail.p0, tail.p1, 'green');
    }

    draw(ctx, alpha) {
        ctx.save();
        this.drawStretchedBody(ctx, alpha);
        this.drawTail(ctx, alpha);
        // this.drawHead(ctx, alpha);
        ctx.restore();
    }

    drawHead(ctx, alpha) {
        ctx.save();
        ctx.translate(0, 0);
        ctx.rotate(this.velAng);
        ctx.ellipse(0, 0, this.headSize.x, this.headSize.y, 0, 0, Math.PI * 2);
        ctx.restore();
    }

    drawStretchedBody(ctx, alpha) {
        ctx.save();

        // Calculate interpolated position between body and butt
        const drawPoint = this.interpolatedPos.lerp(this.buttPos, 0.5);
        ctx.translate(drawPoint.x, drawPoint.y);

        // Calculate direction and distance between interpolated position and butt position
        const bodyDir = this.buttPos.sub(this.interpolatedPos);
        const stretchFactor = 1.0 + bodyDir.mag() / (this.radius * 2.0);
        
        // Rotate context to align with body direction
        ctx.rotate(bodyDir.angle());
        
        // Draw stretched ellipse
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * stretchFactor, this.radius / stretchFactor, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.restore();
    }

    drawTail(ctx, alpha) {
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
    
    // Add utility methods from Actor
    overlaps(other) {
        const distance = Vector.dist(this.pos, other.pos);
        return distance < (this.radius + other.radius);
    }

    distanceTo(other) {
        return Vector.dist(this.pos, other.pos);
    }

    directionTo(other) {
        return other.pos.sub(this.pos).normalize();
    }
} 
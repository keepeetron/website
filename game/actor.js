import { Vector } from '../engine/vector.js';

export class Actor {
    constructor(x, y, radius, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.radius = radius;
        this.angle = 0; // Initialize angle to 0
        
        // Head properties
        this.headSize = new Vector(radius * 0.8, radius * 0.6); // width and height of head
        this.headOffset = radius * 1.2; // distance from center to head
        this.headAngle = 0; // angle the head is facing
        
        // Eye properties
        this.eyeRadius = radius * 0.25;
        this.eyeOffset = new Vector(this.headSize.x * 0.0, this.headSize.y * 0.5); // from head center
        this.eyeColor = '#000000';
        
        // Mouth/nose properties
        this.mouthSize = new Vector(radius * 0.2, radius * 0.15);
        this.mouthColor = '#ffffff'; // default white, can be overridden

        this.color = color;
        this.headColor = color;
    }
    

    fixedUpdate(deltaTime) {
        // Update position
        this.pos = this.pos.add(this.vel.mult(deltaTime));
        
        // Calculate target angles based on velocity by default
        // Child classes can override these after calling super.fixedUpdate
        const velAngle = this.vel.angle();
        this.targetBodyAngle = velAngle;
        this.targetHeadAngle = velAngle;
    }

    update(deltaTime) {
        // Skip interpolation if we don't have valid target angles
        if (typeof this.targetBodyAngle !== 'number' || typeof this.targetHeadAngle !== 'number') {
            return;
        }

        // Calculate rotation based on velocity magnitude
        const velMag = this.vel.mag();
        const maxRotationSpeed = 50.0; // Maximum rotation speed in radians per second
        // rotation factor approaches 1.0 as velMag increases, hwp is the half-way point, where it gets to 0.5
        const hwp = 50.0;
        const rotationFactor = 1.0 - (hwp / (velMag + hwp));
        
        // Body angle interpolation
        let bodyAngleDiff = this.targetBodyAngle - this.angle;
        // Normalize to [-PI, PI]
        while (bodyAngleDiff > Math.PI) bodyAngleDiff -= Math.PI * 2;
        while (bodyAngleDiff < -Math.PI) bodyAngleDiff += Math.PI * 2;
        
        // Apply rotation proportional to speed
        this.angle += bodyAngleDiff * deltaTime * maxRotationSpeed * rotationFactor;
        
        // Head angle interpolation
        let headAngleDiff = this.targetHeadAngle - this.headAngle;
        // Normalize angle difference to [-PI, PI]
        while (headAngleDiff > Math.PI) headAngleDiff -= Math.PI * 2;
        while (headAngleDiff < -Math.PI) headAngleDiff += Math.PI * 2;
        
        // Smooth head rotation
        this.headAngle += headAngleDiff * deltaTime * 8.0;
    }

    draw(ctx, alpha) {
        // Calculate velocity magnitude for stretch amount
        const velMag = this.vel.mag();
        const stretchFactor = 1.0 + velMag / 1400;
        
        // Save current context state
        ctx.save();
        
        // Move to position and rotate
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);  // Using the interpolated angle
        
        // Draw stretched circle for body
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * stretchFactor, this.radius / stretchFactor, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Draw head
        ctx.save();
        // Move to head position (offset from body)
        ctx.translate(this.headOffset, 0);
        // Add offset based on velocity (transformed to local space)
        const localVel = new Vector(
            this.vel.x * Math.cos(-this.angle) - this.vel.y * Math.sin(-this.angle),
            this.vel.x * Math.sin(-this.angle) + this.vel.y * Math.cos(-this.angle)
        );
        const velocityOffset = localVel.mult(0.03);  // Scale factor can be adjusted
        ctx.translate(velocityOffset.x, velocityOffset.y);
        // Apply head rotation relative to body rotation
        ctx.rotate(this.headAngle - this.angle);
        
        // Draw eyes first (they'll be partially covered by the head)
        ctx.beginPath();
        // Left eye
        ctx.arc(this.eyeOffset.x, -this.eyeOffset.y, this.eyeRadius, 0, Math.PI * 2);
        // Right eye
        ctx.arc(this.eyeOffset.x, +this.eyeOffset.y, this.eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.eyeColor;
        ctx.fill();
        
        // Draw rectangular head
        ctx.beginPath();
        ctx.rect(-this.headSize.x / 2, -this.headSize.y / 2, this.headSize.x, this.headSize.y);
        ctx.fillStyle = this.headColor;
        ctx.fill();
        
        // Draw mouth/nose at the front of the head
        ctx.beginPath();
        ctx.rect(
            this.headSize.x / 2 - this.mouthSize.x / 2, 
            -this.mouthSize.y / 2,
            this.mouthSize.x,
            this.mouthSize.y
        );
        ctx.fillStyle = this.mouthColor;
        ctx.fill();
        
        ctx.restore();
        
        // Restore main context state
        ctx.restore();
    }

    // Check if this actor overlaps with another actor
    overlaps(other) {
        const distance = Vector.dist(this.pos, other.pos);
        return distance < (this.radius + other.radius);
    }

    // Get the distance to another actor
    distanceTo(other) {
        return Vector.dist(this.pos, other.pos);
    }

    // Get the direction to another actor (normalized vector)
    directionTo(other) {
        return other.pos.sub(this.pos).normalize();
    }
} 
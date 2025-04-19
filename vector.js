export class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Basic arithmetic operations
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    mult(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    div(scalar) {
        if (scalar === 0) throw new Error("Division by zero");
        return new Vector(this.x / scalar, this.y / scalar);
    }

    // Vector properties
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    // Vector operations
    normalize() {
        const m = this.mag();
        if (m !== 0) {
            return this.div(m);
        }
        return new Vector(0, 0);
    }

    limit(max) {
        const mSq = this.magSq();
        if (mSq > max * max) {
            return this.normalize().mult(max);
        }
        return this.copy();
    }

    // Utility methods
    copy() {
        return new Vector(this.x, this.y);
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    // Static methods for common operations
    static dist(v1, v2) {
        return v1.sub(v2).mag();
    }

    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    static angle(v1, v2) {
        return Math.acos(Vector.dot(v1, v2) / (v1.mag() * v2.mag()));
    }

    // Rotate vector by angle (in radians)
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
} 
import { Vector } from './vector.js';

/**
 * Camera class for handling view transformations in the game
 */
class Camera {
    constructor() {
        this.position = new Vector(0, 0);  // Camera position in world space
        this.scale = 1.0;                  // Camera zoom level (1.0 = normal)
    }

    beginDraw(ctx) {
        ctx.save();
        
        ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
        ctx.translate(-this.position.x, -this.position.y);
        ctx.scale(this.scale, this.scale);

    }

    endDraw(ctx) {
        ctx.restore();
    }
}

// Export the Camera class
export default Camera; 
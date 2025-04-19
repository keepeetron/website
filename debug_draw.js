import { Vector } from './vector.js';

export class DebugDraw {
    static instance = null;
    static shapes = [];
    static currentFrameShapes = [];

    static getInstance() {
        if (!DebugDraw.instance) {
            DebugDraw.instance = new DebugDraw();
        }
        return DebugDraw.instance;
    }

    static line(p0, p1, color = '#ff0000', thickness = 1, duration = 0) {
        DebugDraw.shapes.push({
            type: 'line',
            p0: p0,
            p1: p1,
            color: color,
            thickness: thickness,
            duration: duration,
            startTime: performance.now() / 1000 // Convert to seconds
        });
    }

    static circle(center, radius, color = '#ff0000', thickness = 1, duration = 0) {
        DebugDraw.shapes.push({
            type: 'circle',
            center: center,
            radius: radius,
            color: color,
            thickness: thickness,
            duration: duration,
            startTime: performance.now() / 1000 // Convert to seconds
        });
    }

    static draw(ctx) {
        const currentTime = performance.now() / 1000; // Convert to seconds
        
        // Clear previous frame's shapes
        DebugDraw.currentFrameShapes = [];
        
        // Update shapes list, removing expired ones and adding new ones
        DebugDraw.shapes = DebugDraw.shapes.filter(shape => {
            // If duration is 0, shape only shows for one frame
            if (shape.duration === 0) {
                DebugDraw.currentFrameShapes.push(shape);
                return false; // Remove after this frame
            }
            
            // Check if shape has expired
            if (currentTime - shape.startTime > shape.duration) {
                return false;
            }
            
            DebugDraw.currentFrameShapes.push(shape);
            return true;
        });
        
        // Draw all shapes for this frame
        for (const shape of DebugDraw.currentFrameShapes) {
            ctx.save();
            ctx.strokeStyle = shape.color;
            ctx.lineWidth = shape.thickness;
            
            switch (shape.type) {
                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(shape.p0.x, shape.p0.y);
                    ctx.lineTo(shape.p1.x, shape.p1.y);
                    ctx.stroke();
                    break;
                    
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
            }
            
            ctx.restore();
        }
    }

    static clear() {
        DebugDraw.shapes = [];
        DebugDraw.currentFrameShapes = [];
    }
} 
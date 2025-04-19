import { Vector } from './vector.js';
export class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Engine state
        this.state = null; // To be set by game
        this.rng = null;
        
        // Fixed update settings
        this.fixedTimeStep = 1 / 60; // 60 updates per second (in seconds)
        this.accumulator = 0;
        this.lastTime = performance.now() / 1000; // Convert to seconds
        
        // FPS tracking
        this.fixedUpdatesThisSecond = 0;
        this.updatesThisSecond = 0;
        this.lastFpsUpdate = this.lastTime;
        this.currentFixedFps = 0;
        this.currentFps = 0;
        
        // Input state
        this.mousePos = { x: 0, y: 0 };
        this.touchDelta = new Vector(0, 0);
        this.lastTouchPos = null;
        this.isTouchDevice = false;
        
        // Set canvas size
        this.canvas.width = 768;
        this.canvas.height = 768;
        
        // Setup input handlers
        this.setupInputHandlers();
        
        // Start game loop
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }

    setupInputHandlers() {
        // Mouse tracking (still on canvas)
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });

        // Touch tracking (on document)
        document.addEventListener('touchstart', (e) => {
            this.isTouchDevice = true;
            const touch = e.touches[0];
            this.lastTouchPos = new Vector(touch.clientX, touch.clientY);
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const currentTouchPos = new Vector(touch.clientX, touch.clientY);
            
            if (this.lastTouchPos) {
                this.touchDelta = currentTouchPos.sub(this.lastTouchPos);
                this.lastTouchPos = currentTouchPos;
            }
            
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', () => {
            this.lastTouchPos = null;
            this.touchDelta = new Vector(0, 0);
        });
    }

    gameLoop(currentTime) {
        // Calculate delta time in seconds
        const deltaTime = currentTime / 1000 - this.lastTime;
        this.lastTime = currentTime / 1000;

        // Update FPS counter
        if (currentTime / 1000 - this.lastFpsUpdate >= 1.0) {
            this.currentFixedFps = this.fixedUpdatesThisSecond;
            this.currentFps = this.updatesThisSecond;
            this.fixedUpdatesThisSecond = 0;
            this.updatesThisSecond = 0;
            this.lastFpsUpdate = currentTime / 1000;
        }
        this.updatesThisSecond++;

        // Add to accumulator
        this.accumulator += deltaTime;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Run fixed updates based on game state
        while (this.accumulator >= this.fixedTimeStep) {
            // Run state-specific fixed update logic
            if (this.state && this.state.fixedUpdate) {
                this.state.fixedUpdate(this.fixedTimeStep);
            }
            
            this.fixedUpdatesThisSecond++;
            this.accumulator -= this.fixedTimeStep;
        }

        // Run regular update (every frame)
        if (this.state && this.state.update) {
            this.state.update(deltaTime);
        }

        // Draw based on game state
        if (this.state && this.state.draw) {
            this.state.draw(this.accumulator / this.fixedTimeStep);
        }

        // Continue game loop
        requestAnimationFrame(this.gameLoop);
    }

    setState(newState) {
        this.state = newState;
    }
} 
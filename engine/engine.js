import { Vector } from './vector.js';
import Camera from './camera.js';

export class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas to fill its container
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.resizeCanvas();
        
        // Add window resize handler
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Engine state
        this.state = null; // To be set by game
        this.rng = null;
        
        // Camera setup
        this.camera = new Camera();
        
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
        this.mousePos = { x: 0, y: 0 };  // Raw screen position
        this.worldMousePos = new Int8Array(2);  // Position in world space as Int8
        this.touchDelta = new Vector(0, 0);
        this.lastTouchPos = null;
        this.isTouchDevice = false;
        
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
            const rect = this.canvas.getBoundingClientRect();
            this.lastTouchPos = new Vector(
                touch.clientX - rect.left,
                touch.clientY - rect.top
            );
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const currentTouchPos = new Vector(
                touch.clientX - rect.left,
                touch.clientY - rect.top
            );
            
            if (this.lastTouchPos) {
                // Calculate the scale ratio between screen and canvas
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                
                // Scale the delta to match canvas coordinates
                const rawDelta = currentTouchPos.sub(this.lastTouchPos);
                this.touchDelta = new Vector(
                    rawDelta.x * scaleX,
                    rawDelta.y * scaleY
                );
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

        // Update mouse position in world space
        const worldX = (this.mousePos.x - this.canvas.width/2 + this.camera.position.x) / this.camera.scale;
        const worldY = (this.mousePos.y - this.canvas.height/2 + this.camera.position.y) / this.camera.scale;
        
        // Clamp to Int8 range and store
        this.worldMousePos[0] = Math.max(-128, Math.min(127, Math.round(worldX)));
        this.worldMousePos[1] = Math.max(-128, Math.min(127, Math.round(worldY)));

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
            this.camera.beginDraw(this.ctx);
            this.state.draw(this.accumulator / this.fixedTimeStep);
            this.camera.endDraw(this.ctx);
            
            // Draw UI in screen space
            if (this.state.drawUI) {
                this.state.drawUI(this.accumulator / this.fixedTimeStep);
            }
        }

        // Continue game loop
        requestAnimationFrame(this.gameLoop);
    }

    setState(newState) {
        this.state = newState;
    }

    resizeCanvas() {
        const gameWrapper = this.canvas.parentElement;
        // Set canvas size to match its container
        this.canvas.width = gameWrapper.clientWidth;
        this.canvas.height = gameWrapper.clientHeight;
    }
} 
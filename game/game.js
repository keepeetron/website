import { GameEngine } from '../engine/engine.js';
import { Vector } from '../engine/vector.js';
import { Actor } from './actor.js';
import { Dog } from './dog.js';
import { Duck } from './duck.js';
import { Pen } from './pen.js';
import { Boundary } from './boundary.js';
import { DebugDraw } from '../engine/debugDraw.js';
import { mulberry32, hashCode, getDailySeed, getRandomPointInUnitCircle, angleLerp, isMobileDevice } from '../engine/utils.js';
import { GameUI } from './ui.js';
import { ReplayManager } from './replayManager.js';

// Game states enum
export const GameState = {
    PREGAME: 'PREGAME',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER',
    REPLAY: 'REPLAY'
};

class Game {
    constructor(canvasId) {
        this.engine = new GameEngine(canvasId);
        this.state = GameState.PREGAME;
        this.seed = '';
        this.currentSeed = '';
        
        // Timer
        this.gameTime = 0;
        this.finalTime = 0;
        
        // Create UI and ReplayManager
        this.ui = new GameUI(this);
        this.replayManager = new ReplayManager(this);
        
        // Create game objects
        this.boundary = new Boundary(128);
        this.dog = new Dog(0, 0);
        this.createPen();
        
        // Set default daily seed
        this.setSeed(getDailySeed());
        
        // Set initial state
        this.engine.setState(this);
    }

    setSeed(newSeed) {
        this.currentSeed = newSeed;
        this.seed = newSeed;
        this.ui.updateSeedInput(newSeed);
        this.resetRNG();
        this.regenerateDucks();
    }

    resetRNG() {
        this.engine.rng = mulberry32(hashCode(this.currentSeed));
    }
    getFreeDuckSpawnPosition(spawnRadius, duckRadius) {
        const minDistance = duckRadius * 2;
        const maxAttempts = 100;
        
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const point = getRandomPointInUnitCircle(this.engine.rng);
            const pos = point.mult(spawnRadius);

            let overlaps = false;
            for (const duck of Duck.ducks) {
                const distance = pos.distanceTo(duck.pos);
                if (distance < minDistance) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                return pos;
            }
        }

        // Fallback if no free position found after max attempts
        const point = getRandomPointInUnitCircle(this.engine.rng);
        return point.mult(spawnRadius);
    }

    createPen() {
        const penRadius = 32;
        this.pen = new Pen(penRadius);
    }

    regenerateDucks() {
        // Clear existing ducks
        Duck.ducks = [];
        
        const penRadius = 32;  // Match pen radius
        const duckRadius = 8;  // Smaller duck radius
        const spawnRadius = penRadius - (Pen.thickness / 2) - duckRadius;

        const colors = ['#00ffff', '#ff00ff', '#ffff00'];
        
        for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
            for (let i = 0; i < 4; i++) {
                const position = this.getFreeDuckSpawnPosition(spawnRadius, duckRadius);
                const duck = new Duck(position.x, position.y, colors[colorIndex]);
                duck.active = false;
            }
        }
    }

    fixedUpdate(dt) {
        // Update dog's target position based on input
        if (this.dog && (this.state === GameState.PREGAME || this.state === GameState.PLAYING)) {
            if (this.engine.isTouchDevice) {
                // For touch devices, add the touch delta to the current target position
                const sensitivity = 2.0;
                const touchDelta = this.engine.touchDelta;
                this.dog.target_pos = this.dog.target_pos.add(touchDelta.mult(sensitivity));
                this.engine.touchDelta = new Vector(0, 0);
            } else {
                // For mouse, directly set to world-space mouse position
                this.dog.target_pos = new Vector(this.engine.worldMousePos[0], this.engine.worldMousePos[1]);
            }
        }

        switch (this.state) {
            case GameState.PREGAME:
                this.updatePregameLogic(dt);
                break;
            case GameState.PLAYING:
                this.updatePlayingLogic(dt);
                break;
            case GameState.REPLAY:
                this.replayManager.updateReplay(dt);
                break;
            case GameState.GAMEOVER:
                this.updateGameoverLogic(dt);
                break;
        }

        // Update game objects in explicit order
        this.dog.fixedUpdate(dt, this);
        for (const duck of Duck.ducks) {
            duck.fixedUpdate(dt, this);
        }
        this.boundary.fixedUpdate(dt, this);
        if (this.pen) this.pen.fixedUpdate(dt, this);
    }

    update(dt) {
        this.updateCamera(dt);
        
        // Update game objects in explicit order
        this.dog.update(dt);
        for (const duck of Duck.ducks) {
            duck.update(dt);
        }
        this.boundary.update(dt);
        if (this.pen) this.pen.update(dt);
    }

    updateCamera(dt) {
        if (isMobileDevice()) {
            // Mobile camera handling - simple scaling without buffer
            this.scaleCameraToCanvasSize(0);
            
            // Check if in portrait mode (height > width)
            const isPortrait = this.engine.canvas.height > this.engine.canvas.width;
            
            if (isPortrait) {
                // In portrait mode, move camera down to center the boundary
                const moveDown = this.engine.canvas.height / 2 - (this.boundary.radius * this.engine.camera.scale);
                this.engine.camera.position.set(0, moveDown);
            } else {
                // In landscape mode, move camera right to center the boundary on the left
                const moveRight = this.engine.canvas.width / 2 - (this.boundary.radius * this.engine.camera.scale);
                this.engine.camera.position.set(moveRight, 0);
            }
        } else {
            // Desktop camera handling with larger screen-space buffer
            this.scaleCameraToCanvasSize(48);
            
            // Center camera
            this.engine.camera.position.set(0, 0);
        }
    }

    scaleCameraToCanvasSize(screenSpaceBuffer) {
        const boundaryRadius = 128;
        const canvasWidth = this.engine.canvas.width;
        const canvasHeight = this.engine.canvas.height;
        
        // Calculate scale needed to fit boundary in both dimensions
        const scaleX = canvasWidth / (2 * boundaryRadius);
        const scaleY = canvasHeight / (2 * boundaryRadius);
        
        // Use the smaller scale to ensure the boundary fits in both dimensions
        const baseScale = Math.min(scaleX, scaleY);
        
        if (screenSpaceBuffer > 0) {
            // Convert screen-space buffer to world space and add to boundary radius
            const worldSpaceBuffer = screenSpaceBuffer / baseScale;
            const effectiveRadius = boundaryRadius + worldSpaceBuffer;
            
            // Recalculate scale with the effective radius
            const finalScaleX = canvasWidth / (2 * effectiveRadius);
            const finalScaleY = canvasHeight / (2 * effectiveRadius);
            
            // Use the smaller scale to ensure everything fits
            this.engine.camera.scale = Math.min(finalScaleX, finalScaleY);
        } else {
            // No buffer needed, use base scale
            this.engine.camera.scale = baseScale;
        }
    }

    updatePregameLogic(dt) {
        // Any pregame-specific logic
    }

    updatePlayingLogic(dt) {
        this.gameTime += dt;
        
        // Record mouse position for replay
        this.replayManager.recordFrame(this.engine.mousePos.x, this.engine.mousePos.y);
        
        if (this.checkAllDucksSorted()) {
            this.finalTime = this.gameTime;
            this.replayManager.saveReplay();
            this.endGame();
        }
    }

    checkAllDucksSorted() {
        for (const duck of Duck.ducks) {
            if (!duck.isSorted) return false;
        }
        return Duck.ducks.length > 0;
    }

    updateGameoverLogic(dt) {
        // Gameover-specific logic
    }

    draw(alpha) {
        // Draw game objects in explicit order
        this.boundary.draw(this.engine.ctx);
        if (this.pen) this.pen.draw(this.engine.ctx, alpha);
        this.dog.draw(this.engine.ctx, alpha);
        for (const duck of Duck.ducks) {
            duck.draw(this.engine.ctx, alpha);
        }
    }

    drawUI(alpha) {
        // Draw UI elements in screen space
        this.ui.draw(alpha);
        DebugDraw.draw(this.engine.ctx);
    }

    startGame() {
        this.ui.hideSeedControls();
        this.ui.hideResetButton();
        
        this.gameTime = 0;
        this.replayManager.startRecording();
        
        // Remove pen and activate ducks
        this.pen = null;
        for (const duck of Duck.ducks) {
            duck.active = true;
        }

        this.state = GameState.PLAYING;
    }

    endGame() {
        this.ui.showResetButton();
        if (this.replayManager.replayData) {
            this.ui.showReplayButton();
        }
        this.state = GameState.GAMEOVER;
    }

    startReplay() {
        this.replayManager.startReplay();
    }

    resetGame() {
        this.ui.showSeedControls();
        this.ui.hideResetButton();
        
        this.pen = null;
        Duck.ducks = [];
        
        this.createPen();
        
        // Position dog at outer boundary
        const boundaryRadius = 128;
        const dogRadius = 16; // Dog's radius
        const normal = this.dog.pos.normalize();
        this.dog.pos = normal.mult(boundaryRadius - dogRadius - 10);
        this.dog.vel = new Vector(0, 0);
        this.dog.target_pos = this.dog.pos;
        
        this.resetRNG();
        this.regenerateDucks();
        
        this.state = GameState.PREGAME;
    }
}

// Initialize game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
});

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Prevent pull-to-refresh
document.body.style.overscrollBehavior = 'none'; 
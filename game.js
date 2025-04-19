import { Vector } from './vector.js';
import { Actor } from './actor.js';
import { Dog } from './dog.js';
import { Duck } from './duck.js';
import { Pen } from './pen.js';
import { Boundary } from './boundary.js';

// Game states enum
const GameState = {
    PREGAME: 'PREGAME',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER',
    REPLAY: 'REPLAY'
};

// HTML template for seed input
const seedInputHTML = `
    <div id="seedControls" style="position: absolute; top: 80%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
        <input type="text" id="seedInput" 
            style="background: hsl(0, 0%, 15%); 
                   color: white; 
                   border: 2px solid white; 
                   padding: 8px; 
                   font-size: 16px; 
                   width: 200px; 
                   margin-bottom: 10px;
                   text-align: center;"
            placeholder="Enter seed">
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="randomSeedBtn" 
                style="background: hsl(0, 0%, 20%); 
                       color: white; 
                       border: 2px solid white; 
                       padding: 8px 16px; 
                       cursor: pointer;">Random Seed</button>
            <button id="dailySeedBtn" 
                style="background: hsl(0, 0%, 20%); 
                       color: white; 
                       border: 2px solid white; 
                       padding: 8px 16px; 
                       cursor: pointer;">Daily Seed</button>
        </div>
    </div>
`;

const resetButtonHTML = `
    <div id="resetButton" style="position: absolute; top: 70%; left: 50%; transform: translate(-50%, -50%); display: none;">
        <div style="display: flex; gap: 10px; flex-direction: column; align-items: center;">
            <button id="resetBtn" 
                style="background: hsl(0, 0%, 20%); 
                       color: white; 
                       border: 2px solid white; 
                       padding: 12px 24px; 
                       font-size: 20px;
                       cursor: pointer;">Reset</button>
            <button id="replayBtn" 
                style="background: hsl(0, 0%, 20%); 
                       color: white; 
                       border: 2px solid white; 
                       padding: 12px 24px; 
                       font-size: 20px;
                       cursor: pointer;
                       display: none;">Watch Replay</button>
        </div>
    </div>
`;

// Add operator overloading support
Object.defineProperty(Vector.prototype, Symbol.operator, {
    value: function(b, op) {
        return Vector[Symbol.operator](this, b, op);
    }
});

// Seeded RNG function
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}

function getDailySeed() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

// Game setup
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.objects = [];
        
        // Game state
        this.state = GameState.PREGAME;
        this.seed = '';
        this.currentSeed = '';
        this.rng = null;
        
        // Replay system
        this.MAX_RECORDED_FRAMES = 18000; // 5 minutes at 60fps
        this.recordedPositions = new Int16Array(this.MAX_RECORDED_FRAMES * 2); // x,y pairs
        this.recordedFrames = 0;  // Current number of recorded frames
        this.replayFrame = 0;     // Current frame in replay
        this.replayData = null;   // Stored replay data {seed: string, positions: Int16Array, initialDogState: Object}
        this.replayPaused = false;// Simple pause state instead of variable speed
        
        // Timer
        this.gameTime = 0;
        this.finalTime = 0;
        
        // Add UI elements
        document.body.insertAdjacentHTML('beforeend', seedInputHTML);
        document.body.insertAdjacentHTML('beforeend', resetButtonHTML);
        this.setupSeedControls();
        this.setupKeyboardControls();
        this.setupResetButton();
        
        // Fixed update settings
        this.fixedTimeStep = 1 / 120; // 60 updates per second (in seconds)
        this.accumulator = 0;
        this.lastTime = performance.now() / 1000; // Convert to seconds
        
        // FPS tracking
        this.fixedUpdatesThisSecond = 0;
        this.updatesThisSecond = 0;  // Add counter for regular updates
        this.lastFpsUpdate = this.lastTime;
        this.currentFixedFps = 0;    // Rename to be more specific
        this.currentFps = 0;         // Add FPS counter for regular updates
        
        // Mouse position
        this.mousePos = new Vector(0, 0);
        
        // Set canvas size
        this.canvas.width = 768;
        this.canvas.height = 768;

        // Create the boundary first so it's drawn first
        this.boundary = new Boundary(this.canvas.width/2, this.canvas.height/2, this.canvas.width);
        
        // Create the dog
        this.dog = this.addObject(new Dog(384, 384));
        
        // Create the pen in the center
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const penRadius = 128;
        this.pen = this.addObject(new Pen(centerX, centerY, penRadius));
        
        // Set default daily seed (this will generate the ducks)
        this.setSeed(getDailySeed());
        
        // Set up mouse tracking
        this.setupMouseTracking();
        
        // Start game loop
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }

    setupMouseTracking() {
        document.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            
            // Calculate scale ratio between CSS size and actual canvas size
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            // Calculate mouse position relative to canvas and apply scaling
            let mouseX = Math.round((e.clientX - rect.left) * scaleX);
            let mouseY = Math.round((e.clientY - rect.top) * scaleY);
            
            // Update mouse position
            this.mousePos = new Vector(mouseX, mouseY);
            
            // Update dog's target position only in PREGAME and PLAYING states
            if (this.dog && (this.state === GameState.PREGAME || this.state === GameState.PLAYING)) {
                this.dog.target_pos = new Vector(mouseX, mouseY);
            }
        });
    }

    setupSeedControls() {
        this.seedInput = document.getElementById('seedInput');
        this.randomSeedBtn = document.getElementById('randomSeedBtn');
        this.dailySeedBtn = document.getElementById('dailySeedBtn');
        
        // Generate random seed
        this.randomSeedBtn.addEventListener('click', () => {
            this.setSeed(Math.random().toString(36).substring(2, 15));
        });
        
        // Generate daily seed
        this.dailySeedBtn.addEventListener('click', () => {
            this.setSeed(getDailySeed());
        });
        
        // Update seed when input changes
        this.seedInput.addEventListener('input', (e) => {
            this.setSeed(e.target.value);
        });
        
        // Start game on canvas click
        this.canvas.addEventListener('click', () => {
            if (this.state === GameState.PREGAME) {
                this.startGame();
            }
        });
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key.toLowerCase() === 'r') {
                this.resetGame();
            }
            // Debug: F key to trigger game over
            if (e.key.toLowerCase() === 'f' && this.state === GameState.PLAYING) {
                this.finalTime = this.gameTime;
                this.endGame();
            }
            
            // Replay controls
            if (this.state === GameState.GAMEOVER && e.key.toLowerCase() === 'p') {
                this.startReplay();
            }
            if (this.state === GameState.REPLAY && e.key === ' ') {
                this.replayPaused = !this.replayPaused;
            }
        });
    }

    setupResetButton() {
        const resetButton = document.getElementById('resetButton');
        const resetBtn = document.getElementById('resetBtn');
        const replayBtn = document.getElementById('replayBtn');
        
        resetBtn.addEventListener('click', () => {
            this.resetGame();
        });
        
        replayBtn.addEventListener('click', () => {
            this.startReplay();
        });
    }

    setSeed(newSeed) {
        this.currentSeed = newSeed; // Cache the seed
        this.seed = newSeed;
        this.seedInput.value = newSeed;
        this.resetRNG(); // Separate RNG reset function
        this.regenerateDucks();
    }

    resetRNG() {
        // Create fresh RNG from cached seed
        this.rng = mulberry32(hashCode(this.currentSeed));
    }

    getFreeDuckSpawnPosition(centerX, centerY, spawnRadius, duckRadius) {
        const minDistance = duckRadius * 2; // Minimum distance between ducks
        const maxAttempts = 100;
        
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            // Use seeded RNG for position
            const angle = this.rng() * Math.PI * 2;
            const radius = Math.sqrt(this.rng()) * spawnRadius;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            // Check if this position overlaps with any existing ducks
            let overlaps = false;
            for (const duck of Duck.ducks) {
                const dx = x - duck.pos.x;
                const dy = y - duck.pos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistance) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                return { x, y };
            }
        }

        // If we couldn't find a free spot after max attempts, return one last random position
        const angle = this.rng() * Math.PI * 2;
        const radius = Math.sqrt(this.rng()) * spawnRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        return { x, y };
    }

    regenerateDucks() {
        // Remove existing ducks
        this.objects = this.objects.filter(obj => !(obj instanceof Duck));
        Duck.ducks = []; // Clear static ducks array
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const penRadius = 128;
        const duckRadius = 12; // Duck's radius from Duck class
        // Subtract pen line thickness (half on each side) and duck radius from spawn area
        const spawnRadius = penRadius - (Pen.thickness / 2) - duckRadius;

        // Create ducks with specific colors (4 each of cyan, magenta, and yellow)
        const colors = ['#00ffff', '#ff00ff', '#ffff00']; // cyan, magenta, yellow
        
        for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
            for (let i = 0; i < 4; i++) {
                const position = this.getFreeDuckSpawnPosition(centerX, centerY, spawnRadius, duckRadius);
                const duck = new Duck(position.x, position.y);
                duck.setMainColor(colors[colorIndex]);
                duck.active = false;
                this.addObject(duck);
            }
        }
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
        this.updatesThisSecond++;  // Increment regular update counter

        // Add to accumulator
        this.accumulator += deltaTime;

        // Clear canvas to transparency
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw boundary first
        this.boundary.draw(this.ctx);

        // If in replay mode, update dog's target position before physics update
        if (this.state === GameState.REPLAY && !this.replayPaused && this.replayData) {
            // Keep the last known position when we hit the end of replay
            const frameToUse = Math.min(this.replayFrame, this.recordedFrames - 1);
            const index = frameToUse * 2;
            const x = this.replayData.positions[index];
            const y = this.replayData.positions[index + 1];
            if (this.dog) {
                this.dog.target_pos = new Vector(x, y);
            }
        }

        // Run fixed updates based on game state
        while (this.accumulator >= this.fixedTimeStep) {
            // Always update all objects physics and interactions
            for (const obj of this.objects) {
                if (obj.fixedUpdate) obj.fixedUpdate(this.fixedTimeStep, this);
            }

            // Update boundary constraints
            this.boundary.fixedUpdate(this.fixedTimeStep, this);

            // Run state-specific logic
            switch (this.state) {
                case GameState.PREGAME:
                    this.updatePregameLogic(this.fixedTimeStep);
                    break;
                case GameState.PLAYING:
                    this.updatePlayingLogic(this.fixedTimeStep);
                    break;
                case GameState.REPLAY:
                    this.updateReplayLogic(this.fixedTimeStep);
                    break;
                case GameState.GAMEOVER:
                    this.updateGameoverLogic(this.fixedTimeStep);
                    break;
            }
            
            this.fixedUpdatesThisSecond++;
            this.accumulator -= this.fixedTimeStep;
        }

        // Run regular update (every frame)
        // Update all objects that have an update method
        for (const obj of this.objects) {
            if (obj.update) obj.update(deltaTime, this);
        }
        // Update boundary if it has an update method
        if (this.boundary.update) this.boundary.update(deltaTime, this);

        // Draw based on game state
        this.draw(this.accumulator / this.fixedTimeStep);

        // Continue game loop
        requestAnimationFrame(this.gameLoop);
    }

    updatePregameLogic(dt) {
        // Any pregame-specific logic that isn't physics/interaction based
        // For example: checking for game start conditions
    }

    updatePlayingLogic(dt) {
        // Update timer
        this.gameTime += dt;
        
        // Record mouse position for replay, with limit
        if (this.recordedFrames < this.MAX_RECORDED_FRAMES) {
            const index = this.recordedFrames * 2;
            this.recordedPositions[index] = Math.round(this.mousePos.x);
            this.recordedPositions[index + 1] = Math.round(this.mousePos.y);
            this.recordedFrames++;
        }
        
        // Check if all ducks are sorted
        if (this.checkAllDucksSorted()) {
            this.finalTime = this.gameTime;
            // Store replay data before ending game, but only if we didn't exceed the limit
            if (this.recordedFrames < this.MAX_RECORDED_FRAMES) {
                this.replayData = {
                    seed: this.currentSeed,
                    positions: this.recordedPositions.slice(0, this.recordedFrames * 2),
                    initialDogState: this.initialDogState
                };
            }
            this.endGame();
        }
    }

    checkAllDucksSorted() {
        // Return false if any duck is not sorted
        for (const duck of Duck.ducks) {
            if (!duck.isSorted) return false;
        }
        return Duck.ducks.length > 0;
    }

    updateGameoverLogic(dt) {
        // Gameover-specific logic
        // - High score updates
        // - Restart prompts
    }

    startReplay() {
        if (!this.replayData) return;
        
        // Reset game state for replay
        this.resetGame();
        this.state = GameState.REPLAY;
        this.replayFrame = 0;
        this.replayPaused = false;
        
        // Hide UI elements
        document.getElementById('seedControls').style.display = 'none';
        document.getElementById('resetButton').style.display = 'none';
        
        // Set the same seed to ensure identical setup
        this.setSeed(this.replayData.seed);
        
        // Remove pen and activate ducks (same as normal game start)
        this.objects = this.objects.filter(obj => !(obj instanceof Pen));
        this.objects.forEach(obj => {
            if (obj instanceof Duck) {
                obj.active = true;
            }
        });

        // Restore initial dog state
        if (this.dog && this.replayData.initialDogState) {
            const state = this.replayData.initialDogState;
            this.dog.pos = new Vector(state.position.x, state.position.y);
            this.dog.vel = new Vector(state.velocity.x, state.velocity.y);
            this.dog.target_pos = new Vector(state.targetPosition.x, state.targetPosition.y);
        }
    }

    updateReplayLogic(dt) {
        if (!this.replayData || this.replayPaused) return;
        
        // Increment replay frame
        if (this.replayFrame < this.recordedFrames) {
            this.replayFrame++;
        } else {
            this.endReplay();
        }
    }

    endReplay() {
        this.state = GameState.GAMEOVER;
        document.getElementById('resetButton').style.display = 'block';
    }

    draw(alpha) {
        // Clear canvas to transparency
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw boundary first
        this.boundary.draw(this.ctx);

        // Draw timer if in PLAYING or GAMEOVER state
        if (this.state === GameState.PLAYING || this.state === GameState.GAMEOVER) {
            const timeToShow = this.state === GameState.PLAYING ? this.gameTime : this.finalTime;
            const seconds = Math.floor(timeToShow).toString();
            
            this.ctx.save();
            this.ctx.globalAlpha = 0.2; // Make it somewhat transparent
            this.ctx.font = '140px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(seconds, this.canvas.width/2, this.canvas.height/2);
            this.ctx.restore();
        }

        // Draw all other objects
        for (const obj of this.objects) {
            if (obj.draw) obj.draw(this.ctx, alpha);
        }

        // Draw replay mouse cursor if in replay mode
        if (this.state === GameState.REPLAY && this.replayData && this.replayFrame < this.recordedFrames) {
            const index = this.replayFrame * 2;
            const x = this.replayData.positions[index];
            const y = this.replayData.positions[index + 1];
            const size = 10;  // Size of the cross
            
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            
            // Draw horizontal line
            this.ctx.beginPath();
            this.ctx.moveTo(x - size, y);
            this.ctx.lineTo(x + size, y);
            this.ctx.stroke();
            
            // Draw vertical line
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - size);
            this.ctx.lineTo(x, y + size);
            this.ctx.stroke();
        }

        // Draw state-specific UI
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 8;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        
        switch (this.state) {
            case GameState.PREGAME:
                // Draw title
                this.ctx.font = '48px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.strokeText('duck sorter', this.canvas.width/2, 100);
                this.ctx.fillText('duck sorter', this.canvas.width/2, 100);
                
                // Draw subtitle
                this.ctx.font = '24px Arial';
                this.ctx.strokeText('click anywhere to start', this.canvas.width/2, 140);
                this.ctx.fillText('click anywhere to start', this.canvas.width/2, 140);
                break;

            case GameState.PLAYING:
                this.ctx.textAlign = 'left';
                break;

            case GameState.REPLAY:
                this.ctx.textAlign = 'center';
                this.ctx.font = '24px Arial';
                const status = this.replayPaused ? 'PAUSED' : 'PLAYING';
                this.ctx.strokeText(`Replay: ${status}`, this.canvas.width/2, this.canvas.height - 40);
                this.ctx.fillText(`Replay: ${status}`, this.canvas.width/2, this.canvas.height - 40);
                this.ctx.font = '16px Arial';
                this.ctx.strokeText('Space: Pause/Resume', this.canvas.width/2, this.canvas.height - 20);
                this.ctx.fillText('Space: Pause/Resume', this.canvas.width/2, this.canvas.height - 20);
                break;

            case GameState.GAMEOVER:
                this.ctx.textAlign = 'center';
                this.ctx.font = '48px Arial';
                this.ctx.strokeText('good doggy!', this.canvas.width/2, 100);
                this.ctx.fillText('good doggy!', this.canvas.width/2, 100);
                this.ctx.strokeText('ducks sorted in', this.canvas.width/2, 160);
                this.ctx.fillText('ducks sorted in', this.canvas.width/2, 160);
                this.ctx.strokeText(`${this.finalTime.toFixed(3)} seconds`, this.canvas.width/2, 220);
                this.ctx.fillText(`${this.finalTime.toFixed(3)} seconds`, this.canvas.width/2, 220);
                
                this.ctx.font = '24px Arial';
                this.ctx.strokeText(`on seed: ${this.currentSeed}`, this.canvas.width/2, 280);
                this.ctx.fillText(`on seed: ${this.currentSeed}`, this.canvas.width/2, 280);
                break;
        }

        // Draw FPS counter and deltaTime (left-aligned)
        this.ctx.textAlign = 'left';
        this.ctx.font = '16px Arial';
        this.ctx.strokeText(`Updates/sec: ${this.currentFps}`, 10, this.canvas.height - 60);
        this.ctx.fillText(`Updates/sec: ${this.currentFps}`, 10, this.canvas.height - 60);
        this.ctx.strokeText(`Fixed Updates/sec: ${this.currentFixedFps}`, 10, this.canvas.height - 40);
        this.ctx.fillText(`Fixed Updates/sec: ${this.currentFixedFps}`, 10, this.canvas.height - 40);
        this.ctx.strokeText(`Fixed dt: ${this.fixedTimeStep.toFixed(4)}`, 10, this.canvas.height - 20);
        this.ctx.fillText(`Fixed dt: ${this.fixedTimeStep.toFixed(4)}`, 10, this.canvas.height - 20);
    }

    startGame() {
        // Hide UI elements
        document.getElementById('seedControls').style.display = 'none';
        document.getElementById('resetButton').style.display = 'none';
        
        // Reset timer
        this.gameTime = 0;
        
        // Clear replay data
        this.recordedFrames = 0;
        this.replayData = null;
        
        // Remove pen
        this.objects = this.objects.filter(obj => !(obj instanceof Pen));
        
        // Activate all ducks
        this.objects.forEach(obj => {
            if (obj instanceof Duck) {
                obj.active = true;
            }
        });

        // Store initial dog state
        const initialDogState = {
            position: new Vector(this.dog.pos.x, this.dog.pos.y),
            velocity: new Vector(this.dog.vel.x, this.dog.vel.y),
            targetPosition: new Vector(this.dog.target_pos.x, this.dog.target_pos.y)
        };

        // Store this for replay
        this.initialDogState = initialDogState;

        this.state = GameState.PLAYING;
    }

    endGame() {
        // Show reset button
        document.getElementById('resetButton').style.display = 'block';
        // Show replay button if we have replay data
        document.getElementById('replayBtn').style.display = this.replayData ? 'block' : 'none';
        this.state = GameState.GAMEOVER;
    }

    resetGame() {
        // Show/hide UI elements
        document.getElementById('seedControls').style.display = 'block';
        document.getElementById('resetButton').style.display = 'none';
        
        // Remove all ducks and the pen
        this.objects = this.objects.filter(obj => !(obj instanceof Duck || obj instanceof Pen));
        Duck.ducks = []; // Clear static ducks array
        
        // Recreate the pen
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const penRadius = 128;
        this.pen = this.addObject(new Pen(centerX, centerY, penRadius));
        
        // Reset RNG to initial state and regenerate ducks
        this.resetRNG();
        this.regenerateDucks();
        
        this.state = GameState.PREGAME;
    }

    addObject(obj) {
        this.objects.push(obj);
        return obj;
    }


}

// Initialize game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
}); 
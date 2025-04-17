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
    GAMEOVER: 'GAMEOVER'
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
        this.currentSeed = ''; // Cache the current seed value
        this.rng = null;
        
        // Add seed input UI
        document.body.insertAdjacentHTML('beforeend', seedInputHTML);
        this.setupSeedControls();
        this.setupKeyboardControls();
        
        // Fixed update settings
        this.fixedTimeStep = 1 / 60; // 60 updates per second (in seconds)
        this.accumulator = 0;
        this.lastTime = performance.now() / 1000; // Convert to seconds
        
        // FPS tracking
        this.fixedUpdatesThisSecond = 0;
        this.lastFpsUpdate = this.lastTime;
        this.currentFps = 0;
        
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
            
            // Calculate mouse position relative to canvas, even when outside
            let mouseX = e.clientX - rect.left;
            let mouseY = e.clientY - rect.top;
            
            this.mousePos = new Vector(mouseX, mouseY);
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

    regenerateDucks() {
        // Remove existing ducks
        this.objects = this.objects.filter(obj => !(obj instanceof Duck));
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const spawnRadius = 128; // Same as pen radius

        // Create ducks with specific colors (4 each of cyan, magenta, and yellow)
        const colors = ['#00ffff', '#ff00ff', '#ffff00']; // cyan, magenta, yellow
        
        for (let colorIndex = 0; colorIndex < colors.length; colorIndex++) {
            for (let i = 0; i < 4; i++) {
                // Use seeded RNG for position
                const angle = this.rng() * Math.PI * 2;
                const radius = Math.sqrt(this.rng()) * spawnRadius;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                
                const duck = new Duck(x, y);
                duck.color = colors[colorIndex];
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
            this.currentFps = this.fixedUpdatesThisSecond;
            this.fixedUpdatesThisSecond = 0;
            this.lastFpsUpdate = currentTime / 1000;
        }

        // Add to accumulator
        this.accumulator += deltaTime;

        // Clear canvas to transparency
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw boundary first
        this.boundary.draw(this.ctx);

        // Run fixed updates based on game state
        if (this.accumulator >= this.fixedTimeStep) {
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
                case GameState.GAMEOVER:
                    this.updateGameoverLogic(this.fixedTimeStep);
                    break;
            }
            
            this.fixedUpdatesThisSecond++;
            this.accumulator -= this.fixedTimeStep;
        }

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
        // Game-specific logic like:
        // - Score tracking
        // - Win/loss conditions
        // - Timer updates
    }

    updateGameoverLogic(dt) {
        // Gameover-specific logic
        // - High score updates
        // - Restart prompts
    }

    draw(alpha) {
        // Draw all objects
        for (const obj of this.objects) {
            if (obj.draw) obj.draw(this.ctx, alpha);
        }

        // Draw state-specific UI
        this.ctx.fillStyle = 'white';
        
        switch (this.state) {
            case GameState.PREGAME:
                // Draw title
                this.ctx.font = '48px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('duck sorter', this.canvas.width/2, 100);
                
                // Draw subtitle
                this.ctx.font = '24px Arial';
                this.ctx.fillText('click anywhere to start', this.canvas.width/2, 140);
                
                break;
            case GameState.PLAYING:
                // Reset text alignment for other states
                this.ctx.textAlign = 'left';
                // Draw game UI (score, time, etc)
                break;
            case GameState.GAMEOVER:
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Game Over!', this.canvas.width/2, 100);
                break;
        }

        // Draw FPS counter and deltaTime (left-aligned)
        this.ctx.textAlign = 'left';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Fixed Updates/sec: ${this.currentFps}`, 10, this.canvas.height - 40);
        this.ctx.fillText(`Fixed dt: ${this.fixedTimeStep.toFixed(4)}`, 10, this.canvas.height - 20);
    }

    startGame() {
        // Hide seed controls
        document.getElementById('seedControls').style.display = 'none';
        
        // Remove pen
        this.objects = this.objects.filter(obj => !(obj instanceof Pen));
        
        // Activate all ducks
        this.objects.forEach(obj => {
            if (obj instanceof Duck) {
                obj.active = true;
            }
        });

        this.state = GameState.PLAYING;
    }

    endGame() {
        this.state = GameState.GAMEOVER;
        // Additional game end logic here
    }

    resetGame() {
        // Show seed controls
        document.getElementById('seedControls').style.display = 'block';
        
        // Remove all ducks and the pen
        this.objects = this.objects.filter(obj => !(obj instanceof Duck || obj instanceof Pen));
        
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
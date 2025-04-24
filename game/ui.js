import { GameState } from './game.js';
import { getDailySeed } from '../engine/utils.js';
import { Vector } from '../engine/vector.js';
export class GameUI {
    constructor(game) {
        this.game = game;
        this.seedInput = null;
        this.randomSeedBtn = null;
        this.dailySeedBtn = null;
        this.resetButton = null;
        this.resetBtn = null;
        this.replayBtn = null;
        
        this.setupUIElements();
        this.setupEventListeners();
    }

    setupUIElements() {
        // Add UI elements to the document
        document.body.insertAdjacentHTML('beforeend', this.getSeedInputHTML());
        document.body.insertAdjacentHTML('beforeend', this.getResetButtonHTML());
        
        // Cache references to UI elements
        this.seedInput = document.getElementById('seedInput');
        this.randomSeedBtn = document.getElementById('randomSeedBtn');
        this.dailySeedBtn = document.getElementById('dailySeedBtn');
        this.resetButton = document.getElementById('resetButton');
        this.resetBtn = document.getElementById('resetBtn');
        this.replayBtn = document.getElementById('replayBtn');
    }

    setupEventListeners() {
        // Helper function to handle both click and touch events
        const addButtonHandler = (element, handler) => {
            element.addEventListener('click', handler);
            element.addEventListener('touchend', (e) => {
                e.preventDefault(); // Prevent any default touch behavior
                handler();
            }, { passive: false });
        };

        // Seed controls
        addButtonHandler(this.randomSeedBtn, () => {
            this.game.setSeed(Math.random().toString(36).substring(2, 15));
        });
        
        addButtonHandler(this.dailySeedBtn, () => {
            this.game.setSeed(getDailySeed());
        });
        
        this.seedInput.addEventListener('input', (e) => {
            this.game.setSeed(e.target.value);
        });
        
        // Reset and replay buttons
        addButtonHandler(this.resetBtn, () => {
            this.game.resetGame();
        });
        
        addButtonHandler(this.replayBtn, () => {
            this.game.startReplay();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key.toLowerCase() === 'r') {
                this.game.resetGame();
            }
            if (e.key.toLowerCase() === 'f' && this.game.state === GameState.PLAYING) {
                this.game.finalTime = this.game.gameTime;
                this.game.endGame();
            }
            
            if (this.game.state === GameState.GAMEOVER && e.key.toLowerCase() === 'p') {
                this.game.startReplay();
            }
            if (this.game.state === GameState.REPLAY && e.key === ' ') {
                this.game.replayManager.togglePause();
            }
        });
    }

    getSeedInputHTML() {
        return `
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
    }

    getResetButtonHTML() {
        return `
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
    }

    updateSeedInput(value) {
        this.seedInput.value = value;
    }

    showSeedControls() {
        document.getElementById('seedControls').style.display = 'block';
    }

    hideSeedControls() {
        document.getElementById('seedControls').style.display = 'none';
    }

    showResetButton() {
        this.resetButton.style.display = 'block';
    }

    hideResetButton() {
        this.resetButton.style.display = 'none';
    }

    showReplayButton() {
        this.replayBtn.style.display = 'block';
    }

    hideReplayButton() {
        this.replayBtn.style.display = 'none';
    }

    draw(alpha) {
        const ctx = this.game.engine.ctx;
        
        // Draw timer if in PLAYING or GAMEOVER state
        if (this.game.state === GameState.PLAYING || this.game.state === GameState.GAMEOVER) {
            const timeToShow = this.game.state === GameState.PLAYING ? this.game.gameTime : this.game.finalTime;
            const seconds = Math.floor(timeToShow).toString();
            
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.font = '140px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(seconds, this.game.engine.canvas.width/2, this.game.engine.canvas.height/2);
            ctx.restore();
        }

        // Draw replay cursor and UI
        this.game.replayManager.drawReplayCursor(ctx);
        this.game.replayManager.drawReplayUI(ctx);

        // Draw state-specific UI
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        switch (this.game.state) {
            case GameState.PREGAME:
                this.drawPregameUI();
                break;
            case GameState.GAMEOVER:
                this.drawGameoverUI();
                break;
        }

        // Draw FPS counter
        this.drawFPS();
    }

    drawPregameUI() {
        const ctx = this.game.engine.ctx;
        var pos = new Vector(this.game.engine.canvas.width/2, 150);
        this.drawText('duck sorter', pos, 48, 'white', 'center');
    }

    drawGameoverUI() {
        const ctx = this.game.engine.ctx;
		var pos = new Vector(this.game.engine.canvas.width/2, 100);
        this.drawText('good doggy!', pos, 48, 'white', 'center');
		pos.y += 60;
        this.drawText('ducks sorted in', pos, 30, 'white', 'center');
        pos.y += 40;
        this.drawText(`${this.game.finalTime.toFixed(3)} seconds`, pos, 30, 'white', 'center');
        pos.y += 40;
        this.drawText(`on seed: ${this.game.currentSeed}`, pos, 20, 'white', 'center');
    }

    drawFPS() {
        this.drawText(
			`Updates/sec: ${this.game.engine.currentFps}
Fixed Updates/sec: ${this.game.engine.currentFixedFps}
Fixed dt: ${this.game.engine.fixedTimeStep.toFixed(4)}`, 
			new Vector(0,0),16,'white','left');
    }

	drawText(text, pos, size, color = 'white', align = 'left') {
		const ctx = this.game.engine.ctx;
		ctx.font = `${size}px Arial`;
		ctx.fillStyle = color;
		ctx.strokeStyle = 'black';
		ctx.textAlign = align;
		ctx.textBaseline = 'top';
		
		// Split text into lines and draw each line
		const lines = text.split('\n');
		const lineHeight = size * 1.2; // Add some spacing between lines
		
		lines.forEach((line, index) => {
			const y = pos.y + (index * lineHeight);
			ctx.strokeText(line, pos.x, y);
			ctx.fillText(line, pos.x, y);
		});
	}

} 
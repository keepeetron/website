import { GameState } from './game.js';
import { Vector } from '../engine/vector.js';
import { Duck } from './duck.js';

export class ReplayManager {
    constructor(game) {
        this.game = game;
        this.MAX_RECORDED_FRAMES = 18000; // 5 minutes at 60fps
        this.recordedPositions = new Int16Array(this.MAX_RECORDED_FRAMES * 2); // x,y pairs
        this.recordedFrames = 0;
        this.replayFrame = 0;
        this.replayData = null;
        this.replayPaused = false;
        this.initialDogState = null;
    }

    startRecording() {
        this.recordedFrames = 0;
        this.replayData = null;
        this.initialDogState = {
            position: new Vector(this.game.dog.pos.x, this.game.dog.pos.y),
            velocity: new Vector(this.game.dog.vel.x, this.game.dog.vel.y),
            targetPosition: new Vector(this.game.dog.target_pos.x, this.game.dog.target_pos.y)
        };
    }

    recordFrame(mouseX, mouseY) {
        if (this.recordedFrames < this.MAX_RECORDED_FRAMES) {
            const index = this.recordedFrames * 2;
            this.recordedPositions[index] = Math.round(mouseX);
            this.recordedPositions[index + 1] = Math.round(mouseY);
            this.recordedFrames++;
        }
    }

    saveReplay() {
        if (this.recordedFrames < this.MAX_RECORDED_FRAMES) {
            this.replayData = {
                seed: this.game.currentSeed,
                positions: this.recordedPositions.slice(0, this.recordedFrames * 2),
                initialDogState: this.initialDogState
            };
        }
    }

    startReplay() {
        if (!this.replayData) return;
        
        this.game.resetGame();
        this.game.state = GameState.REPLAY;
        this.replayFrame = 0;
        this.replayPaused = false;
        
        this.game.ui.hideSeedControls();
        this.game.ui.hideResetButton();
        
        this.game.setSeed(this.replayData.seed);
        
        this.game.pen = null;
        for (const duck of Duck.ducks) {
            duck.active = true;
        }

        if (this.game.dog && this.replayData.initialDogState) {
            const state = this.replayData.initialDogState;
            this.game.dog.pos = new Vector(state.position.x, state.position.y);
            this.game.dog.vel = new Vector(state.velocity.x, state.velocity.y);
            this.game.dog.target_pos = new Vector(state.targetPosition.x, state.targetPosition.y);
        }
    }

    endReplay() {
        this.game.state = GameState.GAMEOVER;
        this.game.ui.showResetButton();
    }

    updateReplay(dt) {
        if (!this.replayData || this.replayPaused) return;
        
        // Update dog's target position based on replay data
        if (this.game.dog && this.replayFrame < this.recordedFrames) {
            const index = this.replayFrame * 2;
            const x = this.replayData.positions[index];
            const y = this.replayData.positions[index + 1];
            this.game.dog.target_pos = new Vector(x, y);
        }
        
        if (this.replayFrame < this.recordedFrames) {
            this.replayFrame++;
        } else {
            this.endReplay();
        }
    }

    drawReplayCursor(ctx) {
        if (this.game.state === GameState.REPLAY && this.replayData && this.replayFrame < this.recordedFrames) {
            const index = this.replayFrame * 2;
            const x = this.replayData.positions[index];
            const y = this.replayData.positions[index + 1];
            const size = 10;
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(x - size, y);
            ctx.lineTo(x + size, y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x, y + size);
            ctx.stroke();
        }
    }

    drawReplayUI(ctx) {
        if (this.game.state === GameState.REPLAY) {
            ctx.textAlign = 'center';
            ctx.font = '24px Arial';
            const status = this.replayPaused ? 'PAUSED' : 'PLAYING';
            ctx.strokeText(`Replay: ${status}`, this.game.engine.canvas.width/2, this.game.engine.canvas.height - 40);
            ctx.fillText(`Replay: ${status}`, this.game.engine.canvas.width/2, this.game.engine.canvas.height - 40);
            ctx.font = '16px Arial';
            ctx.strokeText('Space: Pause/Resume', this.game.engine.canvas.width/2, this.game.engine.canvas.height - 20);
            ctx.fillText('Space: Pause/Resume', this.game.engine.canvas.width/2, this.game.engine.canvas.height - 20);
        }
    }

    togglePause() {
        this.replayPaused = !this.replayPaused;
    }
} 
import { GameLoop } from './game/GameLoop.js';
import { Renderer } from './game/Renderer.js';
import { GameState } from './game/GameState.js';
import { Input } from './game/Input.js';
import { Collision } from './game/Collision.js';
import { Background } from './game/Background.js';

// 入口：挂载 Canvas 并启动空主循环骨架。
// 阶段 0 仅建立工程结构与循环骨架，玩法内容在后续阶段填充。
const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const gameState = new GameState();
const input = new Input(canvas);
const background = new Background(canvas);
const collision = new Collision();

const gameLoop = new GameLoop({ renderer, gameState, input, background, collision });
gameLoop.start();

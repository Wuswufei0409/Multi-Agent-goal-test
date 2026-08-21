import { GameLoop } from './game/GameLoop.js';
import { Renderer } from './game/Renderer.js';
import { GameState } from './game/GameState.js';
import { Input } from './game/Input.js';
import { Collision } from './game/Collision.js';
import { Background } from './game/Background.js';

// 入口：挂载 Canvas，建立单一星空实例并注入 Renderer/GameLoop，启动主循环。
// 阶段 1：主循环 + 状态机（Ready/Playing/GameOver）+ 滚动星空背景。
const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const gameState = new GameState();
const input = new Input(canvas);
const collision = new Collision();
const background = new Background(renderer.width, renderer.height);

const gameLoop = new GameLoop({ renderer, gameState, input, background, collision });
gameLoop.start();

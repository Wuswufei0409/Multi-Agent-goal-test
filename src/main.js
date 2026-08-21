import { GameLoop } from './game/GameLoop.js';
import { Renderer } from './game/Renderer.js';
import { GameState } from './game/GameState.js';
import { Input } from './game/Input.js';
import { Collision } from './game/Collision.js';
import { Background } from './game/Background.js';
import { Player } from './game/entities/Player.js';

// 入口：挂载 Canvas，建立单一星空/玩家实例并注入 Renderer/GameLoop，启动主循环。
// 阶段 1：主循环 + 状态机（Ready/Playing/GameOver）+ 滚动星空背景。
// 阶段 2：玩家实体与输入（键盘方向键/WASD + 鼠标·触屏拖拽跟随）。
const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const gameState = new GameState();
const input = new Input(canvas);
const collision = new Collision();
const background = new Background(renderer.width, renderer.height);
const player = new Player();
player.reset(renderer.width, renderer.height);

// 星空与玩家同时注入 Renderer（绘制）与 GameLoop（更新），保证唯一实例，
// 避免 Renderer.render() 里 this.background.draw() 拿到 null 而在浏览器运行时崩溃。
renderer.background = background;
renderer.player = player;

const gameLoop = new GameLoop({ renderer, gameState, input, background, collision, player });
gameLoop.start();

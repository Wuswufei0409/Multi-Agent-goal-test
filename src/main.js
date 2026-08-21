import { GameLoop } from './game/GameLoop.js';
import { Renderer } from './game/Renderer.js';
import { GameState } from './game/GameState.js';
import { Input } from './game/Input.js';
import { Collision } from './game/Collision.js';
import { Background } from './game/Background.js';
import { Player } from './game/entities/Player.js';
import { ParticleSystem } from './game/ParticleSystem.js';

// 入口：挂载 Canvas，建立单一星空/玩家/粒子实例并注入 Renderer/GameLoop，启动主循环。
// 阶段 1：主循环 + 状态机（Ready/Playing/GameOver）+ 滚动星空背景。
// 阶段 2：玩家实体与输入（键盘方向键/WASD + 鼠标·触屏拖拽跟随）。
// 阶段 3：射击（自动）、敌机持续生成与移动、子弹-敌机 / 敌机-玩家碰撞结算、加分与命尽游戏结束。
// 阶段 4：计分（浮动得分/最高分）、生命（受击无敌）、波次推进与奖励、爆炸粒子。
const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const gameState = new GameState();
const input = new Input(canvas);
const collision = new Collision();
const background = new Background(renderer.width, renderer.height);
const player = new Player();
player.reset(renderer.width, renderer.height);
// 阶段 4：粒子系统单一实例，注入 Renderer（绘制）与 GameLoop（更新）。
const particles = new ParticleSystem();

// 星空与玩家同时注入 Renderer（绘制）与 GameLoop（更新），保证唯一实例，
// 避免 Renderer.render() 里 this.background.draw() 拿到 null 而在浏览器运行时崩溃。
renderer.background = background;
renderer.player = player;
renderer.particles = particles;

const gameLoop = new GameLoop({ renderer, gameState, input, background, collision, player, particles });

// 子弹/敌机集合由 GameLoop 管理，注入 Renderer 绘制，保证同一份状态不被重复实例化。
renderer.bullets = gameLoop.bullets;
renderer.enemies = gameLoop.enemies;
// 浮动得分文字由 GameLoop 产生，Renderer 读取同一份集合绘制。
renderer.floatingTexts = gameLoop.floatingTexts;
renderer.gameLoop = gameLoop; // Renderer 读取波次横幅等 HUD 状态

gameLoop.start();

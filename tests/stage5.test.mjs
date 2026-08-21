// stage5.test.mjs — 阶段5：结算与重开闭环 + HUD 单元测试。
// 覆盖：统一 reset() 重建（resetForNewGame / clearField）、结算→重开完整闭环
// （分数/命数/波次/玩家/实体/粒子全复位）、最高分跨局保留、GAME_OVER 结算面板渲染不抛错。
import { GameLoop } from '../src/game/GameLoop.js';
import { GameState, GamePhase } from '../src/game/GameState.js';
import { Player } from '../src/game/entities/Player.js';
import { Enemy } from '../src/game/entities/Enemy.js';
import { Bullet } from '../src/game/entities/Bullet.js';
import { Collision } from '../src/game/Collision.js';
import { Renderer } from '../src/game/Renderer.js';

globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {} };
globalThis.performance = globalThis.performance || { now: () => 0 };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log('  ✅', name); }
  else { failed++; console.log('  ❌', name); }
}

function makeLoop(overrides = {}) {
  const gameState = new GameState();
  const player = new Player();
  const renderer = { width: 800, height: 600, render() {} };
  // 可控制点击/按键的输入桩。
  const input = {
    space: false, click: false,
    isDown: () => input.space,
    consumeClick: () => { const v = input.click; input.click = false; return v; },
    pointerActive: false, pointerX: 0, pointerY: 0,
    getMoveIntent: () => ({ x: 0, y: 0 }),
  };
  const background = { update() {} };
  const loop = new GameLoop({ renderer, gameState, input, background, collision: new Collision(), player });
  return Object.assign(loop, overrides, { _input: input });
}

console.log('GameState — start() 统一重置计分/命/波次（成局数据清零）');
{
  const gs = new GameState();
  gs.addScore(50); gs.lives = 1; gs.wave = 4; gs.phaseTime = 3;
  gs.start();
  assert(gs.phase === GamePhase.PLAYING, 'start 进入 PLAYING');
  assert(gs.score === 0, `score 归零 (${gs.score})`);
  assert(gs.lives === 3, `lives 复位 3 (${gs.lives})`);
  assert(gs.wave === 1, `wave 复位 1 (${gs.wave})`);
  assert(gs.phaseTime === 0, 'phaseTime 归零');
}

console.log('GameLoop — resetForNewGame() 统一重建场上与节奏');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.bullets.push(new Bullet({ x: 100, y: 100 }));
  loop.enemies.push(new Enemy({ speed: 100 }));
  loop.particles.burst(200, 200, { count: 5 });
  loop.floatingTexts.push({ active: true, text: '+10' });
  loop.shootCooldown = 0.3; loop.spawnCooldown = 0.2;
  const px = loop.player.x, py = loop.player.y;
  loop.player.x = 10; loop.player.y = 10; // 人为挪走玩家
  loop.resetForNewGame();
  assert(loop.bullets.length === 0, 'reset 清空子弹');
  assert(loop.enemies.length === 0, 'reset 清空敌机');
  assert(loop.particles.particles.length === 0, 'reset 清空粒子');
  assert(loop.floatingTexts.length === 0, 'reset 清空浮动文字');
  assert(loop.player.x === px && loop.player.y === py, 'reset 玩家回到初始位置');
  assert(loop.player.alive === true, 'reset 玩家存活');
  assert(loop.shootCooldown === 0, 'reset 射击冷却归零');
  assert(loop.spawnCooldown > 0 && loop.spawnCooldown <= loop.spawnInterval, 'reset 重置敌机生成倒计时');
}

console.log('GameLoop — clearField() 离开游玩的统一清空');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.bullets.push(new Bullet({ x: 100, y: 100 }));
  loop.enemies.push(new Enemy({ speed: 100 }));
  loop.particles.burst(200, 200, { count: 5 });
  loop.floatingTexts.push({ active: true, text: '+10' });
  loop.waveBannerTimer = 1.5; loop.waveBannerText = '波次 2';
  loop.clearField();
  assert(loop.bullets.length === 0, 'clearField 清空子弹');
  assert(loop.enemies.length === 0, 'clearField 清空敌机');
  assert(loop.particles.particles.length === 0, 'clearField 清空粒子');
  assert(loop.floatingTexts.length === 0, 'clearField 清空浮动文字');
  assert(loop.waveBannerTimer === 0 && loop.waveBannerText === '', 'clearField 清除波次横幅');
}

console.log('GameState — GAME_OVER → backToReady → start 重开闭环');
{
  const gs = new GameState();
  gs.score = 80; gs.lives = 0; gs.wave = 3; gs.highScore = 80;
  gs.transition(GamePhase.GAME_OVER);
  assert(gs.phase === GamePhase.GAME_OVER, '已进入结算');
  gs.backToReady();
  assert(gs.phase === GamePhase.READY, 'backToReady 回到就绪');
  gs.start();
  assert(gs.phase === GamePhase.PLAYING, '重新开始进入 PLAYING');
  assert(gs.score === 0 && gs.wave === 1 && gs.lives === 3, `重开后计分复位 (s=${gs.score},w=${gs.wave},l=${gs.lives})`);
  assert(gs.highScore === 80, `最高分跨局保留 (${gs.highScore})`);
}

console.log('GameLoop — 结算界面重开：GAME_OVER + 点击 → PLAYING 场上全复位');
{
  const loop = makeLoop();
  const gs = loop.gameState;
  // 构造一场已打出分数/命尽进入结算的场景。
  gs.start();
  gs.addScore(120);
  gs.lives = 0;
  gs.wave = 2;
  loop.bullets.push(new Bullet({ x: 100, y: 100 }));
  loop.enemies.push(new Enemy({ speed: 100 }));
  loop.particles.burst(300, 300, { count: 8 });
  gs.gameOver();
  assert(gs.phase === GamePhase.GAME_OVER, '已进入结算');
  // 玩家点击「重新开始」。
  loop._input.click = true;
  loop.update(0.016);
  assert(gs.phase === GamePhase.PLAYING, '点击后重开进入 PLAYING');
  assert(gs.score === 0 && gs.lives === 3 && gs.wave === 1, `重开后计分复位 (s=${gs.score},l=${gs.lives},w=${gs.wave})`);
  assert(loop.enemies.length === 0, '重开后场上敌机清空（无残留）');
  // 重开首帧自动射击会立刻从机头发一枚新子弹；旧帧残留子弹(100,100)必须已被重置移除。
  assert(!loop.bullets.some((b) => b.x === 100 && b.y === 100), '重开后无旧帧残留子弹');
  assert(loop.particles.particles.length === 0 && loop.floatingTexts.length === 0, '重开后粒子/浮动文字清空');
  assert(gs.highScore === 120, `重开后最高分保留 (${gs.highScore})`);
}

console.log('GameLoop — 结算界面空格重开同样复位');
{
  const loop = makeLoop();
  const gs = loop.gameState;
  gs.start();
  gs.addScore(60); gs.lives = 0;
  gs.gameOver();
  loop._input.space = true;
  loop.update(0.016);
  loop._input.space = false;
  assert(gs.phase === GamePhase.PLAYING, '空格重开进入 PLAYING');
  assert(gs.score === 0, `空格重开后分数归零 (${gs.score})`);
}

console.log('Renderer — GAME_OVER 结算面板渲染不抛错（含按钮/数据/圆角）');
{
  const ctx = {
    save() {}, restore() {}, setTransform() {},
    createLinearGradient() { return { addColorStop() {} }; },
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {},
    fill() {}, stroke() {}, ellipse() {}, translate() {},
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    font: '', textAlign: '', textBaseline: '', fillText() {},
  };
  const canvas = {
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    addEventListener() {}, removeEventListener() {},
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    style: {}, width: 800, height: 600,
  };
  const background = { draw() {}, resize() {} };
  const renderer = new Renderer(canvas, background);
  renderer.player = new Player();
  renderer.particles = { draw() {} };
  renderer.floatingTexts = [];
  const gs = new GameState();
  gs.score = 120; gs.highScore = 200; gs.lives = 0; gs.wave = 3;
  gs.transition(GamePhase.GAME_OVER);
  let threw = null;
  try { renderer.render(gs, 0.016); } catch (e) { threw = e; }
  assert(threw === null, 'GAME_OVER 结算面板渲染未抛错');
}

console.log('Renderer — READY→PLAYING HUD 数据读取正确（分数/生命/波次）');
{
  const ctx = {
    save() {}, restore() {}, setTransform() {},
    createLinearGradient() { return { addColorStop() {} }; },
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {},
    fill() {}, stroke() {}, ellipse() {}, translate() {},
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    font: '', textAlign: '', textBaseline: '', fillText() {},
  };
  const canvas = {
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    addEventListener() {}, removeEventListener() {},
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    style: {}, width: 800, height: 600,
  };
  const renderer = new Renderer(canvas, { draw() {}, resize() {} });
  renderer.player = new Player();
  renderer.particles = { draw() {} };
  renderer.floatingTexts = [];
  renderer.enemies = [];
  const gs = new GameState();
  gs.start();
  gs.score = 45; gs.lives = 2; gs.wave = 3;
  let threw = null;
  try { renderer.render(gs, 0.016); } catch (e) { threw = e; }
  assert(threw === null, 'PLAYING HUD 渲染未抛错');
}

console.log('\n结果:', passed, 'passed,', failed, 'failed');
process.exit(failed ? 1 : 0);

// stage4.test.mjs — 阶段4：计分、生命、波次与爆炸粒子 单元测试。
import { Player } from '../src/game/entities/Player.js';
import { Particle } from '../src/game/entities/Particle.js';
import { ParticleSystem } from '../src/game/ParticleSystem.js';
import { FloatingText } from '../src/game/FloatingText.js';
import { WaveManager } from '../src/game/WaveManager.js';
import { Collision } from '../src/game/Collision.js';
import { GameLoop } from '../src/game/GameLoop.js';
import { GameState, GamePhase } from '../src/game/GameState.js';
import { Enemy } from '../src/game/entities/Enemy.js';
import { Bullet } from '../src/game/entities/Bullet.js';

globalThis.window = globalThis.window || { addEventListener(){}, removeEventListener(){} };
globalThis.performance = globalThis.performance || { now: () => 0 };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log('  ✅', name); }
  else { failed++; console.log('  ❌', name); }
}
function near(a, b, eps = 0.5) { return Math.abs(a - b) <= eps; }

function makeLoop(overrides = {}) {
  const gameState = new GameState();
  const player = new Player();
  const renderer = { width: 800, height: 600, render() {} };
  const input = {
    isDown: () => false, consumeClick: () => false, pointerActive: false,
    pointerX: 0, pointerY: 0, getMoveIntent: () => ({ x: 0, y: 0 }),
  };
  const background = { update() {} };
  const loop = new GameLoop({ renderer, gameState, input, background, collision: new Collision(), player });
  return Object.assign(loop, overrides);
}

console.log('Player — 受击无敌');
{
  const p = new Player();
  p.reset(800, 600);
  assert(p.isInvulnerable() === false, '初始不无敌');
  p.takeHit();
  assert(p.isInvulnerable() === true, '受击后进入无敌');
  p.updateInvuln(0.7);
  assert(p.isInvulnerable() === true, '无敌期内仍无敌');
  p.updateInvuln(0.8);
  assert(p.isInvulnerable() === false, '无敌计时结束恢复');
  p.reset(800, 600);
  assert(p.isInvulnerable() === false, 'reset 清除无敌');
}

console.log('GameLoop — 命中加分走 addScore 并同步最高分');
{
  const loop = makeLoop();
  const gs = loop.gameState;
  gs.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  const b = new Bullet({ x: 400, y: 200 });
  const e = new Enemy({ speed: 100 });
  e.x = 400; e.y = 200;
  loop.bullets.push(b); loop.enemies.push(e);
  loop.update(0.016);
  assert(gs.score === 10, `命中 +10 分 (${gs.score})`);
  assert(gs.highScore === 10, `最高分同步为 ${gs.highScore}`);
}

console.log('ParticleSystem — 爆发/更新/回收/清空');
{
  const ps = new ParticleSystem();
  ps.burst(100, 100, { count: 20, speed: 100, life: 0.5 });
  assert(ps.particles.length === 20, `burst 生成 20 粒子 (${ps.particles.length})`);
  const p0 = ps.particles[0];
  p0.life = 0.01;
  ps.update(0.1);
  assert(ps.particles.length < 20, '生命周期结束粒子被回收');
  ps.burst(200, 200, { count: 5 });
  const before = ps.particles.length;
  ps.clear();
  assert(ps.particles.length === 0, 'clear 清空全部粒子');
  void before;
}

console.log('Particle — 位移/重力/衰减');
{
  const p = new Particle({ x: 0, y: 0, vx: 10, vy: -20, gravity: 100, life: 2 });
  p.update(1);
  assert(near(p.x, 10, 1) && near(p.y, 80, 1), `粒子位移含重力 (x=${p.x.toFixed(0)},y=${p.y.toFixed(0)})`);
  assert(p.active === true, '存活期内 active');
  const p2 = new Particle({ life: 0.001 });
  p2.update(0.1);
  assert(p2.active === false, '生命周期耗尽 inactive');
}

console.log('FloatingText — 上飘/淡出/回收');
{
  const t = new FloatingText({ text: '+10', life: 1 });
  t.place(100, 100);
  const sy = t.y;
  t.update(0.2);
  assert(t.y < sy, `上飘 (${(sy - t.y).toFixed(1)})`);
  assert(t.active === true, '存活期内 active');
  const t2 = new FloatingText({ life: 0.001 });
  t2.update(0.1);
  assert(t2.active === false, '生命周期耗尽 inactive');
}

console.log('WaveManager — 配额/生成/清空/推进');
{
  const wm = new WaveManager();
  assert(wm.wave === 1 && wm.size === 6, `波1 配额 6 (${wm.size})`);
  assert(wm.canSpawn() === true, '开局可生成');
  wm.markSpawned();
  wm.markSpawned();
  wm.markSpawned();
  wm.markSpawned();
  wm.markSpawned();
  wm.markSpawned();
  assert(wm.canSpawn() === false, '配额满则不再生成');
  assert(wm.isWaveCleared() === false, '场上未清不判完成');
  for (let i = 0; i < 6; i++) wm.markGone();
  assert(wm.isWaveCleared() === true, '配额满且场上清空 → 波次完成');
  wm.beginIntermission();
  assert(wm.intermission > 0, '进入波次间过渡');
  let done = false;
  for (let i = 0; i < 100 && !done; i++) done = wm.update(0.02);
  assert(done === true, '过渡倒计时结束');
  wm.nextWave();
  assert(wm.wave === 2 && wm.size === 8, `推进到波2 配额 8 (${wm.size})`);
  assert(wm.spawned === 0 && wm.remaining === 0, '新波计数复位');
}

console.log('GameLoop — 受击无敌期忽略敌机碰撞（不连续扣命）');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  const e = new Enemy({ speed: 100 });
  e.x = loop.player.x; e.y = loop.player.y;
  loop.enemies.push(e);
  loop.gameState.lives = 2;
  loop.player.takeHit();
  loop.update(0.016);
  assert(loop.gameState.lives === 2, `无敌期碰撞不扣命 (lives=${loop.gameState.lives})`);
}

console.log('GameLoop — 击毁敌机产生爆炸粒子与浮动得分');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  const b = new Bullet({ x: 400, y: 200 });
  const e = new Enemy({ speed: 100 });
  e.x = 400; e.y = 200;
  loop.bullets.push(b); loop.enemies.push(e);
  loop.update(0.016);
  assert(loop.particles.particles.length > 0, `击毁产生爆炸粒子 (${loop.particles.particles.length})`);
  assert(loop.floatingTexts.length === 1, `产生一条浮动得分 (+${loop.enemyScore})`);
  assert(loop.floatingTexts[0].text === `+${loop.enemyScore}`, `浮动文本为 +${loop.enemyScore}`);
}

console.log('GameLoop — 波次清空发放奖励并推进下一波');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; // 关射击，专注敌机波次
  loop.spawnCooldown = 0;
  const wm = loop.waveManager;
  // 直接把波1填满并清空场上，模拟一波快速打完。
  wm.spawned = wm.size;
  wm.remaining = 0;
  const bonusBefore = loop.gameState.score;
  loop.update(0.016);
  assert(loop.gameState.score === bonusBefore + loop.waveBonus * 1, `波次奖励 +${loop.waveBonus}`);
  // 多次推进过渡至下一波。
  let advanced = false;
  for (let i = 0; i < 200 && !advanced; i++) { loop.update(0.02); advanced = wm.wave !== 1; }
  assert(wm.wave === 2, `过渡后进入波2 (${wm.wave})`);
  assert(loop.gameState.wave === 2, 'GameState.wave 同步为 2');
  assert(loop.waveBannerText === '波次 2', `波次横幅显示“波次 2”`);
}

console.log('GameLoop — 波内敌机生成受配额限制');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100;
  loop.spawnCooldown = 0;
  const wm = loop.waveManager;
  for (let i = 0; i < 200; i++) loop.update(0.02);
  // 波1配额 6，即使持续 update 也不应超出配额太多（场上受 maxEnemies 保护）。
  assert(wm.spawned <= wm.size, `本波生成不超过配额 (spawned=${wm.spawned}, size=${wm.size})`);
}

console.log('GameState — addScore 与最高分');
{
  const gs = new GameState();
  gs.addScore(10);
  gs.addScore(25);
  gs.addScore(5);
  assert(gs.score === 40, `累计得分 40 (${gs.score})`);
  assert(gs.highScore === 40, `最高分 40 (${gs.highScore})`);
  gs.reset();
  gs.addScore(30);
  assert(gs.score === 30, `新局得分 30`);
  assert(gs.highScore === 40, `最高分不因新局重置 (${gs.highScore})`);
}

console.log('\n结果:', passed, 'passed,', failed, 'failed');
process.exit(failed ? 1 : 0);

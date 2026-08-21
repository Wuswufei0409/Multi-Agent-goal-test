import { Bullet } from '../src/game/entities/Bullet.js';
import { Enemy } from '../src/game/entities/Enemy.js';
import { Collision } from '../src/game/Collision.js';
import { GameLoop } from '../src/game/GameLoop.js';
import { GameState, GamePhase } from '../src/game/GameState.js';
import { Player } from '../src/game/entities/Player.js';

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

// 构造一个可独立运行的 GameLoop（注入假 Collision / 最小 Input 桩）。
function makeLoop(overrides = {}) {
  const gameState = new GameState();
  const player = new Player();
  const renderer = {
    width: 800, height: 600,
    render() {},
  };
  const input = {
    isDown: () => false,
    consumeClick: () => false,
    pointerActive: false,
    pointerX: 0, pointerY: 0,
    getMoveIntent: () => ({ x: 0, y: 0 }),
  };
  const background = { update() {} };
  const loop = new GameLoop({ renderer, gameState, input, background, collision: new Collision(), player });
  return Object.assign(loop, overrides);
}

console.log('Bullet — 向上飞行/越界/命中标记');
{
  const b = new Bullet({ y: 100, speed: 200 });
  b.update(0.5);
  assert(near(b.y, 0), `子弹 0.5s 上升 100 到 ${b.y}`);
  const o = new Bullet({ y: 4 });
  assert(o.isOutOfBounds(600) === false, '未飞出边界不算越界');
  const out = new Bullet({ y: -10 });
  assert(out.isOutOfBounds(600) === true, '飞出上边界判定越界');
}

console.log('Enemy — 生成位置/下移/越界/生命标记');
{
  const e = new Enemy({ speed: 100 });
  e.spawn(800, 600);
  assert(e.x >= e.width / 2 && e.x <= 800 - e.width / 2, `生成 x 在画布内 (${e.x.toFixed(0)})`);
  assert(e.y < 0, `生成于顶边外 y<0 (${e.y.toFixed(0)})`);
  const sy = e.y;
  e.update(1);
  assert(e.y > sy, `敌机 1s 下移 ${(e.y - sy).toFixed(0)}`);
  const out = new Enemy({ speed: 100 });
  out.y = 601 + out.height / 2;
  assert(out.isOutOfBounds(600) === true, '飞出下边界判定越界');
}

console.log('Collision — AABB 重叠判定');
{
  const c = new Collision();
  const a = { x: 100, y: 100, width: 40, height: 40 };
  const b = { x: 115, y: 110, width: 40, height: 40 };
  assert(c.aabbOverlap(a, b) === true, '重叠判定 true');
  const far = { x: 300, y: 300, width: 40, height: 40 };
  assert(c.aabbOverlap(a, far) === false, '相离判定 false');
  const edge = { x: 100 + 40, y: 100, width: 40, height: 40 };
  assert(c.aabbOverlap(a, edge) === true, '边缘相切视为重叠');
}

console.log('GameLoop — 自动射击（PLAYING 下子弹生成并向上飞）');
{
  const loop = makeLoop();
  loop.gameState.start(); // READY -> PLAYING, reset
  loop.shootCooldown = 0;
  loop.spawnCooldown = 100; // 本组禁止生成敌机
  const px = loop.player.x, py = loop.player.y;
  loop.update(0.016);
  assert(loop.bullets.length === 1, '冷却就绪即发射 1 发');
  const b = loop.bullets[0];
  assert(near(b.x, px, 1) && b.y < py, `子弹自机头发射 (x=${b.x.toFixed(0)},y=${b.y.toFixed(0)})`);
  loop.update(0.016);
  assert(b.y < py - 1, `子弹发射后向上飞行 (${b.y.toFixed(1)})`);
}

console.log('GameLoop — 导出发射不叠加（冷却中不发）');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 0.1;
  loop.spawnCooldown = 100;
  loop.update(0.016);
  assert(loop.bullets.length === 0, '冷却中不发射');
}

console.log('GameLoop — 敌机持续生成并下移');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; // 禁止子弹干扰
  loop.spawnCooldown = 0;
  loop.update(0.016);
  assert(loop.enemies.length === 1, '生成 1 架敌机');
  const e = loop.enemies[0];
  const sy = e.y;
  loop.update(0.016);
  assert(e.y > sy, `敌机下移 (${(e.y - sy).toFixed(2)})`);
}

console.log('GameLoop — 敌机数量上限（防无限残留）');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100;
  loop.spawnCooldown = 0;
  for (let i = 0; i < 60; i++) loop.update(0.016);
  assert(loop.enemies.length <= loop.maxEnemies, `敌机不超过上限 ${loop.maxEnemies} (${loop.enemies.length})`);
}

console.log('GameLoop — 子弹命中敌机构毁并加分');
{
  // 直接构造重叠的子弹与敌机。
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  const b = new Bullet({ x: 400, y: 200 });
  const e = new Enemy({ speed: 100 });
  e.x = 400; e.y = 200; e.active = true;
  loop.bullets.push(b); loop.enemies.push(e);
  const before = loop.gameState.score;
  loop.update(0.016);
  assert(loop.gameState.score === before + 10, `命中加分 +10 (${loop.gameState.score})`);
  assert(loop.enemies.length === 0, '被击毁的敌机被剔除');
  assert(loop.bullets.length === 0, '命中的子弹被剔除');
}

console.log('GameLoop — 敌机与玩家碰撞扣命，命尽游戏结束');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  const e = new Enemy({ speed: 100 });
  e.x = loop.player.x; e.y = loop.player.y;
  loop.enemies.push(e);
  loop.update(0.016);
  assert(loop.gameState.lives === 2, `碰撞扣 1 命 (lives=${loop.gameState.lives})`);
  assert(loop.enemies.length === 0, '撞到的敌机消失');
}

console.log('GameLoop — 命尽则进入 GAME_OVER');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  loop.gameState.lives = 1;
  const e = new Enemy({ speed: 100 });
  e.x = loop.player.x; e.y = loop.player.y;
  loop.enemies.push(e);
  loop.update(0.016);
  assert(loop.gameState.phase === GamePhase.GAME_OVER, `命尽进入 GAME_OVER (${loop.gameState.phase})`);
  assert(loop.gameState.lives === 0, '生命下限 0');
}

console.log('GameLoop — 越界子弹/敌机被剔除（防残留）');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  const b = new Bullet({ y: -50 });
  const e = new Enemy({ speed: 100 });
  e.y = 1000; // 飞出下边界
  loop.bullets.push(b); loop.enemies.push(e);
  loop.update(0.016);
  assert(loop.bullets.length === 0, '越界子弹剔除');
  assert(loop.enemies.length === 0, '越界敌机剔除');
}

console.log('GameLoop — 进入 GAME_OVER 后清空场上实体');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  loop.bullets.push(new Bullet({ x: 400, y: 200 }));
  loop.enemies.push(new Enemy({ speed: 100 }));
  loop.gameState.lives = 0;
  loop.gameState.gameOver();
  loop.update(0.016);
  assert(loop.bullets.length === 0 && loop.enemies.length === 0, 'GAME_OVER 清空子弹与敌机');
}

console.log('GameLoop — 重开后实体集合清空、分数命数复位');
{
  const loop = makeLoop();
  loop.gameState.start();
  loop.shootCooldown = 100; loop.spawnCooldown = 100;
  loop.gameState.score = 500;
  loop.gameState.lives = 0;
  loop.gameState.gameOver();
  loop.update(0.016); // GAME_OVER 帧：清空场上实体
  assert(loop.bullets.length === 0 && loop.enemies.length === 0, 'GAME_OVER 后实体为空');
  // 重开
  loop.gameState.backToReady();
  loop.gameState.start();
  loop.update(0.016);
  assert(loop.gameState.score === 0 && loop.gameState.lives === 3, `重开后分数命数复位`);
  assert(loop.bullets.length === 0 && loop.enemies.length === 0, '重开后实体仍为空');
}

console.log('\n结果:', passed, 'passed,', failed, 'failed');
process.exit(failed ? 1 : 0);

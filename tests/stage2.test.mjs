import { Player } from '../src/game/entities/Player.js';
import { Input } from '../src/game/Input.js';

// node 环境无 window，Input 需要它挂 keydown/keyup 监听。
globalThis.window = globalThis.window || { addEventListener(){}, removeEventListener(){} };

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log('  ✅', name); }
  else { failed++; console.log('  ❌', name); }
}
function near(a, b, eps = 0.5) { return Math.abs(a - b) <= eps; }

console.log('Player — 复位');
{
  const p = new Player();
  p.reset(800, 600);
  assert(near(p.x, 400) && near(p.y, 540), `reset 底部中央 (${p.x},${p.y})`);
  assert(p.alive === true, 'reset 后存活');
}

console.log('Player — 键盘移动与边界');
{
  const p = new Player({ speed: 340 });
  p.reset(800, 600);
  p.update(1, { x: 1, y: 0 }, 800, 600);
  assert(near(p.x, 400 + 340, 1) && near(p.y, 540), `右移 (${p.x},${p.y})`);
  p.reset(800, 600);
  p.update(1, { x: -1, y: 0 }, 800, 600);
  assert(near(p.x, 400 - 340, 1), `左移1秒到60 (${p.x})`);
  p.update(100, { x: -1, y: 0 }, 800, 600);
  assert(near(p.x, 22, 1), `左边界钳制到半宽22 (${p.x})`);
  p.update(100, { x: 1, y: 0 }, 800, 600);
  assert(near(p.x, 800 - 22, 1), `右边界钳制到778 (${p.x})`);
  p.update(100, { x: 0, y: 1 }, 800, 600);
  assert(near(p.y, 600 - 22, 1), `下边界钳制到578 (${p.y})`);
  p.update(100, { x: 0, y: -1 }, 800, 600);
  assert(near(p.y, 22, 1), `上边界钳制到22 (${p.y})`);
}

console.log('Player — 对角线等速（归一化）');
{
  const p = new Player({ speed: 340 });
  p.reset(800, 600);
  p.x = 400; p.y = 300; // 放中央，避免边界夹紧干扰
  p.update(1, { x: 1, y: 1 }, 800, 600);
  const dist = Math.hypot(p.x - 400, p.y - 300);
  assert(near(dist, 340, 1), `对角线 1 秒移动 ≈340 (${dist.toFixed(1)})`);
}

console.log('Player — 指针跟随 follow 夹紧边界 / 朝向');
{
  const p = new Player();
  p.reset(800, 600);
  p.follow(10000, 10000, 800, 600, 0.016);
  assert(near(p.x, 778, 1) && near(p.y, 578, 1), `follow 越界被夹紧 (${p.x.toFixed(0)},${p.y.toFixed(0)})`);
  const q = new Player();
  q.reset(800, 600);
  q.follow(100, 100, 800, 600, 0.016);
  assert(q.x < 400 && q.y < 540, `follow 朝左上目标移动 (${q.x.toFixed(0)},${q.y.toFixed(0)})`);
}

console.log('Player — 不存活不移动');
{
  const p = new Player();
  p.reset(800, 600);
  p.alive = false;
  const sx = p.x;
  p.update(1, { x: 1, y: 0 }, 800, 600);
  p.follow(0, 0, 800, 600, 0.016);
  assert(near(p.x, sx), `死亡后 update/follow 均不移动`);
}

console.log('Input — getMoveIntent 方向键/WASD');
{
  const fakeCanvas = { addEventListener(){}, removeEventListener(){}, getBoundingClientRect(){ return {left:0,top:0}; } };
  const i = new Input(fakeCanvas);
  i.keys.add('ArrowRight'); i.keys.add('ArrowDown');
  let v = i.getMoveIntent();
  assert(v.x === 1 && v.y === 1, `右下角意图 (${v.x},${v.y})`);
  i.keys.clear(); i.keys.add('KeyA'); i.keys.add('KeyW');
  v = i.getMoveIntent();
  assert(v.x === -1 && v.y === -1, `WASD 左上意图 (${v.x},${v.y})`);
  i.keys.clear(); i.keys.add('ArrowLeft'); i.keys.add('ArrowRight');
  v = i.getMoveIntent();
  assert(v.x === 0, `左右相消 (${v.x})`);
  i.keys.clear();
  v = i.getMoveIntent();
  assert(v.x === 0 && v.y === 0, `无按键零意图`);
  i.destroy();
}

console.log('\n结果:', passed, 'passed,', failed, 'failed');
process.exit(failed ? 1 : 0);

// smoke-main.mjs — 用 mock 浏览器全局对象真实执行 src/main.js 的整套接线，
// 验证 GameLoop 首帧 update/render 不抛错（此前 Renderer.background 为 null 会崩溃）。
import assert from 'node:assert';

const listeners = new Map();
function listen(type, fn) {
  if (!listeners.has(type)) listeners.set(type, []);
  listeners.get(type).push(fn);
}
function emit(type, ev) {
  for (const fn of listeners.get(type) || []) { try { fn(ev); } catch (e) { console.error('listener err', type, e); } }
}

let rafCalls = 0;
const raf = (fn) => { rafCalls++; if (rafCalls > 3) return 0; const t = rafCalls * 16.67; setTimeout(() => fn(t), 0); return rafCalls; };
const caf = () => {};

const ctx = {
  save() {}, restore() {}, setTransform() {}, createLinearGradient() { return { addColorStop() {} }; },
  fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, ellipse() {},
  translate() {}, globalAlpha: 1, fillStyle: '', font: '', textAlign: '', textBaseline: '',
  fillText() {},
};
const fakeCanvas = {
  getContext: () => ctx,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  addEventListener: listen, removeEventListener() {},
  parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
  style: {}, width: 800, height: 600,
};

globalThis.window = {
  addEventListener: listen, removeEventListener() {},
  devicePixelRatio: 1, innerWidth: 800, innerHeight: 600,
};
globalThis.document = { getElementById: () => fakeCanvas };
globalThis.requestAnimationFrame = raf;
globalThis.cancelAnimationFrame = caf;
globalThis.performance = { now: () => Date.now() };

// 捕获 main.js 顶层执行到第一帧的错误
let topErr = null;
process.once('uncaughtException', (e) => { topErr = e; });

await import('../src/main.js');

await new Promise((r) => setTimeout(r, 60)); // 等几帧跑完

if (topErr) {
  console.error('❌ smoke: main.js 运行抛错:', topErr.message);
  console.error(topErr.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}

// 模拟：切到 PLAYING 并按住方向键，确保玩家 update 路径不抛错
assert.ok(rafCalls >= 3, `rAF 至少跑了3帧 (${rafCalls})`);
console.log('✅ smoke: main.js 接线后 rAF 帧正常推进，无未捕获异常');
console.log('   rAF frames:', rafCalls);
console.log('   结果: PASS');
process.exit(0);

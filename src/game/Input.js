/**
 * Input — 键盘 / 鼠标 / 触屏输入归一化。
 * 阶段 1：键盘键位 + 单击事件（用于开始/重开）。
 * 阶段 2：接入连续指针拖拽操控玩家 + 方向键/WASD 移动。
 *
 * 移动意图接口：
 *  - getMoveIntent() 返回键盘方向键 / WASD 的归一化意图 {x, y}；
 *  - point(x, y) 记录当前指针画布坐标；pointerActive 标记是否正被按压。
 *  指针拖拽采用「目标跟随」：由调用方把指针坐标交给 Player 目标跟随实现。
 */
const MOVE_KEYS = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
};
export class Input {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    /** 待消费的单击/点击开始信号。 */
    this._pendingClick = false;
    /** 指针当前位置（阶段 2 拖拽用）。 */
    this.pointerX = 0;
    this.pointerY = 0;
    this.pointerActive = false;

    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);

    this._onPointerDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = e.clientX - rect.left;
      this.pointerY = e.clientY - rect.top;
      this.pointerActive = true;
      this._pendingClick = true;
    };
    this._onPointerMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = e.clientX - rect.left;
      this.pointerY = e.clientY - rect.top;
    };
    this._onPointerUp = () => {
      this.pointerActive = false;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  /**
   * getMoveIntent() — 由方向键 / WASD 计算归一化移动意图 {x, y}（-1~1）。
   * @returns {{x:number, y:number}}
   */
  getMoveIntent() {
    let x = 0;
    let y = 0;
    for (const code of this.keys) {
      const v = MOVE_KEYS[code];
      if (v) {
        x += v.x;
        y += v.y;
      }
    }
    // 钳制到 [-1,1]（对角时由 Player 端归一化为单位向量）。
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  /** 返回并清除一次待消费的点击信号。 */
  consumeClick() {
    const v = this._pendingClick;
    this._pendingClick = false;
    return v;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
  }
}

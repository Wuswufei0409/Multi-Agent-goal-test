/**
 * Input — 键盘 / 鼠标 / 触屏输入归一化。
 * 阶段 1：键盘键位 + 单击事件（用于开始/重开）。
 * 阶段 2 起接入连续指针拖拽控制玩家。
 */
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

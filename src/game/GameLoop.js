/**
 * GameLoop — requestAnimationFrame 驱动的 update/render 主循环。
 * 阶段 0：仅建立循环骨架，update 为空实现，render 委托给 Renderer。
 * 后续阶段将在此接入固定步长 accumulator 与游戏逻辑。
 */
export class GameLoop {
  /**
   * @param {object} deps
   * @param {import('./Renderer.js').Renderer} deps.renderer
   * @param {import('./GameState.js').GameState} deps.gameState
   */
  constructor({ renderer, gameState, input, background, collision } = {}) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.input = input;
    this.background = background;
    this.collision = collision;
    this._rafId = null;
    this._lastTime = 0;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick = (time) => {
    if (!this.running) return;

    const dt = Math.min((time - this._lastTime) / 1000, 0.1);
    this._lastTime = time;

    this.update(dt);
    this.render(dt);

    this._rafId = requestAnimationFrame(this._tick);
  };

  /**
   * update(dt) — 阶段 1 起实现：输入、实体、碰撞、状态推进。
   * @param {number} dt 上一帧到本帧的秒数
   */
  update(dt) {
    // 阶段 0 空实现，占位。
    void dt;
  }

  render(dt) {
    this.renderer.render(this.gameState, dt);
  }
}

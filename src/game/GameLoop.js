/**
 * GameLoop — requestAnimationFrame 驱动的 update/render 主循环。
 * 阶段 1：接入固定步长保护（dt 上限）并驱动 状态机 / 滚动星空；
 * 输入触发开始/重开（空格或点击），Playing→GameOver 在后续阶段由实体/碰撞接入。
 */
import { GamePhase } from './GameState.js';

export class GameLoop {
  /**
   * @param {object} deps
   * @param {import('./Renderer.js').Renderer} deps.renderer
   * @param {import('./GameState.js').GameState} deps.gameState
   * @param {import('./Input.js').Input} deps.input
   * @param {import('./Background.js').Background} deps.background
   * @param {import('./Collision.js').Collision} deps.collision
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

    // dt 上限 0.1s：切后台/卡顿后避免逻辑跳帧过大。
    const dt = Math.min((time - this._lastTime) / 1000, 0.1);
    this._lastTime = time;

    this.update(dt);
    this.render(dt);

    this._rafId = requestAnimationFrame(this._tick);
  };

  /**
   * update(dt) — 每帧推进：输入触发状态迁移 → 状态机计时 → 星空滚动。
   * 阶段 1 范围：主循环 + 状态机 + 滚动星空；实体/碰撞在阶段 2/3 接入。
   * @param {number} dt 秒
   */
  update(dt) {
    const gs = this.gameState;

    // 开始 / 重开触发：空格键按下或一次点击。
    const wantsStart = this.input.isDown('Space') || this.input.consumeClick();

    if (gs.phase === GamePhase.READY && wantsStart) {
      gs.start();
    } else if (gs.phase === GamePhase.GAME_OVER && wantsStart) {
      gs.backToReady();
      gs.start();
    }
    // PLAYING → GAME_OVER 由后续阶段的生命/碰撞逻辑调用 gs.gameOver()。

    // 状态机推进（phaseTime 累计）。
    gs.update(dt);

    // 星空滚动（READY/PLAYING 下保持动态感）。
    this.background.update(dt);
  }

  render(dt) {
    this.renderer.render(this.gameState, dt);
  }
}

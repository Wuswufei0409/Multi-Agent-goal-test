/**
 * FloatingText — 漂浮伤害/得分提示文字（计分反馈）。
 * 阶段 4：命中敌机 +10、波次结算奖励 等以浮动文字在命中处向上漂浮并淡出，
 * 让得分机制有即时视觉反馈。
 *
 * 实例由 main.js 持有并注入 Renderer（绘制）；GameLoop 通过 add() 产生，
 * 保障 score 的数字变化可视化。
 */
export class FloatingText {
  /**
   * @param {object} [options]
   * @param {string} [options.text='+10'] 显示文本
   * @param {string} [options.color='#ffd54a'] 颜色
   * @param {number} [options.size=16] 字号（px）
   * @param {number} [options.life=0.9] 存活时长（s）
   * @param {number} [options.vy=-46] 上飘速度（px/s）
   */
  constructor({ text = '+10', color = '#ffd54a', size = 16, life = 0.9, vy = -46 } = {}) {
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.vy = vy;
    this.x = 0;
    this.y = 0;
    this.active = true;
  }

  /**
   * place(x, y) — 设定漂浮文字出现位置。
   * @param {number} x
   * @param {number} y
   */
  place(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * update(dt) — 上飘并衰减生命周期。
   * @param {number} dt 秒
   */
  update(dt) {
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.life = 0;
      this.active = false;
    }
  }

  /**
   * draw(ctx) — 按剩余生命淡出绘制文本（居中）。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const alpha = Math.max(0, Math.min(1, this.life / this.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

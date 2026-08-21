/**
 * Particle — 单颗爆炸/特效粒子。
 * 阶段 4：为敌机被击毁、玩家受击/死亡提供爆炸粒子的基本元素。
 *
 * 约定：x/y 为粒子中心；粒子自带速度、生命周期、颜色与（可选）重力衰减，
 * 由 ParticleSystem 统一调度 update/draw 与回收。
 */
export class Particle {
  /**
   * @param {object} [options]
   * @param {number} [options.x=0]          中心横坐标
   * @param {number} [options.y=0]          中心纵坐标
   * @param {number} [options.vx=0]         横速度（px/s）
   * @param {number} [options.vy=0]         纵速度（px/s）
   * @param {number} [options.life=0.5]     存活时长（s）
   * @param {number} [options.size=3]       边长（px）
   * @param {string} [options.color='#ff5a3c'] 填充色（可带透明度写法）
   * @param {number} [options.gravity=0]    纵向额外加速度（px/s²，>0 向下）
   */
  constructor({ x = 0, y = 0, vx = 0, vy = 0, life = 0.5, size = 3, color = '#ff5a3c', gravity = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.gravity = gravity;
    /** 生命周期标记：计时结束后由系统剔除。 */
    this.active = true;
  }

  /**
   * update(dt) — 按速度移动、受重力、衰减生命周期。
   * @param {number} dt 秒
   */
  update(dt) {
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.life = 0;
      this.active = false;
    }
  }

  /**
   * draw(ctx) — 按剩余生命衰减透明度绘制粒子方块。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.active) return;
    const alpha = Math.max(0, Math.min(1, this.life / this.maxLife));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

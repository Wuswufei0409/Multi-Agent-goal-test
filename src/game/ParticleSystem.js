import { Particle } from './entities/Particle.js';

/**
 * ParticleSystem — 爆炸/特效粒子系统（单一实例，由 main.js 注入 Renderer 与 GameLoop）。
 * 阶段 4：敌机被击毁、玩家受击/死亡 时产生爆发粒子，增强视觉反馈。
 *
 * 实例由 main.js 持有并注入 Renderer（绘制）与 GameLoop（更新），保证唯一状态；
 * 上场/重开时 clear() 清空，避免结算后残留。
 */
export class ParticleSystem {
  constructor() {
    /** @type {import('./entities/Particle.js').Particle[]} 场内粒子。 */
    this.particles = [];
  }

  /**
   * burst(x, y, options) — 产生一圈朝向各方向的爆发粒子。
   * @param {number} x 中心横坐标
   * @param {number} y 中心纵坐标
   * @param {object} [options]
   * @param {number} [options.count=14] 粒子数量
   * @param {number} [options.speed=120] 初速基准（px/s）
   * @param {number} [options.life=0.5]  存活时长（s）
   * @param {number} [options.size=4]    粒径（px）
   * @param {string} [options.color='#ff5a3c'] 主色
   * @param {string[]} [options.colors]  可选多色列表（随机挑）
   * @param {number} [options.gravity=140] 重力（px/s²，>0 向下）
   * @param {number} [options.spread=Math.PI*2] 发散角度范围（默认全向）
   * @param {number} [options.direction] 偏好方向（弧度）；配合 spread 形成定向爆发
   */
  burst(x, y, options = {}) {
    const {
      count = 14,
      speed = 120,
      life = 0.5,
      size = 4,
      color = '#ff5a3c',
      colors,
      gravity = 140,
      spread = Math.PI * 2,
      direction,
    } = options;
    const base = direction === undefined ? Math.random() * Math.PI * 2 : direction - spread / 2;
    for (let i = 0; i < count; i++) {
      const ang = base + Math.random() * spread;
      const v = speed * (0.4 + Math.random() * 0.9);
      const c = colors ? colors[(Math.random() * colors.length) | 0] : color;
      this.particles.push(
        new Particle({
          x,
          y,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v,
          life: life * (0.6 + Math.random() * 0.7),
          size: size * (0.6 + Math.random() * 0.9),
          color: c,
          gravity,
        })
      );
    }
  }

  /**
   * update(dt) — 推进全部粒子，删除生命周期结束的。
   * @param {number} dt 秒
   */
  update(dt) {
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => p.active);
  }

  /**
   * draw(ctx) — 绘制全部粒子。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
  }

  /** 清空全部粒子（上场/重开/结算复用）。 */
  clear() {
    this.particles.length = 0;
  }
}

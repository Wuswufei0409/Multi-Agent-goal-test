/**
 * Background — 滚动星空背景，营造战机向前飞行的移动感。
 * 阶段 1：三层视差星空（远/中/近）自上而下滚动，供主循环持续驱动。
 *
 * 实例由 main.js 持有并注入 Renderer（绘制）与 GameLoop（更新），
 * 保证整局只有一份星空状态；窗口尺寸变化时通过 resize() 对齐。
 */
export class Background {
  /**
   * @param {number} width  视口逻辑宽度（CSS 像素）
   * @param {number} height 视口逻辑高度（CSS 像素）
   */
  constructor(width = 0, height = 0) {
    /** 星星数量按面积估算，量级约 150–300 颗。 */
    const count = Math.min(300, Math.floor((width * height) / 6000));
    this.layers = [
      { speed: 18, size: 1, alpha: 0.4, count: Math.floor(count * 0.5) },
      { speed: 38, size: 1.6, alpha: 0.7, count: Math.floor(count * 0.33) },
      { speed: 70, size: 2.4, alpha: 1, count: Math.floor(count * 0.17) },
    ];

    this.width = width;
    this.height = height;
    this.stars = [];
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          layer: li,
          x: Math.random() * width,
          y: Math.random() * height,
        });
      }
    }
  }

  /**
   * resize(width, height) — 画布尺寸变化时重建星空，避免星星越界。
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    for (const s of this.stars) {
      // 仅约束边界，保留相对位置；已出界的大致重置到合法范围。
      if (s.x > width) s.x = (s.x % width) || width;
      if (s.y > height) s.y = (s.y % height) || height;
    }
  }

  /**
   * update(dt) — 每帧按各层速度向下滚动星星。
   * @param {number} dt 秒
   */
  update(dt) {
    for (const s of this.stars) {
      const layer = this.layers[s.layer];
      s.y += layer.speed * dt;
      if (s.y > this.height) {
        s.y -= this.height;
        s.x = Math.random() * this.width;
      }
    }
  }

  /**
   * draw(ctx) — 按层绘制星空（调用方负责实心底色铺底）。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    for (const s of this.stars) {
      const layer = this.layers[s.layer];
      ctx.globalAlpha = layer.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x, s.y, layer.size, layer.size);
    }
    ctx.globalAlpha = 1;
  }
}

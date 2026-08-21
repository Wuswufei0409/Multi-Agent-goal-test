/**
 * Enemy — 敌机实体。
 * 阶段 3：实现敌机在画布顶部随机横向位置生成、向下移动、越界剔除，
 * 供 GameLoop 的主循环持续生成敌机。
 *
 * 约定：x/y 为敌机中心坐标，width/height 为完整包围盒尺寸（与 Player/Bullet 一致）。
 */
export class Enemy {
  /**
   * @param {object} [options]
   * @param {number} [options.width=40] 敌机身宽
   * @param {number} [options.height=40] 敌机身长
   * @param {number} [options.speed=90+70*rand] 下移速度（px/s），随机以增加难度变化
   */
  constructor({ width = 40, height = 40, speed } = {}) {
    this.width = width;
    this.height = height;
    /** 下移速度（px/s），未指定时在 90~160 间随机。 */
    this.speed = speed ?? (90 + Math.random() * 70);
    this.x = 0;
    this.y = 0;
    /** 生命周期标记：被击中/出界后被置 false，由管理者剔除。 */
    this.active = true;
  }

  /**
   * spawn(width, height) — 在画布顶部随机横向位置生成一架敌机。
   * @param {number} width  画布逻辑宽
   * @param {number} height 画布逻辑高（用于初始 y，置于顶边上缘之外）
   */
  spawn(width, height) {
    const halfW = this.width / 2;
    // 左右各保留半机身，避免敌机出现就被裁掉一半。
    this.x = halfW + Math.random() * Math.max(1, width - this.width);
    this.y = -this.height / 2 - 2;
    this.active = true;
    void height;
  }

  /**
   * update(dt) — 敌机向下移动。
   * @param {number} dt 秒
   */
  update(dt) {
    this.y += this.speed * dt;
  }

  /**
   * isOutOfBounds(height) — 是否完全飞出画布下边界（用于剔除，防无限残留压垮性能）。
   * @param {number} height 画布逻辑高
   */
  isOutOfBounds(height) {
    return this.y - this.height / 2 > height;
  }

  /**
   * draw(ctx) — 绘制敌机（倒三角 + 菱形核心，红色系，便于与蓝色玩家战机区分）。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const { x, y, width, height } = this;
    const halfW = width / 2;
    const halfH = height / 2;

    ctx.save();
    ctx.translate(x, y);

    // 机身（倒三角）。
    ctx.fillStyle = '#ff4d5e';
    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(-halfW, -halfH + 4);
    ctx.lineTo(halfW, -halfH + 4);
    ctx.closePath();
    ctx.fill();

    // 机翼。
    ctx.fillStyle = '#ff8a8f';
    ctx.beginPath();
    ctx.moveTo(-halfW, -halfH + 6);
    ctx.lineTo(-halfW, -halfH - 4);
    ctx.lineTo(0, -halfH + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(halfW, -halfH + 6);
    ctx.lineTo(halfW, -halfH - 4);
    ctx.lineTo(0, -halfH + 2);
    ctx.closePath();
    ctx.fill();

    // 核心菱形。
    ctx.fillStyle = '#ffd1d4';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Player — 玩家战机实体。
 * 阶段 2：实现键盘（方向键 / WASD）/ 鼠标·触屏拖拽 双重操控。
 *
 * 设计：Player 不直接依赖 Input，通过 update(dt, intent, width, height)
 * 接收归一化移动意图（-1~1），由调用方（GameLoop）从 Input 换算，便于单测与解耦。
 */
export class Player {
  /**
   * @param {object} [options]
   * @param {number} [options.width=44]   机身宽（逻辑 px）
   * @param {number} [options.height=44]  机身长（逻辑 px）
   * @param {number} [options.speed=340]  键盘操控最大速度（px/s）
   * @param {number} [options.bottomMargin=60] 初始 Y 距底部间距
   */
  constructor({ width = 44, height = 44, speed = 340, bottomMargin = 60 } = {}) {
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.bottomMargin = bottomMargin;

    /** 以飞机中心为基准的位置。 */
    this.x = 0;
    this.y = 0;

    this.alive = true;
    this.reset(0, 0);
  }

  /** 左 / 上 / 右 / 下 边界（取机身中心）。 */
  get left() { return this.width / 2; }
  get right() { return this.width / 2; }
  get top() { return this.height / 2; }
  get bottom() { return this.height / 2; }

  /**
   * reset(width, height) — 放回底部中央并复原状态。
   * @param {number} width
   * @param {number} height
   */
  reset(width, height) {
    this.x = width / 2;
    this.y = height - this.bottomMargin;
    this.alive = true;
  }

  /**
   * update(dt, intent, width, height) — 按移动意图移动并约束在画布内。
   * @param {number} dt 秒
   * @param {{x:number,y:number}} intent 归一化移动向量（-1~1）
   * @param {number} width 画布逻辑宽
   * @param {number} height 画布逻辑高
   */
  update(dt, intent, width, height) {
    if (!this.alive) return;

    const ix = typeof intent.x === 'number' ? intent.x : 0;
    const iy = typeof intent.y === 'number' ? intent.y : 0;
    // 防止对角线速度超速：归一化到单位向量。
    const len = Math.hypot(ix, iy);
    const nx = len > 0 ? ix / len : 0;
    const ny = len > 0 ? iy / len : 0;

    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;

    // 约束在画布内（以中心为基准，保留一半机身不超出）。
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(halfW, Math.min(width - halfW, this.x));
    this.y = Math.max(halfH, Math.min(height - halfH, this.y));
  }

  /**
   * follow(targetX, targetY, width, height) — 鼠标/触屏拖拽：朝目标点平滑靠拢并约束边界。
   * 使用指数平滑，距离越远越快、越近越细腻，避免键盘式的固定速度往复。
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} width 画布逻辑宽
   * @param {number} height 画布逻辑高
   * @param {number} [dt=1/60] 帧间隔（用于近似按帧率一致）
   */
  follow(targetX, targetY, width, height, dt = 1 / 60) {
    if (!this.alive) return;
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // 指数平滑系数：与帧率近似解耦。
    const rate = 1 - Math.pow(0.0008, dt);
    this.x += (targetX - this.x) * rate;
    this.y += (targetY - this.y) * rate;

    this.x = Math.max(halfW, Math.min(width - halfW, this.x));
    this.y = Math.max(halfH, Math.min(height - halfH, this.y));
  }

  /**
   * draw(ctx) — 绘制玩家战机（等腰三角 + 机翼/尾焰点缀，便于区分敌机）。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const { x, y, width, height } = this;
    const halfW = width / 2;
    const halfH = height / 2;

    ctx.save();
    ctx.translate(x, y);

    // 尾焰（底部脉冲）。
    ctx.fillStyle = 'rgba(80,180,255,0.5)';
    const flame = 8 + 4 * Math.sin(performance.now() / 90);
    ctx.beginPath();
    ctx.moveTo(-6, halfH - 2);
    ctx.lineTo(6, halfH - 2);
    ctx.lineTo(0, halfH + flame);
    ctx.closePath();
    ctx.fill();

    // 机身（主体三角）。
    ctx.fillStyle = '#3aa0ff';
    ctx.beginPath();
    ctx.moveTo(0, -halfH);
    ctx.lineTo(-halfW, halfH - 4);
    ctx.lineTo(halfW, halfH - 4);
    ctx.closePath();
    ctx.fill();

    // 机翼。
    ctx.fillStyle = '#7bc4ff';
    ctx.beginPath();
    ctx.moveTo(-halfW, halfH - 8);
    ctx.lineTo(-halfW, halfH + 4);
    ctx.lineTo(0, halfH - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(halfW, halfH - 8);
    ctx.lineTo(halfW, halfH + 4);
    ctx.lineTo(0, halfH - 2);
    ctx.closePath();
    ctx.fill();

    // 座舱。
    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath();
    ctx.ellipse(0, -2, 4, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

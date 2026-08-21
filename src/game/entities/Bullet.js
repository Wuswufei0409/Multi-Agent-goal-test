/**
 * Bullet — 玩家子弹实体。
 * 阶段 3：实现子弹自机头向上飞行、越界剔除与主动标记，供 GameLoop/主循环管理集合。
 *
 * 约定：x/y 为子弹中心坐标，width/height 为完整包围盒尺寸，
 * 与 Player/Enemy 使用同一中心约定，便于 Collision.aabbOverlap 统一判定。
 */
export class Bullet {
  /**
   * @param {object} [options]
   * @param {number} [options.x=0]     中心横坐标
   * @param {number} [options.y=0]     中心纵坐标
   * @param {number} [options.width=4] 子弹宽
   * @param {number} [options.height=12] 子弹长
   * @param {number} [options.speed=520] 向上飞行速度（px/s）
   */
  constructor({ x = 0, y = 0, width = 4, height = 12, speed = 520 } = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
    /** 生命周期标记：命中或越界后被置 false，由管理者剔除。 */
    this.active = true;
  }

  /**
   * update(dt) — 子弹自机头向上飞行。
   * @param {number} dt 秒
   */
  update(dt) {
    this.y -= this.speed * dt;
  }

  /**
   * isOutOfBounds(height) — 是否完全飞出画布上边界（用于剔除，防无限残留）。
   * @param {number} height 画布逻辑高
   */
  isOutOfBounds(height) {
    return this.y + this.height / 2 < 0;
  }
}

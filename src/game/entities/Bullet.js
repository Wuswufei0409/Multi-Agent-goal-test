/**
 * Bullet — 子弹实体。
 * 阶段 0：建立实体骨架；射击/命中在阶段 3 实现。
 */
export class Bullet {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 4;
    this.height = 12;
    this.speed = 0;
  }

  update(_dt) {
    // 阶段 3 实现。
    void _dt;
  }
}

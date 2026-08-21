/**
 * Collision — 碰撞检测（AABB）。
 * 阶段 3：实现轴对齐包围盒重叠判定，供子弹-敌机、敌机-玩家碰撞结算。
 *
 * 所有实体（Player/Enemy/Bullet）约定：x/y 为中心坐标，width/height 为完整尺寸。
 */
export class Collision {
  /**
   * aabbOverlap(a, b) — 判断两个以中心定位的轴对齐包围盒是否重叠。
   * @param {{x:number,y:number,width:number,height:number}} a
   * @param {{x:number,y:number,width:number,height:number}} b
   * @returns {boolean} 重叠为 true
   */
  aabbOverlap(a, b) {
    return (
      Math.abs(a.x - b.x) <= (a.width + b.width) / 2 &&
      Math.abs(a.y - b.y) <= (a.height + b.height) / 2
    );
  }
}

/**
 * WaveManager — 波次推进与结算奖励。
 * 阶段 4：把“波次”从单纯的生成加速晋升为可推进的关卡单位——
 * 每波有固定敌机配额，全部生成且场上清零后波次完成，发放波次奖励，
 * 经短暂过渡（intermission）进入下一波，波次越大配额越多。
 *
 * 关键计数（由 GameLoop 维护并回调）：
 *  - spawned：本波已生成的敌机数
 *  - remaining：仍在场上存活的敌机数（含尚未出界的）
 *  - size：本波目标配额
 */
export class WaveManager {
  /**
   * @param {object} [options]
   * @param {number} [options.intermission=1.8] 波次间过渡时长（s）
   */
  constructor({ intermission = 1.8 } = {}) {
    this.INTERMISSION = intermission;
    this.wave = 1;
    this.size = 0;
    this.spawned = 0;
    this.remaining = 0;
    this.intermission = 0;
    this.reset(1);
  }

  /** settingsForWave(wave) — 该波目标敌机配额。 */
  settingsForWave(wave) {
    return 4 + wave * 2; // 波1:6, 波2:8, 波3:10...
  }

  /**
   * reset(wave) — 重置为第 wave 波。
   * @param {number} [wave=1]
   */
  reset(wave = 1) {
    this.wave = wave;
    this.size = this.settingsForWave(wave);
    this.spawned = 0;
    this.remaining = 0;
    this.intermission = 0;
  }

  /** 本波是否还能生成敌机（未满配额且不在过渡期）。 */
  canSpawn() {
    return this.spawned < this.size && this.intermission <= 0;
  }

  /** 记录一架敌机在本波生成（配额 +1、场上 +1）。 */
  markSpawned() {
    this.spawned++;
    this.remaining++;
  }

  /** 记录一架敌机消失（被击毁或飞出边界）→ 场上 -1（防负）。 */
  markGone() {
    if (this.remaining > 0) this.remaining--;
  }

  /** 本波是否已全部生成且场上完全清除（完成）。 */
  isWaveCleared() {
    return this.spawned >= this.size && this.remaining <= 0;
  }

  /** 进入波次间过渡（同时覆盖之前未尽的过渡）。 */
  beginIntermission() {
    this.intermission = this.INTERMISSION;
  }

  /**
   * update(dt) — 推进过渡倒计时。
   * @returns {boolean} 过渡是否已结束（可进入下一波）
   */
  update(dt) {
    if (this.intermission > 0) {
      this.intermission -= dt;
    }
    return this.intermission <= 0;
  }

  /** 推进到下一波（配额 +2）。 */
  nextWave() {
    this.wave++;
    this.size = this.settingsForWave(this.wave);
    this.spawned = 0;
    this.remaining = 0;
    this.intermission = 0;
  }
}

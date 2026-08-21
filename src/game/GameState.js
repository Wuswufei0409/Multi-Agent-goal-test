/**
 * GameState — 游戏状态机（Ready / Playing / GameOver）。
 * 阶段 1：实现完整状态机与迁移，供主循环驱动开始/重开。
 * 生命周期：READY（开始界面）→ PLAYING（游玩）→ GAME_OVER（结算）→ READY（重开）。
 */
export const GamePhase = Object.freeze({
  READY: 'ready',
  PLAYING: 'playing',
  GAME_OVER: 'gameover',
});

export class GameState {
  constructor() {
    /** @type {GamePhase} 当前游戏阶段 */
    this.phase = GamePhase.READY;
    this.score = 0;
    /** 历史最高分（阶段 4：超越时更新，新一局不归零）。 */
    this.highScore = 0;
    this.lives = 3;
    this.wave = 1;
    /** 进入当前阶段后的累计秒数（阶段 1 用于演示/计时）。 */
    this.phaseTime = 0;
  }

  /**
   * transition(next) — 迁移到指定阶段并重置该阶段计时。
   * @param {GamePhase} next
   */
  transition(next) {
    this.phase = next;
    this.phaseTime = 0;
  }

  /** Ready → Playing（开始 / 重开）。 */
  start() {
    this.reset();
    this.transition(GamePhase.PLAYING);
  }

  /** Playing → GameOver。 */
  gameOver() {
    if (this.phase === GamePhase.PLAYING) {
      this.transition(GamePhase.GAME_OVER);
    }
  }

  /** 任意阶段 → Ready（重开回到开始界面）。 */
  backToReady() {
    this.transition(GamePhase.READY);
  }

  /**
   * update(dt) — 推进状态机累计计时。
   * @param {number} dt 秒
   */
  update(dt) {
    this.phaseTime += dt;
  }

  /** 重置核心对战数据（不含阶段，阶段由调用方 transition 决定）。 */
  reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.phaseTime = 0;
  }

  /**
   * addScore(points) — 加分并同步最高分。
   * @param {number} points 分数增量（正数）
   */
  addScore(points) {
    if (points > 0) this.score += points;
    if (this.score > this.highScore) this.highScore = this.score;
  }
}

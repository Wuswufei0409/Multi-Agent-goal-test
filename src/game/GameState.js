/**
 * GameState — 游戏状态机（Ready / Playing / GameOver）。
 * 阶段 0：建立状态枚举与当前态占位；状态切换逻辑在阶段 1 实现。
 */
export const GamePhase = Object.freeze({
  READY: 'ready',
  PLAYING: 'playing',
  GAME_OVER: 'gameover',
});

export class GameState {
  constructor() {
    /** @type {GamePhase} */
    this.phase = GamePhase.READY;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
  }

  /**
   * transition(next) — 阶段 1 起实现。
   * @param {GamePhase} _next
   */
  transition(_next) {
    // 阶段 0 占位。
    void _next;
  }

  reset() {
    this.phase = GamePhase.READY;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
  }
}

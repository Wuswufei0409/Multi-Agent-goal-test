/**
 * Renderer — Canvas 绘制层。
 * 阶段 1：深空渐变底 + 注入的滚动星空 + 按状态机阶段绘制界面文案（Ready/Playing/GameOver）。
 * 后续阶段在此接入实体（Player/Enemy/Bullet）、粒子与 HUD。
 */
import { GamePhase } from './GameState.js';

/**
 * Renderer — Canvas 绘制层。
 * 阶段 1：深空渐变底 + 注入的滚动星空 + 按状态机阶段绘制界面文案（Ready/Playing/GameOver）。
 * 阶段 2：接入玩家实体绘制 + 生命/分数 HUD 雏形。
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./Background.js').Background} background 由 main.js 持有并注入，
   *   保证星空单一实例、与 GameLoop 同步更新。
   * @param {import('./entities/Player.js').Player} [player] 玩家实体（用于绘制，可选注入）。
   */
  constructor(canvas, background, player = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.background = background;
    this.player = player;
    /** 场上子弹（由 main.js 注入与 GameLoop 共享，保证唯一实例）。 */
    this.bullets = [];
    /** 场上敌机（由 main.js 注入与 GameLoop 共享）。 */
    this.enemies = [];
    this.resize();

    // 画布尺寸随窗口变化自适应，并同步星空边界。
    window.addEventListener('resize', () => {
      const prev = { w: this.width, h: this.height };
      this.resize();
      if (prev.w && prev.h) {
        this.background.resize(this.width, this.height);
      }
    });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    const width = (rect && rect.width) || window.innerWidth;
    const height = (rect && rect.height) || window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.width = width;
    this.height = height;
  }

  /**
   * @param {import('./GameState.js').GameState} gameState
   * @param {number} dt 秒
   */
  render(gameState, dt) {
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);

    // 深空渐变底色（星空星星叠加其上）。
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#070b1a');
    grad.addColorStop(1, '#0a0f1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 滚动星空。
    this.background.draw(ctx);

    // 玩家战机（游玩 / 结算阶段可见）。
    if (this.player && (gameState.phase === GamePhase.PLAYING || gameState.phase === GamePhase.GAME_OVER)) {
      if (this.player.alive) {
        this.player.draw(ctx);
      }
    }

    // 敌机与子弹（阶段 3）：仅游玩阶段绘制，结算/就绪不残留。
    if (gameState.phase === GamePhase.PLAYING) {
      for (const e of this.enemies) e.draw(ctx);
      for (const b of this.bullets) this.drawBullet(ctx, b);
    }

    // 状态机阶段界面。
    this.drawPhaseUI(gameState);

    ctx.restore();
    void dt;
  }

  drawPhaseUI(gameState) {
    const { ctx } = this;
    const cx = this.width / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (gameState.phase === GamePhase.READY) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(36, Math.floor(this.width / 20))}px sans-serif`;
      ctx.fillText('飞机大战', cx, this.height * 0.4);

      ctx.font = `${Math.max(16, Math.floor(this.width / 42))}px sans-serif`;
      ctx.fillStyle = '#8ab4ff';
      ctx.fillText('按 空格 或 点击屏幕 开始', cx, this.height * 0.52);
    } else if (gameState.phase === GamePhase.PLAYING) {
      // HUD 雏形（阶段 2）：分数 + 生命 + 提示操控方式。
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `${Math.max(16, Math.floor(this.width / 50))}px monospace`;
      ctx.fillStyle = '#ffd54a';
      ctx.fillText(`分数 ${gameState.score}`, 16, 14);

      ctx.font = `${Math.max(14, Math.floor(this.width / 56))}px sans-serif`;
      ctx.fillStyle = '#7cff8a';
      let lives = '';
      for (let i = 0; i < gameState.lives; i++) lives += '♥ ';
      ctx.fillText(`生命 ${lives || '-'}`, 16, 44);

      ctx.textAlign = 'right';
      ctx.font = `${Math.max(12, Math.floor(this.width / 70))}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`波次 ${gameState.wave} · 敌机 ${this.enemies.length}`, this.width - 16, 14);

      ctx.textAlign = 'center';
      ctx.font = `${Math.max(12, Math.floor(this.width / 70))}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`方向键/WASD 或 拖拽移动 · 自动射击`, this.width / 2, this.height * 0.08);
    } else if (gameState.phase === GamePhase.GAME_OVER) {
      ctx.fillStyle = '#ff7a7a';
      ctx.font = `bold ${Math.max(32, Math.floor(this.width / 22))}px sans-serif`;
      ctx.fillText('游戏结束', cx, this.height * 0.42);

      ctx.font = `${Math.max(16, Math.floor(this.width / 42))}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('按 空格 或 点击屏幕 重新开始', cx, this.height * 0.54);
    }
  }

  /**
   * drawBullet(ctx, bullet) — 绘制一枚玩家子弹（发光的黄色光柱，便于与敌机区分）。
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./entities/Bullet.js').Bullet} bullet
   */
  drawBullet(ctx, bullet) {
    const halfW = bullet.width / 2;
    const halfH = bullet.height / 2;
    ctx.save();
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(bullet.x - halfW, bullet.y - halfH, bullet.width, bullet.height);
    // 高光芯线：增强视觉区辨。
    ctx.fillStyle = '#fff7c4';
    ctx.fillRect(bullet.x - halfW / 2, bullet.y - halfH, halfW, bullet.height);
    ctx.restore();
  }
}

/**
 * Renderer — Canvas 绘制层。
 * 阶段 1：深空渐变底 + 注入的滚动星空 + 按状态机阶段绘制界面文案（Ready/Playing/GameOver）。
 * 后续阶段在此接入实体（Player/Enemy/Bullet）、粒子与 HUD。
 */
import { GamePhase } from './GameState.js';

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./Background.js').Background} background 由 main.js 持有并注入，
   *   保证星空单一实例、与 GameLoop 同步更新。
   */
  constructor(canvas, background) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.background = background;
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
      // 阶段 1 暂无实体；分数/生命 HUD 在阶段 4/5 接入。
      ctx.font = `${Math.max(14, Math.floor(this.width / 60))}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(`状态: 游玩中  ${Math.floor(gameState.phaseTime)}s`, cx, this.height * 0.08);
    } else if (gameState.phase === GamePhase.GAME_OVER) {
      ctx.fillStyle = '#ff7a7a';
      ctx.font = `bold ${Math.max(32, Math.floor(this.width / 22))}px sans-serif`;
      ctx.fillText('游戏结束', cx, this.height * 0.42);

      ctx.font = `${Math.max(16, Math.floor(this.width / 42))}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('按 空格 或 点击屏幕 重新开始', cx, this.height * 0.54);
    }
  }
}

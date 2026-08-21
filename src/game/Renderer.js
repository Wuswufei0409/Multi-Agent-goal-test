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
    /** 粒子系统（由 main.js 注入，阶段 4：爆炸粒子）。 */
    this.particles = null;
    /** 浮动得分文字（由 main.js 注入与 GameLoop 共享，阶段 4）。 */
    this.floatingTexts = [];
    /** 主循环引用（阶段 4：读取波次横幅等 HUD 状态）。 */
    this.gameLoop = null;
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

    // 阶段 4：粒子与浮动得分文字在所有游玩相关状态绘制（结算也保留收尾爆炸视觉）。
    if (this.particles) this.particles.draw(ctx);
    for (const t of this.floatingTexts) t.draw(ctx);

    // 阶段 4：波次横幅（存活期内居中显示“下一波”/波次号）。
    if (this.gameLoop && gameState.phase === GamePhase.PLAYING && this.gameLoop.waveBannerTimer > 0 && this.gameLoop.waveBannerText) {
      this.drawWaveBanner(this.gameLoop.waveBannerText, this.gameLoop.waveBannerTimer);
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
      // HUD（阶段 2 雏形 + 阶段 4 最高分/波次横幅来源）。
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `${Math.max(16, Math.floor(this.width / 50))}px monospace`;
      ctx.fillStyle = '#ffd54a';
      ctx.fillText(`分数 ${gameState.score}`, 16, 14);

      // 最高分（阶段 4）。
      ctx.font = `${Math.max(12, Math.floor(this.width / 70))}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(`最高 ${gameState.highScore}`, 16, 40);

      ctx.font = `${Math.max(14, Math.floor(this.width / 56))}px sans-serif`;
      ctx.fillStyle = '#7cff8a';
      let lives = '';
      for (let i = 0; i < gameState.lives; i++) lives += '♥ ';
      ctx.fillText(`生命 ${lives || '-'}`, 16, 64);

      ctx.textAlign = 'right';
      ctx.font = `${Math.max(12, Math.floor(this.width / 70))}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`波次 ${gameState.wave} · 敌机 ${this.enemies.length}`, this.width - 16, 14);

      ctx.textAlign = 'center';
      ctx.font = `${Math.max(12, Math.floor(this.width / 70))}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`方向键/WASD 或 拖拽移动 · 自动射击`, this.width / 2, this.height * 0.08);
    } else if (gameState.phase === GamePhase.GAME_OVER) {
      // 阶段 5：结算面板 — 居中半透明底 + 标题 + 本局结算数据（最终分数/最高分/到达波次/剩余命）
      // + 可点击的「重新开始」按钮视觉，配合空格/点击完成 结算→重开 闭环。
      const panelW = Math.min(this.width * 0.7, 420);
      const panelH = Math.min(this.height * 0.5, 260);
      const px = cx - panelW / 2;
      const py = this.height * 0.2;

      // 半透明底色卡片。
      ctx.fillStyle = 'rgba(10,15,30,0.82)';
      ctx.strokeStyle = 'rgba(124,255,138,0.35)';
      ctx.lineWidth = 2;
      this.roundRect(ctx, px, py, panelW, panelH, 14);
      ctx.fill();
      ctx.stroke();

      // 标题。
      ctx.fillStyle = '#ff7a7a';
      ctx.font = `bold ${Math.max(30, Math.floor(this.width / 24))}px sans-serif`;
      ctx.fillText('游戏结束', cx, py + 34);

      // 结算数据行。
      ctx.font = `${Math.max(16, Math.floor(this.width / 46))}px sans-serif`;
      ctx.fillStyle = '#ffd54a';
      ctx.fillText(`最终分数 ${gameState.score}`, cx, py + 78);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(`最高分 ${gameState.highScore}`, cx, py + 108);
      ctx.fillStyle = '#7cff8a';
      ctx.fillText(`到达波次 ${gameState.wave}`, cx, py + 138);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`剩余生命 ${Math.max(0, gameState.lives)}`, cx, py + 166);

      // 「重新开始」按钮（点击/空格）。
      const btnW = 190;
      const btnH = 40;
      const btnX = cx - btnW / 2;
      const btnY = py + panelH - btnH - 20;
      ctx.fillStyle = '#3aa0ff';
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(16, Math.floor(this.width / 50))}px sans-serif`;
      ctx.fillText('重新开始', cx, btnY + btnH / 2);

      // 操作提示（键盘/指针两种方式）。
      ctx.font = `${Math.max(12, Math.floor(this.width / 70))}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('按 空格 或 点击屏幕 / 按钮 重新开始', cx, this.height * 0.85);
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

  /**
   * drawWaveBanner(text, timer) — 绘制居中的波次横幅（新一波提示，阶段 4）。
   * @param {string} text 显示文本（如“波次 2”）
   * @param {number} timer 剩余显示时长（s），用于淡出
   */
  drawWaveBanner(text, timer) {
    const { ctx } = this;
    const cx = this.width / 2;
    const cy = this.height * 0.32;
    const alpha = Math.max(0, Math.min(1, Math.min(timer, 1)));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.max(40, Math.floor(this.width / 16))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7cff8a';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText(text, cx, cy);
    ctx.restore();
  }

  /**
   * roundRect(ctx, x, y, w, h, r) — 绘制圆角矩形路径（兼容部分环境无原生 ctx.roundRect）。
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x 左上角 x
   * @param {number} y 左上角 y
   * @param {number} w 宽
   * @param {number} h 高
   * @param {number} r 圆角半径
   */
  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

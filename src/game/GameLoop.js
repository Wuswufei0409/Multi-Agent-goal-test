/**
 * GameLoop — requestAnimationFrame 驱动的 update/render 主循环。
 * 阶段 1：接入固定步长保护（dt 上限）并驱动 状态机 / 滚动星空；
 * 输入触发开始/重开（空格或点击），Playing→GameOver 在后续阶段由实体/碰撞接入。
 */
import { GamePhase } from './GameState.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { Bullet } from './entities/Bullet.js';
import { ParticleSystem } from './ParticleSystem.js';
import { WaveManager } from './WaveManager.js';
import { FloatingText } from './FloatingText.js';

export class GameLoop {
  /**
   * @param {object} deps
   * @param {import('./Renderer.js').Renderer} deps.renderer
   * @param {import('./GameState.js').GameState} deps.gameState
   * @param {import('./Input.js').Input} deps.input
   * @param {import('./Background.js').Background} deps.background
   * @param {import('./Collision.js').Collision} deps.collision
   * @param {import('./ParticleSystem.js').ParticleSystem} [deps.particles] 阶段4粒子系统（可选，缺失则自建）
   */
  constructor({ renderer, gameState, input, background, collision, player, particles } = {}) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.input = input;
    this.background = background;
    this.collision = collision;
    /** 玩家实体（阶段 2 接入移动操控）。若未注入则自行创建并复位。 */
    this.player = player || new Player();
    this.player.reset(renderer ? renderer.width : 800, renderer ? renderer.height : 600);
    this._lastPointerActive = false;
    this._rafId = null;
    this._lastTime = 0;
    this._prevPhase = gameState ? gameState.phase : GamePhase.READY;
    this.running = false;

    // 阶段 3：子弹 / 敌机集合与生成节奏。
    /** @type {import('./entities/Bullet.js').Bullet[]} 场内子弹。 */
    this.bullets = [];
    /** @type {import('./entities/Enemy.js').Enemy[]} 场内敌机。 */
    this.enemies = [];
    /** 射击冷却计时（s）。 */
    this.shootCooldown = 0;
    /** 敌机生成倒计时（s）。 */
    this.spawnCooldown = 0;
    /** 射击间隔（s，约 6.7 发/秒）。 */
    this.shootInterval = 0.15;
    /** 敌机生成间隔（s，随波次略微加快）。 */
    this.spawnInterval = 1.0;
    /** 场上敌机数量上限（防无限残留挤占性能）。 */
    this.maxEnemies = 14;
    /** 敌机伤害：撞到玩家时扣命数；0 血则游戏结束。 */
    this.enemyDamage = 1;

    // 阶段 4：粒子系统 / 波次 / 浮动得分。
    /** 爆炸粒子系统（含自建兜底，保证单测可直接构造）。 */
    this.particles = particles || new ParticleSystem();
    /** @type {import('./FloatingText.js').FloatingText[]} 浮动得分文字。 */
    this.floatingTexts = [];
    /** 波次管理器（敌机配额/结算/过渡）。 */
    this.waveManager = new WaveManager();
    /** 波次完成奖励分。 */
    this.waveBonus = 50;
    /** 单架敌机击毁得分。 */
    this.enemyScore = 10;
    /** 决胜 HUD 提示：下一波横幅剩余计时（s）。 */
    this.waveBannerTimer = 0;
    /** 决胜 HUD 提示文本（如“波次 2”）。 */
    this.waveBannerText = '';
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick = (time) => {
    if (!this.running) return;

    // dt 上限 0.1s：切后台/卡顿后避免逻辑跳帧过大。
    const dt = Math.min((time - this._lastTime) / 1000, 0.1);
    this._lastTime = time;

    this.update(dt);
    this.render(dt);

    this._rafId = requestAnimationFrame(this._tick);
  };

  /**
   * update(dt) — 每帧推进：输入触发状态迁移 → 状态机计时 → 星空滚动。
   * 阶段 1 范围：主循环 + 状态机 + 滚动星空；实体/碰撞在阶段 2/3 接入。
   * @param {number} dt 秒
   */
  update(dt) {
    const gs = this.gameState;

    // 开始 / 重开触发：空格键按下或一次点击。
    const wantsStart = this.input.isDown('Space') || this.input.consumeClick();
    const prevPhase = gs.phase;

    if (gs.phase === GamePhase.READY && wantsStart) {
      gs.start();
    } else if (gs.phase === GamePhase.GAME_OVER && wantsStart) {
      gs.backToReady();
      gs.start();
    }
    // PLAYING → GAME_OVER 由后续阶段的生命/碰撞逻辑调用 gs.gameOver()。

    // 进入 PLAYING（新一局）时复位玩家与实体集合（分数/命数也已在 gs.start() 重置）。
    if (gs.phase === GamePhase.PLAYING && prevPhase !== GamePhase.PLAYING) {
      const w = this.renderer ? this.renderer.width : 800;
      const h = this.renderer ? this.renderer.height : 600;
      this.player.reset(w, h);
      this.bullets.length = 0;
      this.enemies.length = 0;
      this.shootCooldown = 0;
      this.spawnCooldown = this.spawnInterval; // 开局稍候再出敌，给玩家反应时间
      this._lastPointerActive = false;
      // 阶段 4：新局重置波次/粒子/浮动文字，并以当前波次同步 Banner。
      this.waveManager.reset(gs.wave || 1);
      this.particles.clear();
      this.floatingTexts.length = 0;
      this.waveBannerTimer = 0;
      this.waveBannerText = '';
    }
    // 结算/就绪阶段同样清空场上实体，避免重开时残留。
    if (gs.phase !== GamePhase.PLAYING && prevPhase === GamePhase.PLAYING) {
      this.bullets.length = 0;
      this.enemies.length = 0;
      // 阶段 4：结算同时清空粒子与浮动文字，避免残留。
      this.particles.clear();
      this.floatingTexts.length = 0;
      this.waveBannerTimer = 0;
    }
    this._prevPhase = gs.phase;
    gs.update(dt);

    // 玩家操控（阶段 2）：仅在游玩阶段生效。
    if (gs.phase === GamePhase.PLAYING) {
      const w = this.renderer ? this.renderer.width : 800;
      const h = this.renderer ? this.renderer.height : 600;

      // 指针拖拽优先：按住鼠标/触屏时目标跟随指针；否则用方向键/WASD。
      if (this.input.pointerActive) {
        this.player.follow(this.input.pointerX, this.input.pointerY, w, h, dt);
      } else {
        const intent = this.input.getMoveIntent();
        if (intent.x !== 0 || intent.y !== 0) {
          this.player.update(dt, intent, w, h);
        }
      }

      // 阶段 3：射击 / 敌机生成 / 实体推进 / 碰撞结算。
      this._updateCombat(dt, w, h);
      // 阶段 4：递减玩家受击无敌计时（每帧）。
      this.player.updateInvuln(dt);
      // 阶段 4：粒子与浮动文字持续更新。
      this.particles.update(dt);
      this._updateFloatingTexts(dt);
      this._updateWaveBanner(dt);
    } else {
      // 非游玩阶段不响应移动输入（避免 READY/结算状态幽灵移动）。
      this._lastPointerActive = false;
      // 结算/就绪阶段清空场上实体与粒子，避免命尽或重开后残留。
      this.bullets.length = 0;
      this.enemies.length = 0;
      this.particles.clear();
      this.floatingTexts.length = 0;
      this.waveBannerTimer = 0;
    }

    // 星空滚动（READY/PLAYING 下保持动态感）。
    this.background.update(dt);
  }

  /**
   * _updateCombat(dt, w, h) — 游玩阶段的战斗推进：
   * 自动射击（自机头连续开火）→ 生成敌机 → 推进子弹/敌机 → 剔除越界 → 碰撞结算。
   * @param {number} dt 秒
   * @param {number} w 画布逻辑宽
   * @param {number} h 画布逻辑高
   */
  _updateCombat(dt, w, h) {
    const gs = this.gameState;
    const wm = this.waveManager;

    // 1) 射击：冷却结束后自机头发射一枚向上子弹。
    this.shootCooldown -= dt;
    if (this.shootCooldown <= 0 && this.player.alive) {
      this.bullets.push(
        new Bullet({ x: this.player.x, y: this.player.y - this.player.height / 2 - 4 })
      );
      this.shootCooldown = this.shootInterval;
    }

    // 2) 敌机生成（受波次配额与场上上限双重约束，防止无限堆积）。
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0 && wm.canSpawn() && this.enemies.length < this.maxEnemies) {
      const e = new Enemy();
      e.spawn(w, h);
      this.enemies.push(e);
      wm.markSpawned();
      // 随波次略微加快敌机出现节奏（每波 +5%，下限 0.5s）。
      this.spawnInterval = Math.max(0.5, 1.0 - (gs.wave - 1) * 0.05);
      this.spawnCooldown = this.spawnInterval;
    }

    // 3) 推进子弹并在越界/命中后剔除；推进敌机并剔除越界/被击毁。
    for (const b of this.bullets) b.update(dt);
    for (const e of this.enemies) e.update(dt);

    // 4) 碰撞结算：先子弹-敌机（加分+爆炸粒子+浮动得分），再敌机-玩家（扣命）。
    const hitPositions = [];
    for (const b of this.bullets) {
      if (!b.active) continue;
      for (const e of this.enemies) {
        if (!e.active) continue;
        if (this.collisionAABB(b, e)) {
          b.active = false;
          e.active = false;
          // 阶段 4：命中加分（走 addScore 同步最高分）+
          // 击毁敌机爆炸粒子与浮动 +分。
          gs.addScore(this.enemyScore);
          hitPositions.push({ x: e.x, y: e.y });
          break;
        }
      }
    }
    for (const p of hitPositions) {
      this._onEnemyDestroyed(p.x, p.y);
    }

    //   敌机-玩家：无敌期忽略碰撞；否则扣命（受击进入短时无敌），命尽则结束。
    if (this.player.alive && !this.player.isInvulnerable()) {
      for (const e of this.enemies) {
        if (!e.active) continue;
        if (this.collisionAABB(this.player, e)) {
          e.active = false;
          gs.lives -= this.enemyDamage;
          this.player.takeHit();
          this._onPlayerHit(this.player.x, this.player.y);
          if (gs.lives <= 0) {
            gs.lives = 0;
            gs.gameOver();
            this._onPlayerDeath();
          }
          break;
        }
      }
    }

    // 5) 剔除并计数波次场上消耗：被击毁/越界都视为离开本波。
    const killedRemoved = this.enemies.filter((e) => !e.active).length;
    const survivedCount = this.enemies.length - killedRemoved;
    this.bullets = this.bullets.filter((b) => b.active && !b.isOutOfBounds(h));
    this.enemies = this.enemies.filter((e) => e.active && !e.isOutOfBounds(h));
    // 本帧被击毁 + 飞出边界的 都从波次场上计数扣除。
    const stepGone = killedRemoved + (survivedCount - this.enemies.length);
    for (let i = 0; i < stepGone; i++) wm.markGone();

    // 6) 波次推进：场上清零且本波配额已全出 → 波次完成，发奖励并进入过渡。
    this._advanceWaveIfCleared(dt, wm, gs);
  }

  /**
   * _onEnemyDestroyed(x, y) — 敌机被击毁的视觉反馈（爆炸粒子 + 浮动得分）。
   * @param {number} x
   * @param {number} y
   */
  _onEnemyDestroyed(x, y) {
    this.particles.burst(x, y, {
      count: 16,
      speed: 150,
      life: 0.6,
      size: 4,
      colors: ['#ff5a3c', '#ffb03c', '#ffd54a', '#ff7a7a'],
    });
    this._addFloatingText(`+${this.enemyScore}`, x, y, '#ffd54a');
  }

  /**
   * _onPlayerHit(x, y) — 玩家受击的视觉反馈（受击爆炸粒子）。
   * @param {number} x
   * @param {number} y
   */
  _onPlayerHit(x, y) {
    this.particles.burst(x, y, {
      count: 18,
      speed: 170,
      life: 0.6,
      size: 5,
      colors: ['#3aa0ff', '#7bc4ff', '#ffffff'],
      gravity: 60,
    });
  }

  /**
   * _onPlayerDeath() — 玩家死亡的大规模爆炸。
   */
  _onPlayerDeath() {
    this.particles.burst(this.player.x, this.player.y, {
      count: 42,
      speed: 260,
      life: 0.9,
      size: 6,
      colors: ['#3aa0ff', '#ff7a7a', '#ffffff', '#ffd54a'],
      gravity: 160,
    });
  }

  /**
   * _advanceWaveIfCleared(dt, wm, gs) — 波次完成时发放奖励并进入过渡，过渡结束后推进下一波。
   * 本方法每帧调用：刚清空时发波次奖励并开始过渡；过渡倒计时归零后进入下一波。
   * @param {number} dt 秒
   * @param {import('./WaveManager.js').WaveManager} wm
   * @param {import('./GameState.js').GameState} gs
   */
  _advanceWaveIfCleared(dt, wm, gs) {
    if (!wm.isWaveCleared()) {
      return; // 本波尚未清完，无波次推进。
    }
    // 首次检测到完成：发放波次奖励并开始过渡倒计时（仅一次）。
    if (wm.intermission <= 0) {
      const bonus = this.waveBonus * wm.wave;
      gs.addScore(bonus);
      this._addFloatingText(
        `波次 ${wm.wave} 奖励 +${bonus}`,
        this.renderer ? this.renderer.width / 2 : 400,
        this.renderer ? this.renderer.height * 0.3 : 180,
        '#7cff8a',
        22
      );
      wm.beginIntermission();
    }
    // 过渡倒计时推进；归零后进入下一波。
    if (wm.update(dt)) {
      wm.nextWave();
      gs.wave = wm.wave;
      this._showWaveBanner(`波次 ${wm.wave}`);
    }
  }

  /**
   * _addFloatingText(text, x, y, color, size) — 产生一条浮动得分/反馈文字。
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} [color]
   * @param {number} [size]
   */
  _addFloatingText(text, x, y, color, size) {
    const t = new FloatingText({ text, color: color || '#ffd54a', size: size || 16 });
    t.place(x, y);
    this.floatingTexts.push(t);
  }

  /**
   * _updateFloatingTexts(dt) — 推进并清理浮动文字。
   * @param {number} dt 秒
   */
  _updateFloatingTexts(dt) {
    for (const t of this.floatingTexts) t.update(dt);
    this.floatingTexts = this.floatingTexts.filter((t) => t.active);
  }

  /**
   * _updateWaveBanner(dt) — 递减波次横幅计时（视觉层消费）。
   * @param {number} dt 秒
   */
  _updateWaveBanner(dt) {
    if (this.waveBannerTimer > 0) this.waveBannerTimer -= dt;
    else this.waveBannerText = '';
  }

  /** 设置波次横幅（进入新一波时调用）。 */
  _showWaveBanner(text) {
    this.waveBannerText = text;
    this.waveBannerTimer = 2.0;
  }

  /**
   * collisionAABB(a, b) — 委托 Collision 判定（允许注入自定义实现，便于单测解耦）。
   * @param {{x:number,y:number,width:number,height:number}} a
   * @param {{x:number,y:number,width:number,height:number}} b
   */
  collisionAABB(a, b) {
    if (this.collision) return this.collision.aabbOverlap(a, b);
    return (
      Math.abs(a.x - b.x) <= (a.width + b.width) / 2 &&
      Math.abs(a.y - b.y) <= (a.height + b.height) / 2
    );
  }

  render(dt) {
    this.renderer.render(this.gameState, dt);
  }
}

/**
 * GameLoop — requestAnimationFrame 驱动的 update/render 主循环。
 * 阶段 1：接入固定步长保护（dt 上限）并驱动 状态机 / 滚动星空；
 * 输入触发开始/重开（空格或点击），Playing→GameOver 在后续阶段由实体/碰撞接入。
 */
import { GamePhase } from './GameState.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { Bullet } from './entities/Bullet.js';

export class GameLoop {
  /**
   * @param {object} deps
   * @param {import('./Renderer.js').Renderer} deps.renderer
   * @param {import('./GameState.js').GameState} deps.gameState
   * @param {import('./Input.js').Input} deps.input
   * @param {import('./Background.js').Background} deps.background
   * @param {import('./Collision.js').Collision} deps.collision
   */
  constructor({ renderer, gameState, input, background, collision, player } = {}) {
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
    }
    // 结算/就绪阶段同样清空场上实体，避免重开时残留。
    if (gs.phase !== GamePhase.PLAYING && prevPhase === GamePhase.PLAYING) {
      this.bullets.length = 0;
      this.enemies.length = 0;
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
    } else {
      // 非游玩阶段不响应移动输入（避免 READY/结算状态幽灵移动）。
      this._lastPointerActive = false;
      // 结算/就绪阶段清空场上实体，避免命尽或重开后残留。
      this.bullets.length = 0;
      this.enemies.length = 0;
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

    // 1) 射击：冷却结束后自机头发射一枚向上子弹。
    this.shootCooldown -= dt;
    if (this.shootCooldown <= 0 && this.player.alive) {
      this.bullets.push(
        new Bullet({ x: this.player.x, y: this.player.y - this.player.height / 2 - 4 })
      );
      this.shootCooldown = this.shootInterval;
    }

    // 2) 敌机生成（限制场上数量，防止无限堆积）。
    this.spawnCooldown -= dt;
    if (this.spawnCooldown <= 0 && this.enemies.length < this.maxEnemies) {
      const e = new Enemy();
      e.spawn(w, h);
      this.enemies.push(e);
      // 随波次略微加快敌机出现节奏（每波 +5%，最多 0.5s）。
      this.spawnInterval = Math.max(0.5, 1.0 - (gs.wave - 1) * 0.05);
      this.spawnCooldown = this.spawnInterval;
    }

    // 3) 推进子弹并在越界/命中后剔除；推进敌机并剔除越界/被击毁。
    for (const b of this.bullets) b.update(dt);
    for (const e of this.enemies) e.update(dt);

    // 4) 碰撞结算：先子弹-敌机（加分），再敌机-玩家（扣命）。
    //   子弹-敌机：同一发子弹只计一次命中。
    for (const b of this.bullets) {
      if (!b.active) continue;
      for (const e of this.enemies) {
        if (!e.active) continue;
        if (this.collisionAABB(b, e)) {
          b.active = false;
          e.active = false;
          gs.score += 10;
          break;
        }
      }
    }
    //   敌机-玩家：碰撞扣命，命尽则游戏结束；撞到后敌机消失。
    if (this.player.alive) {
      for (const e of this.enemies) {
        if (!e.active) continue;
        if (this.collisionAABB(this.player, e)) {
          e.active = false;
          gs.lives -= this.enemyDamage;
          if (gs.lives <= 0) {
            gs.lives = 0;
            gs.gameOver();
            break;
          }
        }
      }
    }

    // 5) 剔除非活跃/越界实体，防无限残留。
    this.bullets = this.bullets.filter((b) => b.active && !b.isOutOfBounds(h));
    this.enemies = this.enemies.filter((e) => e.active && !e.isOutOfBounds(h));
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

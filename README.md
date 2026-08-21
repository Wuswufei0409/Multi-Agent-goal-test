# 网页版飞机大战游戏（Multi-Agent-goal-test）

一个可直接在现代桌面浏览器中运行的网页版飞机大战游戏：玩家控制战机移动并自动发射子弹，敌机持续生成并下移；子弹击中敌机销毁敌机并加分，敌机撞玩家扣命、生命归零进入结算并可重新开始。

- **技术栈**：HTML5 Canvas + 原生 JavaScript（ES Modules）+ Vite
- **纯前端**：无后端、无打包产物提交、全程**零音频**（仅视觉反馈）
- **完整闭环**：就绪 → 游玩（计分/生命/波次/爆炸粒子/HUD）→ 结算 → 重开

## 游戏玩法

- **开始/重开**：按 `空格` 或点击 / 点击屏幕上的「重新开始」按钮
- **移动**：方向键 / `WASD`（含对角线等速、边界钳制），或按住鼠标/触屏拖拽跟随
- **射击**：自动开火（无需按键）
- **计分**：命中敌机 `+10`；波次清空发奖励 `+50×波数`；最高分跨局保留
- **生命**：初始 3 命；被敌机撞到扣 1 命并进入短暂无敌（闪烁反馈）
- **波次**：每波敌机配额递增并随波加快生成节奏；清空后发奖励并过渡到下一波
- **结束**：生命归零进入结算面板（最终分 / 最高分 / 到达波次 / 剩余生命）

## 启动方式

前置：安装 [Node.js](https://nodejs.org/)（建议 ≥ 18）与 npm。

```bash
# 1. 安装依赖
npm install

# 2. 开发模式（推荐，含热更新）
npm run dev
# 浏览器打开终端输出的本地地址，默认 http://localhost:5173

# 3. 生产构建 + 本地预览
npm run build      # 产物输出到 dist/
npm run preview    # 预览已构建产物（默认 http://localhost:4173）
```

打开页面后按 `空格` 即可开始一局游戏。

## 运行测试

```bash
node tests/stage2.test.mjs   # 阶段2：玩家移动/输入
node tests/stage3.test.mjs   # 阶段3：射击/敌机/碰撞
node tests/stage4.test.mjs   # 阶段4：计分/生命/波次/粒子
node tests/stage5.test.mjs   # 阶段5：结算/重开/HUD + 终检 D1/D2
node tests/smoke-main.mjs    # 主循环接线冒烟
```

## 目录结构

```
src/
  main.js            # 入口：装配 Renderer/GameLoop/Input/粒子 并启动主循环
  game/
    GameLoop.js      # 主循环 + 状态机 + 战斗结算 + 统一 reset/clearField
    GameState.js     # 状态机（READY/PLAYING/GAME_OVER）与计分/生命/波次
    Renderer.js      # 绘制：星空背景、玩家/敌机/子弹、HUD、结算面板
    Input.js         # 键盘/指针输入
    Background.js    # 三层视差滚动星空
    Collision.js     # AABB 碰撞
    ParticleSystem.js / entity/Particle.js  # 爆炸/特效粒子
    FloatingText.js  # 上飘浮动得分
    WaveManager.js   # 敌机波次配额/推进
    entities/        # Player / Enemy / Bullet
tests/               # 各阶段 node 单元测试
```

## 许可

[MIT](LICENSE)

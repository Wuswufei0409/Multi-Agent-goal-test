/**
 * Renderer — Canvas 绘制层。
 * 阶段 0：负责把 canvas 就位（清晰度对齐设备像素比）并做基础清屏，
 * 为后续阶段（背景/实体/粒子/HUD）提供统一绘制入口。
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();

    // 画布尺寸随窗口变化自适应。
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas.parentElement
      ? this.canvas.parentElement.getBoundingClientRect()
      : { clientWidth: window.innerWidth, clientHeight: window.innerHeight };
    const width = clientWidth || window.innerWidth;
    const height = clientHeight || window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.width = width;
    this.height = height;
  }

  /**
   * @param {import('./GameState.js').GameState} gameState
   * @param {number} dt
   */
  render(gameState, dt) {
    // 阶段 0：仅清屏。背景滚动/实体绘制在后续阶段接入。
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
    void gameState;
    void dt;
  }
}

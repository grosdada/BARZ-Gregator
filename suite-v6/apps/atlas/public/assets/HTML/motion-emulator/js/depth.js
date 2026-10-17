/**
 * depth.js — Depth Anything V2 (Small) via transformers.js.
 *
 * Prefers WebGPU (fp32) and automatically falls back to WASM (quantized q8).
 * We render from the raw `predicted_depth` tensor rather than the pipeline's
 * pre-normalized image so we can normalize with an exponential moving average
 * of the min/max across frames — this removes the frame-to-frame brightness
 * flicker that per-frame normalization causes.
 *
 * Depth Anything outputs *inverse* depth (larger = closer). We keep the
 * ControlNet/MiDaS convention: closer = brighter.
 */
import { CDN, COLORMAPS } from './constants.js';

const EMA_ALPHA = 0.25; // smoothing factor for the normalization window
const MAX_INPUT_WIDTH = 518; // model-side resolution cap (DA v2 native)

export class DepthEngine {
  constructor() {
    this.pipe = null;
    this.device = null;
    this._RawImage = null;
    this._ema = null; // {min, max}
    this._inCanvas = document.createElement('canvas');
    this._inCtx = this._inCanvas.getContext('2d', { willReadFrequently: true });
    this._outCanvas = document.createElement('canvas');
    this._outCtx = this._outCanvas.getContext('2d');
    this._loading = null;
  }

  get ready() {
    return !!this.pipe;
  }

  /** Lazy, idempotent load. Safe to call from several places at once. */
  load(onStatus) {
    if (this._loading) return this._loading;
    this._loading = this._load(onStatus).catch((err) => {
      this._loading = null; // allow retry
      throw err;
    });
    return this._loading;
  }

  async _load(onStatus) {
    onStatus?.('loading');
    const { pipeline, RawImage, env } = await import(CDN.transformers);
    // Fully OFFLINE (Prompt Atlas integration): weights and the ONNX runtime wasm are
    // served from the local vendor dir — same setup as the Blocking Studio depth path.
    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    env.localModelPath = CDN.transformersModels;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.wasmPaths = CDN.transformersWasm;
      env.backends.onnx.wasm.numThreads = 1;
    }
    this._RawImage = RawImage;

    const attempts = [];
    // fp16 on WebGPU (the vendored model ships fp16 + q8; fp32 stayed CDN-only)
    if (navigator.gpu) attempts.push({ device: 'webgpu', dtype: 'fp16' });
    attempts.push({ device: 'wasm', dtype: 'q8' });

    let lastErr;
    for (const opts of attempts) {
      try {
        this.pipe = await pipeline('depth-estimation', CDN.depthModel, opts);
        // Verify the backend actually works before committing to it.
        await this._selfCheck();
        this.device = opts.device;
        onStatus?.('ready', opts.device);
        return;
      } catch (err) {
        console.warn(`Depth backend "${opts.device}" failed, trying next.`, err);
        this.pipe = null;
        lastErr = err;
      }
    }
    onStatus?.('error');
    throw lastErr;
  }

  async _selfCheck() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#888';
    g.fillRect(0, 0, 64, 64);
    await this._infer(c);
  }

  /** Reset temporal normalization (call at the start of each clip/run). */
  resetNormalization() {
    this._ema = null;
  }

  async _infer(sourceCanvas) {
    const { width, height } = sourceCanvas;
    const id = sourceCanvas.getContext('2d').getImageData(0, 0, width, height);
    const img = new this._RawImage(new Uint8ClampedArray(id.data), width, height, 4);
    const out = await this.pipe(img);
    return out.predicted_depth; // Tensor, dims [..., h, w]
  }

  /**
   * Estimate depth for the current content of `frameCanvas` and paint the
   * colorized result onto `targetCtx` at (0, 0, targetW, targetH).
   * @param {HTMLCanvasElement} frameCanvas letterboxed source frame
   * @param {CanvasRenderingContext2D} targetCtx destination
   * @param {string} colormap 'gray' | 'turbo' | 'inferno'
   */
  async renderTo(frameCanvas, targetCtx, targetW, targetH, colormap = 'gray') {
    // Downscale the model input for speed; aspect is preserved.
    const scale = Math.min(1, MAX_INPUT_WIDTH / frameCanvas.width);
    const iw = Math.max(16, Math.round(frameCanvas.width * scale));
    const ih = Math.max(16, Math.round(frameCanvas.height * scale));
    if (this._inCanvas.width !== iw || this._inCanvas.height !== ih) {
      this._inCanvas.width = iw;
      this._inCanvas.height = ih;
    }
    this._inCtx.drawImage(frameCanvas, 0, 0, iw, ih);

    const tensor = await this._infer(this._inCanvas);
    const dims = tensor.dims;
    const dw = dims[dims.length - 1];
    const dh = dims[dims.length - 2];
    const data = tensor.data; // Float32Array of inverse depth

    // Frame min/max
    let mn = Infinity;
    let mx = -Infinity;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    // Temporal EMA so brightness is stable across the clip.
    if (!this._ema) this._ema = { min: mn, max: mx };
    else {
      this._ema.min += EMA_ALPHA * (mn - this._ema.min);
      this._ema.max += EMA_ALPHA * (mx - this._ema.max);
    }
    const lo = this._ema.min;
    const range = Math.max(1e-6, this._ema.max - lo);

    // Colorize into an ImageData at model resolution.
    const lut = COLORMAPS[colormap] || COLORMAPS.gray;
    const imageData = new ImageData(dw, dh);
    const px = imageData.data;
    for (let i = 0; i < dw * dh; i++) {
      let t = (data[i] - lo) / range;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const k = (t * 255) | 0; // inverse depth: near is already bright
      px[i * 4] = lut[k * 3];
      px[i * 4 + 1] = lut[k * 3 + 1];
      px[i * 4 + 2] = lut[k * 3 + 2];
      px[i * 4 + 3] = 255;
    }
    if (this._outCanvas.width !== dw || this._outCanvas.height !== dh) {
      this._outCanvas.width = dw;
      this._outCanvas.height = dh;
    }
    this._outCtx.putImageData(imageData, 0, 0);

    // Smooth upscale to the export resolution.
    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = 'high';
    targetCtx.drawImage(this._outCanvas, 0, 0, targetW, targetH);
  }
}

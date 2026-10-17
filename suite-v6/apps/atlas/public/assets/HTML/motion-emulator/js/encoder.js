/**
 * encoder.js — frame-accurate WebM video encoding.
 *
 * Primary path: WebCodecs VideoEncoder + webm-muxer. Because batch processing
 * runs slower (or faster) than real time, we must stamp each frame with its
 * *media* timestamp rather than wall-clock time — MediaRecorder cannot do
 * that, WebCodecs can. Falls back to MediaRecorder + canvas.captureStream()
 * on browsers without WebCodecs (output then plays at processing speed).
 */
import { CDN } from './constants.js';
import { sleep } from './utils.js';

export async function createEncoder(canvas, { fps, label = 'video' }) {
  if ('VideoEncoder' in window) {
    try {
      return await WebCodecsEncoder.create(canvas, fps);
    } catch (err) {
      console.warn(`WebCodecs encoder unavailable for ${label}; using MediaRecorder.`, err);
    }
  }
  return new MediaRecorderEncoder(canvas, fps);
}

/* ------------------------------------------------------------------ */

class WebCodecsEncoder {
  static async create(canvas, fps) {
    const { Muxer, ArrayBufferTarget } = await import(CDN.webmMuxer);
    const { width, height } = canvas;

    // Prefer VP9; fall back to VP8.
    const candidates = [
      { codec: 'vp09.00.10.08', muxCodec: 'V_VP9' },
      { codec: 'vp8', muxCodec: 'V_VP8' },
    ];
    let chosen = null;
    for (const c of candidates) {
      const support = await VideoEncoder.isConfigSupported({
        codec: c.codec, width, height, framerate: fps,
      });
      if (support.supported) { chosen = c; break; }
    }
    if (!chosen) throw new Error('No supported WebM video codec (VP9/VP8).');

    const enc = new WebCodecsEncoder();
    enc.canvas = canvas;
    enc.fps = fps;
    enc.frameIndex = 0;
    enc.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: chosen.muxCodec, width, height, frameRate: fps },
    });
    enc.error = null;
    enc.encoder = new VideoEncoder({
      output: (chunk, meta) => enc.muxer.addVideoChunk(chunk, meta),
      error: (e) => { enc.error = e; },
    });
    enc.encoder.configure({
      codec: chosen.codec,
      width,
      height,
      framerate: fps,
      bitrate: Math.min(14_000_000, Math.max(800_000, Math.round(width * height * fps * 0.14))),
    });
    return enc;
  }

  /** Encode the canvas' current content as the next frame. */
  async addFrame() {
    if (this.error) throw this.error;
    // Basic backpressure so we never queue unbounded frames in memory.
    while (this.encoder.encodeQueueSize > 4) await sleep(4);
    const usPerFrame = 1_000_000 / this.fps;
    const frame = new VideoFrame(this.canvas, {
      timestamp: Math.round(this.frameIndex * usPerFrame),
      duration: Math.round(usPerFrame),
    });
    const keyFrame = this.frameIndex % Math.max(1, Math.round(this.fps * 2)) === 0;
    this.encoder.encode(frame, { keyFrame });
    frame.close();
    this.frameIndex++;
  }

  async finalize() {
    await this.encoder.flush();
    if (this.error) throw this.error;
    this.muxer.finalize();
    return new Blob([this.muxer.target.buffer], { type: 'video/webm' });
  }

  dispose() {
    try { if (this.encoder.state !== 'closed') this.encoder.close(); } catch { /* noop */ }
  }
}

/* ------------------------------------------------------------------ */

class MediaRecorderEncoder {
  constructor(canvas, fps) {
    this.stream = canvas.captureStream(0);
    this.track = this.stream.getVideoTracks()[0];
    this.chunks = [];
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((m) => MediaRecorder.isTypeSupported(m));
    this.recorder = new MediaRecorder(this.stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start(250);
  }

  async addFrame() {
    // Push the current canvas content into the stream. Timing follows
    // wall-clock, so playback speed equals processing speed on this path.
    this.track.requestFrame?.();
  }

  finalize() {
    return new Promise((resolve) => {
      this.recorder.onstop = () =>
        resolve(new Blob(this.chunks, { type: this.recorder.mimeType || 'video/webm' }));
      this.recorder.stop();
    });
  }

  dispose() {
    try { if (this.recorder.state !== 'inactive') this.recorder.stop(); } catch { /* noop */ }
    this.track.stop();
  }
}

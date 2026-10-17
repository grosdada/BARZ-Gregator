/**
 * pose.js — MediaPipe Tasks Vision PoseLandmarker wrapper.
 *
 * Loads the 33-landmark pose model in VIDEO running mode and exposes a
 * detect() that returns both normalized landmarks (x, y, z in image space)
 * and worldLandmarks (metric meters, origin at the hip center).
 *
 * MediaPipe requires strictly monotonically increasing timestamps in VIDEO
 * mode; scrubbing backwards or restarting a batch would violate that, so we
 * maintain our own monotonic clock and only use the caller's time as a hint.
 */
import { CDN } from './constants.js';

export class PoseEngine {
  constructor() {
    this.landmarker = null;
    this.delegate = null;
    this._lastTs = 0;
    this._offset = 0;
  }

  get ready() {
    return !!this.landmarker;
  }

  /** Load the model. Tries the GPU delegate first, falls back to CPU. */
  async load(onStatus) {
    onStatus?.('loading');
    const { FilesetResolver, PoseLandmarker } = await import(CDN.mediapipeVision);
    const fileset = await FilesetResolver.forVisionTasks(CDN.mediapipeWasm);
    const options = (delegate) => ({
      baseOptions: { modelAssetPath: CDN.poseModel, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, options('GPU'));
      this.delegate = 'GPU';
    } catch (err) {
      console.warn('Pose GPU delegate unavailable, falling back to CPU.', err);
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, options('CPU'));
      this.delegate = 'CPU';
    }
    onStatus?.('ready', this.delegate);
  }

  /**
   * Run detection on a video/canvas/bitmap source.
   * @param {CanvasImageSource} source
   * @param {number} hintMs caller's media time in ms (may go backwards)
   * @returns {{landmarks:Array|null, world:Array|null}}
   */
  detect(source, hintMs = 0) {
    // Keep timestamps strictly increasing regardless of scrubbing direction.
    this._lastTs = Math.max(this._lastTs + 1, Math.round(hintMs) + this._offset);
    const res = this.landmarker.detectForVideo(source, this._lastTs);
    if (!res.landmarks || res.landmarks.length === 0) return { landmarks: null, world: null };
    return { landmarks: res.landmarks[0], world: res.worldLandmarks[0] };
  }

  /**
   * Call when a new independent time sequence begins (new file, batch start)
   * so the internal clock keeps increasing but tracking state resets cleanly.
   */
  newSequence() {
    this._offset = this._lastTs + 1000;
  }
}

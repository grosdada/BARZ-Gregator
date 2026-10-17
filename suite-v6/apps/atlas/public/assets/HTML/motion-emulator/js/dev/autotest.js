/**
 * dev/autotest.js — end-to-end smoke test, loaded ONLY with ?probe=1&autotest=1.
 *
 * Synthesizes a short animated clip entirely in the browser (WebCodecs →
 * WebM), loads it as if the user uploaded it, runs the full "Both +
 * side-by-side" pipeline at 8 fps, and reports pass/fail to the dev server.
 * A synthetic clip contains no person, so this also exercises the
 * "no pose detected" path; depth runs on every frame for real.
 */
import { createEncoder } from '../encoder.js';

const post = (e, d) => window.__probePost?.(e, d);

export async function run(app) {
  try {
    post('autotest-start');

    await window.__poseReady;
    post('pose-ready', { delegate: app.pose.delegate });

    // 1. Synthesize a 1.5 s, 24 fps, 320×240 test clip.
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 240;
    const g = c.getContext('2d');
    const enc = await createEncoder(c, { fps: 24, label: 'selftest-source' });
    for (let i = 0; i < 36; i++) {
      const t = i / 36;
      g.fillStyle = `hsl(${220 + t * 60}, 30%, ${12 + t * 10}%)`;
      g.fillRect(0, 0, 320, 240);
      g.fillStyle = '#e2e8f0';
      g.beginPath();
      g.arc(40 + t * 240, 120 + Math.sin(t * Math.PI * 4) * 50, 26, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f59e0b';
      g.fillRect(240 - t * 180, 170, 46, 46);
      await enc.addFrame();
    }
    const clip = await enc.finalize();
    post('clip-synthesized', { bytes: clip.size });

    // 2. Load it like a user upload.
    await app.loadVideoFile(new File([clip], 'selftest.webm', { type: 'video/webm' }));
    if (!app.video.videoWidth) throw new Error('synthesized clip failed to load');
    post('clip-loaded', { duration: app.video.duration });

    // 3. Configure: Both + side-by-side, 8 fps, source resolution, turbo cmap.
    document.querySelector('input[name="mode"][value="both"]').checked = true;
    document.getElementById('sbs-check').checked = true;
    document.getElementById('fps-select').value = '8';
    document.getElementById('res-select').value = 'source';
    document.getElementById('cmap-select').value = 'turbo';

    // 4. Full pipeline run (loads the depth model for real).
    await app.process();

    // 5. Assertions.
    const res = app.getResults();
    if (!res) throw new Error('no results after processing');
    const assert = (cond, msg) => { if (!cond) throw new Error(`assert failed: ${msg}`); };
    assert(res.blobs.depth?.size > 0, 'depth blob non-empty');
    assert(res.blobs.skeleton?.size > 0, 'skeleton blob non-empty');
    assert(res.blobs.sidebyside?.size > 0, 'sidebyside blob non-empty');
    const expected = Math.floor(app.video.duration * 8);
    assert(Math.abs(res.poseFrames.length - expected) <= 1, `poseFrames ${res.poseFrames.length} ≈ ${expected}`);
    assert(res.poseFrames.every((f) => 'detected' in f), 'pose frames well-formed');
    const prompt = document.getElementById('prompt-out').value;
    assert(prompt.length > 200 && prompt.includes('CONTROL'), 'prompt assembled');

    // 6. Optional: exercise the ffmpeg.wasm WebM→MP4 path (&mp4=1).
    let mp4Size = null;
    if (new URLSearchParams(location.search).has('mp4')) {
      post('mp4-start');
      const { webmToMp4 } = await import('../mp4.js');
      const mp4 = await webmToMp4(res.blobs.skeleton, () => {});
      const head = new Uint8Array(await mp4.slice(0, 12).arrayBuffer());
      const tag = String.fromCharCode(...head.slice(4, 8));
      assert(mp4.size > 0, 'mp4 blob non-empty');
      assert(tag === 'ftyp', `mp4 container signature (got "${tag}")`);
      mp4Size = mp4.size;
      post('mp4-ok', { bytes: mp4.size });
    }

    // 7. Clear-video resets the workspace (results were captured above).
    app.clearVideo();
    assert(!app.video.getAttribute('src'), 'video source removed after clear');
    assert(document.getElementById('btn-clear').classList.contains('hidden'), 'clear button hidden');
    assert(document.getElementById('scrub').disabled, 'transport disabled after clear');
    assert(!app.getResults(), 'results reset after clear');

    post('autotest-pass', {
      mp4Size,
      depthDevice: app.depth.device,
      poseDelegate: app.pose.delegate,
      frames: res.poseFrames.length,
      blobs: Object.fromEntries(Object.entries(res.blobs).map(([k, b]) => [k, b.size])),
      consoleErrors: window.__probeErrors,
    });
  } catch (err) {
    post('autotest-fail', { error: String(err?.stack || err), consoleErrors: window.__probeErrors });
  }
}

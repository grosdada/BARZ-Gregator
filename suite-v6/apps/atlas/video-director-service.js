import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { IMAGE_ANALYZER_MODELS } from "./image-analyzer-service.js";
import { buildPromptSkillContext } from "./lib/prompt-skill-router.js";

const execFileAsync = promisify(execFile);
const PROVIDER_KEYS = Object.freeze({ openai: "openaiApiKey", anthropic: "anthropicApiKey", google: "googleApiKey" });
const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024;
let cachedFfmpeg = "";

const SYSTEM = [
  "You are the Video Director Analyzer inside Prompt Atlas 6.",
  "Study the ordered keyframes, their timecodes, the selected source window, and the transcript when supplied.",
  "Infer action continuity, edits, camera movement, performance rhythm, lighting, sound, and likely cut points without inventing identities.",
  "Return strict JSON only with: analysis, klingPrompt, klingNegativePrompt, seedancePrompt, minimaxH3Prompt, flux3Prompt, wan3Prompt, duration, shots.",
  "klingPrompt: production-ready English, 1 to 6 explicitly timed shots, camera and subject movement, lighting, audio, motion intensity 0.0 to 3.0, total no longer than 15 seconds.",
  "klingNegativePrompt: concise comma-separated risks tailored to the scene.",
  "seedancePrompt: one flowing English paragraph, exactly 15 seconds, 3 to 7 shots separated by 'Cut to.', each with shot size, lens, angle, camera movement and action.",
  "minimaxH3Prompt: block-form English for MiniMax H3. Include Style, whole-second Shot blocks whose durations sum to the requested duration, mandatory native stereo Audio direction, and Settings. Do not compress it into a Seedance paragraph.",
  "flux3Prompt: production-ready English for FLUX 3 Video. Use 2 to 3 strongly contrasted SHOT blocks separated by the exact directive 'HARD CUT.', direct synchronized audio, and end with a settings line.",
  "wan3Prompt: one flowing chronological English director note for Wan 3.0, with the subject lock near the beginning, action, environment and light, camera choreography, and audio. Use 'Cut to.' for real cuts.",
  "shots: ordered objects with time, duration, frame, action, camera, motionIntensity.",
  "Required subject or background changes are absolute commands. Every positive prompt must state their exact requested wording and must replace, never merely accompany, the visible source subject or source environment. Preserve only the source timing, cuts, gestures, camera path and rhythm.",
  "When a transcript exists, preserve its dialogue and lipsync timing. Do not invent dialogue when none exists."
].join("\n");

function modelInfo(id) {
  return IMAGE_ANALYZER_MODELS.find((item) => item.id === id) ?? IMAGE_ANALYZER_MODELS.find((item) => item.id === "gpt-4.1-mini");
}

function dataUrl(value, prefix = "") {
  const match = /^data:([^;,]+)?(?:;[^,]*)?;base64,([a-z0-9+/=\r\n]+)$/i.exec(String(value || ""));
  if (!match || (prefix && !String(match[1] || "").startsWith(prefix))) return null;
  return { mime: match[1] || "application/octet-stream", base64: match[2].replace(/\s/g, ""), buffer: Buffer.from(match[2], "base64") };
}

function cleanJson(value) {
  return String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function text(value) {
  if (typeof value === "string") return value.trim();
  return value == null ? "" : String(value).trim();
}

function normalizeResult(raw, duration, body) {
  let parsed;
  try { parsed = JSON.parse(cleanJson(raw)); } catch { parsed = { analysis: cleanJson(raw) }; }
  const source = parsed?.prompt && typeof parsed.prompt === "object" ? parsed.prompt : parsed || {};
  const fallback = localResult(body.frames || [], duration, body);
  return {
    analysis: text(source.analysis || source.description) || fallback.analysis,
    klingPrompt: directedPrompt(text(source.klingPrompt || source.kling_prompt || source.kling) || fallback.klingPrompt, body),
    klingNegativePrompt: text(source.klingNegativePrompt || source.kling_negative_prompt || source.negativePrompt) || fallback.klingNegativePrompt,
    seedancePrompt: directedPrompt(text(source.seedancePrompt || source.seedance_prompt || source.seedance) || fallback.seedancePrompt, body),
    minimaxH3Prompt: directedPrompt(text(source.minimaxH3Prompt || source.minimax_h3_prompt || source.h3Prompt) || fallback.minimaxH3Prompt, body),
    flux3Prompt: directedPrompt(text(source.flux3Prompt || source.flux_3_prompt || source.fluxPrompt) || fallback.flux3Prompt, body),
    wan3Prompt: directedPrompt(text(source.wan3Prompt || source.wan_3_prompt || source.wanPrompt) || fallback.wan3Prompt, body),
    duration: Math.min(15, Math.max(1, Number(source.duration) || duration)),
    shots: Array.isArray(source.shots) ? source.shots.slice(0, 12) : fallback.shots
  };
}

function directedPrompt(prompt, body = {}) {
  const subject = text(body.subjectChange);
  const background = text(body.backgroundChange);
  const notes = text(body.notes);
  if (!subject && !background && !notes) return prompt;
  if (/^(?:MANDATORY SUBJECT REPLACEMENT|MANDATORY ENVIRONMENT REPLACEMENT|ADDITIONAL DIRECTION):/i.test(text(prompt))) return text(prompt);
  const commands = [
    subject ? `MANDATORY SUBJECT REPLACEMENT: ${subject}. The original visible subject must not appear.` : "",
    background ? `MANDATORY ENVIRONMENT REPLACEMENT: ${background}. The original visible environment must not appear.` : "",
    notes ? `ADDITIONAL DIRECTION: ${notes}.` : "",
    "Preserve the source only as a motion, framing, edit-rhythm and performance-timing reference."
  ].filter(Boolean);
  return `${commands.join("\n")}\n\n${text(prompt)}`;
}

function extractOpenAi(payload) {
  return text(payload?.output_text || payload?.output?.flatMap((item) => item.content || []).map((part) => part.text).filter(Boolean).join("\n"));
}

async function jsonResponse(fetchImpl, url, options) {
  const response = await fetchImpl(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.message || payload?.error || `Requête IA refusée (HTTP ${response.status}).`), { status: response.status });
  return payload;
}

async function callProvider({ fetchImpl, settings, model, userText, frames, system = SYSTEM }) {
  const info = modelInfo(model);
  const key = text(settings[PROVIDER_KEYS[info.provider]]);
  if (!key) throw Object.assign(new Error(`La clé ${info.provider === "google" ? "Google" : info.provider === "anthropic" ? "Anthropic" : "OpenAI"} n’est pas configurée.`), { status: 400 });
  const images = frames.map((frame) => dataUrl(frame.dataUrl, "image/")).filter(Boolean);
  if (info.provider === "anthropic") {
    const payload = await jsonResponse(fetchImpl, "https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: info.id, max_tokens: 5200, temperature: 0.45, system,
        messages: [{ role: "user", content: [
          { type: "text", text: userText },
          ...images.map((image) => ({ type: "image", source: { type: "base64", media_type: image.mime, data: image.base64 } }))
        ] }]
      })
    });
    return (payload.content || []).map((part) => part.text).filter(Boolean).join("\n");
  }
  if (info.provider === "google") {
    const request = (id) => jsonResponse(fetchImpl, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userText }, ...images.map((image) => ({ inlineData: { mimeType: image.mime, data: image.base64 } }))] }],
        generationConfig: { temperature: 0.45, maxOutputTokens: 5200, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    let payload;
    try { payload = await request(info.id); } catch (error) {
      if (!info.fallbackId || error.status !== 404) throw error;
      payload = await request(info.fallbackId);
    }
    return (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text).filter(Boolean).join("\n");
  }
  const payload = await jsonResponse(fetchImpl, "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: info.id,
      input: [
        { role: "system", content: system },
        { role: "user", content: [{ type: "input_text", text: userText }, ...frames.map((frame) => ({ type: "input_image", image_url: frame.dataUrl, detail: "high" }))] }
      ],
      max_output_tokens: 5200,
      temperature: 0.45
    })
  });
  return extractOpenAi(payload);
}

function localResult(frames, duration, body = {}) {
  const safeDuration = Math.min(15, Math.max(1, Number(duration) || 15));
  const subject = text(body.subjectChange) || "the visible subject";
  const background = text(body.backgroundChange) || "the source video environment";
  const transcript = text(body.transcript);
  const notes = text(body.notes);
  const count = Math.max(1, frames.length);
  const shotDuration = safeDuration / count;
  const shots = (frames.length ? frames : [{ time: 0 }]).map((frame, index) => ({
    time: Number(frame.time) || 0,
    duration: Number(shotDuration.toFixed(2)),
    frame: index + 1,
    action: "preserve the visible action and performance timing from this continuity anchor",
    camera: index % 3 === 0 ? "slow push-in" : index % 3 === 1 ? "gentle tracking move" : "subtle handheld drift",
    motionIntensity: index % 2 ? 1.2 : 1.4
  }));
  const shotText = shots.map((shot, index) => `Shot ${index + 1} (${shot.duration.toFixed(1)}s, motion intensity ${shot.motionIntensity.toFixed(1)}): ${subject} in ${background}; ${shot.action}. ${shot.camera}, stable identity and coherent physics.`).join(" Cut to. ");
  const wholeDuration = Math.min(15, Math.max(4, Math.round(safeDuration)));
  const h3ShotCount = wholeDuration >= 12 ? 5 : wholeDuration >= 8 ? 3 : wholeDuration >= 4 ? 2 : 1;
  const h3Durations = Array.from({ length: h3ShotCount }, () => Math.floor(wholeDuration / h3ShotCount));
  for (let index = 0; index < wholeDuration % h3ShotCount; index += 1) h3Durations[index] += 1;
  const h3Shots = h3Durations.map((shotLength, index) => {
    const shot = shots[index % shots.length];
    const lens = ["35mm", "50mm", "85mm", "24mm", "70mm"][index % 5];
    return `Shot ${index + 1} - ${shotLength} seconds. Camera: ${lens}, ${shot.camera}. ${subject} performs the corresponding source-video action in ${background}, ending the beat cleanly before the cut.`;
  }).join("\n\n");
  const fluxShots = shots.slice(0, Math.min(3, shots.length)).map((shot, index) => `SHOT ${["ONE", "TWO", "THREE"][index]}: ${subject} in ${background}; ${shot.action}. Camera: ${shot.camera}, ${["35mm wide", "50mm medium", "70mm close"][index]} framing. End on a readable completed action.`).join(" HARD CUT.\n");
  const wanShots = shots.slice(0, Math.min(4, shots.length)).map((shot, index) => `${index ? "Cut to. Re-anchor the same " : ""}${subject} in ${background}; ${shot.action}, filmed with ${shot.camera}.`).join(" ");
  const audio = transcript ? `Preserve the source dialogue and lipsync exactly: ${transcript}` : "No music. Diegetic ambience and action-synchronized foley only.";
  const fallback = {
    analysis: `The selected ${safeDuration.toFixed(1)}s window contains ${count} continuity anchor(s). Preserve subject identity, wardrobe, action, camera path, edit rhythm, lighting and background layout.${transcript ? ` Transcript: ${transcript}` : " No transcript was available."}`,
    klingPrompt: `Kling 3 prompt, total ${safeDuration.toFixed(1)}s. ${shotText}${transcript ? ` Dialogue and lipsync timing: ${transcript}` : " Diegetic sound only."}`,
    klingNegativePrompt: "temporal flicker, morphing, identity drift, unstable anatomy, deformed hands, background drift, inconsistent physics, warped objects, compression artifacts",
    seedancePrompt: `Wide shot, 35mm lens, eye-level angle, slow push-in: ${subject} in ${background} begins the source action. Cut to. Medium shot, 50mm lens, eye-level angle, gentle tracking move: continue the exact gesture timing with stable identity. Cut to. Close-up, 70mm lens, slight low angle, subtle handheld drift: finish the action with matching light and texture. Photo real, natural framing. Audio: ${transcript ? `preserve this dialogue and lipsync: ${transcript}` : "diegetic sound only - natural ambience, environmental foley, and subject-driven sound."}`,
    minimaxH3Prompt: `Style: cinematic motion reconstruction, source-video pacing and cut rhythm, coherent natural light, stable subject and environment continuity.\n\n${h3Shots}\n\nAudio, native stereo: ${audio}\n\nSettings: 16:9, 2K, ${wholeDuration} seconds.`,
    flux3Prompt: `Mode: text-to-video reconstruction, ${Math.max(5, Math.round(safeDuration))} seconds.\n${fluxShots}\nAudio: ${audio} No on-screen text, no subtitles.\nSettings: 16:9, 1080p, audio on, grounding on.`,
    wan3Prompt: `Multi-shot motion reconstruction, performance-led and physically grounded. Lock the subject as ${subject}, consistently staged in ${background}. ${wanShots} Preserve the source camera path, gesture rhythm, cut timing and lighting logic. Audio: ${audio} Settings: 1080P, 16:9, ${Math.max(2, Math.round(safeDuration))} seconds, audio on.`,
    duration: safeDuration,
    shots
  };
  return {
    ...fallback,
    klingPrompt: directedPrompt(fallback.klingPrompt, body),
    seedancePrompt: directedPrompt(fallback.seedancePrompt, body),
    minimaxH3Prompt: directedPrompt(fallback.minimaxH3Prompt, body),
    flux3Prompt: directedPrompt(fallback.flux3Prompt, body),
    wan3Prompt: directedPrompt(fallback.wan3Prompt, body)
  };
}

function extension(mime, fileName, fallback = ".mp4") {
  const named = path.extname(String(fileName || "")).toLowerCase();
  if (named && named.length <= 8) return named;
  if (/webm/i.test(mime)) return ".webm";
  if (/wav/i.test(mime)) return ".wav";
  if (/mpeg|mp3/i.test(mime)) return ".mp3";
  if (/quicktime/i.test(mime)) return ".mov";
  return fallback;
}

function safeStem(value) {
  return String(value || "video").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "video";
}

async function resolveFfmpeg() {
  if (cachedFfmpeg) return cachedFfmpeg;
  const candidates = [process.env.FFMPEG_PATH, "ffmpeg", "C:\\ffmpeg\\bin\\ffmpeg.exe", "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      if (candidate !== "ffmpeg") await access(candidate);
      await execFileAsync(candidate, ["-version"], { timeout: 5000, windowsHide: true });
      cachedFfmpeg = candidate;
      return candidate;
    } catch {}
  }
  throw Object.assign(new Error("FFmpeg est introuvable. Installe FFmpeg puis redémarre Prompt Atlas."), { status: 503 });
}

async function withMedia(body, prefix, callback) {
  const media = dataUrl(body.mediaDataUrl || body.videoDataUrl);
  if (!media) throw Object.assign(new Error("Aucun média valide n’a été fourni."), { status: 400 });
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  const input = path.join(directory, `input${extension(media.mime, body.fileName)}`);
  try { await writeFile(input, media.buffer); return await callback({ directory, input, media }); }
  finally { await rm(directory, { recursive: true, force: true }).catch(() => {}); }
}

function trim(body) {
  return { start: Math.max(0, Number(body.trimStart) || 0), duration: Math.min(15, Math.max(0.5, Number(body.duration) || 15)) };
}

function exportRange(body) {
  if (!body.original) return trim(body);
  return {
    start: 0,
    duration: Math.max(0.5, Number(body.sourceDuration) || Number(body.duration) || 15)
  };
}

export function createVideoDirectorService({ getSettings, fetchImpl = globalThis.fetch } = {}) {
  if (typeof getSettings !== "function") throw new TypeError("Video Director requires a settings provider.");

  async function analyze(body = {}) {
    const frames = Array.isArray(body.frames) ? body.frames.filter((frame) => dataUrl(frame?.dataUrl, "image/")).slice(0, 8) : [];
    const transcript = text(body.transcript).slice(0, 3000);
    if (!frames.length && !transcript) throw Object.assign(new Error("Aucun photogramme ni transcript à analyser."), { status: 400 });
    const duration = Math.min(15, Math.max(1, Number(body.duration) || 15));
    const settings = await getSettings();
    const info = modelInfo(body.model || settings.model);
    const timing = frames.map((frame, index) => `Frame ${index + 1}: +${Number(frame.time || 0).toFixed(2)}s (source ${Number(frame.sourceTime ?? frame.time ?? 0).toFixed(2)}s)`).join("\n");
    const userText = [
      `Analyze the selected ${duration.toFixed(2)} second window from ${text(body.fileName) || "the source media"}.`,
      timing ? `Ordered continuity anchors:\n${timing}` : "This is audio-only input; infer no visual facts beyond the written direction.",
      transcript ? `Transcript/dialogue:\n${transcript}` : "No transcript is available. Do not invent dialogue.",
      text(body.subjectChange) ? `Required subject change: ${text(body.subjectChange).slice(0, 800)}` : "",
      text(body.backgroundChange) ? `Required background change: ${text(body.backgroundChange).slice(0, 800)}` : "",
      text(body.notes) ? `Additional direction: ${text(body.notes).slice(0, 1200)}` : ""
    ].filter(Boolean).join("\n\n");
    try {
      const skills = await buildPromptSkillContext({
        media: "video",
        targetEngine: "Kling 3, Seedance 2.0, MiniMax H3, FLUX 3 Video, Wan 3.0",
        task: "video-analysis",
        maxChars: 70000
      });
      const system = skills.text ? `${SYSTEM}\n\n${skills.text}` : SYSTEM;
      const raw = await callProvider({ fetchImpl, settings, model: info.id, userText, frames, system });
      return {
        ...normalizeResult(raw, duration, { ...body, frames, transcript }),
        model: info.id,
        provider: info.provider,
        warning: "",
        skillTrace: { available: skills.available, version: skills.version, sections: skills.sections }
      };
    } catch (error) {
      if (error.status === 400) throw error;
      return { ...localResult(frames, duration, { ...body, transcript }), model: "local-video-fallback", provider: "local", warning: `${error.message} Une synthèse locale a été utilisée.` };
    }
  }

  async function transcribe(body = {}) {
    const settings = await getSettings();
    const key = text(settings.openaiApiKey);
    if (!key) return { transcript: "", model: TRANSCRIPTION_MODEL, warning: "Clé OpenAI absente : transcript non généré." };
    return withMedia(body, "barz-director-transcribe-", async ({ directory, input, media }) => {
      let upload = input;
      try {
        const ffmpeg = await resolveFfmpeg();
        const output = path.join(directory, "trim.mp3");
        const range = trim(body);
        await execFileAsync(ffmpeg, ["-y", "-ss", range.start.toFixed(3), "-t", range.duration.toFixed(3), "-i", input, "-map", "0:a:0?", "-vn", "-codec:a", "libmp3lame", "-q:a", "5", output], { timeout: 90000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
        upload = output;
      } catch {}
      const buffer = await readFile(upload);
      if (buffer.length > MAX_TRANSCRIPTION_BYTES) return { transcript: "", model: TRANSCRIPTION_MODEL, warning: "Le média dépasse la limite de transcription OpenAI de 25 Mo." };
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: upload === input ? media.mime : "audio/mpeg" }), `${safeStem(body.fileName)}${upload === input ? extension(media.mime, body.fileName) : ".mp3"}`);
      form.append("model", TRANSCRIPTION_MODEL);
      form.append("response_format", "json");
      const payload = await jsonResponse(fetchImpl, "https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
      return { transcript: text(payload.text).slice(0, 5000), model: TRANSCRIPTION_MODEL, warning: "" };
    });
  }

  async function sampleFrames(body = {}) {
    return withMedia(body, "barz-director-frames-", async ({ directory, input }) => {
      const ffmpeg = await resolveFfmpeg();
      const range = trim(body);
      const count = Math.min(8, Math.max(3, Number(body.frameCount) || 6));
      const frames = [];
      for (let index = 0; index < count; index += 1) {
        // Sample at the centre of each interval. Seeking exactly on the first or
        // last timestamp is unreliable with short/GOP-compressed media and can
        // leave FFmpeg without a decodable frame near EOF.
        const relative = range.duration * (index + 0.5) / count;
        const sourceTime = range.start + relative;
        const output = path.join(directory, `frame-${index}.jpg`);
        await execFileAsync(ffmpeg, ["-y", "-ss", sourceTime.toFixed(3), "-i", input, "-frames:v", "1", "-vf", "scale='min(960,iw)':-2,format=yuvj420p", "-q:v", "5", "-threads", "1", output], { timeout: 45000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
        const image = await readFile(output);
        frames.push({ time: relative, sourceTime, dataUrl: `data:image/jpeg;base64,${image.toString("base64")}` });
      }
      return { duration: range.duration, trimStart: range.start, frames, extractor: "ffmpeg" };
    });
  }

  async function exportMedia(body = {}) {
    return withMedia(body, "barz-director-export-", async ({ directory, input }) => {
      const ffmpeg = await resolveFfmpeg();
      const range = exportRange(body);
      const kind = String(body.exportType || "mp3");
      const stem = safeStem(body.fileName);
      let output; let args; let contentType; let fileName;
      if (kind === "black-mp4") {
        const width = Math.max(2, Math.round(Math.min(640, Number(body.width) || 640) / 2) * 2);
        const ratio = (Number(body.width) || 16) / (Number(body.height) || 9);
        const height = Math.max(2, Math.round((width / ratio) / 2) * 2);
        output = path.join(directory, "black.mp4"); contentType = "video/mp4"; fileName = `${stem}_black-audio.mp4`;
        args = ["-y", "-ss", range.start.toFixed(3), "-t", range.duration.toFixed(3), "-i", input, "-f", "lavfi", "-i", `color=c=black:s=${width}x${height}:r=24`, "-map", "1:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", "-movflags", "+faststart", output];
      } else if (kind === "mp4-trimmed") {
        output = path.join(directory, "trimmed.mp4"); contentType = "video/mp4"; fileName = `${stem}_trimmed.mp4`;
        args = ["-y", "-ss", range.start.toFixed(3), "-t", range.duration.toFixed(3), "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", output];
      } else {
        output = path.join(directory, "audio.mp3"); contentType = "audio/mpeg"; fileName = `${stem}_${range.start ? "trimmed-" : ""}audio.mp3`;
        args = ["-y", "-ss", range.start.toFixed(3), "-t", range.duration.toFixed(3), "-i", input, "-map", "0:a:0?", "-vn", "-codec:a", "libmp3lame", "-q:a", "4", output];
      }
      await execFileAsync(ffmpeg, args, { timeout: 180000, windowsHide: true, maxBuffer: 5 * 1024 * 1024 });
      return { buffer: await readFile(output), contentType, fileName };
    });
  }

  async function webmToMp4(body = {}) {
    return withMedia({ ...body, fileName: body.fileName || "motion-emulator.webm" }, "barz-motion-mp4-", async ({ directory, input }) => {
      const ffmpeg = await resolveFfmpeg();
      const output = path.join(directory, "motion-emulator.mp4");
      await execFileAsync(ffmpeg, [
        "-y", "-i", input, "-map", "0:v:0", "-map", "0:a:0?",
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-movflags", "+faststart", output
      ], { timeout: 300000, windowsHide: true, maxBuffer: 5 * 1024 * 1024 });
      return { buffer: await readFile(output), contentType: "video/mp4", fileName: "motion-emulator.mp4" };
    });
  }

  return { analyze, transcribe, sampleFrames, exportMedia, webmToMp4 };
}

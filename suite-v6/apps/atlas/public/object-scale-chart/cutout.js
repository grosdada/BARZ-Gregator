/* Local automatic cutout: edge colour learning, connected-background growth and matte feathering. */
(function (root) {
  const sq = n => n * n;
  const distance = (a, b) => Math.sqrt(sq(a[0] - b[0]) + sq(a[1] - b[1]) + sq(a[2] - b[2]));
  const sideCount = mask => ((mask & 1) > 0) + ((mask & 2) > 0) + ((mask & 4) > 0) + ((mask & 8) > 0);

  function borderSamples(data, width, height) {
    const samples = [];
    const step = Math.max(1, Math.floor(Math.max(width, height) / 320));
    const depth = Math.max(1, Math.min(3, Math.floor(Math.min(width, height) / 80)));
    const add = (x, y, side) => {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 20) samples.push({ color: [data[i], data[i + 1], data[i + 2]], side });
    };
    for (let d = 0; d < depth; d++) {
      for (let x = 0; x < width; x += step) { add(x, d, 1); add(x, height - 1 - d, 2); }
      for (let y = 0; y < height; y += step) { add(d, y, 4); add(width - 1 - d, y, 8); }
    }
    return samples;
  }

  function backgroundClusters(samples) {
    if (!samples.length) return [];
    const k = Math.min(5, samples.length);
    const global = samples.reduce((a, s) => a.map((v, i) => v + s.color[i]), [0, 0, 0]).map(v => v / samples.length);
    const means = [samples.reduce((best, s) => distance(s.color, global) > distance(best.color, global) ? s : best, samples[0]).color.slice()];
    while (means.length < k) {
      const candidate = samples.reduce((best, s) => {
        const score = Math.min(...means.map(m => distance(s.color, m)));
        return score > best.score ? { score, color: s.color } : best;
      }, { score: -1, color: samples[0].color });
      if (candidate.score < 3) break;
      means.push(candidate.color.slice());
    }
    let assignment = new Uint8Array(samples.length);
    for (let iteration = 0; iteration < 7; iteration++) {
      const sums = means.map(() => [0, 0, 0, 0]);
      samples.forEach((sample, i) => {
        let best = 0, bestDistance = Infinity;
        means.forEach((mean, j) => { const d = distance(sample.color, mean); if (d < bestDistance) { best = j; bestDistance = d; } });
        assignment[i] = best;
        sums[best][0] += sample.color[0]; sums[best][1] += sample.color[1]; sums[best][2] += sample.color[2]; sums[best][3]++;
      });
      sums.forEach((sum, i) => { if (sum[3]) means[i] = [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]]; });
    }
    const stats = means.map(mean => ({ mean, count: 0, sides: 0, variance: 0 }));
    samples.forEach((sample, i) => { const stat = stats[assignment[i]]; stat.count++; stat.sides |= sample.side; stat.variance += sq(distance(sample.color, stat.mean)); });
    return stats
      .filter(stat => stat.count / samples.length >= .055 && (sideCount(stat.sides) >= 2 || stat.count / samples.length >= .3))
      .map(stat => ({ mean: stat.mean, radius: Math.max(8, Math.sqrt(stat.variance / Math.max(1, stat.count))) * 1.8 }));
  }

  function autoCutout(imageData, strength = 55) {
    const { data, width, height } = imageData;
    if (!data || !width || !height || data.length !== width * height * 4) throw new Error('Image invalide pour le détourage.');
    const total = width * height;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 245) transparent++;
    if (transparent / total > .025) return { removedRatio: transparent / total, skipped: true, message: 'Transparence existante conservée.' };

    const clusters = backgroundClusters(borderSamples(data, width, height));
    if (!clusters.length) return { removedRatio: 0, skipped: true, message: 'Fond non détecté : image originale conservée.' };
    const sensitivity = Math.max(5, Math.min(95, Number(strength) || 55));
    const base = 7 + sensitivity * .43;
    const localLimit = 5 + sensitivity * .2;
    const score = i => {
      const p = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
      return Math.min(...clusters.map(c => distance(p, c.mean) / (base + c.radius)));
    };
    const seen = new Uint8Array(total), background = new Uint8Array(total), queue = new Int32Array(total);
    let head = 0, tail = 0;
    const seed = i => { if (!seen[i]) { seen[i] = 1; if (data[i * 4 + 3] < 20 || score(i) <= 1.15) queue[tail++] = i; } };
    for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
    const tryPixel = (next, current) => {
      if (seen[next]) return;
      seen[next] = 1;
      const a = next * 4, b = current * 4;
      const local = Math.sqrt(sq(data[a] - data[b]) + sq(data[a + 1] - data[b + 1]) + sq(data[a + 2] - data[b + 2]));
      const global = score(next);
      if (data[a + 3] < 20 || global <= 1 || (global <= 2.35 && local <= localLimit)) queue[tail++] = next;
    };
    while (head < tail) {
      const i = queue[head++]; background[i] = 1;
      const x = i % width;
      if (x) tryPixel(i - 1, i); if (x < width - 1) tryPixel(i + 1, i);
      if (i >= width) tryPixel(i - width, i); if (i < total - width) tryPixel(i + width, i);
    }
    const removedRatio = tail / total;
    if (removedRatio < .008) return { removedRatio, skipped: true, message: 'Fond insuffisamment distinct : image originale conservée.' };
    if (removedRatio > .94) return { removedRatio, skipped: true, message: 'Sujet non isolé : image originale conservée. Réduisez la précision.' };

    const originalAlpha = new Uint8ClampedArray(total);
    for (let i = 0; i < total; i++) originalAlpha[i] = data[i * 4 + 3];
    for (let i = 0; i < total; i++) {
      if (background[i]) { data[i * 4 + 3] = 0; continue; }
      const x = i % width, neighbours = [];
      if (x) neighbours.push(i - 1); if (x < width - 1) neighbours.push(i + 1);
      if (i >= width) neighbours.push(i - width); if (i < total - width) neighbours.push(i + width);
      if (neighbours.some(n => background[n])) data[i * 4 + 3] = Math.min(originalAlpha[i], 190);
    }
    return { removedRatio, skipped: false, message: `Fond retiré (${Math.round(removedRatio * 100)} % de l’image).` };
  }

  root.AutoCutout = { autoCutout, borderSamples, backgroundClusters };
  if (typeof module !== 'undefined') module.exports = root.AutoCutout;
})(typeof globalThis !== 'undefined' ? globalThis : this);

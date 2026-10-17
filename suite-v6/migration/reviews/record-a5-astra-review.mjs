// Records the A5 texts manually read by Astra. Input hashes freeze these decisions.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { validateAstraReview } from './validate-astra-review.mjs';

async function pinned(relative, digest) {
  const raw = await readFile(new URL(relative, import.meta.url));
  if (createHash('sha256').update(raw).digest('hex') !== digest) throw new Error(`Reviewed input changed: ${relative}`);
  return JSON.parse(raw.toString('utf8'));
}
const bundleDigest = 'b567221eaa252af043205238fe3b7c45f7d885a74ccad9424ec020936018bafd';
const fixtureDigest = '10d892af5c6d69bfc30b438e9331340c567e8d587fa3a125f32d8b8b99eee369';
const corpusDigest = 'bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126';
const bundle = JSON.parse(await readFile(new URL('../atlas-v5/semantic-review/astra-bundles/a5-veo-precision.json', import.meta.url), 'utf8'));
if (bundle.bundleDigest !== bundleDigest || bundle.items.length !== 223) throw new Error('A5 bundle changed.');
const fixture = await pinned('./a5-legacy-fixtures.json', fixtureDigest);
const corpus = await pinned('../atlas-v5/prompt-literals.json', corpusDigest);
const sourcePath = fixture.source.path;
const cards = fixture.veoPrecision.cards;
const bodies = new Set(cards.flatMap(card => card.prompts));
const metadata = new Set([
  ...fixture.veoPrecision.sections.map(section => section.title),
  ...cards.flatMap(card => [card.title, ...card.labels])
]);
if (cards.length !== 22 || bodies.size !== 110) throw new Error('Reviewed catalog changed.');

const corrections = new Map([
  [58, {
    before: 'circular fisheye, full 180° sphere visible in circular frame, extreme distortion, black circular vignette border, psychedelic.',
    after: 'circular fisheye, 180° field of view visible in circular frame, extreme distortion, black circular vignette border, psychedelic.',
    reason: 'Une sphère complète et un champ de 180° sont confondus. Nommer le champ conserve le cadrage circulaire voulu.',
    evidence: 'https://www.nikon.com/company/news/2017/0531_lens_01/'
  }],
  [154, {
    before: 'crash zoom, extreme rapid zoom-in, violent magnification, slamming focus onto subject, kung fu cinema energy.',
    after: 'crash zoom, extremely rapid zoom-in, violent magnification, slamming focus onto subject, kung fu cinema energy.',
    reason: 'Adverbe extremely requis devant rapid ; même mouvement et même vigueur.'
  }],
  [156, {
    before: '16mm news reel footage, documentary grain, slightly overlit, journalistic camera work, archival news film aesthetic.',
    after: '16mm newsreel footage, documentary grain, slightly overlit, journalistic camera work, archival news film aesthetic.',
    reason: 'Newsreel est le nom composé des actualités filmées.'
  }],
  [197, {
    before: 'tilt-shift miniature effect, making real scenes look like tiny models, extreme shallow focus band, toylike perspective.',
    after: 'tilt-shift miniature effect, making real scenes look like tiny models, extremely shallow focus band, toylike perspective.',
    reason: 'Adverbe extremely requis devant shallow ; effet miniature inchangé.'
  }]
]);
for (const [index, correction] of corrections) {
  if (bundle.items[index].value !== correction.before || !bodies.has(correction.before)) throw new Error(`Correction changed: ${index}`);
}
// All remaining non-catalog values were read individually in the source runtime.
const technicalBundleIndices = new Set([21,29,31,40,65,68,78,89,93,108,138,139,144,149,178,180,187,203]);
function record(item, sourceIndex, technicalIndices, correction) {
  const base = { id: item.id, sourceIndex, originalValue: item.value };
  if (correction) return {
    ...base, action: 'correct', role: 'prompt-body', correctedValue: correction.after,
    reason: correction.reason, ...(correction.evidence ? { evidence: correction.evidence } : {})
  };
  if (bodies.has(item.value)) return { ...base, action: 'preserve', role: 'prompt-body' };
  if (metadata.has(item.value)) return {
    ...base, action: 'exclude-non-prompt', role: 'catalog-metadata', retainInCatalog: true,
    reason: 'Nom de famille, carte ou variante lu et conservé comme métadonnée de navigation ; le compilateur utilise le corps associé, pas ce libellé.'
  };
  if (!technicalIndices.has(sourceIndex)) throw new Error(`Unreviewed value: ${sourceIndex} ${item.value}`);
  return {
    ...base, action: 'exclude-non-prompt', role: 'interface-or-runtime',
    reason: 'Identifiant, message, titre de page ou balisage lu dans le runtime VEO Precision. Conserver sa fonction hors prompt compilé ; aucune suppression de fonctionnalité.'
  };
}
const decisions = bundle.items.map((item, index) => record(item, index, technicalBundleIndices, corrections.get(index)));
const review = {
  schemaVersion: '1.0', bundleId: bundle.id, bundleDigest,
  status: 'reviewed', reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-12',
  scope: 'All 223 bundle values, all 110 fixture bodies and catalog metadata, fixture states/output and source composition/event handlers read. 81 omitted source-scoped literals reviewed in supplement. Runtime migration pending.',
  decisions
};
const summary = validateAstraReview(bundle, review);

const bundleIds = new Set(bundle.items.map(item => item.id));
const extra = corpus.literals.filter(item => !bundleIds.has(item.id) && item.occurrences.some(o => o.sourcePath === sourcePath))
  .sort((a, b) => a.id.localeCompare(b.id));
if (extra.length !== 81) throw new Error('Supplement selection changed.');
const technicalExtraIndices = new Set([2,6,9,10,12,13,14,18,19,23,25,26,29,31,33,37,38,39,41,45,46,49,50,51,54,55,59,60,63,67,68,70,71,74,76,79,80]);
const extraDecisions = extra.map((item, index) => ({
  ...record(item, index, technicalExtraIndices),
  occurrences: item.occurrences.filter(o => o.sourcePath === sourcePath)
}));
const reviewedBodies = new Set([...decisions, ...extraDecisions].filter(d => d.role === 'prompt-body').map(d => d.originalValue));
if (reviewedBodies.size !== 110 || [...bodies].some(body => !reviewedBodies.has(body))) throw new Error('A5 prompt coverage incomplete.');
const corrected = new Map([...corrections.values()].map(c => [c.before, c.after]));
const catalog = cards.map(card => ({
  key: card.key, title: card.title, section: card.section,
  variants: card.prompts.map((body, index) => {
    const literal = corpus.literals.find(item => item.value === body && item.occurrences.some(o => o.sourcePath === sourcePath));
    if (!literal) throw new Error(`Missing provenance: ${card.key}/${index}`);
    return {
      id: `veo-suite-${card.key}-${index}`, index,
      label: card.key === 'film16mm' && index === 2 ? 'Newsreel' : card.labels[index],
      originalLabel: card.labels[index], originalPrompt: body,
      prompt: corrected.get(body) ?? body, literalId: literal.id,
      occurrences: literal.occurrences.filter(o => o.sourcePath === sourcePath)
    };
  })
}));
const configured = fixture.veoPrecision.configuredState;
const configuredLayers = [configured.incoming, ...catalog.filter(card => configured.active[card.key])
  .map(card => card.variants[configured.values[card.key]].prompt)];
const supplement = {
  schemaVersion: '1.0', status: 'reviewed', reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-12',
  fixtureDigest, corpusDigest, source: fixture.source,
  additionalLiteralCount: extra.length, decisions: extraDecisions, catalog,
  scope: 'Source-scoped decisions only: shared literal IDs do not approve other owners. Metadata excluded from compilation remains in the catalog.',
  metadataCorrections: [{
    cardKey: 'film16mm', variantIndex: 2, before: 'News Reel', after: 'Newsreel',
    reason: 'Orthographe du nom composé, en accord avec la correction du corps.'
  }],
  behavioralDecisions: [
    { id: 'discrete-variants', decision: 'Keep five ordered variants per stable card key; initial index 2. Label the control Variante, not an intensity percentage: lateral track, static looks and camera brands are categorical choices.' },
    { id: 'canonical-composition', decision: 'Incoming layer first, then active cards in source section/card order; never activation order. V6 joins intact nonempty layers with newline to fix legacy period-comma boundaries. Do not normalize user text or infer time, ratio or model settings from it.' },
    { id: 'clear-versus-reset', decision: 'Clear All deactivates cards and clears incoming but retains variant indices and collapsed sections, matching legacy. Defaults reset restores index 2 and collapsed sections, checkpointing setup state and keeping personal variants.' },
    { id: 'incoming-layer', decision: 'Maintain one replaceable setup-scoped incoming layer with source metadata; repeated delivery replaces it instead of concatenating. Retain legacy camera-suite target alias mapped to veo-suite. Validate message origin, source window and string payload. No inference of media references.' },
    { id: 'generic-video-fragments', decision: 'Keep title BZ Camera Suite, owner veo-suite and a movable placement in the camera workshop. No hardcoded Veo model, duration, aspect or resolution: this source only compiles camera/look fragments. Deck and Backstage stay fixed.' },
    { id: 'safe-declarative-rendering', decision: 'Store five variant records and stable IDs declaratively, expose edits as setup overlay, and render user labels/bodies as text. Keep compilation/state/bridge in an adapter; no evaluation or inline handlers from imported libraries.' },
    { id: 'preserve-combinations', decision: 'Keep multi-card combinations even if aesthetically contradictory. No automatic exclusivity, sorting, prompt rewriting or filtering; user sees the complete compiled preview.' }
  ],
  approvedExpectedOutputs: {
    defaultComposite: '',
    configuredLayers,
    configuredComposite: configuredLayers.join('\n'),
    defaultSingleOutputs: catalog.map(card => ({ key: card.key, ...card.variants[2] }))
  },
  fixtureLimitations: [
    'Fixture captures one combined state, all body texts and 22 median outputs; it does not execute toggle, clear, copy or message handling. Sol must verify these transitions.',
    'Legacy has no setup persistence; V6 persistence is a deliberate addition through the existing setup service.',
    'Changing a variant does not activate an inactive legacy card. Single-copy works for inactive cards; composite excludes them.',
    'Raw legacy HTML must remain unchanged. Source hash should be checked against fixture before porting.'
  ]
};
await mkdir(new URL('../atlas-v5/semantic-review/astra-reviews/', import.meta.url), { recursive: true });
for (const relative of ['./a5-astra.review.json', '../atlas-v5/semantic-review/astra-reviews/a5-veo-precision.review.json']) {
  await writeFile(new URL(relative, import.meta.url), JSON.stringify(review, null, 2) + '\n');
}
await writeFile(new URL('./a5-astra-supplement.review.json', import.meta.url), JSON.stringify(supplement, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, supplemental: extra.length,
  supplementalPrompts: extraDecisions.filter(d => d.role === 'prompt-body').length,
  retainedMetadata: [...decisions, ...extraDecisions].filter(d => d.role === 'catalog-metadata').length,
  reviewedPromptBodies: reviewedBodies.size, catalogVariants: catalog.flatMap(c => c.variants).length
}, null, 2));

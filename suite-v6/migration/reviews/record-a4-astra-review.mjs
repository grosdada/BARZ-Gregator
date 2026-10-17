// Serializes decisions manually read by Astra; refuses changes to reviewed inputs.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateAstraReview } from './validate-astra-review.mjs';

const hash = raw => createHash('sha256').update(raw).digest('hex');
async function pinned(relative, digest) {
  const raw = await readFile(new URL(relative, import.meta.url));
  if (hash(raw) !== digest) throw new Error(`Reviewed input changed: ${relative}`);
  return JSON.parse(raw.toString('utf8'));
}
const bundleDigest = 'c56499d141b9c30bb61e0a94aa8dd1219d2caea34d0328e06b6e54be9fe2759d';
const fixtureDigest = '425aaa55c476c923d0eb8d78a9e9b0e3b722a21cac39434380b0c5df3c9f9cea';
const corpusDigest = 'bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126';
const bundle = JSON.parse(await readFile(new URL('../atlas-v5/semantic-review/astra-bundles/a4-facs-board.json', import.meta.url), 'utf8'));
if (bundle.bundleDigest !== bundleDigest || bundle.items.length !== 175) throw new Error('A4 bundle changed.');
const fixture = await pinned('./a4-legacy-fixtures.json', fixtureDigest);
const corpus = await pinned('../atlas-v5/prompt-literals.json', corpusDigest);
const preserve = new Set([1,7,8,10,12,14,16,17,18,20,21,23,24,25,26,28,31,34,35,39,40,42,43,44,45,47,49,50,52,54,55,56,57,60,61,62,64,65,67,70,77,79,85,89,101,105,107,108,110,114,116,117,118,120,126,128,131,132,133,135,138,147,150,156,164,165,167,169,170,171]);
const exclude = new Set([0,2,3,4,5,6,11,13,15,19,22,27,29,30,32,33,36,37,38,41,46,48,51,53,58,59,63,66,68,69,71,72,73,74,75,76,78,80,81,82,83,84,86,87,88,90,91,92,93,94,95,96,97,98,99,100,102,103,104,106,109,111,112,113,115,119,121,122,123,124,125,127,129,130,134,136,137,139,140,142,143,145,148,149,151,152,153,154,155,157,158,159,160,162,163,166,168,172,173]);
const corrections = new Map([
  [9, { before: ' cinematic panels, focused on ', after: ' cinematic panels. Action / choreography: ', reason: 'Le champ action peut contenir un verbe conjugué : focused on crosses est agrammatical. Un libellé autonome accepte aussi les groupes nominaux sans réécrire la saisie.' }],
  [141, { before: 'head turns toward subject left into a three-quarter view', after: "head turns toward the subject's left into a three-quarter view", reason: 'Ajout du possessif ; la direction reste celle du personnage.' }],
  [144, { before: 'head turns toward subject right into a three-quarter view', after: "head turns toward the subject's right into a three-quarter view", reason: 'Ajout du possessif ; la direction reste celle du personnage.' }],
  [146, { before: 'head tilts toward the subject left shoulder', after: "head tilts toward the subject's left shoulder", reason: 'Ajout du possessif sans modifier le mouvement.' }],
  [161, { before: 'head tilts strongly toward the subject right shoulder', after: "head tilts strongly toward the subject's right shoulder", reason: 'Ajout du possessif ; la variante forte est conservée.' }],
  [174, { before: 'head tilts toward the subject right shoulder', after: "head tilts toward the subject's right shoulder", reason: 'Ajout du possessif sans modifier le mouvement.' }]
]);
for (let i = 0; i < 175; i++) {
  if ([preserve.has(i), exclude.has(i), corrections.has(i)].filter(Boolean).length !== 1) throw new Error(`Missing or overlapping manual decision ${i}`);
}
const decisions = bundle.items.map((item, sourceIndex) => {
  const base = { id: item.id, sourceIndex, originalValue: item.value };
  if (corrections.has(sourceIndex)) {
    const { before, after, reason } = corrections.get(sourceIndex);
    if (item.value !== before) throw new Error(`Correction text changed: ${sourceIndex}`);
    return { ...base, action: 'correct', correctedValue: after, reason };
  }
  if (preserve.has(sourceIndex)) return { ...base, action: 'preserve' };
  return { ...base, action: 'exclude-non-prompt', reason: 'Texte lu dans son contexte : identifiant, balisage, aide, exemple de saisie ou état de l’interface. Conserver ce rôle hors texte compilé ; aucune fonctionnalité ni donnée utilisateur supprimée.' };
});
const review = {
  schemaVersion: '1.0', bundleId: bundle.id, bundleDigest,
  status: 'reviewed', reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-12',
  scope: '175 bundle values, complete A4 fixture and relevant source composition read. 209 additional source-scoped literals reviewed separately. No runtime implementation.',
  decisions
};
const summary = validateAstraReview(bundle, review);

// These source ranges were inspected manually; shared/context-only values need
// source-scoped decisions and must not approve other owners of the same string.
function inScope(o) {
  return (o.sourcePath.endsWith('/facs_sheet_generator.html') &&
    ((o.line >= 233 && o.line <= 333) || (o.line >= 343 && o.line <= 347) || (o.line >= 662 && o.line <= 715))) ||
    (o.sourcePath.endsWith('/barzy-board.html') &&
    ((o.line >= 575 && o.line <= 635) || (o.line >= 749 && o.line <= 758) || (o.line >= 936 && o.line <= 1025) ||
    [330,331,332,333,334,343,349,358,359,360,361,362,445,446,447,464,484,485,486,487].includes(o.line)));
}
const ids = new Set(bundle.items.map(x => x.id));
const additional = corpus.literals.filter(x => !ids.has(x.id) && x.occurrences.some(inScope)).sort((a,b) => a.id.localeCompare(b.id));
if (additional.length !== 209) throw new Error('A4 supplemental selection changed.');
const extraExcluded = new Set([2,3,8,9,10,16,17,25,29,33,35,38,39,45,50,54,58,61,65,68,70,75,76,77,81,83,90,91,97,98,104,121,130,138,143,148,151,155,159,163,175,182,187,192,193,195,202]);
const extraDecisions = additional.map((x, sourceIndex) => ({
  id: x.id, sourceIndex, originalValue: x.value,
  occurrences: x.occurrences.filter(inScope),
  action: extraExcluded.has(sourceIndex) ? 'exclude-non-prompt' : 'preserve',
  reason: extraExcluded.has(sourceIndex)
    ? 'Clé technique, groupe ou libellé affiché ; conserver hors sortie compilée. Décision limitée aux deux sources A4.'
    : 'Nom/code FACS, description visible, valeur de réglage ou fragment de composition lu et conservé. Appliquer les règles de mapping séparées ; aucune validation des autres ateliers partageant ce littéral.'
}));
const corrected = new Map(decisions.filter(x => x.action === 'correct').map(x => [x.originalValue, x.correctedValue]));
const catalog = fixture.facsSheet.units.map(unit => {
  const canonicalCode = unit.code === 'AU58' ? 'AU51' : unit.code === 'AU58B' ? 'AU58' : unit.code.replace(/B$/, '');
  const variant = ['AU56B', 'AU57B'].includes(unit.code) ? 'deep' : 'standard';
  return {
    id: `facs-${canonicalCode.toLowerCase()}${variant === 'deep' ? '-deep' : ''}`,
    canonicalCode, variant, label: `${canonicalCode}${variant === 'deep' ? ' (deep)' : ''}`,
    name: unit.name, category: unit.cat, sheetPosition: unit.n,
    legacySheetCode: unit.code,
    legacyBoardCode: variant === 'standard' ? canonicalCode : null,
    originalVisible: fixture.facsSheet.visibleByCode[unit.code],
    visible: corrected.get(fixture.facsSheet.visibleByCode[unit.code]) ?? fixture.facsSheet.visibleByCode[unit.code]
  };
});
if (new Set(catalog.map(x => x.id)).size !== 49) throw new Error('Canonical FACS IDs collide.');
const supplementary = {
  schemaVersion: '1.0', status: 'reviewed', reviewerModel: 'gpt-6-astra', reviewedAt: '2026-09-12',
  fixtureDigest, corpusDigest, sources: fixture.sources,
  additionalLiteralCount: additional.length, decisions: extraDecisions,
  catalog,
  metadataCorrections: [
    { sourcePath: fixture.sources[1].path, line: 630, before: 'Langue & machoire', after: 'Langue & mâchoire', reason: 'Accent manquant dans le titre de groupe ; aucun changement du prompt.' },
    { sourcePath: fixture.sources[0].path, line: 183, before: 'Download FACS sheet', after: 'Import FACS sheet', reason: 'Ce bouton ouvre un fichier du disque pour importer une planche, il ne télécharge rien.' }
  ],
  behavioralDecisions: [
    { id: 'source-scoped-facs-identity', decision: 'Use stable catalog IDs, canonicalCode and variant. Map Sheet AU58 to AU51 and AU58B to AU58; keep AU56B and AU57B as distinct deep variants. Never resolve AU58 using code alone without source/schema or unambiguous legacy name. Keep sheet positions and source crop keys.' },
    { id: 'complete-board-output', decision: 'Remove silent final 4950-character truncation and the 420/300/220 field truncations. Preserve 49 complete entries and final sentence. Any actual provider limit belongs to explicit bridge validation; never discard text to satisfy an unverified historical limit.' },
    { id: 'cue-transfer', decision: 'Transfer structured cue IDs, variant and visible text; do not append a generated FACS paragraph permanently into the editable action. Repeated transfers are idempotent; removing a cue removes its generated instructions. Preserve imported legacy action verbatim and require explicit editing for ambiguous old paragraphs.' },
    { id: 'motion-facs-inheritance', decision: 'Represent inherit-story versus custom explicitly. Migrate nonempty legacy motion selection to custom and empty selection to inherit-story. Custom empty means no cues; do not repopulate it silently.' },
    { id: 'local-card-persistence', decision: 'Keep stable media IDs outside recipe text. Record ordered crop mapping, original sheet and cropVersion. Import from the legacy origin explicitly because IndexedDB on port 3783 is not accessible from port 4326. Do not auto-recrop or relabel the pixels of saved images.' }
  ],
  fixtureLimitations: [
    'defaultFullBoardPrompt was generated with empty stub fields. It is the fallback case, not initial HTML fields populated from defaultText.',
    'Fixture covers five individual FACS outputs and configured Board examples, not exhaustive input combinations or empty/default Board state. Sol must extend witnesses before porting.',
    'Legacy full-board witnesses intentionally retain truncated text. V6 expectations must explicitly restore the complete template and all cells.',
    'Source inventories are heuristically filtered. Supplemental corpus decisions cover omitted prompt data in inspected ranges; no claim that all unrelated UI/CSS/runtime literals were semantically reviewed.'
  ]
};
await mkdir(new URL('../atlas-v5/semantic-review/astra-reviews/', import.meta.url), { recursive: true });
for (const relative of ['./a4-astra.review.json', '../atlas-v5/semantic-review/astra-reviews/a4-facs-board.review.json']) {
  await writeFile(new URL(relative, import.meta.url), JSON.stringify(review, null, 2) + '\n');
}
await writeFile(new URL('./a4-astra-supplement.review.json', import.meta.url), JSON.stringify(supplementary, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, supplemental: extraDecisions.length, supplementalPreserved: extraDecisions.filter(x => x.action === 'preserve').length, catalogEntries: catalog.length }, null, 2));

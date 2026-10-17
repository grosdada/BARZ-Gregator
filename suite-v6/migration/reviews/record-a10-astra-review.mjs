// Astra A10 review record and output oracle. Not an application adapter.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateAstraReview } from './validate-astra-review.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
async function pinned(relative, hash) {
  const bytes = await readFile(new URL(relative, import.meta.url));
  assert.equal(sha(bytes), hash, relative);
  return JSON.parse(bytes);
}
const fixtureDigest = 'c4a4fe9729b68f19cd1051037fa01d27bcc75616c0c2847fdaef9f419d2b4468';
const corpusDigest = 'bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126';
const fixture = await pinned('./a10-legacy-fixtures.json', fixtureDigest);
const bundle = await pinned('../atlas-v5/semantic-review/astra-bundles/a10-multishot.json',
  '78e484ec6546f75c5f482d77b45eca5aafdea1966f9bd0322c717adb6365d319');
const corpus = await pinned('../atlas-v5/prompt-literals.json', corpusDigest);
const source = await readFile('E:/Fable 5-Project/Meat Journey/' + fixture.source.path, 'utf8');
assert.equal(sha(source), fixture.source.sha256);
const m = fixture.multishot;

// One-based positions in the signed bundle: each value has been read in full.
const preserved = new Set([2,7,8,13,14,17,20,21,26,27,28,30,32,33,37,39,43,44,
  46,48,50,51,54,58,60,61,63,64,69,73,74,75,76,81,83,88,89,92,95,96,98,99,
  103,104,105,106,107,111,116,117,120,121,124,125,132,140,145,148,149,152,154]);
const excluded = new Set([1,3,5,6,11,12,15,16,18,22,23,24,25,29,31,34,35,36,
  38,40,41,42,45,47,49,52,55,56,57,59,65,66,67,68,70,71,72,77,78,79,80,
  82,85,86,87,90,91,93,94,97,100,101,102,108,110,112,113,114,115,118,
  122,126,128,129,130,131,133,137,138,139,141,142,143,144,146,150,151,153]);
const corrections = new Map();
function change(index, reason, replacements) {
  let value = bundle.items[index - 1].value;
  for (const [before, after] of replacements) {
    assert.ok(value.includes(before), `Missing correction ${index}: ${before}`);
    value = value.split(before).join(after);
  }
  corrections.set(index, { correctedValue: value, reason });
}
change(4, 'Le flat lay final retire les accessoires du corps : distinguer leur identité du placement.', [
  ['All accessories, jewelry, footwear must remain identical across frames. No styling changes. Perfect consistency.',
    'All accessories, jewelry and footwear must retain their exact identity, materials and colors across frames. Keep styling unchanged in worn views; the final flat lay shows those same accessories removed and arranged separately.']
]);
change(9, 'Les anciens titres de rangée supposent trois colonnes alors que 2x3 signifie deux colonnes.', [
  ['**Row 1 (Static & Observational):**', '**Beats 1–3 (Static & Observational):**'],
  ['**Row 2 (Dynamic & Conceptual):**', '**Beats 4–6 (Dynamic & Conceptual):**']
]);
change(10, 'La buée de respiration n’est pas cohérente avec la plage chaude décrite.', [
  ['Breath visible, slight smile.', 'A quiet breath and a slight smile.']
]);
change(19, 'Éviter le changement inexpliqué entre midi et golden hour dans une même séquence.', [
  ['High noon.', 'Late afternoon, near sunset.']
]);
change(53, 'Les angles incluent des changements de cadrage et une référence stylisée doit rester stylisée.', [
  ['Change ONLY the camera angle between panels.', 'Change ONLY the camera viewpoint and framing between panels.'],
  ['sharp focus, high detail, photoreal.',
    "sharp focus, high detail, preserving the source image's rendering style."]
]);
change(62, 'Remplacer l’override contradictoire par un plan de panneaux déjà compilé au bon nombre.', [
  [bundle.items[61].value,
    '${gridHeader}\n\n${sceneContext}\n\nPanel plan:\n${panelList}\n\n${continuityAndStyle}']
]);
change(84, 'La surface réfléchissante de l’œil est la cornée ; le plan doit rester optiquement lisible.', [
  ["Detective's pupil reflects the suspect's face.",
    "The suspect's face is reflected on the detective's cornea, over the iris."]
]);
change(109, 'Corriger les fautes grammaticales et le nom propre sans changer le look.', [
  ['the a full body shot', 'a full body shot'],
  ['looking past the camera slightly bored expression',
    'looking past the camera with a slightly bored expression'],
  ['fuji velvia', 'Fuji Velvia'], ['over exposed', 'overexposed']
]);
change(119, 'Maintenir la même fin de journée du duel jusqu’à son dernier plan.', [
  ['High noon.', 'Late afternoon, near sunset.'],
  ['Harsh sunlight creating stark shadows.', 'Low, hard sunlight creating long, stark shadows.']
]);
for (const index of [123,147]) change(index,
  'Les références à des numéros de plans deviennent fausses lorsque la grille est redécoupée.', [
    ['distinct from Frames 1 and 2', 'distinct from the close portrait and overhead views']
  ]);
change(127, 'Un POV pare-brise ne peut simultanément montrer la mâchoire et les yeux du conducteur.', [
  ["**Tight POV From Subject B's Car:** Windshield view, Subject B's hands gripping the wheel, determination etched in his jaw and eyes.",
    "**Tight Interior Shot From Subject B's Car:** From the front passenger side, frame Subject B's face, hands gripping the wheel and part of the windshield; determination is etched in his jaw and eyes."]
]);
change(134, 'Employer la cornée réfléchissante plutôt que la pupille.', [
  ["Detective's pupil reflects suspect's face.",
    "The suspect's face is reflected on the detective's cornea, over the iris."]
]);
change(135, 'Une itération de la même référence ne doit pas changer arbitrairement vêtements et matières.', [
  ['but invent new scene beats, camera moments, wardrobe and material details, lighting and atmosphere.',
    'but invent new scene beats and camera moments while preserving the current character identities, wardrobe, materials, lighting and environment. Preserve the exact panel count and chronological order.']
]);
change(136, 'Six vues limitées à un demi-tour plus un détail ne couvrent pas un tour complet.', [
  ['Rotate around subject systematically showing all viewpoints.',
    'Show the following selected viewpoints systematically; this selection is not a complete 360-degree survey.'],
  ['Required 6-Frame 360° Documentation', 'Required 6-Frame Selected-View Documentation']
]);

const meta = new Set([
  ...m.camera.entries.flatMap(x => [x.name, x.type, x.subType, x.context]),
  ...m.sequences.entries.map(x => x.title), ...m.actionBoards.entries.map(x => x.title)
]);
const exclusionReason = value => meta.has(value)
  ? 'Métadonnée du catalogue ou aide caméra ; conservée dans l’interface, pas ajoutée au prompt copié.'
  : 'Code, sélecteur, identifiant ou texte d’interface ; conservé comme provenance, exclu du prompt final.';
const decisions = bundle.items.map((item, i) => {
  const n = i + 1;
  assert.equal(Number(preserved.has(n)) + Number(excluded.has(n))
    + Number(corrections.has(n)), 1, `Undecided or duplicate ${n}`);
  return { id: item.id, sourceIndex: n, originalValue: item.value,
    occurrences: item.occurrences,
    ...(preserved.has(n) ? { action: 'preserve' } : excluded.has(n)
      ? { action: 'exclude-non-prompt', reason: exclusionReason(item.value) }
      : { action: 'correct', ...corrections.get(n) }) };
});
const review = { schemaVersion: '1.0', bundleId: bundle.id,
  bundleDigest: bundle.bundleDigest, status: 'reviewed', reviewerModel: 'gpt-6-astra',
  reviewedAt: '2026-09-13', decisions };
const summary = validateAstraReview(bundle, review);
const ids = new Set(bundle.items.map(x => x.id));
const extra = corpus.literals.filter(x => !ids.has(x.id)
  && x.occurrences.some(o => o.sourcePath === fixture.source.path))
  .sort((a,b) => a.id.localeCompare(b.id));
assert.equal(extra.length, 89);
const extraDecisions = extra.map(item => ({ id: item.id, originalValue: item.value,
  occurrences: item.occurrences.filter(o => o.sourcePath === fixture.source.path),
  action: 'exclude-non-prompt', reason: exclusionReason(item.value) }));

// Run the actual V5 display/Copy handlers in an isolated DOM harness.
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return source.slice(a,b);
}
const harness = `
  let captured;
  class Element {
    constructor() { this.children=[]; this.nodes={}; this.handlers={}; this._html=''; }
    set innerHTML(value) { this._html=value; this.children=[]; this.nodes={}; }
    get innerHTML() { return this._html; }
    appendChild(item) { this.children.push(item); }
    querySelector(selector) {
      if(!this.nodes[selector]) this.nodes[selector]=new Element();
      return this.nodes[selector];
    }
    addEventListener(event, handler) { this.handlers[event]=handler; }
  }
  const elements={};
  const document={ createElement:()=>new Element(),
    getElementById:id=>elements[id]||(elements[id]=new Element()) };
  function copyToClipboard(text) { captured=text; }
  let atlasGrid, multishotGrid, actionboardGrid;
` + section('const multishotDataBase = [', '// State for flash toggle')
  + section('const cameraData = [', '// Render camera table')
  + section('const MULTI_ANGLE_POOL = [', 'function copyMultiAnglePrompt')
  + section('function adaptGridPrompt(', 'function applyAtlasGrid(')
  + section('let hardFlashEnabled = true;', '// Iterate intelligent');
const context = vm.createContext(Object.create(null), {
  codeGeneration: { strings: false, wasm: false }
});
vm.runInContext(harness, context, { timeout: 1000 });
const evalJson = expression => JSON.parse(vm.runInContext(`JSON.stringify(${expression})`,
  context, { timeout: 1000 }));
assert.deepEqual(evalJson('MULTI_ANGLE_POOL'), m.multiAnglePool);
assert.deepEqual(evalJson('cameraData'), m.camera.entries);
let compared = 0;
for (const scenario of Object.values(m.scenarios)) {
  for (const flash of [true,false]) {
    vm.runInContext(`atlasGrid=${JSON.stringify(scenario.grid)};
      multishotGrid=actionboardGrid=${JSON.stringify(scenario.sourceGridKey)};
      hardFlashEnabled=${flash}; initializeMultishots(); initializeActionBoards();`, context,
    { timeout: 1000 });
    for (const [container, expected] of [
      ['multishotContainer', flash ? scenario.multishotFlashOn : scenario.multishotFlashOff],
      ['actionboardContainer', scenario.actionBoards]
    ]) {
      const actual = evalJson(`document.getElementById('${container}').children.map(item=>{
        const button=item.querySelector('.multishot-copy-btn-header');
        button.handlers.click.call(button,{stopPropagation(){}});
        const display=item.innerHTML.match(/<div class="multishot-text">([\\s\\S]*?)<\\/div>/)[1];
        return {copied:captured,display}; })`);
      for (let i=0;i<actual.length;i++) {
        assert.equal(actual[i].copied, expected[i].prompt);
        assert.equal(actual[i].display, expected[i].prompt);
        compared++;
      }
    }
  }
  for (const [subject,key] of [['','multiAngleBlank'],
    ['a clockwork diver in a copper pressure suit','multiAngleConfigured']]) {
    vm.runInContext(`document.getElementById('multiAngleSubject').value=${JSON.stringify(subject)};`,
      context, { timeout: 1000 });
    assert.equal(evalJson('buildMultiAnglePrompt()'), scenario[key]);
    compared++;
  }
}
// Demonstrate the stale-copy bug without contacting the iteration endpoint.
vm.runInContext(`document.getElementById('multishotContainer').children[1]
  .querySelector('.multishot-text').textContent='ITERATED OUTPUT';`, context);
const staleCopy = evalJson(`(()=>{const button=document.getElementById('multishotContainer')
  .children[1].querySelector('.multishot-copy-btn-header');
  button.handlers.click.call(button,{stopPropagation(){}});return captured;})()`);
assert.notEqual(staleCopy, 'ITERATED OUTPUT');

const correctedByValue = new Map(decisions.filter(d => d.action === 'correct')
  .map(d => [d.originalValue,d.correctedValue]));
const corrected = value => correctedByValue.get(value) ?? value;
const camera = m.camera.entries.map((entry,index) => ({
  id: `camera-${String(index+1).padStart(2,'0')}`, ...entry, prompt: corrected(entry.prompt)
}));
const cards = [
  ...m.sequences.entries.map((entry,index) => ({ ...entry, id: `multishot-${index}`,
    tab: 'multishot' })),
  ...m.actionBoards.entries.map((entry,index) => ({ ...entry, id: `board-${index}`,
    tab: 'actionboard' }))
].map(entry => ({ ...entry, title: entry.title.trim(),
  ...(entry.prompt ? { prompt: corrected(entry.prompt) } : {}),
  ...(entry.prompt_2x3 ? { prompt_2x3: corrected(entry.prompt_2x3),
    prompt_3x3: corrected(entry.prompt_3x3) } : {}) }));
// One authoritative structured shot list. V5 row headings and output requests are archived.
function decompose(text, board) {
  const header = board ? /\*\*Phase 2:[^\n]+/ : /(?:Required )?[69]-Frame[^\n]+/;
  const headerMatch = text.match(header);
  assert.ok(headerMatch, 'Missing shot-list header');
  const tail = text.slice(headerMatch.index + headerMatch[0].length);
  const footerMatch = tail.match(board ? /\*\*Technical (?:Notes|Execution):\*\*/
    : /(?:Continuity & Technical Requirements|Style:|Aesthetic:)/);
  assert.ok(footerMatch, 'Missing footer');
  const list = tail.slice(0,footerMatch.index).replace(/^\*\*(?:Row|Beats) [^\n]+\n?/gm,'');
  const starts = [...list.matchAll(/^(\d+)\. /gm)];
  const beats = starts.map((match,i) => ({
    sourceBeat: Number(match[1]),
    text: list.slice(match.index + match[0].length, starts[i+1]?.index ?? list.length).trim()
  }));
  let before = text.slice(0,headerMatch.index).trim();
  before = before.split('\n').filter(line => !/^(?:Output:|Your visible output must be:|One [23][×x]3 contact sheet|Then a keyframe breakdown|The (?:six|nine) frames)/.test(line)).join('\n').trim();
  let after = tail.slice(footerMatch.index).trim();
  after = after.split('\n').filter(line => !/^- Final output:/.test(line)).join('\n');
  return { before, beats, after };
}
for (const card of cards.filter(c => !c.noGridAdapt)) {
  card.structured = {};
  for (const key of ['2x3','3x3']) {
    const model = decompose(card[`prompt_${key}`], card.tab === 'actionboard');
    assert.equal(model.beats.length, key === '2x3' ? 6 : 9, card.id);
    card.structured[key] = model;
  }
}

// Deliberately selected cuts: retain opening, progression and final beat.
const fourBeatPlans = {
  'multishot-1':[1,2,3,6], 'multishot-2':[1,2,4,6], 'multishot-3':[1,2,3,6],
  'multishot-4':[1,2,4,6], 'multishot-5':[1,3,5,6],
  'board-0':[1,3,4,6], 'board-1':[1,2,4,6], 'board-2':[1,3,4,6],
  'board-3':[1,3,4,6], 'board-4':[1,2,5,6], 'board-5':[1,3,5,6],
  'board-6':[1,3,5,6], 'board-7':[1,3,5,6]
};
const omitForEight = {
  'multishot-1':5, 'multishot-2':8, 'multishot-3':8, 'multishot-4':6, 'multishot-5':9,
  'board-0':8, 'board-1':3, 'board-2':7, 'board-3':8, 'board-4':3,
  'board-5':3, 'board-6':2, 'board-7':5
};
const extraCoverageText = 'Alternate coverage of the immediately preceding panel, at the exact same frozen instant. Use a slightly tighter framing from a modest lateral camera offset. Preserve every visible character, pose, garment, prop, material, light source and action state. Do not restart or advance the action; do not introduce a new event.';
function planFor(card, count) {
  if (count===4) return fourBeatPlans[card.id].map(sourceBeat=>({ sourceBeat }));
  if (count===6 || count===9) return Array.from({length:count},(_,i)=>({sourceBeat:i+1}));
  if (count===8) return Array.from({length:9},(_,i)=>({sourceBeat:i+1}))
    .filter(b=>b.sourceBeat!==omitForEight[card.id]);
  const insertAfter = count===12 ? [1,4,7] : [1,2,3,4,5,6,7];
  return Array.from({length:9},(_,i)=>i+1).flatMap(sourceBeat=>[
    { sourceBeat }, ...(insertAfter.includes(sourceBeat)?[{sourceBeat, alternate:true}]:[])
  ]);
}
const renderContract = 'Render only the contact-sheet image. Panel numbers in this plan indicate reading order only; do not print panel numbers, captions, shot descriptions or extra decorative text into the image. Keep necessary source markings and story props. Maintain character identity, wardrobe, materials, lighting and scene continuity within the chosen scenario.';
function counts(text, count) {
  return text.replace(/\b(?:6|9) (frames|keyframes)\b/g,`${count} $1`);
}
function compile(card, cols, rows, flash=true) {
  assert.ok(Number.isInteger(cols)&&Number.isInteger(rows)&&cols>=2&&cols<=4&&rows>=2&&rows<=4);
  if (card.noGridAdapt) return { output:card.prompt, panelPlan:[] };
  const count=cols*rows;
  const model=card.structured[count<=6?'2x3':'3x3'];
  const panelPlan=planFor(card,count);
  assert.equal(panelPlan.length,count);
  const panels=panelPlan.map((step,i)=>`${i+1}. ${step.alternate
    ? extraCoverageText : model.beats[step.sourceBeat-1].text}`).join('\n\n');
  const header=`Generate one ${cols}x${rows} contact-sheet image: ${cols} columns, ${rows} rows, exactly ${count} panels. Read the panels left to right, then top to bottom. Use exactly the panel plan below.`;
  let output=[header,counts(model.before,count),'Panel plan:\n'+panels,
    counts(model.after,count),renderContract].join('\n\n');
  if(card.hasFlashToggle) output=output.replace('{{FLASH_OPTION}}',()=>flash?' with a hard flash':'');
  assert.doesNotMatch(output,/FLASH_OPTION|GRID OVERRIDE/);
  return { output,panelPlan };
}
const multiAngleTemplate=corrected(bundle.items[52].value);
function multiAngle(cols,rows,subject='') {
  const tokens={ '${g.cols}':String(cols), '${g.rows}':String(rows), '${n}':String(cols*rows),
    '${subject}':subject.trim()||'(describe your subject / reference image here)',
    '${angleList}':m.multiAnglePool.slice(0,cols*rows).map((a,i)=>`${i+1}. ${a}`).join('\n') };
  // Single-pass substitution so user dollar tokens are not interpreted a second time.
  return multiAngleTemplate.replace(/\$\{(?:g\.cols|g\.rows|n|subject|angleList)\}/g,
    token=>tokens[token]);
}
const cases=[];
for(const cols of [2,3,4]) for(const rows of [2,3,4]) {
  for(const card of cards) for(const flash of card.hasFlashToggle?[true,false]:[true]) {
    cases.push({id:card.id,state:{cols,rows,hardFlashEnabled:flash},...compile(card,cols,rows,flash)});
  }
  for(const subject of ['', 'a clockwork diver in a copper pressure suit',
    '<b>$& ${angleList} [character]</b>']) cases.push({id:'multi-angle',state:{cols,rows,subject},
    output:multiAngle(cols,rows,subject)});
}
const supplement={schemaVersion:'1.0',status:'reviewed',reviewerModel:'gpt-6-astra',
  reviewedAt:'2026-09-13',bundleDigest:bundle.bundleDigest,fixtureDigest,corpusDigest,
  source:fixture.source,decisions:extraDecisions,
  sourceCoverage:{bundleValues:154,complementaryValues:89},
  legacyComparison:{method:'Actual source display/Copy functions in isolated DOM VM',
    outputCount:compared,identical:true,staleCopyAfterIterationConfirmed:true},
  catalog:{title:m.title,tabs:m.tabs,camera,cards,multiAnglePool:m.multiAnglePool,
    multiAngleTemplate,defaultState:{cols:3,rows:3,hardFlashEnabled:true,subject:''}},
  metadataCorrections:[{sourceValue:' Image Board - Template',value:'Image Board - Template',
    reason:'Supprimer seulement l’espace initial accidentel du titre visible.'}],
  gridContract:{orientation:'columns x rows',integers:[2,3,4],counts:[4,6,8,9,12,16],
    fourBeatPlans,omitForEight,extraCoverageText,
    insertAfterForTwelve:[1,4,7],insertAfterForSixteen:[1,2,3,4,5,6,7],renderContract,
    reason:'Découpage explicite : quatre et huit plans sélectionnés ; douze/seize par couvertures du même instant. Les six/neuf originaux restent disponibles.',
    structuralEdits:['Retirer les anciens titres Row/Beats ; numérotation unique du plan de panneaux.',
      'Remplacer les demandes de grille et de breakdown par un en-tête image et une instruction sans légendes.',
      'Reporter le total dans les seules contraintes de continuité portant sur 6/9 frames/keyframes.',
      'Conserver casting, récit, techniques et intentions ; aucune génération LLM pour redimensionner.']},
  approvedExpectedOutputs:{camera:camera.map(c=>({id:c.id,output:c.prompt})),cases},
  architecture:{owner:'multishot',suggestedWorkshop:'grid-generation',runtimePortStatus:'pending-sol',
    outputMediaType:'image',cameraMovementOutputMediaType:'video',
    copySource:'Persisted visible final; never regenerate on Copy or bridge send.',
    referenceTransfer:'Use only the existing bridge contract; current bridge carries prompt only. Do not invent asset IDs. User attaches references in aggregator.',
    iteration:'Explicit user action only; validate nonempty result and matching panel count before adopting; preserve previous final on failure. Initial Model Prompt uses a single-image iteration instruction.',
    iterationAvailability:'Atlas V6 has no /api/ai/refine route. Keep the reviewed iteration contract; do not display an enabled action until an existing authorized service is actually wired and tested.',
    personalization:'Stable card IDs and per-setup custom finals; default reset preserves personal finals. Recompile explicitly replaces the selected final.',
    gridAuthority:'Setup tool configuration, explicit import from Grid Builder only; no unvalidated cross-origin postMessage.',
    initialPrompt:'Keep as first card, label single image, preserve intrinsic flash and 3:2 hint without forcing aggregator settings.',
    cameraContext:'Visible searchable help only; Copy uses prompt without context. Preserve legacy name and prompt search as minimum.',
    noText:'No added layout labels; existing scene text such as source logos/readouts remains allowed.'}
};
for(const [file,value] of [['./a10-astra.review.json',review],
  ['../atlas-v5/semantic-review/astra-reviews/a10-multishot.review.json',review],
  ['./a10-astra-supplement.review.json',supplement]]) {
  await writeFile(new URL(file,import.meta.url),JSON.stringify(value,null,2)+'\n');
}
console.log(JSON.stringify({...summary,complementary:extraDecisions.length,
  legacyOutputsCompared:compared,oracleCases:cases.length},null,2));

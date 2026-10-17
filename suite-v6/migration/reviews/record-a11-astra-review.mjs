// Astra A11 review record. Not a runtime adapter.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateAstraReview } from './validate-astra-review.mjs';
import { buildA11Oracle } from './a11-output-oracle.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
async function pinned(relative,digest) {
  const bytes=await readFile(new URL(relative,import.meta.url));
  assert.equal(sha(bytes),digest,relative); return JSON.parse(bytes);
}
const fixtureDigest='a8702b866bb460d71c56140f47720c6efd208ca8d2e0f4493b9423556d913a99';
const corpusDigest='bd15fa2df1b2effbf833d1ac484e9306b76e6f9945e372d2697ce86ebf79a126';
const fixture=await pinned('./a11-legacy-fixtures.json',fixtureDigest);
const bundle=await pinned('../atlas-v5/semantic-review/astra-bundles/a11-seedance-framing.json',
  '0814aa3a933fca7fe38c95419019b022e68b6cadfb48507eebbfeddcbea98f20');
const corpus=await pinned('../atlas-v5/prompt-literals.json',corpusDigest);
const source=await readFile('E:/Fable 5-Project/Meat Journey/'+fixture.source.path,'utf8');
assert.equal(sha(source),fixture.source.sha256);
const f=fixture.seedanceFraming;

// All 391 unique shots and every other numbered value were read in full.
// These positions refer only to the signed bundle, not a future classification.
const shotNumbers=new Set(bundle.items.flatMap((x,i)=>
  /^(Still photograph:|Sequence shot \d)/.test(x.value)?[i+1]:[]));
assert.equal(shotNumbers.size,391);
const usefulAtoms=new Set([12,23,39,44,52,75,107,135,138,149,153,168,170,185,
  213,224,239,255,296,305,324,333,336,349,355,356,366,373,378,384,415,432,444,
  449,463,486,487,495,499,500]);
const excludedNumbers=new Set([2,3,7,8,10,15,18,22,26,36,43,53,55,61,62,63,
  66,72,73,76,81,87,91,113,116,117,120,132,137,141,159,173,181,191,209,214,
  220,231,232,236,241,243,244,247,250,252,262,267,269,277,290,292,295,298,
  304,306,307,309,315,316,320,327,330,331,334,335,339,341,343,345,363,371,
  374,377,390,393,395,406,416,421,425,431,436,437,439,440,445,452,468,490,
  491,492,502,503,514,515,528,530,531,112,485]);
const corrections=new Map();
function change(n,before,after,reason) {
  const original=bundle.items[n-1].value;
  assert.ok(original.includes(before),'Missing correction '+n);
  corrections.set(n,{correctedValue:original.replace(before,()=>after),reason});
}
change(13,'framing tightening','framing opening up','Le recul ouvre le cadrage au lieu de le resserrer.');
change(169,'organic-mechanical animation','organic-mechanical distortion frozen in a single still',
  'Conserver la déformation tout en respectant le mode image fixe.');
change(210,'very long hold wide','contemplative wide composition',
  'Une photographie suggère une contemplation, sans durée de plan animé.');
change(218,'[SUBJECT] dwarfing','[SUBJECT] dwarfed',
  'Le sujet subit la monumentalité oppressive décrite, il ne doit pas grandir à sa place.');
change(281,'warm/ocre','warm/ochre','Corriger le nom anglais de la couleur.');
change(318,'dorée gold','gold','Retirer le doublon français du prompt anglais.');
change(414,'Ecrasante.','Crushing.','Traduire le mot français isolé sans changer le sens.');
change(506,'Tableaux vivant.','Tableau vivant.','Accorder la locution au singulier.');
const decisions=bundle.items.map((item,i)=>{
  const n=i+1;
  assert.equal(Number(shotNumbers.has(n)||usefulAtoms.has(n))+Number(excludedNumbers.has(n)),1,
    'Unclassified or duplicate value '+n);
  return {id:item.id,sourceIndex:n,originalValue:item.value,occurrences:item.occurrences,
    ...(corrections.has(n)?{action:'correct',...corrections.get(n)}
      :excludedNumbers.has(n)?{action:'exclude-non-prompt',
        reason:'Libellé, aide de catalogue, état ou construction technique ; conserver comme métadonnée/provenance sans insertion automatique dans le prompt.'}
      :{action:'preserve'})};
});
const review={schemaVersion:'1.0',bundleId:bundle.id,bundleDigest:bundle.bundleDigest,
  status:'reviewed',reviewerModel:'gpt-6-astra',reviewedAt:'2026-09-13',decisions};
const summary=validateAstraReview(bundle,review);
const ids=new Set(bundle.items.map(x=>x.id));
const extras=corpus.literals.filter(x=>!ids.has(x.id)&&x.occurrences.some(o=>o.sourcePath===fixture.source.path))
  .sort((a,b)=>a.id.localeCompare(b.id));
assert.equal(extras.length,148);
// Read in full: director-name fallbacks, shared director notes and reference tokens.
const extraPreserved=new Set([4,10,16,40,46,47,52,67,68,70,83,85,91,93,96,99,148]);
const extraDecisions=extras.map((item,i)=>({id:item.id,sourceIndex:i+1,originalValue:item.value,
  occurrences:item.occurrences.filter(o=>o.sourcePath===fixture.source.path),
  ...(extraPreserved.has(i+1)?{action:'preserve'}:{action:'exclude-non-prompt',
    reason:'Interface, enveloppe HTML, événement, sélecteur ou contrat technique ; garder le rôle et la provenance hors texte envoyé.'})}));

function section(start,end) {
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,start);return source.slice(a,b);
}
const sandbox=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});
const harness=[
  "let currentMode='stills',movingProvider='kling',currentTemplate='standard';",
  'const VMF_CELL_COUNT=9;const vmfCells=Array.from({length:9},()=>({dataUrl:null,subject:"",context:""}));',
  'const elements={style:{value:""},movingDuration:{value:14},movingShots:{value:7},actionDirection:{value:""},promptCharLimit:{value:12000}};',
  'const document={getElementById:id=>elements[id]};',
  section('const templates = {','// Build the single Template dropdown'),
  section('function clampNumber(','function updateMovingVisibility('),
  section('function loadedCellIndexes()','function renderVmfRack()'),
  section('function vmfPrimarySubject()','function updateTemplate()'),
  section('function buildMovingDraftLines(','const PROVIDER_LABELS'),
  section('function buildVmfReferences()','function toggleDropdown(')
].join('\n');
vm.runInContext(harness,sandbox,{timeout:1000});
const evaluate=expression=>JSON.parse(vm.runInContext('JSON.stringify('+expression+')',sandbox,{timeout:1000}));
assert.deepEqual(evaluate('directorNotes'),f.directorNotes);
assert.deepEqual(evaluate('Object.keys(templates)'),f.templates.map(t=>t.id));
let compared=0;
for(const template of f.templates) {
  assert.deepEqual(evaluate('templates['+JSON.stringify(template.id)+'].stills'),template.stills);
  assert.deepEqual(evaluate('templates['+JSON.stringify(template.id)+'].moving'),template.moving);
  vm.runInContext('currentTemplate='+JSON.stringify(template.id)+';'
    +'elements.style.value="tactile 1970s optical effects";'
    +'Object.assign(vmfCells[0],{dataUrl:"fixture:1",subject:"@image1 clockwork diver",context:"@image1 flooded brass observatory"});'
    +'Object.assign(vmfCells[1],{dataUrl:"fixture:2",subject:"@image2 glass moth",context:"@image2 moonlit archive"});',sandbox);
  const scenario=f.scenarios[template.id];
  const stills=evaluate('templates[currentTemplate].stills.shots.map(s=>fillPromptText(s,'
    +'buildSubjectText(vmfPrimarySubject(),vmfSecondarySubject()),'
    +'buildContextText(vmfPrimaryContext(),vmfSecondaryContext()),elements.style.value))');
  assert.deepEqual(stills,scenario.stills.shots.map(s=>s.description));compared++;
  for(const provider of f.controls.providers) {
    vm.runInContext('movingProvider='+JSON.stringify(provider),sandbox);
    assert.deepEqual(evaluate('buildMovingDraftLines({duration:13,shotCount:5})'),
      scenario.moving[provider].shots.map(s=>s.label+': '+s.description));compared++;
  }
  assert.equal(evaluate('buildCoexistenceLine(vmfPrimarySubject(),vmfPrimaryContext(),vmfSecondarySubject(),vmfSecondaryContext())'),
    scenario.stills.coexistence);
}
vm.runInContext('vmfCells[0].context="";vmfCells[1].subject="GLASS MOTH";',sandbox);
assert.equal(evaluate('vmfPrimaryContext()'),'GLASS MOTH');
vm.runInContext('Object.assign(vmfCells[8],{dataUrl:"fixture:9",subject:"NINTH SENTINEL",context:"NINTH HALL"});',sandbox);
assert.equal(evaluate('buildVmfReferences()').at(-1).ref,'@image9');
assert.ok(!evaluate('buildMovingDraftLines({duration:13,shotCount:5})').join('\n').includes('NINTH SENTINEL'));
assert.ok(evaluate('fillPromptText("[SUBJECT] / [CONTEXT]","$& [CONTEXT]","literal","")').includes('[SUBJECT]'));
assert.equal(evaluate('cleanShotDescription("tilt returning to normal over slow 2 seconds")'),'tilt returning to normal over slow');
assert.equal(evaluate('cleanShotDescription("upward pan (5 degrees/2 sec)")'),'upward pan (5 degrees/)');
assert.ok(source.includes('debounceTimer = setTimeout(')&&source.includes('}, 1600);'));
assert.ok(source.includes('setTimeout(aiDirectSequence, 1200)'));
assert.ok(source.includes('Math.floor(Math.random() * (i + 1))'));
// Source limiter has a minimum per-shot budget. At 30 shots and a 300-character
// limit the labels alone already exceed the requested total, before descriptions.
const minimumLabelsLength=Array.from({length:30},(_,i)=>
  'Sequence shot '+(i+1)+' (00:00.00-00:01.00): ').join('').length;
assert.ok(minimumLabelsLength>300);
assert.ok(source.includes('Math.max(48, Math.floor((limit - 80) / shots.length))'));
const short=evaluate('truncateSentence("Keep the subject perfectly identical. No costume changes are allowed.",30)');
assert.ok(short.endsWith('...'));

const correctedByValue=new Map(decisions.filter(d=>d.action==='correct').map(d=>[d.originalValue,d.correctedValue]));
const corrected=value=>correctedByValue.get(value)??value;
const metadataCorrections=[
  {templateId:'standard',field:'stills.info',before:'no characters',after:'subjects remain still',
    reason:'Le template accepte personnages et objets ; retirer la contradiction avec le sujet.'},
  {templateId:'fincher',field:'stills.info',before:'no camera.',after:'no camera movement.',
    reason:'La photographie utilise une caméra ; seule son animation est exclue.'}
];
const catalog=f.templates.map(t=>{
  const entry={id:t.id,name:t.name,category:t.category,bankId:t.aliasesStandardShots?'standard':t.id,
    directorNote:f.directorNotes[t.id]||t.name,
    stills:{info:t.stills.info,shots:t.stills.shots.map(corrected)},
    moving:{info:t.moving.info,shots:t.moving.shots.map(corrected)}};
  for(const edit of metadataCorrections.filter(e=>e.templateId===entry.bankId)) {
    if(edit.field==='stills.info') entry.stills.info=entry.stills.info.replace(edit.before,edit.after);
  }
  return entry;
});
const oracle=buildA11Oracle(catalog,f.directorNotes);
const architecture={
  owner:'seedance',suggestedWorkshop:'motion-studio',runtimePortStatus:'pending-sol',
  displayTitle:'Video Multi Framing',searchAliases:['Seedance Framing'],
  catalogStorage:'25 entries in original order; 23 distinct banks. Wes and Coppola reference Standard plus their explicit visual direction.',
  outputs:'Stills: ten separately copyable image prompts and named Copy all list; no invented grid. Moving: one video sequence. Custom finals independent per template/mode/provider.',
  characterLimit:'Count entire visible/copied string including newlines (JS UTF-16 length). Never truncate. Over limit: preserve full text, show actual/max, copy exact text; bridge/send disabled until final fits. User may edit or raise limit.',
  pacing:'Integer seconds 1..15; plans 1..30. Round cumulative boundaries to centiseconds, not segment durations; end equals duration*100. Warn if mean shot duration <0.5s without claiming provider limits.',
  repetition:'Preserve prefix for 1..7 and explicit cyclic reuse for 8..30. Display cycle/sourceBeat and warning. Opening-shot references mean original opening framing; no invented story.',
  references:'Fixed slots 1..9 with gaps. Image ID, subject and context persist together. Main setting never falls back to secondary subject. List all active refs; 3..9 support descriptions but are not locally staged actions.',
  textOnly:'Provide explicit subject/context fields without images. Empty values produce editable descriptive placeholders; block send until resolved.',
  inputSubstitution:'One replacement pass with callback; dollar tokens, bracketed text, HTML-like input and Unicode remain literal. Render textContent; copy persisted visible final.',
  style:'Blank style: source-matched when refs exist, neutral cinematic otherwise. Wes stills omit whip pans. Preserve original notes for AI use.',
  import:'Explicit ordered file selection; folders sort by relative path using code-point ordering, preview and choose up to nine. Reject overflow before replacing any slot. Decode before atomic commit, report read errors, never randomize. Replacement clears old descriptions unless explicitly retained.',
  async:'Capture setup/revision/slot ID; discard late reads/results on target change. One explicit request at a time; remove input-triggered AI and queued busy retries. Errors preserve prior final.',
  persistence:'Reuse validated A4 media conventions. Media and custom finals survive duplicate/version/export/restore/reset. Reset controls while retaining personal media/finals.',
  bridge:'Current V6 tools pass references:[]; do not claim transfer until roundtrip-tested. If unsupported, clearly expose prompt-only handoff and required attachment for referenced drafts. Stills use image, sequences video; dialect must not invent a generation model or resolution.',
  aiAvailability:'No /api/ai/video-direct route currently in V6 server. Keep payload contract; UI unavailable until an authorized service is wired/tested. No BYOK secrets in setups or messages.',
  aiPayload:'Snapshot model (dialect), model_ai (configured service), mode, director, intent, durationSec, shotCount, references {ref,description,imageBase64}. GO ACTION does not consume the local shot draft; no claim of AI enforcing its beat order.',
  aiAdoption:'Check nonempty result and length. Verify actual count/duration if structured; free text with unverified structure stays explicitly unverified. Stale/error responses cannot replace previous final.',
  build:'Movable/renamable tool with stable IDs. Deck and Backstage fixed.'
};
const supplement={schemaVersion:'1.0',status:'reviewed',reviewerModel:'gpt-6-astra',reviewedAt:'2026-09-13',
  bundleDigest:bundle.bundleDigest,fixtureDigest,corpusDigest,source:fixture.source,decisions:extraDecisions,
  sourceCoverage:{bundleValues:532,complementaryValues:148,
    scope:'Every extracted value occurring in this source, including shared-shell values. Backend endpoint instructions are a separate source.'},
  legacyComparison:{method:'Actual source helpers and buildMovingDraftLines in isolated VM.',
    catalogIdentical:true,preLimitOutputCount:compared,preLimitIdentical:true,
    limitation:'Fixture is pre-HTML-limiter; not final browser copy. No browser rendering equivalence claim.',
    minimumLabelLengthAt30Shots:minimumLabelsLength,limitNotGuaranteed:true,
    secondSubjectUsedAsSetting:true,referenceNineAbsentFromLocalShots:true,referenceNinePresentInAiPayload:true,
    dollarReplacementCorruption:true,brokenTimePhrases:true,typingTriggersAi:true,
    busyCallsQueueRetries:true,folderOverflowRandomizes:true},
  fixtureErrata:[
    'explicitActionOnly is a V6 requirement, contradicted by the active V5 1600ms input debounce.',
    'The fixture scenarios are pre-limit outputs; final truncation was not captured.',
    'V5 folder import randomizes when more than nine files are selected.',
    '425 logical shot uses include two aliases: 391 unique shot texts.'
  ],
  catalog:{title:f.title,categoryOrder:f.categoryOrder,templates:catalog,directorNotes:f.directorNotes,
    defaultState:oracle.defaultState,aliasStillsNotes:oracle.aliasStillsNotes,controls:f.controls},
  metadataCorrections,approvedExpectedOutputs:{cases:oracle.cases},architecture};
for(const [file,value] of [['./a11-astra.review.json',review],
  ['../atlas-v5/semantic-review/astra-reviews/a11-seedance-framing.review.json',review],
  ['./a11-astra-supplement.review.json',supplement]]) {
  await writeFile(new URL(file,import.meta.url),JSON.stringify(value,null,2)+'\n');
}
console.log(JSON.stringify({...summary,complementary:extras.length,extraPreserved:extraPreserved.size,
  legacyOutputsCompared:compared,oracleCases:oracle.cases.length},null,2));

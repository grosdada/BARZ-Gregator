import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateAstraReview} from '../migration/reviews/validate-astra-review.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url));
const json=p=>JSON.parse(read(p));
const bundle=json('../migration/atlas-v5/semantic-review/astra-bundles/a11-seedance-framing.json');
const review=json('../migration/reviews/a11-astra.review.json');
const supplement=json('../migration/reviews/a11-astra-supplement.review.json');
const cases=supplement.approvedExpectedOutputs.cases;
const find=id=>cases.find(c=>c.caseId===id);

test('A11 decisions cover the signed bundle and complementary source values',()=>{
  assert.deepEqual(validateAstraReview(bundle,review).counts,
    {preserve:423,correct:8,'exclude-non-prompt':101});
  assert.deepEqual(review,json('../migration/atlas-v5/semantic-review/astra-reviews/a11-seedance-framing.review.json'));
  assert.equal(createHash('sha256').update(read('../migration/reviews/a11-legacy-fixtures.json')).digest('hex'),
    supplement.fixtureDigest);
  const all=[...review.decisions,...supplement.decisions];
  assert.equal(all.length,680);
  assert.equal(new Set(all.map(d=>d.id)).size,680);
  assert.ok(supplement.decisions.every(d=>d.occurrences.every(o=>o.sourcePath===supplement.source.path)));
  assert.equal(supplement.legacyComparison.preLimitOutputCount,100);
  assert.equal(supplement.legacyComparison.preLimitIdentical,true);
  assert.equal(supplement.legacyComparison.typingTriggersAi,true);
  assert.equal(supplement.legacyComparison.folderOverflowRandomizes,true);
});

test('A11 catalog retains every director and exact documented source corrections',()=>{
  const frozen=json('../migration/reviews/a11-legacy-fixtures.json').seedanceFraming;
  const catalog=supplement.catalog.templates;
  assert.deepEqual(catalog.map(t=>t.id),frozen.templates.map(t=>t.id));
  assert.equal(catalog.length,25);
  assert.equal(new Set(catalog.map(t=>t.bankId)).size,23);
  assert.deepEqual(supplement.catalog.categoryOrder,['CORE','SECONDARY','WILD CARDS','REAL','SIGNATURE']);
  const corrections=new Map(review.decisions.filter(d=>d.action==='correct').map(d=>[d.originalValue,d.correctedValue]));
  for(const [i,t] of catalog.entries()) for(const mode of ['stills','moving']) {
    assert.deepEqual(t[mode].shots,frozen.templates[i][mode].shots.map(v=>corrections.get(v)??v));
  }
  assert.doesNotMatch(catalog[0].stills.info,/no characters/);
  assert.match(catalog.find(t=>t.id==='fincher').stills.info,/no camera movement/);
  assert.doesNotMatch(find('wes-stills-refs').output,/whip pans/);
  assert.match(find('wes-kling').output,/whip pans/);
});

test('A11 time plans close exactly and preserve repeated source order',()=>{
  assert.equal(cases.length,190);
  for(const c of cases.filter(c=>c.mediaType==='video')) {
    const n=c.state.shotCount??7,duration=c.state.duration??14;
    assert.equal(c.plan.length,n);
    assert.equal(c.plan[0].startTicks,0);
    assert.equal(c.plan.at(-1).endTicks,duration*100);
    assert.equal(c.plan.reduce((sum,p)=>sum+p.endTicks-p.startTicks,0),duration*100);
    for(const [i,p] of c.plan.entries()) {
      assert.equal(p.sourceBeat,i%7+1);
      assert.equal(p.cycle,Math.floor(i/7)+1);
      assert.ok(p.endTicks>p.startTicks);
      if(i) assert.equal(p.startTicks,c.plan[i-1].endTicks);
      if(c.state.provider==='seedance') assert.equal(p.label,'Cut to');
    }
    if(n>7) assert.ok(c.warnings.includes('REPEATED_TEMPLATE_CYCLE'));
  }
  assert.match(find('standard-wan').providerInfo,/WAN/);
  assert.doesNotMatch(find('standard-wan').providerInfo,/Kling/);
  assert.match(find('noe-full-seven').plan[5].description,/across this shot/);
  assert.match(find('tarkovsky-full-seven').plan[0].description,/5 degrees across this shot/);
});

test('A11 sparse references and literal text keep their identities',()=>{
  const sparse=find('sparse-nine');
  assert.match(sparse.output,/@image3/);
  assert.match(sparse.output,/@image7/);
  assert.match(sparse.output,/@image9: Subject: Sentinel/);
  assert.doesNotMatch(sparse.output,/@image[124568](?!\d)/);
  assert.match(sparse.plan[0].description,/@image3 setting/);
  assert.ok(sparse.warnings.includes('ADDITIONAL_REFS_LISTED_NOT_STAGED'));
  const literal=find('literal-input');
  assert.ok(literal.output.includes(literal.state.subject));
  assert.ok(literal.output.includes('Room $$ $1'));
  assert.ok(literal.output.includes('[SUBJECT] orange'));
  for(let i=1;i<=9;i++) assert.match(find('all-nine').output,new RegExp('@image'+i+':'));
});

test('A11 length gates preserve complete final text and separate still outputs',()=>{
  const c=find('short-limit');
  assert.equal(c.readyToSend,false);
  assert.equal(c.overLimit,true);
  assert.equal(c.characterCount,c.output.length);
  assert.equal(c.plan.length,30);
  assert.ok(c.output.endsWith(c.plan[29].description));
  assert.doesNotMatch(c.output,/\.\.\.$/);
  for(const s of cases.filter(c=>c.mediaType==='image')) {
    assert.equal(s.plan.length,10);
    assert.equal(s.individualOutputs.length,10);
    assert.doesNotMatch(s.output,/Generate .*grid/);
    assert.ok(s.individualOutputs.every(p=>p.characterCount===p.output.length));
  }
  assert.ok(find('standard-stills-default').warnings.includes('DESCRIPTIONS_REQUIRED'));
  assert.match(find('standard-stills-refs').individualOutputs[9].output,
    /Opening framing reference \(composition only\): Still photograph: wide frontal/);
  assert.equal(supplement.architecture.runtimePortStatus,'pending-sol');
});

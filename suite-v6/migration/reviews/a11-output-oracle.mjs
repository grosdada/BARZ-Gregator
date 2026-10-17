// Reviewed output oracle for Sol; not imported by the application.
import assert from 'node:assert/strict';
export function buildA11Oracle(catalog,directorNotes) {
  const byId=new Map(catalog.map(t=>[t.id,t]));
  const aliasStillsNotes={
    wes:'Wes Anderson: centered symmetry, pastel palettes, flat frontal tableaux and dollhouse staging.',
    coppola:directorNotes.coppola
  };
  const defaultState={templateId:'standard',mode:'stills',provider:'kling',duration:14,
    shotCount:7,charLimit:2500,style:'',subject:'',context:'',actionDirection:'',references:[]};
  function time(ticks) {
    return String(Math.floor(ticks/6000)).padStart(2,'0')+':'
      +String(Math.floor(ticks%6000/100)).padStart(2,'0')+'.'+String(ticks%100).padStart(2,'0');
  }
  function cleanMoving(text) {
    return text.replace(/^Sequence shot\s+\d+\s*\([^)]*\):\s*/i,'')
      .replace(/\(5 degrees\/2 sec\)/g,'(5 degrees across this shot)')
      .replace(/\bover(?: slow)?\s+\d+(?:\.\d+)?\s*seconds?\b/gi,'across this shot')
      .replace(/\bbuilds over \d+(?:\.\d+)?\s*sec\b/gi,'builds across this shot')
      .replace(/\bShot 1\b/g,'the opening shot').trim();
  }
  function compile(overrides={}) {
    const s={...defaultState,...overrides};
    assert.ok(byId.has(s.templateId));
    assert.ok(['stills','moving'].includes(s.mode));
    assert.ok(['seedance','kling','wan'].includes(s.provider));
    assert.ok(Number.isInteger(s.duration)&&s.duration>=1&&s.duration<=15);
    assert.ok(Number.isInteger(s.shotCount)&&s.shotCount>=1&&s.shotCount<=30);
    assert.ok(Number.isInteger(s.charLimit)&&s.charLimit>=300&&s.charLimit<=12000);
    assert.ok(s.references.length<=9);
    const slots=s.references.map(r=>r.slot);
    assert.equal(new Set(slots).size,slots.length);
    assert.ok(slots.every(n=>Number.isInteger(n)&&n>=1&&n<=9));
    const refs=[...s.references].sort((a,b)=>a.slot-b.slot);
    const first=refs[0],second=refs[1],t=byId.get(s.templateId);
    const subject=s.subject.trim()||(first?first.subject.trim()||'@image'+first.slot:'[describe the main subject]');
    const context=s.context.trim()||(first?first.context.trim()||'@image'+first.slot+' setting':'[describe the setting]');
    const subject2=second?second.subject.trim()||'@image'+second.slot:'';
    const context2=second?second.context.trim():'';
    const values={SUBJECT:subject+(subject2?'; secondary subject: '+subject2:''),
      CONTEXT:context+(context2?'; secondary context: '+context2:''),
      STYLE:s.style.trim()||(refs.length?'source-matched':'neutral cinematic')};
    const fill=text=>text.replace(/\[(SUBJECT|CONTEXT|STYLE)\]/g,(_,key)=>values[key]);
    const preamble=[];
    if(refs.length) preamble.push('References:\n'+refs.map(r=>
      '@image'+r.slot+': '+([r.subject.trim()&&'Subject: '+r.subject.trim(),
        r.context.trim()&&'Context: '+r.context.trim()].filter(Boolean).join('. ')||'reference image')).join('\n'));
    if(t.bankId!==t.id) preamble.push('Visual direction: '+(s.mode==='stills'?aliasStillsNotes[t.id]:t.directorNote));
    if(s.mode==='moving'&&s.actionDirection.trim()) preamble.push('Action direction: '+s.actionDirection.trim());
    if(subject2||context2) preamble.push('Coexistence logic: '
      +(subject2?'Bring the secondary subject ('+subject2+') into a logical relationship with the main subject ('+subject+').'
        :'Extend the main subject ('+subject+') into the secondary context.')
      +' '+(context2?'Blend the secondary context ('+context2+') with the main context ('+context+') as a motivated shared scene, not a collage.'
        :'Keep the shared scene grounded in '+context+'.')
      +' Use cause-and-effect staging, shared light direction, matching scale, and clear spatial contact so both references feel like one believable setup.');
    const count=s.mode==='stills'?10:s.shotCount;
    const plan=Array.from({length:count},(_,i)=>{
      const sourceBeat=s.mode==='stills'?i+1:i%7+1;
      const startTicks=Math.round(i*s.duration*100/count),endTicks=Math.round((i+1)*s.duration*100/count);
      return {sourceBeat,cycle:s.mode==='stills'?1:Math.floor(i/7)+1,
        ...(s.mode==='moving'?{startTicks,endTicks}:{}),
        label:s.mode==='stills'?'Still '+(i+1):s.provider==='seedance'?'Cut to'
          :'Sequence shot '+(i+1)+' ('+time(startTicks)+'-'+time(endTicks)+')',
        description:fill(s.mode==='stills'?t.stills.shots[i]:cleanMoving(t.moving.shots[sourceBeat-1]))};
    });
    const output=[...preamble,...plan.map(p=>p.label+': '+p.description)].join('\n\n');
    const overLimit=output.length>s.charLimit,warnings=[];
    if(s.mode==='moving'&&count>7) warnings.push('REPEATED_TEMPLATE_CYCLE');
    if(s.mode==='moving'&&s.duration/count<0.5) warnings.push('VERY_SHORT_SHOTS');
    if(refs.length>2) warnings.push('ADDITIONAL_REFS_LISTED_NOT_STAGED');
    if(overLimit) warnings.push('PROMPT_OVER_LIMIT');
    const unresolved=!refs.length&&(!s.subject.trim()||!s.context.trim());
    if(unresolved) warnings.push('DESCRIPTIONS_REQUIRED');
    return {output,plan,warnings,characterCount:output.length,overLimit,
      readyToSend:!overLimit&&!unresolved,mediaType:s.mode==='moving'?'video':'image',
      ...(s.mode==='stills'?{individualOutputs:plan.map(p=>{
        const opening=/\bShot 1\b/.test(p.description)
          ? ['Opening framing reference (composition only): '+plan[0].description] : [];
        const text=[...preamble,...opening,p.description].join('\n\n');
        return {id:'still-'+p.sourceBeat,output:text,characterCount:text.length,
          readyToSend:text.length<=s.charLimit&&!unresolved};
      })}:{}),
      providerInfo:s.mode==='stills'?'10 static stills':count+' '+(s.provider==='seedance'?'cuts':'shots')
        +' - '+s.duration+'s - '+({seedance:'Seedance cut-to wording, no timecodes',
          kling:'Kling timed sequence wording',wan:'WAN timestamped shot list'})[s.provider]};
  }
  const refs=[{slot:1,subject:'clockwork diver',context:'flooded brass observatory'},
    {slot:2,subject:'glass moth',context:'moonlit archive'}];
  const cases=[];
  const add=(caseId,state)=>cases.push({caseId,state,...compile(state)});
  for(const t of catalog) {
    add(t.id+'-stills-default',{templateId:t.id});
    add(t.id+'-stills-refs',{templateId:t.id,references:refs,style:'tactile 1970s optical effects',charLimit:12000});
    for(const provider of ['kling','seedance','wan']) add(t.id+'-'+provider,{
      templateId:t.id,mode:'moving',provider,references:refs,duration:13,shotCount:5,
      actionDirection:'The diver follows the moth through the archive.',style:'tactile 1970s optical effects',charLimit:12000});
    add(t.id+'-full-seven',{templateId:t.id,mode:'moving',duration:15,shotCount:7,
      subject:'clockwork diver',context:'brass observatory',charLimit:12000});
  }
  for(const provider of ['kling','seedance','wan']) for(const duration of [1,14,15]) for(const shotCount of [1,7,8,30]) {
    add(provider+'-'+duration+'-'+shotCount,{mode:'moving',provider,duration,shotCount,references:refs,charLimit:12000});
  }
  add('literal-input',{mode:'moving',subject:'<b>$& [CONTEXT] $'+'{style}</b>',
    context:'Room $$ $1',style:'[SUBJECT] orange',charLimit:12000});
  add('sparse-nine',{mode:'moving',references:[{slot:3,subject:'Diver',context:''},
    {slot:7,subject:'Moth',context:''},{slot:9,subject:'Sentinel',context:'Hall'}],charLimit:12000});
  add('all-nine',{mode:'moving',references:Array.from({length:9},(_,i)=>({
    slot:i+1,subject:'subject '+(i+1),context:'setting '+(i+1)})),charLimit:12000});
  add('short-limit',{mode:'moving',shotCount:30,duration:1,references:refs,charLimit:300});
  return {defaultState,aliasStillsNotes,cases};
}

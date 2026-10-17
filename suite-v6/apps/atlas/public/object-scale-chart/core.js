(function(root){
  const units={mm:.001,cm:.01,m:1,km:1000};
  const colors=['#7787a1','#9382ba','#619b9a','#bd947c','#8fa479','#d18799'];
  const categories={human:'humain',animal:'animal',vehicle:'véhicule',building:'bâtiment',creature:'créature',object:'objet'};
  const defaults={background:'#ffffff',gridColor:'#b9c6d8',showGrid:true,model:'Universel',language:'en',referenceId:'',action:'',lock:true};
  const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'s-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  const dimensions=s=>s.axis==='width'?{width:s.size,height:s.size/s.aspect}:{width:s.size*s.aspect,height:s.size};
  const number=(n,digits=3)=>Number(n.toPrecision(digits)).toLocaleString('fr-FR',{maximumFractionDigits:8});
  const english=n=>Number(n.toPrecision(5)).toString();
  const dimensionText=(s,axisLabel=false)=>`${axisLabel?(s.axis==='width'?'L. ':'H. '):''}${number(s.size/units[s.unit||'m'],5)} ${s.unit||'m'}`;
  function autoUnit(n){const abs=Math.abs(n);return abs>=1000?number(n/1000)+' km':abs>0&&abs<.01?number(n*1000)+' mm':abs>0&&abs<1?number(n*100)+' cm':number(n)+' m';}
  function fromPreset(p,index=0){return{id:uid(),presetId:p.id,name:p.name,category:p.category,size:p.size,axis:p.axis,aspect:p.aspect,unit:'m',color:colors[index%colors.length],x:0};}
  function arrange(items){const gap=Math.max(...items.map(s=>dimensions(s).height),1)*.2;let x=0;return items.map(s=>{const item={...s,x};x+=dimensions(s).width+gap;return item});}
  function extent(items){return{width:Math.max(...items.map(s=>s.x+dimensions(s).width),1e-6),height:Math.max(...items.map(s=>dimensions(s).height),1e-6)}}
  function labelLines(name){const words=name.split(/\s+/).flatMap(w=>w.match(/.{1,19}/gu)||[]),lines=[];let line='';for(const word of words){if(line&&line.length+word.length+1>19){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
  function labelMetrics(items,width){const columns=Math.max(1,Math.floor((width-65)/110)),rows=Math.max(1,Math.ceil(items.length/columns)),lines=Math.max(1,...items.map(s=>labelLines(s.name).length));const rowHeight=25+lines*12;return{columns,rows,rowHeight,space:rows*rowHeight+33};}
  function layout(items,width,height,zoom=1,pan=0){
    const metrics=labelMetrics(items,width),labelRows=metrics.rows;
    const labelSpace=metrics.space;
    const ground=height-labelSpace;
    const e=extent(items);
    const scale=items.length?Math.min((width-105)/e.width,(ground-56)/e.height)*zoom:Math.min(width/8,ground/3);
    const used=e.width*scale;
    const left=52+Math.max(0,(width-105-used)/2)+pan;
    const positions=items.map(s=>{const d=dimensions(s);return{id:s.id,x:left+s.x*scale,y:ground-d.height*scale,w:d.width*scale,h:d.height*scale}});
    // Label lanes stay readable even when an object is smaller than one pixel.
    const sorted=positions.slice().sort((a,b)=>a.x-b.x), ends=Array(labelRows).fill(42);
    sorted.forEach((p,i)=>{const row=i%labelRows;const remaining=Math.ceil((sorted.length-i)/labelRows)-1;const desired=p.x+p.w/2;const x=Math.max(ends[row]+51,Math.min(width-58-remaining*110,desired));p.labelX=x;p.labelY=ground+28+row*metrics.rowHeight;ends[row]=x+59;Object.assign(positions.find(q=>q.id===p.id),{labelX:x,labelY:p.labelY});});
    return{width,height,scale,ground,left,positions,labelRows,extent:e};
  }
  function tickStep(target){const pow=10**Math.floor(Math.log10(Math.max(target,1e-9)));const f=target/pow;return(f<=1?1:f<=2?2:f<=5?5:10)*pow;}
  function prompt(state){
    const {items,settings:s}=state;if(!items.length)return s.language==='fr'?'Ajoutez des sujets au tableau pour générer une instruction de proportions.':'Add subjects to the chart to generate a scale reference instruction.';
    const fr=s.language==='fr',ref=items.find(i=>i.id===s.referenceId)||items[0],rh=dimensions(ref).height;
    const order=items.slice().sort((a,b)=>a.x-b.x);
    const lines=[fr?'Utiliser le tableau joint comme référence de proportions physiques. Les sujets sont représentés de profil ou de face, sur un même plan au sol, à une échelle linéaire commune.':'Use the attached chart as a physical scale reference. Subjects are shown in side or front view, on a shared ground plane, at one consistent linear scale.'];
    lines.push(fr?'Sujets, de gauche à droite :':'Subjects, from left to right:');
    order.forEach((item,i)=>{const d=dimensions(item),axis=fr?(item.axis==='height'?'hauteur':'longueur / largeur'):(item.axis==='height'?'height':'length / width');const nature=fr?categories[item.category]:({human:'human',animal:'animal',vehicle:'vehicle',building:'building',creature:'creature',object:'object'})[item.category];lines.push(`${i+1}. "${item.name}" (${nature}): ${axis} ${english(item.size)} m; ${fr?'encombrement représenté':'depicted bounds'} ${english(d.width)} m ${fr?'de large ×':'wide ×'} ${english(d.height)} m ${fr?'de haut':'tall'}.`)});
    lines.push(fr?`Référence de hauteur : "${ref.name}" = ${english(rh)} m.`:`Height reference: "${ref.name}" = ${english(rh)} m.`);
    items.filter(i=>i.id!==ref.id).forEach(i=>{const ratio=dimensions(i).height/rh;lines.push(fr?`La hauteur de "${i.name}" est ${english(ratio)} fois celle de "${ref.name}".`:`"${i.name}" is ${english(ratio)} times as tall as "${ref.name}".`)});
    lines.push(fr?'La dimension renseignée est la contrainte principale ; l’autre dimension est déduite des proportions de la silhouette ou de l’image. Préserver le design, les vêtements et les détails des images de sujets importées.':'The entered dimension is the primary constraint; the other dimension is inferred from the silhouette or image aspect ratio. Preserve the design, clothing and details of imported subject images.');
    if(s.lock)lines.push(fr?'Conserver ces dimensions et rapports pendant toute la vidéo, y compris lors des déplacements et mouvements de caméra. Appliquer une perspective cohérente ; ne pas normaliser les sujets à une hauteur identique.':'Maintain these physical dimensions and ratios throughout the video, including subject and camera movement. Apply consistent perspective; do not normalize subjects to the same height.');
    lines.push(fr?'Le tableau sert uniquement de référence : ne pas afficher la grille, les textes, les graduations ou les silhouettes de référence dans la vidéo finale.':'The chart is reference material only: do not render its grid, labels, rulers or reference silhouettes in the final video.');
    if(s.action.trim())lines.push((fr?'Scène : ':'Scene: ')+s.action.trim());
    return lines.join('\n');
  }
  function validateProject(value,catalogue){
    if(!value||value.version!==1||!Array.isArray(value.items)||value.items.length>60)throw Error('Format de projet invalide (version 1, 60 sujets maximum).');
    const ids=new Set();let humans=0;
    const items=value.items.map(s=>{
      if(!s||typeof s.id!=='string'||ids.has(s.id)||!/^[\w-]{1,100}$/.test(s.id))throw Error('Identifiants de sujets invalides.');ids.add(s.id);
      if(typeof s.name!=='string'||!s.name.trim()||s.name.length>60||!Object.keys(categories).includes(s.category))throw Error('Nom ou nature de sujet invalide.');
      if(!Number.isFinite(s.size)||s.size<1e-6||s.size>1e6||!Number.isFinite(s.aspect)||s.aspect<.001||s.aspect>1000||!Number.isFinite(s.x)||s.x<0||s.x>1e9||!['height','width'].includes(s.axis)||!units[s.unit]||!/^#[\da-f]{6}$/i.test(s.color)||('offsetY'in s&&(!Number.isFinite(s.offsetY)||s.offsetY<-.5||s.offsetY>.5)))throw Error('Dimensions ou couleurs invalides.');
      if(s.category==='human'&&++humans>15)throw Error('Le tableau accepte au maximum 15 sujets humains.');
      const preset=catalogue.find(p=>p.id===s.presetId);
      if(!preset&&!(typeof s.image==='string'&&s.image.length<12e6&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z\d+/=]+$/.test(s.image)))throw Error('Image ou silhouette de sujet invalide.');
      return{id:s.id,name:s.name,category:s.category,size:s.size,aspect:preset?preset.aspect:s.aspect,axis:s.axis,unit:s.unit,color:s.color,x:s.x,...(preset?{presetId:preset.id}:{image:s.image,offsetY:Number.isFinite(s.offsetY)?s.offsetY:0})};
    });
    const input=value.settings||{},settings={...defaults};
    ['background','gridColor'].forEach(k=>{if(typeof input[k]==='string'&&/^#[\da-f]{6}$/i.test(input[k]))settings[k]=input[k]});
    ['showGrid','lock'].forEach(k=>{if(typeof input[k]==='boolean')settings[k]=input[k]});
    if(['en','fr'].includes(input.language))settings.language=input.language;
    if(['Universel','Seedance','MiniMax H3','Wan 3'].includes(input.model))settings.model=input.model;
    if(typeof input.action==='string')settings.action=input.action.slice(0,600);
    if(items.some(i=>i.id===input.referenceId))settings.referenceId=input.referenceId;
    return{version:1,title:typeof value.title==='string'?value.title.slice(0,80):'Étude de proportions',items,settings,promptOverride:typeof value.promptOverride==='string'?value.promptOverride.slice(0,30000):null};
  }
  root.ScaleCore={units,colors,categories,defaults,uid,dimensions,number,english,dimensionText,autoUnit,fromPreset,arrange,extent,labelLines,labelMetrics,layout,tickStep,prompt,validateProject};
  if(typeof module!=='undefined')module.exports=root.ScaleCore;
})(typeof globalThis!=='undefined'?globalThis:this);

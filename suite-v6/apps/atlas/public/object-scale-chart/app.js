(() => {
  'use strict';
  const C = ScaleCore, $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const icons = {
    chevron:'m5 8 5 5 5-5',download:'M10 2v11m-4-4 4 4 4-4M3 13v4h14v-4',upload:'M10 14V3m-4 4 4-4 4 4M3 13v4h14v-4',grid:'M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z',search:'M14 14l4 4M15 8A6 6 0 1 1 3 8a6 6 0 0 1 12 0',plus:'M10 4v12M4 10h12',minus:'M4 10h12',info:'M10 9v5M10 6h.01M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0',image:'M2 3h16v14H2zM2 14l5-5 4 4 3-3 4 4M14 6h.01',shield:'M10 2l7 3v5c0 4-7 8-7 8s-7-4-7-8V5zM6 10l3 3 5-6',edit:'m3 13 10-10 4 4L7 17H3zM11 5l4 4',undo:'M6 4 2 8l4 4M2 8h10a5 5 0 0 1 0 10',redo:'m14 4 4 4-4 4M18 8h-10a5 5 0 0 0 0 10',align:'M2 17h16M4 14V6h4v8zM12 14V3h4v11z',fit:'M7 2H2v5M13 2h5v5M18 13v5h-5M7 18H2v-5',ruler:'m2 13 11-11 5 5L7 18zM6 9l2 2M9 6l3 3M12 3l2 2',spark:'m10 1 2 6 6 3-6 2-2 6-2-6-6-2 6-3zM17 1v4M15 3h4',copy:'M7 7h10v11H7zM3 13H2V2h10v1',settings:'M2 5h16M2 15h16M6 2v6M14 12v6',reset:'M3 8a7 7 0 1 1 1 7M3 3v5h5',pointer:'M3 2l14 7-7 2-3 7z',close:'m4 4 12 12M16 4 4 16',folder:'M2 5h6l2 2h8v10H2z',text:'M3 3h14M10 3v14M7 17h6',person:'M13 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0M7 9h6l2 6M7 9l-2 6M8 10v8M12 10v8',paw:'M6 11q4-5 8 0l2 4q-2 4-6 1-4 3-6-1zM4 8V5M8 5V2M12 5V2M16 8V5',car:'M2 10l3-6h10l3 6v6H2zM2 10h16M5 16v2M15 16v2M5 13h1M14 13h1',building:'M3 18V2h9v16M12 8h5v10M1 18h18M6 5h3M6 9h3M6 13h3',trash:'M3 5h14M7 5V2h6v3M5 5l1 13h8l1-13M8 8v6M12 8v6',palette:'M10 2a8 8 0 1 0 0 16h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2c4 0 1-9-6-9ZM6 7h.01M10 5h.01M14 7h.01M5 11h.01'
  };
  const icon = name => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${icons[name]||icons.grid}"/></svg>`;
  function hydrateIcons(parent=document){parent.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
  hydrateIcons();
  const preferenceKey='echelle-interface';
  let preferences={language:'en',theme:'light'};
  try{preferences={...preferences,...JSON.parse(localStorage.getItem(preferenceKey)||'{}')};}catch{}
  let uiLanguage=['en','fr'].includes(preferences.language)?preferences.language:'en';
  let uiTheme=['light','dark'].includes(preferences.theme)?preferences.theme:'light';
  const staticEnglish={
    'Studio de proportions':'Scale studio','Enregistré sur cet appareil':'Saved on this device','Projet':'Project','Mise à jour':'Update','Exporter':'Export','la référence':'the reference','Enregistrer le projet (.json)':'Save project (.json)','Ouvrir un projet':'Open project','Nouveau tableau':'New chart','Charger la démonstration':'Load demo','Vos sujets':'Your subjects','Bibliothèque':'Library','Importer':'Import','Source des sujets':'Subject source','Chercher une silhouette…':'Search silhouettes…','Cliquez ou glissez sur le tableau.':'Click or drag onto the chart.','Dimensions indicatives et modifiables.':'Indicative, editable dimensions.','Ajouter votre sujet':'Add your subject','Glissez une image ou':'Drop an image or','parcourir':'browse','Analyse de l’image…':'Analyzing image…','Voir l’original':'View original','Voir le détourage':'View cutout','Changer d’image':'Change image','Le sujet est détouré automatiquement sur votre appareil. Rien n’est envoyé en ligne.':'The subject is cut out automatically on your device. Nothing is sent online.','Détourage automatique':'Automatic cutout','Moteur de détourage':'Cutout engine','IA locale · haute précision':'Local AI · high precision','Couleur du fond · rapide':'Background colour · fast','Le modèle IA est téléchargé une fois, puis l’analyse reste locale.':'The AI model is downloaded once, then processing stays local.','Précision du détourage':'Cutout precision','Augmentez pour retirer davantage de fond, réduisez si une partie du sujet disparaît. Idéal quand le fond se distingue du sujet.':'Increase to remove more background; reduce it if part of the subject disappears. Best when subject and background differ.','Calage vertical au sol':'Vertical ground alignment','Déplacez l’image jusqu’à ce que ses pieds ou sa base touchent la ligne.':'Move the image until its feet or base touch the line.','Glissez aussi directement l’image verticalement sur le tableau, ou utilisez ↑ et ↓.':'You can also drag the image vertically on the chart, or use ↑ and ↓.','Enregistrer dans My subjects':'Save to My subjects','Choisir l’emplacement':'Choose location','Stockage local de l’application':'Local app storage','Les sujets importés enregistrés apparaîtront ici.':'Saved imported subjects will appear here.','Nom du sujet':'Subject name','Nature':'Type','Humain / personnage':'Human / character','Animal':'Animal','Créature':'Creature','Véhicule':'Vehicle','Bâtiment / monument':'Building / monument','Autre objet':'Other object','Dimension mesurée':'Measured dimension','Hauteur':'Height','Largeur':'Width','Longueur / largeur':'Length / width','Taille':'Size','Unité':'Unit','Ajouter au tableau':'Add to chart','Vos images restent sur cet appareil.':'Your images stay on this device.','Aucun compte, aucune API externe.':'No account and no external API.','Une même échelle. Toutes les proportions.':'One scale. Every proportion.','Aligner':'Arrange','Grille':'Grid','Fond':'Background','Graduations':'Grid marks','Clair':'Light','Sombre':'Dark','Plan bleu':'Blueprint','Échelle réelle':'True scale','Déplacer un sujet · Tirer une poignée pour redimensionner':'Move a subject · Drag a handle to resize','Glisser l’image horizontalement et verticalement pour la caler au sol':'Drag the image horizontally and vertically to align it with the ground','L’instruction de proportions':'Scale instruction','Calculée à partir de votre tableau, prête à accompagner l’image.':'Calculated from your chart and ready to accompany the image.','Copier':'Copy','Générateur':'Generator','Langue':'Language','Référence':'Reference','Action / scène souhaitée':'Desired action / scene','Maintenir les proportions pendant toute la vidéo':'Keep proportions throughout the video','Les trois générateurs reçoivent les mêmes contraintes physiques. Joignez le tableau comme référence visuelle dans votre outil vidéo.':'All three generators receive the same physical constraints. Attach the chart as a visual reference in your video tool.','Mis à jour avec vos sujets':'Updated with your subjects','Recalculer':'Recalculate','Dans le tableau':'On the chart','Sélectionnez un sujet pour ajuster ses dimensions.':'Select a subject to adjust its dimensions.','Une référence cohérente':'A consistent reference','Les silhouettes gardent leurs proportions. Noms et dimensions restent toujours sous les sujets.':'Silhouettes retain their proportions. Names and dimensions always remain below the subjects.','Votre scène, à la bonne échelle.':'Your scene, at the right scale.','Exportez le tableau puis joignez-le à votre prompt dans votre générateur vidéo.':'Export the chart, then attach it to your prompt in your video generator.','Résolution du PNG':'PNG resolution','Télécharger l’image PNG':'Download PNG image','SVG vectoriel':'Vector SVG','Prompt .txt':'Prompt .txt','L’export inclut les graduations, les noms et les dimensions, sans les poignées de sélection.':'The export includes grid marks, names and dimensions, without selection handles.','Fermer':'Close','Annuler':'Cancel','Continuer':'Continue','Votre tableau actuel sera remplacé. Vous pourrez revenir en arrière avec Annuler.':'Your current chart will be replaced. You can undo this action.','Tout commence par un sujet':'Every chart starts with a subject','Choisissez une silhouette ou importez une image.':'Choose a silhouette or import an image.','Le tableau s’adapte à ses dimensions.':'The chart adapts to its dimensions.','Choisir un sujet':'Choose a subject','Ex. Aline, le dragon, le château…':'E.g. Alice, the dragon, the castle…','Ex. Les personnages marchent à côté du gorille.':'E.g. The characters walk beside the gorilla.','Propriétés du sujet':'Subject properties','Image importée':'Imported image','Silhouette':'Silhouette','Nom':'Name','Modifiez la valeur ou tirez une poignée sur le tableau. Les proportions sont conservées.':'Edit the value or drag a handle on the chart. Proportions are preserved.','Couleur de la silhouette':'Silhouette colour','Dupliquer':'Duplicate','Supprimer':'Delete','humain':'human','animal':'animal','créature':'creature','véhicule':'vehicle','bâtiment':'building','objet':'object','Couleur personnalisée du sujet':'Custom subject colour'
  };
  staticEnglish.Universel='Universal';
  Object.assign(staticEnglish,{
    'Ressources':'Resources','Bibliothèque locale · choix par défaut':'Local library · default choice',
    'Assets générés':'Generated assets','Images créées dans l’Aggregator':'Images created in Aggregator',
    'Depuis cet ordinateur':'From this computer','Choisir dans les assets':'Choose from assets',
    'Sélectionnez une image à importer comme sujet.':'Select an image to import as a subject.',
    'Actualiser':'Refresh','Chargement des assets…':'Loading assets…',
    'Aucune image dans cette source.':'No images in this source.'
  });
  const englishToFrench=Object.fromEntries(Object.entries(staticEnglish).map(([fr,en])=>[en,fr]));
  const presetNamesEn=[
    'Slim man','Average man','Heavyset man','Slim woman','Average woman','Heavyset woman','Dog','Cat','Gorilla','Elephant','Giraffe','Lion','Tiger','Brown bear','Wolf','Fox','Horse','Donkey','Cow','Sheep','Goat','Pig','Deer','Rhinoceros','Hippopotamus','Zebra','Rabbit','Kangaroo','Panda','Crocodile','Turtle','Eagle','Ostrich','Penguin','Dolphin','Blue whale',
    'City car','Compact car','Sedan','Estate car','Sports coupe','Convertible','SUV','Off-road vehicle','Pickup truck','Van','Motorhome','Limousine','Street motorcycle','Sport motorcycle','Cruiser motorcycle','Dirt bike','Scooter','Quad bike','City bicycle','Mountain bike','Road bicycle','Cargo bicycle','Rowboat','Inflatable boat','Sailboat','Catamaran','Motorboat','Yacht','Ferry','Ocean liner','Container ship','Oil tanker','Light aircraft','Touring aircraft','Private jet','Regional airliner','Airliner','Wide-body aircraft','Cargo aircraft','Fighter jet','Light helicopter','Transport helicopter','City bus','Coach','Double-decker bus','Tram','Locomotive','High-speed train','Semi-trailer truck','Excavator',
    'Small house','Two-storey house','Villa','Chalet','Detached house','Townhouse','Manor','Farmhouse','3-storey building','5-storey building','8-storey building','Residential tower','Office tower','Skyscraper','Slender tower','Twin towers','Stepped tower','Glass tower','Cylindrical tower','Megatower','Factory','Warehouse','Hangar','Power plant','Grain silo','Water tower','Industrial chimney','Refinery','Castle','Palace','Cathedral','Church','Mosque','Temple','Pagoda','Lighthouse','Eiffel Tower','Triumphal arch','Pyramid','Obelisk','Stadium','Railway station','Airport','Hospital','School','Shopping centre','Suspension bridge','Viaduct','Wind turbine','Radio tower'
  ];
  const sectionEnglish={'Personnages':'Characters','Animaux':'Animals','Voitures & utilitaires':'Cars & utility vehicles','Motos & cycles':'Motorcycles & cycles','Bateaux':'Boats','Avions & hélicoptères':'Aircraft & helicopters','Transports & engins':'Transport & machinery','Maisons & habitat':'Houses & homes','Immeubles & tours':'Buildings & towers','Industrie & équipements':'Industry & facilities','Patrimoine & monuments':'Heritage & landmarks','Infrastructures':'Infrastructure'};
  const categoryEnglish={human:'Characters',animal:'Animals',vehicle:'Vehicles',building:'Buildings'};
  const phrase=(fr,en)=>uiLanguage==='en'?en:fr;
  const presetName=p=>uiLanguage==='en'?(presetNamesEn[CATALOGUE.indexOf(p)]||p.name):p.name;
  const presetSection=p=>uiLanguage==='en'?(sectionEnglish[p.section]||p.section):p.section;
  const localizedPreset=p=>({...p,name:presetName(p),section:presetSection(p)});
  function translateStatic(){
    document.documentElement.lang=uiLanguage;document.documentElement.dataset.theme=uiTheme;
    document.title=uiLanguage==='en'?'Scale — proportion studio':'Échelle — Studio de proportions';
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while(node=walker.nextNode()){const raw=node.nodeValue,word=raw.trim(),fr=englishToFrench[word]||word,target=uiLanguage==='en'?(staticEnglish[fr]||word):fr;if(word&&target!==word)node.nodeValue=raw.replace(word,target);}
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{for(const attribute of ['placeholder','title','aria-label']){const word=el.getAttribute(attribute);if(!word)continue;const fr=englishToFrench[word]||word;el.setAttribute(attribute,uiLanguage==='en'?(staticEnglish[fr]||word):fr);}});
    document.querySelectorAll('[data-ui-language]').forEach(button=>{const active=button.dataset.uiLanguage===uiLanguage;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $('ui-theme-toggle').textContent=uiTheme==='dark'?(uiLanguage==='en'?'Light':'Clair'):(uiLanguage==='en'?'Night':'Sombre');
    try{localStorage.setItem(preferenceKey,JSON.stringify({language:uiLanguage,theme:uiTheme}));}catch{}
  }
  const presetVector=s=>globalThis.SUBJECT_VECTORS?.[s.presetId||s.id];
  const vectorAspect=s=>{
    const values=presetVector(s)?.viewBox?.trim().split(/\s+/).map(Number);
    return values?.length===4&&values[2]>0&&values[3]>0?values[2]/values[3]:s.aspect;
  };
  // Keep every preset at the proportions of its traced artwork. The catalogue
  // dimension remains authoritative on its selected measurement axis.
  CATALOGUE.forEach(p=>{if(presetVector(p))p.aspect=vectorAspect(p);});
  const availableCatalogue=CATALOGUE.filter(p=>presetVector(p));
  const availableCategories=CATEGORIES.filter(c=>availableCatalogue.some(p=>p.category===c.id));
  const byId = new Map(availableCatalogue.map(p=>[p.id,p]));
  function vectorMarkup(s){const vector=presetVector(s);return `<svg viewBox="${vector.viewBox}" aria-hidden="true" overflow="visible"><path d="${vector.d}" fill="${s.color||'currentColor'}"/></svg>`;}
  function miniature(s){if(s.image)return `<img src="${s.image}" alt="">`;return vectorMarkup(s);}
  const demo=()=>({version:1,title:uiLanguage==='en'?'Scale study':'Étude de proportions',items:C.arrange([C.fromPreset(localizedPreset(byId.get('human-2')),0),C.fromPreset(localizedPreset(byId.get('human-5')),1),C.fromPreset(localizedPreset(byId.get('animal-9')),2)]),settings:{...C.defaults,language:uiLanguage},promptOverride:null});
  const withoutLegacySubjects=project=>({...project,items:project.items.filter(s=>s.image||presetVector(s)).map(s=>s.presetId?{...s,aspect:vectorAspect(s)}:s)});
  let state=demo(),selected=state.items[0].id,category=availableCategories[0]?.id||'',zoom=1,pan=0,history=[],future=[],db=null,saveTimer,toastTimer,drag=null,currentLayout=null,pendingConfirm=null,originalImage=null,originalPreview=null,importedImage=null,processing=0,showingOriginal=false,cutoutTimer=null,personalSubjects=[],libraryFolder='',assetPickerSource='resources',assetPickerItems=[];
  const aggregatorOrigin='http://127.0.0.1:4317';
  // All item and setting fields are primitives; share image strings across undo snapshots.
  const clone=v=>({...v,items:v.items.map(s=>({...s})),settings:{...v.settings}});
  function localizeStateNames(){state.items.forEach(item=>{if(!item.presetId)return;const preset=byId.get(item.presetId);if(!preset)return;const english=presetNamesEn[CATALOGUE.indexOf(preset)];if(item.name===preset.name||item.name===english)item.name=uiLanguage==='en'?english:preset.name;});if(state.title==='Étude de proportions'||state.title==='Scale study')state.title=uiLanguage==='en'?'Scale study':'Étude de proportions';state.settings.language=uiLanguage;state.promptOverride=null;}
  const selectedItem=()=>state.items.find(s=>s.id===selected);
  function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3400);}
  function checkpoint(){history.push(clone(state));if(history.length>35)history.shift();future=[];}
  function change(fn,{fit=false,keepPrompt=false}={}){checkpoint();fn();if(!keepPrompt)state.promptOverride=null;if(fit){zoom=1;pan=0;}render();save();}
  function undo(){if(!history.length)return;future.push(clone(state));state=history.pop();selected=state.items.some(s=>s.id===selected)?selected:state.items[0]?.id;zoom=1;pan=0;render();save();}
  function redo(){if(!future.length)return;history.push(clone(state));state=future.pop();selected=state.items.some(s=>s.id===selected)?selected:state.items[0]?.id;zoom=1;pan=0;render();save();}
  function save(){clearTimeout(saveTimer);$('save-status').innerHTML=`<i></i> ${phrase('Enregistrement…','Saving…')}`;saveTimer=setTimeout(()=>{if(!db){$('save-status').textContent=phrase('Pensez à enregistrer le projet','Remember to save the project');return;}try{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(clone(state),'current');tx.oncomplete=()=>$('save-status').innerHTML=`<i></i> ${phrase('Enregistré sur cet appareil','Saved on this device')}`;tx.onerror=()=>{$('save-status').textContent=phrase('Stockage plein : exportez le projet','Storage full: export the project');toast(phrase('Enregistrement local impossible. Enregistrez le projet en JSON.','Local save failed. Save the project as JSON.'));};}catch{$('save-status').textContent=phrase('Exportez le projet pour le conserver','Export the project to keep it');}},450);}
  async function restore(){try{db=await new Promise((resolve,reject)=>{const r=indexedDB.open('echelle-studio',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('projects'))r.result.createObjectStore('projects');if(!r.result.objectStoreNames.contains('personalSubjects'))r.result.createObjectStore('personalSubjects',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const saved=await new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(saved){state=withoutLegacySubjects(C.validateProject(saved,CATALOGUE));localizeStateNames();selected=state.items[0]?.id;render();save();}else save();await loadPersonalLibrary();}catch{$('save-status').textContent=phrase('Enregistrement manuel du projet','Manual project saving');renderPersonalLibrary();}}
  function renderLibrary(){
    $('preset-count').textContent=`${availableCatalogue.length} presets`;
    $('categories').innerHTML=availableCategories.map(c=>`<button class="category ${category===c.id?'active':''}" data-category="${c.id}" aria-pressed="${category===c.id}">${icon(c.icon)}${uiLanguage==='en'?categoryEnglish[c.id]:c.name}</button>`).join('');
    const query=$('search').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const presets=availableCatalogue.filter(p=>(query||p.category===category)&&(!query||`${p.name} ${presetName(p)} ${p.section} ${presetSection(p)}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)));
    const activeCategory=availableCategories.find(c=>c.id===category);$('category-title').textContent=query?(uiLanguage==='en'?'Results':'Résultats'):(uiLanguage==='en'?categoryEnglish[activeCategory?.id]:activeCategory?.name)||'';$('category-count').textContent=`${presets.length} silhouettes`;
    let section='';$('preset-list').innerHTML=presets.map(p=>{const translatedSection=presetSection(p),heading=(p.category==='vehicle'||p.category==='building')&&translatedSection!==section?`<div class="section-subheading">${esc(translatedSection)}</div>`:'';section=translatedSection;const name=presetName(p),addLabel=uiLanguage==='en'?'Add':'Ajouter';return heading+`<button class="preset-card" draggable="true" data-preset="${p.id}" title="${addLabel}: ${esc(name)}" aria-label="${addLabel} ${esc(name)}"><span class="preset-add">+</span><span class="miniature">${miniature(p)}</span><span class="preset-name">${esc(name)}</span><span class="preset-size">${p.axis==='width'?(uiLanguage==='en'?'L.':'Long.'):'H.'} ${C.autoUnit(p.size)}</span></button>`;}).join('')||`<p class="no-results">${uiLanguage==='en'?'No subject found. Try another word or import your image.':'Aucun sujet trouvé. Essayez un autre mot ou importez votre image.'}</p>`;
  }
  function renderPersonalLibrary(){
    $('personal-count').textContent=uiLanguage==='en'?`${personalSubjects.length} subject${personalSubjects.length===1?'':'s'}`:`${personalSubjects.length} sujet${personalSubjects.length>1?'s':''}`;
    $('library-location').textContent=libraryFolder||phrase('Stockage local de l’application','Local app storage');
    $('choose-library-folder').hidden=!window.desktopApp;
    $('personal-empty').hidden=!!personalSubjects.length;
    $('personal-list').innerHTML=personalSubjects.map(s=>`<div class="preset-card" role="button" tabindex="0" data-personal="${s.id}" title="${phrase('Ajouter','Add')}: ${esc(s.name)}"><button type="button" class="personal-delete" data-personal-delete="${s.id}" title="${phrase('Supprimer','Delete')}" aria-label="${phrase('Supprimer','Delete')} ${esc(s.name)}">×</button><span class="preset-add">+</span><img class="personal-card-image" src="${s.image}" alt=""><span class="preset-name">${esc(s.name)}</span><span class="preset-size">${s.axis==='width'?'L.':'H.'} ${C.autoUnit(s.size)}</span></div>`).join('');
  }
  function personalRecord(subject){return{id:'personal-'+C.uid(),name:subject.name,category:subject.category,size:subject.size,axis:subject.axis,aspect:subject.aspect,unit:subject.unit,color:subject.color||C.colors[0],image:subject.image,offsetY:Number.isFinite(subject.offsetY)?subject.offsetY:0};}
  async function browserLibrary(action,value){
    if(!db)throw Error('Local storage is not ready');const store=db.transaction('personalSubjects','readwrite').objectStore('personalSubjects');
    if(action==='save')await new Promise((resolve,reject)=>{const r=store.put(value);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});
    if(action==='delete')await new Promise((resolve,reject)=>{const r=store.delete(value);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});
    return new Promise((resolve,reject)=>{const r=db.transaction('personalSubjects').objectStore('personalSubjects').getAll();r.onsuccess=()=>resolve({folder:'',subjects:r.result||[]});r.onerror=()=>reject(r.error);});
  }
  async function applyLibraryResult(result){if(!result||result.canceled)return false;libraryFolder=result.folder||'';personalSubjects=Array.isArray(result.subjects)?result.subjects:[];renderPersonalLibrary();return true;}
  async function loadPersonalLibrary(){try{await applyLibraryResult(window.desktopApp?await window.desktopApp.getLibrary():await browserLibrary('get'));}catch{personalSubjects=[];renderPersonalLibrary();}}
  async function savePersonal(subject){
    const record=personalRecord(subject);let result;
    if(window.desktopApp){result=await window.desktopApp.savePersonalSubject(record);if(result.needsFolder){result=await window.desktopApp.chooseLibraryFolder();if(result.canceled)return false;result=await window.desktopApp.savePersonalSubject(record);}}
    else result=await browserLibrary('save',record);
    await applyLibraryResult(result);return true;
  }
  async function deletePersonal(id){const result=window.desktopApp?await window.desktopApp.deletePersonalSubject(id):await browserLibrary('delete',id);await applyLibraryResult(result);}
  function canAdd(item){if(state.items.length>=60){toast('Ce tableau accepte au maximum 60 sujets.');return false;}if(item.category==='human'&&state.items.filter(i=>i.category==='human').length>=15){toast('Maximum atteint : 15 sujets humains par tableau.');return false;}if(state.items.reduce((sum,s)=>sum+(s.image?.length||0),0)+(item.image?.length||0)>90e6){toast('Ce projet atteint 90 Mo d’images. Utilisez des images plus légères ou un autre tableau.');return false;}return true;}
  function add(item){if(!canAdd(item))return false;change(()=>{const e=C.extent(state.items);item.x=state.items.length?e.width+Math.max(e.height,C.dimensions(item).height)*.2:0;state.items.push(item);selected=item.id;},{fit:true});toast(`${item.name} ajouté au tableau`);return true;}
  function remove(){const s=selectedItem();if(!s)return;change(()=>{state.items=state.items.filter(i=>i.id!==selected);selected=state.items.at(-1)?.id;if(state.settings.referenceId===s.id)state.settings.referenceId='';},{fit:true});}
  function duplicate(){const s=selectedItem();if(!s)return;add({...s,id:C.uid(),name:(s.name+' · copie').slice(0,60)});}
  function renderSceneList(){
    const n=state.items.length;$('subject-count').textContent=uiLanguage==='en'?`${n} subject${n===1?'':'s'}`:`${n} sujet${n>1?'s':''}`;$('human-count').textContent=uiLanguage==='en'?`${state.items.filter(s=>s.category==='human').length} / 15 humans`:`${state.items.filter(s=>s.category==='human').length} / 15 humains`;
    $('scene-list').innerHTML=state.items.map(s=>`<button class="scene-row ${s.id===selected?'active':''}" data-select="${s.id}" aria-pressed="${s.id===selected}"><span class="scene-thumbnail">${miniature(s)}</span><span class="scene-row-info"><strong>${esc(s.name)}</strong><small>${C.dimensionText(s,true)}</small></span><span class="scene-row-dot" style="background:${s.color}"></span></button>`).join('')||'<p class="field-hint">Aucun sujet pour le moment.</p>';
  }
  function renderInspector(){
    const s=selectedItem();$('selection-empty').hidden=!!s;$('inspector-content').hidden=!s;if(!s){$('inspector-content').innerHTML='';return;}
    const d=C.dimensions(s);const ref=state.items.find(i=>i.id===state.settings.referenceId)||state.items[0];
    $('inspector-content').innerHTML=`<div class="selection-caption"><h2>Propriétés du sujet</h2><span>${s.image?'Image importée':'Silhouette'}</span></div>
      <label class="field">Nom<input id="edit-name" value="${esc(s.name)}" maxlength="60"></label>
      <label class="field">Nature<select id="edit-nature">${Object.entries(C.categories).map(([k,v])=>`<option value="${k}" ${s.category===k?'selected':''}>${uiLanguage==='en'?({human:'Human',animal:'Animal',creature:'Creature',vehicle:'Vehicle',building:'Building',object:'Object'}[k]||k):(v[0].toUpperCase()+v.slice(1))}</option>`).join('')}</select></label>
      <label class="field">Dimension mesurée<select id="edit-axis"><option value="height" ${s.axis==='height'?'selected':''}>Hauteur</option><option value="width" ${s.axis==='width'?'selected':''}>Longueur / largeur</option></select></label>
      <div class="dimension-row"><label class="field">Taille<input id="edit-size" type="number" min="0.000001" step="any" value="${Number((s.size/C.units[s.unit]).toPrecision(8))}"></label><label class="field unit-field">Unité<select id="edit-unit">${Object.keys(C.units).map(u=>`<option ${u===s.unit?'selected':''}>${u}</option>`).join('')}</select></label></div>
      <p class="size-input-hint">Modifiez la valeur ou tirez une poignée sur le tableau. Les proportions sont conservées.</p>
      <div class="dimensions-summary"><span>Hauteur <strong>${C.autoUnit(d.height)}</strong></span><span>Largeur <strong>${C.autoUnit(d.width)}</strong></span></div>
      ${s.image?`<label class="field">Calage vertical au sol <span class="range-row"><input id="edit-offset-y" type="range" min="-50" max="50" value="${Math.round((s.offsetY||0)*100)}"><output>${Math.round((s.offsetY||0)*100)} %</output></span><span class="field-hint">Glissez aussi directement l’image verticalement sur le tableau, ou utilisez ↑ et ↓.</span></label>`:''}
      ${s.image?'':`<div class="field">Couleur de la silhouette<div class="color-swatches">${C.colors.map(c=>`<button class="color-swatch ${c===s.color?'active':''}" data-color="${c}" style="background:${c}" title="Couleur ${c}" aria-label="Couleur ${c}" aria-pressed="${c===s.color}"></button>`).join('')}<input id="subject-color" class="custom-color" type="color" value="${s.color}" aria-label="Couleur personnalisée du sujet"></div></div>`}
      ${s.image?`<button id="save-personal-subject" class="button subtle full" type="button">${icon('folder')} Enregistrer dans My subjects</button>`:''}
      <div class="inspector-actions"><button id="duplicate-subject" class="button subtle">${icon('copy')} Dupliquer</button><button id="delete-subject" class="button subtle danger">${icon('trash')} Supprimer</button></div>
      ${ref&&ref.id!==s.id?`<div class="scale-ratio"><strong>× ${C.number(d.height/C.dimensions(ref).height)}</strong>la hauteur de ${esc(ref.name)}</div>`:''}`;
  }
  function contrast(bg){const rgb=bg.match(/[a-f\d]{2}/ig).map(v=>parseInt(v,16));return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>145?'#42516a':'#edf1f8';}
  function boardSVG(width,height,forExport=false){
    const settings=state.settings,bg=settings.background,grid=settings.gridColor,ink=contrast(bg);
    const l=C.layout(state.items,width,height,forExport?1:zoom,forExport?0:pan);
    if(!forExport&&drag&&drag.type!=='pan'){
      l.scale=drag.layout.scale;l.left=drag.layout.left;l.ground=drag.layout.ground;
      l.positions.forEach(p=>{const s=state.items.find(s=>s.id===p.id),d=C.dimensions(s);p.x=l.left+s.x*l.scale;p.y=l.ground-d.height*l.scale;p.w=d.width*l.scale;p.h=d.height*l.scale;p.labelX=Math.min(width-55,Math.max(70,p.x+p.w/2));});
    }
    if(!forExport)currentLayout=l;
    const step=C.tickStep(70/l.scale),fine=step/5;let out=`<rect width="${width}" height="${height}" fill="${bg}"/><g font-family="Segoe UI,Arial,sans-serif">`;
    if(settings.showGrid){
      for(let y=fine,n=0;y*l.scale<l.ground-22&&n<250;y+=fine,n++){const py=l.ground-y*l.scale;out+=`<path d="M42 ${py}H${width-22}" stroke="${grid}" stroke-opacity=".2" stroke-width=".6"/>`;}
      const start=Math.max(0,Math.floor((42-l.left)/l.scale/fine)*fine);
      for(let x=start,n=0;l.left+x*l.scale<width-22&&n<400;x+=fine,n++){const px=l.left+x*l.scale;if(px<42)continue;out+=`<path d="M${px} 22V${l.ground}" stroke="${grid}" stroke-opacity=".22" stroke-width=".6"/>`;}
    }
    for(let y=0,n=0;y*l.scale<l.ground-19&&n<100;y+=step,n++){const py=l.ground-y*l.scale;out+=`<path d="M37 ${py}H${width-22}" stroke="${grid}" stroke-opacity="${y===0?.95:.45}" stroke-width="${y===0?1.2:.8}"/><text x="31" y="${py+3}" text-anchor="end" fill="${grid}" font-size="9">${esc(C.autoUnit(y))}</text>`;}
    const tickStart=Math.max(0,Math.ceil((44-l.left)/l.scale/step)*step);
    for(let x=tickStart,n=0;l.left+x*l.scale<width-22&&n<100;x+=step,n++){const px=l.left+x*l.scale;out+=`<path d="M${px} 20V${l.ground+5}" stroke="${grid}" stroke-opacity=".45" stroke-width=".8"/><text x="${px}" y="15" text-anchor="middle" fill="${grid}" font-size="9">${esc(C.autoUnit(x))}</text>`;}
    out+=`<text x="16" y="15" fill="${grid}" font-size="8">m</text>`;
    l.positions.forEach(p=>{
      const s=state.items.find(i=>i.id===p.id),active=!forExport&&s.id===selected;
      const controls=s.image?phrase('Glisser horizontalement et verticalement. Flèches pour ajuster, plus ou moins pour redimensionner.','Drag horizontally and vertically. Use arrow keys to adjust, plus or minus to resize.'):phrase('Glisser horizontalement. Flèches gauche et droite pour ajuster, plus ou moins pour redimensionner.','Drag horizontally. Use left and right arrow keys to adjust, plus or minus to resize.');
      out+=`<g class="subject" data-subject="${s.id}" ${forExport?'':`tabindex="0" role="button" aria-label="${esc(s.name)}, ${esc(C.dimensionText(s,true))}. ${esc(controls)}"`}><title>${esc(s.name)} — ${esc(C.dimensionText(s,true))}</title>`;
      if(s.image)out+=`<image href="${s.image}" x="${p.x}" y="${p.y+(s.offsetY||0)*p.h}" width="${p.w}" height="${p.h}" preserveAspectRatio="xMidYMid meet"/>`;
      else{const vector=presetVector(s);out+=`<svg x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${vector.viewBox}" preserveAspectRatio="xMidYMax meet" overflow="visible"><path d="${vector.d}" fill="${s.color}"/></svg>`;}
      if(!forExport)out+=`<rect class="hitbox" x="${p.x-3}" y="${p.y-3}" width="${Math.max(p.w+6,10)}" height="${Math.max(p.h+6,10)}" fill="transparent"/>`;
      if(active){out+=`<rect x="${p.x-6}" y="${p.y-6}" width="${p.w+12}" height="${p.h+12}" fill="none" stroke="#8578d7" stroke-width="1" stroke-dasharray="4 3"/><path d="M${p.x-15} ${p.y}h-5V${l.ground}h5M${p.x-20} ${p.y}h5" fill="none" stroke="#aa9bdc" stroke-width=".8"/>`;['left','right'].forEach(side=>{const x=side==='left'?p.x:p.x+p.w;out+=`<rect class="resize-handle" data-resize="${side}" data-subject="${s.id}" x="${x-5}" y="${p.y-5}" width="10" height="10" rx="2" fill="#fff" stroke="#8578d7" stroke-width="1.5"/>`;});}
      out+='</g>';
    });
    l.positions.forEach(p=>{const s=state.items.find(i=>i.id===p.id),active=!forExport&&s.id===selected;const lines=C.labelLines(s.name);
      const displacement=Math.abs(p.labelX-(p.x+p.w/2));if(displacement>14||p.labelY-l.ground>35)out+=`<path d="M${p.x+p.w/2} ${l.ground+5}L${p.labelX} ${p.labelY-13}" stroke="${grid}" stroke-opacity=".65" fill="none" stroke-width=".7"/>`;
      out+=`<g ${forExport?'':`data-select="${s.id}" style="cursor:pointer"`}><title>${esc(s.name)} — ${esc(C.dimensionText(s,true))}</title><text x="${p.labelX}" y="${p.labelY}" text-anchor="middle" fill="${active?'#8874c7':ink}" font-size="10.5" font-weight="600">${lines.map((line,i)=>`<tspan x="${p.labelX}" dy="${i?12:0}">${esc(line)}</tspan>`).join('')}</text><text x="${p.labelX}" y="${p.labelY+(lines.length-1)*12+15}" text-anchor="middle" fill="${ink}" fill-opacity=".68" font-size="10">${esc(C.dimensionText(s,true))}</text></g>`;
    });
    if(forExport)out+=`<text x="${width-22}" y="${height-13}" text-anchor="end" fill="${grid}" font-size="12" font-weight="600">échelle.</text><text x="43" y="${height-13}" fill="${grid}" font-size="9">${esc(state.title)} — Échelle linéaire commune · Dimensions indicatives</text>`;
    out+='</g>';return{markup:out,layout:l};
  }
  function renderBoard(){const el=$('board-wrap'),w=el.clientWidth;const minH=230+C.labelMetrics(state.items,w).space;el.style.minHeight=Math.max(360,minH)+'px';const h=el.clientHeight;const result=boardSVG(w,h);$('board').setAttribute('viewBox',`0 0 ${w} ${h}`);$('board').innerHTML=result.markup;el.style.background=state.settings.background;$('empty-board').hidden=!!state.items.length;$('zoom-label').textContent=Math.round(zoom*100)+' %';$('scale-caption').textContent=`· ${C.autoUnit(100/result.layout.scale)} / 100 px`;const tiny=result.layout.positions.filter(p=>Math.max(p.w,p.h)<8);$('scale-warning').hidden=!tiny.length;$('scale-warning').textContent=uiLanguage==='en'?`${tiny.length} subject${tiny.length===1?' is':'s are'} very small at this scale. Proportions remain exact. Zoom in to inspect them; export reframes every subject.`:`${tiny.length} sujet${tiny.length>1?'s sont très petits':' est très petit'} à cette échelle. Les proportions restent exactes. Zoomez pour les inspecter ; l’export recadre tous les sujets.`;const imported=selectedItem()?.image;$('board-help').textContent=imported?phrase('Glisser l’image horizontalement et verticalement pour la caler au sol','Drag the image horizontally and vertically to align it with the ground'):zoom>1?phrase('Glisser le fond pour naviguer · Ajuster pour tout voir','Drag the background to pan · Fit to show everything'):phrase('Déplacer un sujet · Tirer une poignée pour redimensionner','Move a subject · Drag a handle to resize');}
  function renderPrompt(){const s=state.settings;$('prompt-model').value=s.model;$('prompt-language').value=s.language;$('prompt-reference').innerHTML=state.items.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('')||'<option value="">Aucun sujet</option>';$('prompt-reference').value=state.items.some(i=>i.id===s.referenceId)?s.referenceId:(state.items[0]?.id||'');$('scene-action').value=s.action;$('lock-proportions').checked=s.lock;$('prompt-output').value=state.promptOverride??C.prompt(state);$('prompt-note').innerHTML=state.promptOverride===null?'<i></i> Mis à jour avec vos sujets':'Texte modifié · Le prochain changement de sujet le recalculera';}
  function render(){
    $('project-title').value=state.title;$('show-grid').checked=state.settings.showGrid;$('background-color').value=state.settings.background;$('grid-color').value=state.settings.gridColor;
    $('undo-button').disabled=!history.length;$('redo-button').disabled=!future.length;$('export-button').disabled=!state.items.length;
    renderSceneList();renderInspector();renderBoard();renderPrompt();translateStatic();
  }
  function switchTab(mode){for(const name of ['preset','my','import']){const active=name===mode;$(name+'-panel').hidden=!active;$(name+'-tab').classList.toggle('active',active);$(name+'-tab').setAttribute('aria-selected',String(active));}}
  function aggregatorMediaResults(result,items=[],depth=0){
    if(depth>5||result==null)return items;
    if(Array.isArray(result))result.forEach(value=>aggregatorMediaResults(value,items,depth+1));
    else if(typeof result==='object'){
      if(typeof result.url==='string'&&(!result.content_type||String(result.content_type).startsWith('image/')))items.push({url:result.url,contentType:result.content_type||''});
      else Object.values(result).forEach(value=>aggregatorMediaResults(value,items,depth+1));
    }
    return items;
  }
  function assetPickerRecords(payload,source){
    if(source==='resources')return(payload.resources||[]).filter(item=>item.mediaType==='image').map(item=>({name:item.name||item.originalName||'resource',contentType:item.contentType||'',previewUrl:`${aggregatorOrigin}/api/resources/${encodeURIComponent(item.id)}/content`,fetchUrl:`${aggregatorOrigin}/api/resources/${encodeURIComponent(item.id)}/content`,caption:phrase('Ressource locale','Local resource')}));
    return(payload.jobs||[]).filter(job=>job.status==='completed'&&job.mediaType==='image'&&job.jobType!=='director-session').flatMap(job=>aggregatorMediaResults(job.result).map((media,index)=>({name:job.assetNames?.[String(index)]||job.modelLabel||job.modelId||phrase('Image générée','Generated image'),contentType:media.contentType||'',previewUrl:`${aggregatorOrigin}/api/jobs/${encodeURIComponent(job.id)}/download/${index}`,fetchUrl:`${aggregatorOrigin}/api/jobs/${encodeURIComponent(job.id)}/download/${index}`,caption:job.modelLabel||job.modelId||phrase('Génération','Generation')})));
  }
  function renderAssetPicker(){
    document.querySelectorAll('[data-asset-source]').forEach(button=>{const active=button.dataset.assetSource===assetPickerSource;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    $('asset-picker-grid').innerHTML=assetPickerItems.length?assetPickerItems.map((item,index)=>`<button type="button" class="asset-picker-card" data-picker-index="${index}"><img src="${esc(item.previewUrl)}" alt=""><span><strong>${esc(item.name)}</strong><small>${esc(item.caption)}</small></span></button>`).join(''):`<p class="asset-picker-empty">${phrase('Aucune image dans cette source.','No images in this source.')}</p>`;
  }
  async function refreshAssetPicker(){
    $('asset-picker-status').textContent=phrase('Chargement des assets…','Loading assets…');$('asset-picker-grid').innerHTML='';
    try{const response=await fetch(`${aggregatorOrigin}/api/state`);const payload=await response.json();if(!response.ok)throw Error(payload.error||`HTTP ${response.status}`);assetPickerItems=assetPickerRecords(payload,assetPickerSource);$('asset-picker-status').textContent=assetPickerSource==='resources'?phrase(`${assetPickerItems.length} ressource${assetPickerItems.length>1?'s':''} image`,`${assetPickerItems.length} image resource${assetPickerItems.length===1?'':'s'}`):phrase(`${assetPickerItems.length} asset${assetPickerItems.length>1?'s':''} généré${assetPickerItems.length>1?'s':''}`,`${assetPickerItems.length} generated asset${assetPickerItems.length===1?'':'s'}`);renderAssetPicker();}
    catch(error){assetPickerItems=[];$('asset-picker-status').textContent=phrase('Aggregator indisponible : ','Aggregator unavailable: ')+error.message;renderAssetPicker();}
  }
  function openAssetPicker(source='resources'){
    assetPickerSource=source==='generated'?'generated':'resources';$('import-source-menu').hidden=true;$('import-tab').setAttribute('aria-expanded','false');
    if(!$('asset-picker-dialog').open)$('asset-picker-dialog').showModal();refreshAssetPicker();
  }
  function setImportSource(source){
    document.querySelectorAll('[data-import-source]').forEach(button=>{const active=button.dataset.importSource===source;button.setAttribute('aria-checked',String(active));button.querySelector('.source-check').textContent=active?'✓':'';});
    if(source==='computer'){switchTab('import');$('import-source-menu').hidden=true;$('import-tab').setAttribute('aria-expanded','false');return;}
    openAssetPicker(source);
  }
  async function importAggregatorAsset(item){
    $('asset-picker-status').textContent=phrase('Import de l’image…','Importing image…');
    try{const response=await fetch(item.fetchUrl);if(!response.ok)throw Error(`HTTP ${response.status}`);const blob=await response.blob();const contentType=(blob.type||item.contentType||'').split(';')[0];if(!['image/png','image/jpeg','image/webp'].includes(contentType))throw Error(phrase('Ce format d’image n’est pas pris en charge.','This image format is not supported.'));const extension=contentType==='image/png'?'.png':contentType==='image/webp'?'.webp':'.jpg';const fileName=(item.name||'asset').replace(/[\\/:*?"<>|]+/g,'-').replace(/\.(png|jpe?g|webp)$/i,'')+extension;const file=new File([blob],fileName,{type:contentType});$('asset-picker-dialog').close();switchTab('import');await loadImage(file);}
    catch(error){$('asset-picker-status').textContent=phrase('Import impossible : ','Import failed: ')+error.message;}
  }
  $('preset-tab').onclick=()=>switchTab('preset');$('my-tab').onclick=()=>switchTab('my');
  $('import-tab').onclick=e=>{e.stopPropagation();const next=$('import-source-menu').hidden;$('import-source-menu').hidden=!next;$('import-tab').setAttribute('aria-expanded',String(next));};
  $('import-source-menu').onclick=e=>{const button=e.target.closest('[data-import-source]');if(button)setImportSource(button.dataset.importSource);};
  document.querySelectorAll('[data-asset-source]').forEach(button=>button.onclick=()=>{assetPickerSource=button.dataset.assetSource;refreshAssetPicker();});
  $('asset-picker-grid').onclick=e=>{const card=e.target.closest('[data-picker-index]');if(card)importAggregatorAsset(assetPickerItems[Number(card.dataset.pickerIndex)]);};
  $('asset-picker-refresh').onclick=refreshAssetPicker;$('asset-picker-close').onclick=()=>$('asset-picker-dialog').close();
  $('categories').onclick=e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;$('search').value='';renderLibrary();}};
  $('search').oninput=renderLibrary;
  $('preset-list').onclick=e=>{const b=e.target.closest('[data-preset]');if(b)add(C.fromPreset(localizedPreset(byId.get(b.dataset.preset)),state.items.length));};
  $('preset-list').ondragstart=e=>{const b=e.target.closest('[data-preset]');if(b){e.dataTransfer.setData('application/x-echelle-preset',b.dataset.preset);e.dataTransfer.effectAllowed='copy';}};
  $('board-wrap').ondragover=e=>{e.preventDefault();$('board-wrap').classList.add('drag-over');};
  $('board-wrap').ondragleave=()=>$('board-wrap').classList.remove('drag-over');
  $('board-wrap').ondrop=e=>{e.preventDefault();$('board-wrap').classList.remove('drag-over');const id=e.dataTransfer.getData('application/x-echelle-preset');if(byId.has(id))add(C.fromPreset(localizedPreset(byId.get(id)),state.items.length));else if(e.dataTransfer.files.length){switchTab('import');loadImage(e.dataTransfer.files[0]);}};
  $('personal-list').onclick=e=>{const remove=e.target.closest('[data-personal-delete]');if(remove){e.stopPropagation();deletePersonal(remove.dataset.personalDelete).catch(()=>toast(phrase('Suppression impossible.','Could not delete subject.')));return;}const card=e.target.closest('[data-personal]');if(card){const source=personalSubjects.find(s=>s.id===card.dataset.personal);if(source)add({...source,id:C.uid(),x:0});}};
  $('choose-library-folder').onclick=async()=>{try{await applyLibraryResult(await window.desktopApp.chooseLibraryFolder());}catch{toast(phrase('Impossible d’ouvrir ce dossier.','Could not open this folder.'));}};
  function focusSelectedSubject(){requestAnimationFrame(()=>$('board').querySelector(`[data-subject="${selected}"]`)?.focus());}
  function select(id,{focusBoard=false}={}){if(!state.items.some(s=>s.id===id))return;selected=id;renderSceneList();renderInspector();renderBoard();if(focusBoard)focusSelectedSubject();}
  $('scene-list').onclick=e=>{const b=e.target.closest('[data-select]');if(b)select(b.dataset.select);};
  $('inspector-content').onchange=e=>{const s=selectedItem();if(!s)return;const t=e.target;
    if(t.id==='edit-name'){const name=t.value.trim();if(!name){toast('Donnez un nom au sujet.');renderInspector();return;}change(()=>s.name=name);}
    if(t.id==='edit-size'){const value=Number(t.value)*C.units[s.unit];if(!Number.isFinite(value)||value<1e-6||value>1e6){toast('La taille doit être comprise entre 0,001 mm et 1 000 km.');renderInspector();return;}change(()=>s.size=value,{fit:true});}
    if(t.id==='edit-unit')change(()=>s.unit=t.value);
    if(t.id==='edit-axis')change(()=>{const d=C.dimensions(s);s.axis=t.value;s.size=s.axis==='width'?d.width:d.height;});
    if(t.id==='edit-offset-y')change(()=>s.offsetY=Number(t.value)/100,{keepPrompt:true});
    if(t.id==='edit-nature'){if(t.value==='human'&&s.category!=='human'&&state.items.filter(i=>i.category==='human').length>=15){toast('Maximum : 15 sujets humains.');renderInspector();return;}change(()=>s.category=t.value);}
    if(t.id==='subject-color')change(()=>s.color=t.value,{keepPrompt:true});
  };
  $('inspector-content').oninput=e=>{if(e.target.id==='edit-offset-y'){e.target.nextElementSibling.textContent=`${e.target.value} %`;const s=selectedItem();s.offsetY=Number(e.target.value)/100;renderBoard();}};
  $('inspector-content').onclick=e=>{const c=e.target.closest('[data-color]');if(c)change(()=>selectedItem().color=c.dataset.color,{keepPrompt:true});if(e.target.closest('#duplicate-subject'))duplicate();if(e.target.closest('#delete-subject'))remove();if(e.target.closest('#save-personal-subject'))savePersonal(selectedItem()).then(saved=>saved&&toast(phrase('Sujet enregistré dans My subjects.','Subject saved to My subjects.'))).catch(()=>toast(phrase('Enregistrement impossible.','Could not save subject.')));};
  $('board').onpointerdown=e=>{
    if(e.button!==0)return;const handle=e.target.closest('[data-resize]'),subject=e.target.closest('[data-subject]'),label=e.target.closest('[data-select]');
    if(label){select(label.dataset.select,{focusBoard:true});return;}
    if(subject){const id=subject.dataset.subject;selected=id;renderSceneList();renderInspector();focusSelectedSubject();const s=selectedItem();drag={type:handle?'resize':'move',side:handle?.dataset.resize,id,startX:e.clientX,startY:e.clientY,original:{...s},layout:currentLayout,changed:false};}
    else{drag={type:'pan',startX:e.clientX,startY:e.clientY,originalPan:pan,changed:false};}
    $('board').setPointerCapture(e.pointerId);e.preventDefault();renderBoard();
  };
  $('board').onpointermove=e=>{
    if(!drag)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(Math.abs(dx)+Math.abs(dy)<3&&!drag.changed)return;
    if(drag.type==='pan'){pan=drag.originalPan+dx;drag.changed=true;renderBoard();return;}
    if(!drag.changed){checkpoint();drag.changed=true;}
    const s=selectedItem(),d=C.dimensions(drag.original),sc=drag.layout.scale;
    if(drag.type==='move'){
      s.x=Math.max(0,drag.original.x+dx/sc);
      if(s.image)s.offsetY=Math.max(-.5,Math.min(.5,(drag.original.offsetY||0)+dy/(d.height*sc)));
    }
    else{const w=d.width*sc,h=d.height*sc,projection=((drag.side==='left'?-dx:dx)*w-dy*h)/(w*w+h*h);s.size=Math.max(1e-6,Math.min(1e6,drag.original.size*(1+projection)));if(drag.side==='left')s.x=Math.max(0,drag.original.x+d.width-C.dimensions(s).width);}
    state.promptOverride=null;renderBoard();
  };
  function finishDrag(){if(!drag)return;const changed=drag.changed,type=drag.type;drag=null;if(changed&&type!=='pan'){zoom=1;pan=0;render();save();}else renderBoard();}
  $('board').onpointerup=finishDrag;$('board').onpointercancel=finishDrag;$('board').onlostpointercapture=finishDrag;
  $('board').onkeydown=e=>{const s=selectedItem();if(!s)return;const vertical=s.image&&['ArrowUp','ArrowDown'].includes(e.key);if(vertical||['ArrowLeft','ArrowRight','+','=','-','Delete','Backspace'].includes(e.key)){e.preventDefault();if(e.key==='Delete'||e.key==='Backspace'){e.stopPropagation();return remove();}change(()=>{if(vertical)s.offsetY=Math.max(-.5,Math.min(.5,(s.offsetY||0)+(e.key==='ArrowDown'?1:-1)*(e.shiftKey?.02:.005)));else if(e.key==='ArrowLeft'||e.key==='ArrowRight')s.x=Math.max(0,s.x+(e.key==='ArrowRight'?1:-1)*C.extent(state.items).width*(e.shiftKey?.03:.005));else s.size=Math.min(1e6,Math.max(1e-6,s.size*(e.key==='-'?.95:1.05)));},{fit:!vertical,keepPrompt:vertical});$('board').querySelector(`[data-subject="${selected}"]`)?.focus();}if(e.key==='Enter'||e.key===' '){const subject=e.target.closest('[data-subject]');if(subject){e.preventDefault();select(subject.dataset.subject);}}};
  $('undo-button').onclick=undo;$('redo-button').onclick=redo;
  $('arrange-button').onclick=()=>change(()=>state.items=C.arrange(state.items),{fit:true});
  $('fit-button').onclick=()=>{zoom=1;pan=0;renderBoard();};
  $('zoom-in').onclick=()=>{zoom=Math.min(40,zoom*1.25);renderBoard();};$('zoom-out').onclick=()=>{zoom=Math.max(.25,zoom/1.25);renderBoard();};
  $('show-grid').onchange=e=>change(()=>state.settings.showGrid=e.target.checked,{keepPrompt:true});
  $('appearance-toggle').onclick=()=>{const hidden=!$('appearance-panel').hidden;$('appearance-panel').hidden=hidden;$('appearance-toggle').setAttribute('aria-expanded',String(!hidden));};
  $('background-color').onchange=e=>change(()=>state.settings.background=e.target.value,{keepPrompt:true});$('grid-color').onchange=e=>change(()=>state.settings.gridColor=e.target.value,{keepPrompt:true});
  for(const [id,background,gridColor] of [['theme-light','#ffffff','#b9c6d8'],['theme-dark','#242a38','#737f96'],['theme-blueprint','#234d7f','#a2bddc']])$(id).onclick=()=>change(()=>Object.assign(state.settings,{background,gridColor}),{keepPrompt:true});
  $('project-title').onchange=e=>change(()=>state.title=e.target.value.trim()||'Sans titre',{keepPrompt:true});
  $('empty-add').onclick=()=>{switchTab('preset');$('search').focus();$('preset-panel').scrollIntoView({block:'nearest',behavior:'smooth'});};
  const promptSettings={'prompt-model':'model','prompt-language':'language','prompt-reference':'referenceId','scene-action':'action','lock-proportions':'lock'};
  Object.entries(promptSettings).forEach(([id,key])=>$(id).onchange=e=>change(()=>state.settings[key]=e.target.type==='checkbox'?e.target.checked:e.target.value));
  $('prompt-settings-toggle').onclick=()=>{const hidden=!$('prompt-settings').hidden;$('prompt-settings').hidden=hidden;$('prompt-settings-toggle').setAttribute('aria-expanded',String(!hidden));};
  $('prompt-output').onchange=e=>{checkpoint();state.promptOverride=e.target.value;save();$('prompt-note').textContent='Texte personnalisé · Conservé dans le projet';};
  $('regenerate-prompt').onclick=()=>change(()=>state.promptOverride=null);
  $('copy-prompt').onclick=async()=>{try{await navigator.clipboard.writeText($('prompt-output').value);toast('Prompt copié dans le presse-papiers');}catch{$('prompt-output').focus();$('prompt-output').select();toast('Sélectionnez le texte puis copiez-le avec Ctrl+C.');}};
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  const filename=()=>state.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'echelle';
  function exportSvg(){const w=1600,h=Math.max(900,300+Math.ceil(state.items.length/13)*37);return`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${esc(state.title)}</title><desc>Tableau de proportions à échelle linéaire commune. ${esc(state.items.map(s=>s.name+' : '+C.dimensionText(s,true)).join('; '))}</desc>${boardSVG(w,h,true).markup}</svg>`;}
  async function exportPngBlob(resolution=3840){let url;try{const svg=exportSvg();url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Impossible de préparer l’image.'));image.src=url;});const canvas=document.createElement('canvas');canvas.width=Math.max(640,Math.min(7680,Number(resolution)||3840));canvas.height=Math.round(canvas.width*image.height/image.width);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Export PNG impossible.');return blob;}finally{if(url)URL.revokeObjectURL(url);}}
  function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(Error('Le schéma exporté ne peut pas être lu.'));reader.readAsDataURL(blob);});}
  window.BarzObjectScale=Object.freeze({exportBundle:async()=>{if(!state.items.length)throw Error('Ajoutez au moins un sujet au tableau.');const prompt=$('prompt-output').value.trim();if(!prompt)throw Error('Le prompt de proportions est vide.');const blob=await exportPngBlob(Number($('export-resolution').value)||3840);return{title:state.title,filename:filename()+'.png',prompt,dataUrl:await blobToDataUrl(blob),generator:state.settings.model};}});
  $('export-button').onclick=()=>{$('export-status').textContent='';$('export-dialog').showModal();};
  $('download-svg').onclick=()=>download(new Blob([exportSvg()],{type:'image/svg+xml'}),filename()+'.svg');
  $('download-prompt').onclick=()=>download(new Blob([$ ('prompt-output').value],{type:'text/plain;charset=utf-8'}),filename()+'-prompt.txt');
  $('download-png').onclick=async()=>{const button=$('download-png');button.disabled=true;$('export-status').textContent='Préparation de l’image…';try{download(await exportPngBlob(Number($('export-resolution').value)),filename()+'.png');$('export-status').textContent='Image téléchargée. Pensez à récupérer le prompt.';}catch(error){$('export-status').textContent=error.message;}finally{button.disabled=false;}};
  $('project-menu-button').onclick=()=>{const hidden=!$('project-menu').hidden;$('project-menu').hidden=hidden;$('project-menu-button').setAttribute('aria-expanded',String(!hidden));};
  document.addEventListener('click',e=>{if(!e.target.closest('#project-menu')&&!e.target.closest('#project-menu-button')){$('project-menu').hidden=true;$('project-menu-button').setAttribute('aria-expanded','false');}if(!e.target.closest('#import-source-menu')&&!e.target.closest('#import-tab')){$('import-source-menu').hidden=true;$('import-tab').setAttribute('aria-expanded','false');}});
  $('save-project').onclick=()=>{state.promptOverride=$('prompt-output').value===C.prompt(state)?null:$('prompt-output').value;download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),filename()+'.json');$('project-menu').hidden=true;};
  $('load-project').onclick=()=>$('project-file').click();
  $('project-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100e6)throw Error('Ce projet est trop volumineux (100 Mo maximum).');const next=withoutLegacySubjects(C.validateProject(JSON.parse(await file.text()),CATALOGUE));confirm('Ouvrir ce projet ?',()=>{change(()=>{state=next;localizeStateNames();selected=next.items[0]?.id;},{fit:true,keepPrompt:true});toast('Projet ouvert');});}catch(error){toast('Projet non ouvert : '+error.message);}e.target.value='';};
  function confirm(title,fn){pendingConfirm=fn;$('confirm-title').textContent=title;$('confirm-dialog').showModal();$('project-menu').hidden=true;}
  $('confirm-cancel').onclick=()=>{$('confirm-dialog').close();pendingConfirm=null;};$('confirm-ok').onclick=()=>{$('confirm-dialog').close();pendingConfirm?.();pendingConfirm=null;};
  $('new-project').onclick=()=>confirm(phrase('Créer un nouveau tableau ?','Create a new chart?'),()=>change(()=>{state={...demo(),items:[],title:phrase('Nouveau tableau','New chart')};selected=null;},{fit:true}));
  $('demo-project').onclick=()=>confirm(phrase('Charger la démonstration ?','Load the demo?'),()=>change(()=>{state=demo();selected=state.items[0].id;},{fit:true}));
  function trimCanvas(canvas){const ctx=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height,pixels=ctx.getImageData(0,0,w,h);let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(pixels.data[(y*w+x)*4+3]>12){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}if(x1<0)throw Error('Le détourage a supprimé tout le sujet. Réduisez la tolérance.');const result=document.createElement('canvas');result.width=x1-x0+1;result.height=y1-y0+1;result.getContext('2d').drawImage(canvas,x0,y0,result.width,result.height,0,0,result.width,result.height);return result;}
  function setCutoutStatus(message,kind=''){$('cutout-status').textContent=message;$('cutout-status').className='cutout-status '+kind;}
  function updatePreview(){if(!importedImage)return;$('import-preview').src=showingOriginal&&originalPreview?originalPreview:importedImage.image;$('import-preview').style.setProperty('--subject-offset',`${Number($('import-offset-y').value)||0}%`);$('toggle-cutout').textContent=showingOriginal?phrase('Voir le détourage','View cutout'):phrase('Voir l’original','View original');$('change-image').textContent=phrase('Changer d’image','Change image');$('toggle-cutout').hidden=!$('remove-background').checked||!originalPreview;}
  async function imageFromBlob(blob){const url=URL.createObjectURL(blob);try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Le résultat du détourage ne peut pas être lu.'));image.src=url;});return image;}finally{setTimeout(()=>URL.revokeObjectURL(url),0);}}
  async function processImage(){
    if(!originalImage)return;
    const ticket=++processing,cutout=$('remove-background').checked,method=$('cutout-method').value;
    $('add-import').disabled=true;importedImage=null;$('import-error').textContent='';$('cutout-working').hidden=false;setCutoutStatus(cutout?'Analyse du fond en cours…':'Image originale conservée.');
    try{
      await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));if(ticket!==processing)return;
      const maxSide=cutout?1100:1400,factor=Math.min(1,maxSide/Math.max(originalImage.width,originalImage.height));let canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(originalImage.width*factor));canvas.height=Math.max(1,Math.round(originalImage.height*factor));canvas.getContext('2d').drawImage(originalImage,0,0,canvas.width,canvas.height);
      originalPreview=canvas.toDataURL('image/png');
      let result={skipped:true,message:'Image originale conservée.'};
      if(cutout&&method==='ai'){
        if(!window.LocalAICutout)throw Error('Le moteur IA local n’est pas disponible.');
        setCutoutStatus(phrase('Chargement du modèle IA local…','Loading local AI model…'));
        const source=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
        const output=await window.LocalAICutout.remove(source,({current,total})=>{if(ticket===processing&&total)setCutoutStatus(phrase(`Chargement IA ${Math.round(current/total*100)} %…`,`Loading AI ${Math.round(current/total*100)}%…`));});
        if(ticket!==processing)return;
        const aiImage=await imageFromBlob(output);canvas=document.createElement('canvas');canvas.width=aiImage.width;canvas.height=aiImage.height;canvas.getContext('2d').drawImage(aiImage,0,0);result={skipped:false,message:phrase('Détourage IA local terminé.','Local AI cutout complete.')};
      }else if(cutout){const context=canvas.getContext('2d',{willReadFrequently:true}),pixels=context.getImageData(0,0,canvas.width,canvas.height);result=AutoCutout.autoCutout(pixels,Number($('background-tolerance').value));if(!result.skipped)context.putImageData(pixels,0,0);}
      const cropped=trimCanvas(canvas),aspect=cropped.width/cropped.height;if(aspect<.001||aspect>1000)throw Error('Les proportions de cette image ne sont pas prises en charge.');
      importedImage={image:cropped.toDataURL('image/png'),aspect,offsetY:Number($('import-offset-y').value)/100};showingOriginal=false;updatePreview();$('upload-zone').hidden=true;$('import-preview-wrap').hidden=false;$('add-import').disabled=false;
      setCutoutStatus(result.message,result.skipped&&cutout?'warning':'success');
    }catch(error){$('import-error').textContent=method==='ai'&&/fetch/i.test(error.message)?phrase('Le modèle IA n’a pas pu être téléchargé. Vérifiez la connexion ou choisissez le mode rapide.','The AI model could not be downloaded. Check the connection or choose fast mode.'):error.message;setCutoutStatus(phrase('Détourage interrompu.','Cutout stopped.'),'warning');}
    finally{if(ticket===processing)$('cutout-working').hidden=true;}
  }
  async function loadImage(file){$('import-error').textContent='';$('import-offset-y').value='0';$('import-offset-value').value='0 %';if(!['image/png','image/jpeg','image/webp'].includes(file.type)){$('import-error').textContent='Choisissez une image PNG, JPG ou WebP.';return;}if(file.size>15*1024*1024){$('import-error').textContent='L’image dépasse 15 Mo. Réduisez sa résolution.';return;}const url=URL.createObjectURL(file);try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Cette image ne peut pas être lue.'));image.src=url;});if(image.width*image.height>50e6)throw Error('Cette image dépasse 50 mégapixels. Réduisez sa résolution.');originalImage=image;$('import-name').value=file.name.replace(/\.[^.]+$/,'').slice(0,60);await processImage();}catch(error){$('import-error').textContent=error.message;}finally{URL.revokeObjectURL(url);}}
  $('subject-file').onchange=e=>{if(e.target.files[0])loadImage(e.target.files[0]);e.target.value='';};$('change-image').onclick=()=>$('subject-file').click();
  $('toggle-cutout').onclick=()=>{showingOriginal=!showingOriginal;updatePreview();};
  $('upload-zone').ondragover=e=>{e.preventDefault();$('upload-zone').classList.add('drag-over');};$('upload-zone').ondragleave=()=>$('upload-zone').classList.remove('drag-over');$('upload-zone').ondrop=e=>{e.preventDefault();$('upload-zone').classList.remove('drag-over');if(e.dataTransfer.files[0])loadImage(e.dataTransfer.files[0]);};
  function updateCutoutControls(){const enabled=$('remove-background').checked,fast=$('cutout-method').value==='fast';$('cutout-method-field').hidden=!enabled;$('tolerance-field').hidden=!enabled||!fast;}
  $('remove-background').onchange=()=>{updateCutoutControls();showingOriginal=false;processImage();};
  $('cutout-method').onchange=()=>{updateCutoutControls();showingOriginal=false;processImage();};
  $('background-tolerance').oninput=e=>{$('cutout-strength').value=e.target.value;clearTimeout(cutoutTimer);cutoutTimer=setTimeout(processImage,320);};
  $('background-tolerance').onchange=()=>{clearTimeout(cutoutTimer);processImage();};
  $('import-offset-y').oninput=e=>{$('import-offset-value').value=`${e.target.value} %`;if(importedImage){importedImage.offsetY=Number(e.target.value)/100;updatePreview();}};
  $('import-nature').onchange=e=>{if(e.target.value==='vehicle')$('import-axis').value='width';else $('import-axis').value='height';};
  $('import-form').onsubmit=async e=>{e.preventDefault();if(!importedImage)return;const size=Number($('import-size').value)*C.units[$('import-unit').value],name=$('import-name').value.trim();if(!name||!Number.isFinite(size)||size<1e-6||size>1e6){$('import-error').textContent='Renseignez un nom et une taille entre 0,001 mm et 1 000 km.';return;}const subject={id:C.uid(),name,category:$('import-nature').value,axis:$('import-axis').value,size,unit:$('import-unit').value,color:C.colors[state.items.length%C.colors.length],x:0,...importedImage,offsetY:Number($('import-offset-y').value)/100};if(add(subject)){$('import-error').textContent='';if($('save-to-library').checked)try{if(await savePersonal(subject))toast(phrase('Sujet ajouté et enregistré dans My subjects.','Subject added and saved to My subjects.'));}catch{$('import-error').textContent=phrase('Sujet ajouté, mais la bibliothèque personnelle n’a pas pu être enregistrée.','Subject added, but the personal library could not be saved.');}}};
  document.addEventListener('keydown',e=>{const editing=e.target.matches('input,textarea,select')||document.querySelector('dialog[open]');if(editing)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();}else if((e.key==='Delete'||e.key==='Backspace')&&!e.target.closest('#board')){e.preventDefault();remove();}else if(e.key==='/'){e.preventDefault();switchTab('preset');$('search').focus();}else if(e.key==='Escape'){$('project-menu').hidden=true;$('import-source-menu').hidden=true;$('import-tab').setAttribute('aria-expanded','false');}});
  new ResizeObserver(()=>{if(!drag)renderBoard();}).observe($('board-wrap'));
  document.querySelectorAll('[data-ui-language]').forEach(button=>button.onclick=()=>{if(uiLanguage===button.dataset.uiLanguage)return;uiLanguage=button.dataset.uiLanguage;localizeStateNames();renderLibrary();renderPersonalLibrary();render();save();});
  $('ui-theme-toggle').onclick=()=>{uiTheme=uiTheme==='dark'?'light':'dark';translateStatic();};
  const versionParts=value=>String(value||'0').replace(/^v/i,'').split('.').map(part=>Number(part.replace(/\D.*$/,''))||0);
  const newerVersion=(latest,current)=>{const a=versionParts(latest),b=versionParts(current);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return(a[i]||0)>(b[i]||0);}return false;};
  async function currentVersion(){return window.desktopApp?window.desktopApp.getVersion():(window.APP_VERSION||'1.1.0');}
  async function fetchLatestRelease(){if(window.desktopApp)return window.desktopApp.latestRelease();const response=await fetch('https://api.github.com/repos/grosdada/Object-scale-chart/releases/latest',{headers:{Accept:'application/vnd.github+json'}});if(!response.ok)throw Error(`GitHub ${response.status}`);const release=await response.json(),asset=release.assets?.find(item=>/\.exe$/i.test(item.name));return{version:String(release.tag_name||'').replace(/^v/i,''),url:asset?.browser_download_url||release.html_url};}
  async function openUpdate(url){if(window.desktopApp)return window.desktopApp.openUpdate(url);const opened=window.open(url,'_blank','noopener,noreferrer');if(!opened)location.href=url;}
  $('update-button').onclick=async()=>{const button=$('update-button');if(button.dataset.url)return openUpdate(button.dataset.url);button.disabled=true;button.textContent=phrase('Vérification…','Checking…');try{const [current,latest]=await Promise.all([currentVersion(),fetchLatestRelease()]);if(newerVersion(latest.version,current)){button.dataset.url=latest.url;button.textContent=phrase(`Télécharger v${latest.version}`,`Download v${latest.version}`);toast(phrase(`Version ${latest.version} disponible. Cliquez à nouveau pour la télécharger.`,`Version ${latest.version} is available. Click again to download it.`));}else{button.textContent=phrase('À jour','Up to date');toast(phrase(`Vous utilisez la dernière version (${current}).`,`You are using the latest version (${current}).`));setTimeout(()=>{button.textContent=phrase('Mise à jour','Update');button.disabled=false;},2600);return;}}catch{button.dataset.url='https://github.com/grosdada/Object-scale-chart/releases/latest';button.textContent=phrase('Voir les versions','View releases');toast(phrase('Vérification automatique impossible. Ouvrez la page des versions.','Automatic check failed. Open the releases page.'));}button.disabled=false;};
  currentVersion().then(version=>$('update-button').title=phrase(`Version actuelle : ${version}`,`Current version: ${version}`));
  updateCutoutControls();renderLibrary();renderPersonalLibrary();render();translateStatic();restore();
})();

(function(){
'use strict';
const F=window.FlowCore,$=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),esc=F.esc;
F.standalone.coreSource=window.FLOW_CORE_SOURCE;
const BUILTINS={...window.FLOW_ASSETS,...F.extraAssets};let project=F.preset('hybrid',window.FLOW_ASSETS),selection=null,paused=matchMedia('(prefers-reduced-motion:reduce)').matches,connectFrom=null,connectMode=false,grid=false,snap=true,drag=null;
let libraryMode='elements';
let history=[],future=[],lastState='',saveTimer,toastTimer;
const STORAGE='flow-studio.v1';
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function snapshot(){const{assets,...rest}=project;return JSON.stringify(rest);}
function commit(){const now=snapshot();if(now!==lastState){history.push(lastState);if(history.length>60)history.shift();future=[];lastState=now;}saveLater();updateHistory();}
function saveLater(){if(window.domainProjects?.editing){window.domainProjects.changed();return;}clearTimeout(saveTimer);$('save-status').textContent='Saving…';saveTimer=setTimeout(()=>{try{const{assets,...rest}=project;const custom=Object.fromEntries(Object.entries(assets).filter(([k])=>!BUILTINS[k]));localStorage.setItem(STORAGE,JSON.stringify({...rest,assets:custom}));$('save-status').textContent='Saved on this device';}catch(e){$('save-status').textContent='Use Save project';}},450);}
function updateHistory(){$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function restore(s){const assets=project.assets;project={...JSON.parse(s),assets};selection=null;lastState=s;draw();inspect();saveLater();updateHistory();}
function undo(){if(!history.length)return;future.push(snapshot());restore(history.pop());}
function redo(){if(!future.length)return;history.push(snapshot());restore(future.pop());}
try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(saved){saved.assets={...F.clone(BUILTINS),...saved.assets};F.validate(saved);project=saved;}}catch(e){/* Invalid older drafts never prevent opening the editor. */}
lastState=snapshot();
function unique(prefix,list){let n=1,id=prefix;while(list.some(x=>x.id===id))id=prefix+'-'+n++;return id;}
function findSelected(){return selection?(selection.type==='node'?project.nodes:project.edges).find(x=>x.id===selection.id):null;}
function select(type,id){selection=type?{type,id}:null;draw();inspect();}
function draw(){
 const svg=F.render(project,{editable:true,selection,grid,animate:!paused});const canvas=$('canvas');canvas.setAttribute('viewBox',svg.getAttribute('viewBox'));canvas.replaceChildren(...svg.childNodes);canvas.setAttribute('aria-label',project.title);
 $('project-title').value=project.title;$('canvas-info').textContent=`${project.width} × ${project.height}`;
 $('motion').textContent=paused?'▶ Play':'Ⅱ Pause';$('motion').setAttribute('aria-pressed',String(!paused));$('connect').setAttribute('aria-pressed',String(connectMode));
 $('hint').textContent=connectMode?(connectFrom?'Click the target element.':'Click the source element.'):'Drag elements · Select lines to edit routes';
 const list=$('layers');list.replaceChildren();$('layer-count').textContent=project.nodes.length+project.edges.length;
 for(const type of ['node','edge'])for(const item of type==='node'?project.nodes:project.edges){const b=document.createElement('button');b.className='layer-row'+(selection?.type===type&&selection.id===item.id?' active':'');b.innerHTML=`<i class="layer-dot ${esc(item.state)}"></i><span>${esc(item.name)}</span><span>${type==='node'?'Element':'Line'}</span>`;b.onclick=()=>select(type,item.id);list.append(b);}
 updateZoom();updateHistory();
}
function updateZoom(){$('stage-size').style.width=(Number($('zoom').value)*100)+'%';}
function stateButtons(item){return`<div class="state-buttons">${F.STATES.map(s=>`<button data-state="${s}" aria-pressed="${item.state===s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}</div>`;}
function field(label,key,value,type='text',extra=''){return`<label class="field">${label}<input data-prop="${key}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
function choose(label,key,value,opts){return`<label class="field">${label}<select data-prop="${key}">${opts.map(o=>`<option value="${esc(Array.isArray(o)?o[0]:o)}" ${value===(Array.isArray(o)?o[0]:o)?'selected':''}>${esc(Array.isArray(o)?o[1]:o)}</option>`).join('')}</select></label>`;}
function check(label,key,value){return`<label class="check"><input data-prop="${key}" type="checkbox" ${value?'checked':''}>${label}</label>`;}
function inspect(){const item=findSelected(),host=$('inspector');
 if(!item){$('inspector-title').textContent='Canvas settings';$('inspector-subtitle').textContent='Size, background and project layout.';
  host.innerHTML=`${field('Project name','title',project.title)}<div class="field-grid">${field('Width','width',project.width,'number','min="100" max="4096"')}${field('Height','height',project.height,'number','min="100" max="4096"')}</div>${field('Background','background',project.background,'color')}<button id="fit-content" class="wide">Fit canvas to content</button><div class="inspector-section"><h3>Quick guide</h3><div class="inspector-help">1. Add an element from the left.<br>2. Drag it into position.<br>3. Connect two elements.<br>4. Select a line to adjust its corners and motion.<br>5. Export or save an editable project.</div></div><div class="inspector-section"><h3>Shortcuts</h3><div class="inspector-help">Ctrl / ⌘ Z — Undo<br>Ctrl / ⌘ Shift Z — Redo<br>Delete — Remove selection<br>Esc — Cancel connection / deselect</div></div>`;
  $('fit-content').onclick=()=>{F.fit(project);commit();draw();inspect();toast('Canvas resized to fit the diagram');};
 }else if(selection.type==='node'){
  $('inspector-title').textContent='Element properties';$('inspector-subtitle').textContent=item.id;
  host.innerHTML=stateButtons(item)+field('Name','name',item.name)+`<div class="field-grid">${field('Value','value',item.value,'number','step="any"')}${field('Unit','unit',item.unit)}</div>`+
   `<div class="inspector-section"><h3>Display data</h3><div class="field-grid">${field('Current','current',item.current,'number','step="any"')}${field('Current unit','currentUnit',item.currentUnit)}${field('Efficiency %','efficiency',item.efficiency,'number','min="0" max="100" step="any"')}</div>${field('Status text','status',item.status)}${check('Show current and efficiency','showDetails',item.showDetails)}</div>`+
   `<div class="inspector-section"><h3>Position & size</h3><div class="field-grid">${field('X','x',item.x,'number','step="1"')}${field('Y','y',item.y,'number','step="1"')}${field('Width','w',item.w,'number','min="1" max="4096"')}${field('Height','h',item.h,'number','min="1" max="4096"')}</div></div>`+
   `<div class="inspector-section"><h3>عرض بيانات العنصر</h3>${choose('طريقة العرض','labelStyle',item.labelStyle||'text',[['text','نص'],['card','بطاقة بيانات']])}${check('إظهار الاسم','showName',item.showName!==false)}${check('إظهار القيمة والوحدة','showValue',item.showValue!==false)}${check('إظهار الحالة','showStatus',item.showStatus!==false)}${choose('Position','labelSide',item.labelSide,['bottom','right','left','top'])}<div class="field-grid">${field('Gap','labelGap',item.labelGap,'number','min="0" max="200"')}${field('Font size','fontSize',item.fontSize,'number','min="8" max="60"')}</div>${field('Value color','color',item.color,'color')}${check('Show label','showLabel',item.showLabel!==false)}</div>`+
   `<div class="inspector-actions"><button id="duplicate">Duplicate</button><button id="remove" class="danger">Delete</button></div>`;
  $('duplicate').onclick=duplicate;$('remove').onclick=remove;
 }else{
  $('inspector-title').textContent='Line properties';$('inspector-subtitle').textContent=item.id;const nodes=project.nodes.filter(F.canConnect).map(n=>[n.id,n.name]);
  host.innerHTML=stateButtons(item)+field('Line name','name',item.name)+choose('Source element','from',item.from,nodes)+choose('Target element','to',item.to,nodes)+
   `<div class="field-grid">${choose('Source port','sourcePort',item.sourcePort,['top','bottom','left','right','center'])}${choose('Target port','targetPort',item.targetPort,['top','bottom','left','right','center'])}</div>`+
   `<div class="inspector-section"><h3>Appearance & motion</h3><div class="field-grid">${field('Highlight','color',item.color,'color')}${field('Base track','trackColor',item.trackColor,'color')}${field('Highlight width','width',item.width,'number','min="0.5" max="30" step="0.5"')}${field('Track width','trackWidth',item.trackWidth,'number','min="0.5" max="30" step="0.1"')}${field('Corner radius','radius',item.radius,'number','min="0" max="100"')}${field('Cycle seconds','duration',item.duration,'number','min="0.5" max="20" step="0.1"')}</div>${choose('Direction','direction',String(item.direction),[['1','Source → target'],['-1','Target → source']])}</div>`+
   `<div class="inspector-section"><h3>Route</h3>${check('Automatic rounded routing','auto',item.auto)}<p class="inspector-help">Manual routes use the points below. Drag their blue handles on the canvas.</p><label class="field">Waypoints — x, y per line<textarea id="waypoints" ${item.auto?'disabled':''}>${item.waypoints.map(v=>v.join(', ')).join('\n')}</textarea></label><button id="manual-route" class="wide">${item.auto?'Convert to editable route':'Add a midpoint'}</button></div><div class="inspector-actions"><button id="remove" class="danger">Delete line</button></div>`;
  $('remove').onclick=remove;
  $('waypoints').onchange=()=>{try{const text=$('waypoints').value.trim(),pts=text?text.split('\n').map(l=>l.split(',').map(v=>Number(v.trim()))):[];if(pts.length>80||!pts.every(a=>a.length===2&&a.every(v=>Number.isFinite(v)&&v>=-4096&&v<=8192)))throw new Error('Each line needs two numbers: x, y');item.waypoints=pts;commit();draw();}catch(e){toast(e.message);inspect();}};
  $('manual-route').onclick=()=>{if(item.auto){item.waypoints=F.points(project,item).slice(1,-1);item.auto=false;}else{const pts=F.points(project,item);const a=pts[Math.floor((pts.length-1)/2)],b=pts[Math.floor((pts.length-1)/2)+1];item.waypoints.splice(Math.floor((pts.length-1)/2),0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);}commit();draw();inspect();};
 }
 host.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>{item.state=b.dataset.state;commit();draw();inspect();});
 host.querySelectorAll('[data-prop]').forEach(input=>input.onchange=()=>{
  const target=item||project,key=input.dataset.prop,old=target[key];let value=input.type==='checkbox'?input.checked:input.type==='number'||key==='direction'?Number(input.value):input.value;
  if(input.type==='number'&&(!input.value||!Number.isFinite(value)||(input.min&&value<Number(input.min))||(input.max&&value>Number(input.max)))){toast('Enter a value within the allowed range');inspect();return;}
  target[key]=value;
  if(selection?.type==='node'&&['x','y','w','h'].includes(key))for(const e of project.edges)if(e.from===item.id||e.to===item.id)e.auto=true;
  try{F.validate({...project,assets:{}});}catch(e){target[key]=old;toast(e.message);inspect();return;}
  commit();draw();inspect();
 });
}
function addElement(kind){if(project.nodes.length>=100){toast('Maximum 100 elements');return;}const a=project.assets[kind],id=unique(kind,project.nodes);let w=F.isGround({kind})?600:kind==='forest'?180:kind.startsWith('river')?240:kind==='junction'?8:kind==='battery'?90:kind==='grid'?95:150,h=w*a.height/a.width;if(h>180&&!F.isGround({kind})&&!kind.startsWith('river')){w*=180/h;h=180;}const n=F.node(id,kind,({solar:'Solar',battery:'Battery',inverter:'Inverter',grid:'Grid',home:'Load',generator:'Generator',pump:'Pump',junction:'Junction'})[kind]||F.domainCatalog.find(a=>a[0]===kind)?.[1]||'Custom element',project.width/2,project.height/2,w,h,{showLabel:kind!=='junction'&&!F.domainCatalog.some(a=>a[0]===kind)});project.nodes.push(n);selection={type:'node',id};commit();draw();inspect();}
function palette(){const host=$('palette');host.replaceChildren();for(const [kind,name]of (libraryMode==='domain'?F.domainCatalog:[['solar','Solar'],['battery','Battery'],['inverter','Inverter'],['grid','Grid'],['home','Load'],['generator','Generator'],['pump','Pump'],['junction','Junction']])){const b=document.createElement('button');b.className='palette-item';b.innerHTML=`<img alt="" src="${project.assets[kind]?.src||BUILTINS[kind].src}"><span>+ ${name}</span>`;b.onclick=()=>{if(!project.assets[kind])project.assets[kind]=F.clone(BUILTINS[kind]);addElement(kind);};host.append(b);}}
document.querySelectorAll('[data-library]').forEach(b=>b.onclick=()=>{libraryMode=b.dataset.library;document.querySelectorAll('[data-library]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));$('library-title').textContent=libraryMode==='domain'?'المجال':'Elements';$('library-description').textContent=libraryMode==='domain'?'أضف أرضًا وطبيعة، ثم اسحب العناصر واربطها.':'Original artwork from your files.';palette();});
function remove(){const item=findSelected();if(!item)return;if(selection.type==='node'){project.nodes=project.nodes.filter(n=>n.id!==item.id);project.edges=project.edges.filter(e=>e.from!==item.id&&e.to!==item.id);}else project.edges=project.edges.filter(e=>e.id!==item.id);selection=null;commit();draw();inspect();}
function duplicate(){if(project.nodes.length>=100){toast('Maximum 100 elements');return;}const item=findSelected();if(!item||selection.type!=='node')return;const n=F.clone(item);n.id=unique(item.kind,project.nodes);n.x+=30;n.y+=30;project.nodes.push(n);selection={type:'node',id:n.id};commit();draw();inspect();}
function coord(event){const svg=$('canvas'),pt=new DOMPoint(event.clientX,event.clientY);return pt.matrixTransform(svg.getScreenCTM().inverse());}
function snapped(v){return snap?Math.round(v/10)*10:Math.round(v);}
$('canvas').addEventListener('pointerdown',e=>{
 if(e.button!==0)return;const handle=e.target.closest('[data-waypoint]'),ng=e.target.closest('[data-node]'),eg=e.target.closest('[data-edge]');
 if(handle){const edge=project.edges.find(x=>x.id===handle.dataset.edgeId);drag={type:'waypoint',id:edge.id,index:Number(handle.dataset.waypoint)};$('canvas').setPointerCapture(e.pointerId);e.preventDefault();return;}
 if(ng){const id=ng.dataset.node,n=project.nodes.find(x=>x.id===id);
  if(connectMode){if(!F.canConnect(n)){toast('عناصر الطبيعة للعرض فقط ولا تقبل الربط');return;}if(!connectFrom){connectFrom=id;select('node',id);}else if(connectFrom!==id){if(project.edges.length>=200){toast('Maximum 200 lines');return;}const from=project.nodes.find(n=>n.id===connectFrom);const horizontal=Math.abs(n.x-from.x)>Math.abs(n.y-from.y),sourcePort=horizontal?(n.x>from.x?'right':'left'):(n.y>from.y?'bottom':'top'),targetPort=horizontal?(n.x>from.x?'left':'right'):(n.y>from.y?'top':'bottom');const id2=unique('flow',project.edges),edge=F.edge(id2,connectFrom,id,sourcePort,targetPort);edge.name=`${from.name} → ${n.name}`;edge.auto=true;project.edges.push(edge);connectMode=false;connectFrom=null;selection={type:'edge',id:id2};commit();draw();inspect();}return;}
  const pt=coord(e);select('node',id);drag={type:'node',id,dx:pt.x-n.x,dy:pt.y-n.y};$('canvas').setPointerCapture(e.pointerId);e.preventDefault();
 }else if(eg)select('edge',eg.dataset.edge);else{selection=null;draw();inspect();}
});
$('canvas').addEventListener('pointermove',e=>{if(!drag)return;const p=coord(e);
 if(drag.type==='node'){const n=project.nodes.find(n=>n.id===drag.id),x=snapped(p.x-drag.dx),y=snapped(p.y-drag.dy);if(n.x!==x||n.y!==y){n.x=Math.max(n.w/2,Math.min(project.width-n.w/2,x));n.y=Math.max(n.h/2,Math.min(project.height-n.h/2,y));for(const edge of project.edges)if(edge.from===n.id||edge.to===n.id)edge.auto=true;}}
 else{const edge=project.edges.find(e=>e.id===drag.id);edge.waypoints[drag.index]=[snapped(p.x),snapped(p.y)];}
 draw();
});
function endDrag(){if(!drag)return;drag=null;commit();inspect();}
$('canvas').addEventListener('pointerup',endDrag);$('canvas').addEventListener('pointercancel',endDrag);
$('undo').onclick=undo;$('redo').onclick=redo;$('motion').onclick=()=>{paused=!paused;draw();};$('show-grid').onchange=e=>{grid=e.target.checked;draw();};$('snap').onchange=e=>snap=e.target.checked;$('zoom').onchange=updateZoom;
$('connect').onclick=()=>{connectMode=!connectMode;connectFrom=null;draw();};$('settings').onclick=()=>select(null);
$('project-title').onchange=e=>{project.title=e.target.value.trim()||'Untitled flow';commit();inspect();};
$('apply-preset').onclick=()=>$('confirm-dialog').showModal();$('confirm-layout').onclick=()=>{const oldAssets=project.assets;project=F.preset($('preset').value,window.FLOW_ASSETS);project.assets={...oldAssets,...project.assets};selection=null;connectMode=false;connectFrom=null;commit();draw();inspect();palette();$('confirm-dialog').close();};
function download(content,name,mime){const blob=content instanceof Blob?content:new Blob([content],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);}
function filename(){return(project.title.replace(/[^\p{L}\p{N} _-]/gu,'').trim().replace(/\s+/g,'-')||'energy-flow').slice(0,90);}
function portableProject(){const p=F.clone(project),needed=new Set(p.nodes.map(n=>n.kind));p.assets=Object.fromEntries(Object.entries(p.assets).filter(([k])=>needed.has(k)));return p;}
function saveProject(){if(window.domainProjects?.editing){window.domainProjects.save().catch(()=>{});return;}download(JSON.stringify(portableProject(),null,2),filename()+'.flow.json','application/json');toast('Editable project saved');}
$('save-project').onclick=saveProject;$('open-project').onclick=()=>{if(window.domainProjects?.editing)location.hash='#domain';else $('project-file').click();};
$('project-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>25*1024*1024)throw new Error('Project limit is 25 MB');const p=F.validate(JSON.parse(await file.text()));project={...p,assets:{...project.assets,...F.clone(BUILTINS),...p.assets}};selection=null;commit();draw();inspect();palette();toast('Project opened');}catch(e){toast(e.message);}finally{$('project-file').value='';}};
$('import-asset').onclick=()=>$('asset-file').click();let replaceArtwork=false;$('replace-artwork').onclick=()=>{if(selection?.type!=='node'){toast('اختر العنصر الذي تريد تغيير صورته');return;}replaceArtwork=true;$('asset-file').click();};$('asset-file').onchange=async event=>{
 try{const file=event.target.files[0];if(!file)return;if(file.size>15*1024*1024)throw new Error('Image limit is 15 MB');let src,w,h;const previous=replaceArtwork?findSelected():null;
  if(file.name.toLowerCase().endsWith('.svg')||file.type==='image/svg+xml'){const text=F.sanitizeSVG(await file.text()),doc=new DOMParser().parseFromString(text,'image/svg+xml'),r=doc.documentElement,v=r.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);w=v?.[2]||parseFloat(r.getAttribute('width'))||500;h=v?.[3]||parseFloat(r.getAttribute('height'))||500;src=F.svgAsset(text,w,h).src;/* avoid nesting the imported svg */src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(text)));}
  else{src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});const im=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Choose an SVG, PNG, JPEG, GIF or WebP image'));i.src=src;});w=im.naturalWidth;h=im.naturalHeight;}
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||w>10000||h>10000)throw new Error('Invalid image dimensions');const key='custom-'+Date.now();project.assets[key]={src,width:w,height:h};if(previous){previous.role=F.canConnect(previous)?'equipment':'decoration';previous.kind=key;}else addElement(key);const n=previous||findSelected();if(!previous){n.role=$('import-role').value;n.showLabel=n.role!=='decoration';}n.name=file.name.replace(/\.[^.]+$/,'');commit();draw();inspect();toast('Artwork imported');
 }catch(e){toast(e.message);}finally{$('asset-file').value='';replaceArtwork=false;}
};
$('export-open').onclick=()=>$('export-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
async function exported(format,options={}){const p=portableProject();F.validate(p);const bounds=F.bounds(p);if(format!=='project'&&(bounds.minX<-.5||bounds.minY<-.5||bounds.maxX>p.width+.5||bounds.maxY>p.height+.5))throw new Error('Some content is outside the canvas. Use Canvas settings → Fit canvas to content before exporting.');const opts={transparent:options.transparent??$('transparent').checked,time:options.time??Number($('snapshot-time').value),animate:options.animate??true};
 if(format==='project')return new Blob([JSON.stringify(p,null,2)],{type:'application/json'});
 if(format==='svg')return new Blob([F.serialize(F.render(p,opts))],{type:'image/svg+xml'});
 if(format==='html')return new Blob([F.standalone(p)],{type:'text/html'});
 if(format==='lottie'){const data=await F.lottie(p,opts);return new Blob([JSON.stringify(data)],{type:'application/json'});}
 if(format==='png'){const scale=options.scale??Number($('png-scale').value),canvas=await F.raster(F.render(p,{...opts,animate:false}),p.width,p.height,scale);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG conversion failed')),'image/png'));}
 throw new Error('Unknown export format');
}
document.querySelectorAll('[data-export]').forEach(b=>b.onclick=async()=>{const kind=b.dataset.export;const old=b.innerHTML;b.disabled=true;try{const blob=await exported(kind);const ext={html:'.html',svg:'.svg',png:'.png',lottie:'.lottie.json',project:'.flow.json'}[kind];download(blob,filename()+ext);toast(kind==='lottie'?'Lottie exported with embedded artwork and labels':kind.toUpperCase()+' exported');}catch(e){toast('Export failed: '+e.message);}finally{b.disabled=false;b.innerHTML=old;}});
document.addEventListener('keydown',e=>{if(document.body.dataset.currentScreen&&!['editor','board'].includes(document.body.dataset.currentScreen))return;if(e.target.matches('input,textarea,select')||q('dialog[open]'))return;const cmd=e.ctrlKey||e.metaKey;if(cmd&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if(cmd&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}else if(e.key==='Escape'){connectMode=false;connectFrom=null;select(null);}});
window.flowStudio={resetSession(){clearTimeout(saveTimer);history=[];future=[];selection=null;connectMode=false;connectFrom=null;lastState=snapshot();draw();inspect();},getProject:()=>F.clone(project),setProject(p){const next=F.validate(F.clone(p));project={...next,assets:{...F.clone(BUILTINS),...next.assets}};selection=null;commit();draw();inspect();palette();},setNodeState(id,state){if(!F.STATES.includes(state))throw new Error('Invalid state');const n=project.nodes.find(n=>n.id===id);if(!n)throw new Error('Unknown node');n.state=state;commit();draw();inspect();},setFlowState(id,state){if(!F.STATES.includes(state))throw new Error('Invalid state');const e=project.edges.find(e=>e.id===id);if(!e)throw new Error('Unknown line');e.state=state;commit();draw();inspect();},setNodeData(id,data){const n=project.nodes.find(n=>n.id===id);if(!n)throw new Error('Unknown node');for(const k of ['name','value','unit','current','currentUnit','efficiency','status','showDetails','showLabel','showName','showValue','showStatus','labelStyle','labelSide','labelGap','fontSize','color'])if(k in data)n[k]=data[k];commit();draw();inspect();},export:exported,select,undo,redo};
palette();draw();inspect();updateHistory();
})();

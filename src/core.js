/* Flow Studio rendering/export engine. No dependencies. */
(function (global) {
'use strict';
const NS='http://www.w3.org/2000/svg', STATES=['active','inactive','hidden'];
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const rnd=v=>Math.round(v*1000)/1000;
function element(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))if(v!==undefined)e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function svgAsset(body,w=100,h=100){return{src:'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(`<svg xmlns="${NS}" viewBox="0 0 ${w} ${h}">${body}</svg>`))),width:w,height:h};}
const extraAssets={
 junction:svgAsset('<circle cx="50" cy="50" r="25" fill="#6a8bf2"/>'),
 generator:svgAsset('<ellipse cx="52" cy="86" rx="42" ry="7" fill="#dbe3eb"/><path d="M12 36 26 26H76L88 38V74L76 84H24L12 73Z" fill="#a2b1bf"/><path d="M12 36H75V84H24L12 73Z" fill="#718699"/><path d="M75 36 88 38V74L75 84Z" fill="#445d72"/><rect x="21" y="45" width="44" height="28" rx="3" fill="#ced7df"/><path d="M27 49V67M33 49V67M39 49V67M45 49V67" stroke="#7d8e9f" stroke-width="3"/><rect x="54" y="49" width="7" height="7" rx="1" fill="#5698af"/><path d="M65 26V14H74V26" fill="#576d80"/><path d="m29 84 0 6m40-6v6" stroke="#51677b" stroke-width="5"/>'),
 pump:svgAsset('<ellipse cx="50" cy="85" rx="40" ry="7" fill="#dbe3eb"/><path d="M24 34H60V67H24Z" fill="#6aa9c5"/><path d="M59 34 75 41V70L59 67Z" fill="#376d8c"/><ellipse cx="25" cy="50" rx="16" ry="18" fill="#9ac8da"/><ellipse cx="25" cy="50" rx="10" ry="12" fill="#5e96b1"/><path d="M15 67V79H70V70" fill="#6b8093"/><path d="M71 49H87V32" fill="none" stroke="#98c8dd" stroke-width="10"/><path d="M43 34V16H63" fill="none" stroke="#6da8c2" stroke-width="9"/>')
};
// Embedded nature artwork stays available offline and in every export.
const domainCatalog=[['ground-grass','أرض عشبية'],['ground-sand','أرض رملية'],['ground-stone','أرض صخرية'],['sun','شمس'],['sun-soft','شمس هادئة'],['moon','هلال'],['moon-full','قمر كامل'],['river','نهر متعرج'],['river-wide','نهر واسع'],['tree','شجرة'],['pine','شجرة صنوبر'],['forest','غابة']];
function terrain(top,side){return svgAsset(`<path d="M4 52 100 4 196 52 100 100Z" fill="${top}"/><path d="M4 52 100 100V112L4 64Z" fill="${side}"/><path d="M100 100 196 52V64L100 112Z" fill="${side}" opacity=".8"/><path d="m28 40 96 48m-72-60 96 48m-72-60 96 48M28 64l96-48M52 76l96-48M76 88l96-48" stroke="#d2dab9" opacity=".18"/>`,200,116);}
const treeBody='<ellipse cx="50" cy="91" rx="32" ry="7" fill="#254c3c" opacity=".2"/><path d="M45 48h10v43H45Z" fill="#86613d"/><circle cx="50" cy="34" r="29" fill="#44875a"/><circle cx="31" cy="48" r="23" fill="#36764c"/><circle cx="68" cy="47" r="25" fill="#559969"/>';
Object.assign(extraAssets,{
 'ground-grass':terrain('#5d7651','#3c503b'),'ground-sand':terrain('#bba174','#806d4f'),'ground-stone':terrain('#78838a','#4f5b65'),
 sun:svgAsset('<circle cx="50" cy="50" r="24" fill="#ffca58"/>'+Array.from({length:12},(_,i)=>`<path d="M50 7v10" transform="rotate(${i*30} 50 50)" stroke="#e9b54b" stroke-width="3" stroke-linecap="round"/>`).join('')),
 'sun-soft':svgAsset('<circle cx="50" cy="50" r="42" fill="#ffcf6d" opacity=".12"/><circle cx="50" cy="50" r="33" fill="#ffcf6d" opacity=".22"/><circle cx="50" cy="50" r="24" fill="#ffdc8b"/>'),
 moon:svgAsset('<path d="M66 8a42 42 0 1 0 26 62A36 36 0 0 1 66 8Z" fill="#d8e4f2"/>'),
 'moon-full':svgAsset('<circle cx="50" cy="50" r="40" fill="#d8e4f2"/><g fill="#b3c6db"><circle cx="34" cy="32" r="9"/><circle cx="66" cy="57" r="13"/><circle cx="37" cy="71" r="6"/></g>'),
 river:svgAsset('<path d="M5 38C65 0 65 82 115 48S165 10 195 40L195 70C145 35 150 90 105 78S55 30 5 68Z" fill="#4b9cbd"/><path d="M8 50C65 14 65 95 115 60S165 24 191 52" fill="none" stroke="#9ed7df" stroke-width="3"/>',200,100),
 'river-wide':svgAsset('<path d="M0 25Q50 8 100 28T200 25V85Q150 102 100 82T0 85Z" fill="#4b9cbd"/><path d="M0 42Q50 25 100 45T200 42M0 65Q50 48 100 68T200 65" fill="none" stroke="#93ccd9" stroke-width="2"/>',200,110),
 tree:svgAsset(treeBody),pine:svgAsset('<ellipse cx="50" cy="92" rx="30" ry="6" fill="#254c3c" opacity=".2"/><path d="M46 65h8v28h-8Z" fill="#86613d"/><path d="m50 5 23 36H62l23 33H15l23-33H27Z" fill="#377b60"/><path d="m50 5 23 36H50Z" fill="#509473"/>'),
 forest:svgAsset(`<g transform="translate(45 0) scale(.65)">${treeBody}</g><g transform="translate(3 25) scale(.7)">${treeBody}</g><g transform="translate(80 22) scale(.75)">${treeBody}</g><g transform="translate(42 38) scale(.8)">${treeBody}</g>`,160,120)
});
function canConnect(n){return n&&n.role!=='decoration'&&!domainCatalog.some(([kind])=>kind===n.kind);}
function isGround(n){return n.kind.startsWith('ground-');}
function node(id,kind,name,x,y,w,h,fields={}){return{id,kind,name,x,y,w,h,state:'active',value:0,unit:'kW',current:0,currentUnit:'A',efficiency:100,status:'Online',showDetails:false,labelSide:'bottom',labelGap:12,fontSize:16,color:'#293b55',...fields};}
function edge(id,from,to,sourcePort,targetPort,waypoints=[]){return{id,name:id,from,to,sourcePort,targetPort,waypoints,auto:false,state:'active',color:'#6688ff',trackColor:'#c9d7ff',width:5,trackWidth:2.4,radius:12,duration:3.5,direction:1};}
function preset(kind,assets={}){
 const p={format:'flow-studio',version:1,title:'Hybrid energy flow',width:1000,height:650,background:'#ffffff',nodes:[],edges:[],assets:{...clone(assets),...clone(extraAssets)}};
 if(kind==='domain'){
  p.title='المجال · مشهد الطاقة';p.background='#102137';p.width=1200;p.height=800;
  p.nodes=[node('terrain','ground-grass','الأرض',600,435,960,550,{showLabel:false}),node('sun','sun','الشمس',1000,100,90,90,{showLabel:false}),node('forest','forest','الغابة',880,330,180,135,{showLabel:false}),node('river','river','النهر',350,530,300,150,{showLabel:false}),node('solar','solar','ألواح شمسية',350,315,210,190,{value:14.1,labelSide:'left',labelStyle:'card',fontSize:14,color:'#ffcf6d',status:'PV · 28.8 kWp'}),node('inverter','inverter','العاكس',630,330,130,120,{value:12.3,labelSide:'top',labelStyle:'card',fontSize:14,color:'#91caff'}),node('battery','battery','البطارية',770,450,80,110,{value:0,labelSide:'right',labelStyle:'card',fontSize:14,color:'#63d58d',status:'مشحونة 100%'}),node('home','home','المنزل',560,550,170,120,{value:6.3,labelSide:'bottom',labelStyle:'card',fontSize:14,color:'#b69afa'})];
  p.edges=[edge('solar-inverter','solar','inverter','right','left'),edge('inverter-battery','inverter','battery','right','top'),edge('inverter-home','inverter','home','bottom','top')];p.edges.forEach(e=>{e.auto=true;e.color='#ffc65c';e.trackColor='#7d7054';});return p;
 }
 if(kind==='blank'){p.title='Untitled flow';return p;}
 if(kind==='pump'){
  p.title='Solar pump flow';p.nodes=[node('solar','solar','Solar panels',170,180,170,154,{value:6.8,efficiency:92}),node('inverter','inverter','Pump inverter',485,220,150,118,{value:6.2,efficiency:96}),node('pump','pump','Water pump',820,260,150,150,{value:5.9,unit:'kW',status:'Running',current:12.3})];
  p.edges=[edge('solar-inverter','solar','inverter','right','left'),edge('inverter-pump','inverter','pump','right','left')];p.edges.forEach(e=>e.auto=true);return p;
 }
 p.nodes=[node('solar','solar','Solar',285,98,171,155,{value:7.2,labelSide:'right',labelGap:40,status:'PV available'}),node('battery','battery','Battery',100,270,98,135,{value:2.1,status:'Charging'}),node('inverter','inverter','Hybrid inverter',340,315,150,118,{value:5.1,efficiency:96.8}),node('grid','grid','Grid backup',550,525,90,142,{state:'inactive',value:0,status:'',labelGap:0,fontSize:14}),node('home','home','Load',840,265,172,111,{value:3,status:'',labelGap:23}),node('junction','junction','Junction',610,315,8,8,{showLabel:false,status:''})];
 p.edges=[edge('solar','solar','inverter','bottom','top',[[285,228],[340,228]]),edge('battery','battery','inverter','right','left',[[224,270],[224,315]]),edge('inverter','inverter','junction','right','center'),edge('home','junction','home','center','left',[[702,315],[702,265]]),edge('grid','grid','junction','top','center',[[550,382],[610,382]])];
 p.edges[1].direction=-1;p.edges[4].state='inactive';if(kind==='generator'){p.title='Hybrid inverter with generator backup';const n=p.nodes.find(n=>n.id==='grid');n.kind='generator';n.name='Generator backup';n.w=112;n.h=112;n.y=510;}return p;
}
function port(n,p){return p==='left'?[n.x-n.w/2,n.y]:p==='right'?[n.x+n.w/2,n.y]:p==='top'?[n.x,n.y-n.h/2]:p==='bottom'?[n.x,n.y+n.h/2]:[n.x,n.y];}
const direction=p=>({left:[-1,0],right:[1,0],top:[0,-1],bottom:[0,1],center:[0,0]}[p]||[0,0]);
function points(p,e){const a=p.nodes.find(n=>n.id===e.from),b=p.nodes.find(n=>n.id===e.to);if(!a||!b)return[];const s=port(a,e.sourcePort),t=port(b,e.targetPort);
 if(!e.auto)return[s,...e.waypoints.map(v=>[num(v[0]),num(v[1])]),t];
 const d1=direction(e.sourcePort),d2=direction(e.targetPort),s1=[s[0]+d1[0]*30,s[1]+d1[1]*30],t1=[t[0]+d2[0]*30,t[1]+d2[1]*30];let mid=[];
 if(d1[0]&&d2[0]){const x=(s1[0]+t1[0])/2;mid=[[x,s1[1]],[x,t1[1]]];}
 else if(d1[1]&&d2[1]){const y=(s1[1]+t1[1])/2;mid=[[s1[0],y],[t1[0],y]];}
 else mid=d1[1]?[[s1[0],t1[1]]]:[[t1[0],s1[1]]];
 return[s,s1,...mid,t1,t].filter((v,i,a)=>!i||Math.hypot(v[0]-a[i-1][0],v[1]-a[i-1][1])>.01);
}
/* Identical cubic Bézier vertices drive SVG and Lottie. */
function geometry(pts,radius){const clean=pts.filter((p,i,a)=>!i||Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1])>.01);const sh={v:[],i:[],o:[],c:false};
 const push=p=>{sh.v.push(p.map(rnd));sh.i.push([0,0]);sh.o.push([0,0]);return sh.v.length-1;};
 if(!clean.length)return sh;push(clean[0]);
 for(let j=1;j<clean.length-1;j++){
  const a=clean[j-1],b=clean[j],c=clean[j+1],l1=Math.hypot(b[0]-a[0],b[1]-a[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]);const u=[(b[0]-a[0])/l1,(b[1]-a[1])/l1],v=[(c[0]-b[0])/l2,(c[1]-b[1])/l2];
  const dot=u[0]*v[0]+u[1]*v[1];if(Math.abs(dot)>.9999||radius<=0){push(b);continue;}
  const angle=Math.acos(Math.max(-1,Math.min(1,dot))),tangent=Math.tan(angle/2);const cut=Math.min(radius*tangent,l1/2,l2/2);const k=(4/3)*Math.tan(angle/4)*(cut/tangent);
  const p1=[b[0]-u[0]*cut,b[1]-u[1]*cut],p2=[b[0]+v[0]*cut,b[1]+v[1]*cut],n1=push(p1),n2=push(p2);sh.o[n1]=u.map(x=>rnd(x*k));sh.i[n2]=v.map(x=>rnd(-x*k));
 }
 if(clean.length>1)push(clean.at(-1));return sh;
}
function pathData(sh){if(!sh.v.length)return'';let d=`M${sh.v[0].join(' ')}`;for(let j=1;j<sh.v.length;j++){const a=sh.v[j-1],b=sh.v[j],o=sh.o[j-1],i=sh.i[j];if(o.some(Boolean)||i.some(Boolean))d+=`C${rnd(a[0]+o[0])} ${rnd(a[1]+o[1])} ${rnd(b[0]+i[0])} ${rnd(b[1]+i[1])} ${b.join(' ')}`;else d+=`L${b.join(' ')}`;}return d+(sh.c?'Z':'');}
function opacity(state){return state==='hidden'?0:state==='inactive'?.35:1;}
function labelLines(n){if(n.showLabel===false)return[];const card=n.labelStyle==='card',lines=[];if(n.showName!==false)lines.push({text:n.name,size:n.fontSize,weight:600,color:card?'#bccbda':'#566981'});if(n.showValue!==false)lines.push({text:`${n.value} ${n.unit}`.trim(),size:n.fontSize+6,weight:700,color:n.color});if(n.status&&n.showStatus!==false)lines.push({text:n.status,size:n.fontSize-3,weight:400,color:card?'#bccbda':'#8594a8'});if(n.showDetails)lines.push({text:`${n.current} ${n.currentUnit}  ·  ${n.efficiency}%`,size:n.fontSize-4,weight:400,color:card?'#bccbda':'#8594a8'});return lines;}
let labelContext;
function labelBox(n){const lines=labelLines(n),pad=n.labelStyle==='card'?12:0;const width=Math.max(40,...lines.map(l=>{const c=labelContext||(labelContext=document.createElement('canvas').getContext('2d'));c.font=`${l.weight} ${l.size}px Arial`;return c.measureText(l.text).width+4;}))+pad*2;const height=(lines.length?lines.reduce((s,l)=>s+l.size+9,0)-2:4)+pad*2;
 const side=n.labelSide||'bottom',gap=num(n.labelGap,12);let x=n.x-width/2,y=n.y+n.h/2+gap;if(side==='right'){x=n.x+n.w/2+gap;y=n.y-height/2;}if(side==='left'){x=n.x-n.w/2-gap-width;y=n.y-height/2;}if(side==='top')y=n.y-n.h/2-gap-height;return{x,y,width,height,lines,pad};}
function labels(n){const b=labelBox(n),g=element('g',{'data-label':n.id});if(!b.lines.length)return g;if(n.labelStyle==='card')g.append(element('rect',{x:b.x,y:b.y,width:b.width,height:b.height,rx:12,fill:'#192633',stroke:'#405064','stroke-width':1}));let y=b.y+b.pad;for(const l of b.lines){y+=l.size;g.append(element('text',{x:b.x+b.width/2,y,'text-anchor':'middle','font-family':'Arial, sans-serif','font-size':l.size,'font-weight':l.weight,fill:l.color},l.text));y+=9;}return g;}
function lengthOf(d){const path=element('path',{d});return path.getTotalLength();}
function render(p,options={}){
 const svg=element('svg',{xmlns:NS,width:p.width,height:p.height,viewBox:`0 0 ${p.width} ${p.height}`,role:'img','aria-label':p.title});svg.append(element('title',{},p.title));
 if(!options.transparent)svg.append(element('rect',{width:p.width,height:p.height,fill:p.background}));
 if(options.grid){const defs=element('defs'),pat=element('pattern',{id:'editor-grid',width:20,height:20,patternUnits:'userSpaceOnUse'});pat.append(element('circle',{cx:1,cy:1,r:.7,fill:'#d1dbea'}));defs.append(pat);svg.append(defs,element('rect',{width:p.width,height:p.height,fill:'url(#editor-grid)','pointer-events':'none'}));}
 const groundLayer=element('g',{'data-layer':'terrain'});svg.append(groundLayer);
 const flowLayer=element('g',{'data-layer':'flows'}),nodeLayer=element('g',{'data-layer':'nodes'});svg.append(flowLayer,nodeLayer);
 for(const e of p.edges){const sh=geometry(points(p,e),e.radius),d=pathData(sh);if(!d)continue;const len=Math.max(1,lengthOf(d));const g=element('g',{'data-edge':e.id,opacity:e.state==='hidden'?0:1,'pointer-events':e.state==='hidden'?'none':undefined});
  if(options.editable){g.append(element('path',{d,stroke:'transparent','stroke-width':20,fill:'none', 'pointer-events':'stroke'}));}
  const track=element('path',{d,fill:'none',stroke:e.trackColor,'stroke-width':e.trackWidth,'stroke-linecap':'round','stroke-linejoin':'round',opacity:e.state==='inactive'?.3:.85});g.append(track);
  if(e.state==='active')for(const glow of [true,false]){const path=element('path',{d,fill:'none',stroke:e.color,'stroke-width':glow?e.width*2.8:e.width,'stroke-linecap':'round','stroke-linejoin':'round',opacity:glow?.13:.95,'stroke-dasharray':`${len*.12} ${len*.88}`,'stroke-dashoffset':-len*e.direction*((options.time||0)%e.duration)/e.duration});
   if(options.animate!==false){path.append(element('animate',{attributeName:'stroke-dashoffset',from:0,to:-len*e.direction,dur:`${e.duration}s`,repeatCount:'indefinite'}));}g.append(path);
  }
  if(options.selection?.type==='edge'&&options.selection.id===e.id){g.append(element('path',{d,fill:'none',stroke:'#3265ef','stroke-width':1,'stroke-dasharray':'4 4','pointer-events':'none'}));if(!e.auto)e.waypoints.forEach((q,j)=>g.append(element('circle',{cx:q[0],cy:q[1],r:6,fill:'#fff',stroke:'#5579ef','stroke-width':2,'data-waypoint':j,'data-edge-id':e.id,cursor:'move'})));}
  flowLayer.append(g);
 }
 for(const n of p.nodes){const g=element('g',{'data-node':n.id,opacity:opacity(n.state),'pointer-events':n.state==='hidden'?'none':undefined}),a=p.assets[n.kind];
  if(a)g.append(element('image',{x:n.x-n.w/2,y:n.y-n.h/2,width:n.w,height:n.h,href:a.src,preserveAspectRatio:'xMidYMid meet'}));
  else g.append(element('rect',{x:n.x-n.w/2,y:n.y-n.h/2,width:n.w,height:n.h,rx:8,fill:'#e5ebf5'}));
  g.append(labels(n));
  if(options.editable){const b=labelBox(n);g.append(element('rect',{x:Math.min(n.x-n.w/2,b.lines.length?b.x:n.x-n.w/2),y:Math.min(n.y-n.h/2,b.lines.length?b.y:n.y-n.h/2),width:Math.max(n.x+n.w/2,b.lines.length?b.x+b.width:n.x+n.w/2)-Math.min(n.x-n.w/2,b.lines.length?b.x:n.x-n.w/2),height:Math.max(n.y+n.h/2,b.lines.length?b.y+b.height:n.y+n.h/2)-Math.min(n.y-n.h/2,b.lines.length?b.y:n.y-n.h/2),fill:'transparent'}));}
  if(options.selection?.type==='node'&&options.selection.id===n.id){g.append(element('rect',{x:n.x-n.w/2-6,y:n.y-n.h/2-6,width:n.w+12,height:n.h+12,rx:8,fill:'none',stroke:'#6488ef','stroke-width':1.5,'stroke-dasharray':'5 4','pointer-events':'none'}));for(const pt of (canConnect(n)?['top','bottom','left','right']:[])){const q=port(n,pt);g.append(element('circle',{cx:q[0],cy:q[1],r:4,fill:'#fff',stroke:'#6488ef','stroke-width':1.5,'pointer-events':'none'}));}}
  (isGround(n)?groundLayer:nodeLayer).append(g);
 }
 return svg;
}
function serialize(svg){return new XMLSerializer().serializeToString(svg);}
function image(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Could not render an embedded image'));im.src=src;});}
async function raster(svg,w,h,scale=1){const c=document.createElement('canvas');c.width=Math.ceil(w*scale);c.height=Math.ceil(h*scale);const ctx=c.getContext('2d'),url=URL.createObjectURL(new Blob([serialize(svg)],{type:'image/svg+xml'}));try{const im=await image(url);ctx.drawImage(im,0,0,c.width,c.height);return c;}finally{URL.revokeObjectURL(url);}}
function dataScript(v){return JSON.stringify(v).replace(/</g,'\\u003c');}
function standalone(p){return`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title)}</title><style>body{margin:0;background:${p.background};font-family:Arial,sans-serif}#flow{width:100%;max-width:${p.width}px;margin:auto}#flow svg{width:100%;height:auto;display:block}body.paused svg{visibility:visible}</style></head><body><div id="flow"></div><script>${standalone.coreSource||''}<\/script><script>const project=${dataScript(p)}; const host=document.getElementById('flow');let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;function draw(){host.replaceChildren(FlowCore.render(project,{animate:!paused}));}function find(list,id){const item=list.find(x=>x.id===id);if(!item)throw new Error('Unknown id: '+id);return item;}window.energyFlow={getProject:()=>FlowCore.clone(project),setNodeState(id,state){if(!FlowCore.STATES.includes(state))throw new Error('Invalid state');find(project.nodes,id).state=state;draw();},setFlowState(id,state){if(!FlowCore.STATES.includes(state))throw new Error('Invalid state');find(project.edges,id).state=state;draw();},setNodeData(id,data){const n=find(project.nodes,id);for(const k of ['name','value','unit','current','currentUnit','efficiency','status','showDetails','showLabel','showName','showValue','showStatus','labelStyle','labelSide','labelGap','fontSize','color'])if(k in data)n[k]=data[k];draw();},setFlowDirection(id,direction){if(direction!==1&&direction!==-1)throw new Error('Direction must be 1 or -1');find(project.edges,id).direction=direction;draw();},pause(){paused=true;host.firstElementChild?.pauseAnimations();},play(){paused=false;host.firstElementChild?.unpauseAnimations();if(!host.querySelector('animate'))draw();}};window.setNodeState=(...a)=>energyFlow.setNodeState(...a);window.setFlowState=(...a)=>energyFlow.setFlowState(...a);window.addEventListener('energy-flow-data',event=>{for(const[id,data]of Object.entries(event.detail.nodes||{}))energyFlow.setNodeData(id,data);for(const[id,state]of Object.entries(event.detail.flows||{}))energyFlow.setFlowState(id,state);});draw();<\/script></body></html>`;}
const stat=k=>({a:0,k});
function ks(pos=[0,0],op=100){return{o:stat(op),r:stat(0),p:stat([...pos,0]),a:stat([0,0,0]),s:stat([100,100,100])};}
function rgb(hex){return[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);}
function tr(){return{ty:'tr',p:stat([0,0]),a:stat([0,0]),s:stat([100,100]),r:stat(0),o:stat(100),sk:stat(0),sa:stat(0)};}
function animated(a,b,op){return{a:1,k:[{t:0,s:[a],e:[b],o:{x:[0],y:[0]},i:{x:[1],y:[1]}},{t:op,s:[b]}]};}
async function lottie(p,options={}){
 const fps=30;const periods=p.edges.filter(e=>e.state==='active').map(e=>Math.max(1,Math.round(e.duration*fps)));const gcd=(a,b)=>b?gcd(b,a%b):a;let op=periods.reduce((a,b)=>a/gcd(a,b)*b,1);if(!periods.length)op=120;if(!Number.isSafeInteger(op)||op>18000)throw new Error('For a seamless Lottie loop, use matching line cycle durations. The current common loop exceeds 10 minutes.');const seconds=op/fps;
 const out={v:'5.12.2',fr:fps,ip:0,op,w:p.width,h:p.height,nm:p.title,ddd:0,assets:[],layers:[],markers:[]};const layers=[];
 const base=(nm,ty,transform=ks())=>({ddd:0,ty,nm,sr:1,ks:transform,ao:0,ip:0,op,st:0,bm:0});
 const shapeLayer=(nm,it,transform=ks())=>({...base(nm,4,transform),shapes:[{ty:'gr',nm,it:[...it,tr()]}]});
 if(!options.transparent){layers.push(shapeLayer('background',[{ty:'rc',d:1,s:stat([p.width,p.height]),p:stat([p.width/2,p.height/2]),r:stat(0)},{ty:'fl',c:stat(rgb(p.background)),o:stat(100),r:1,bm:0}]));}
 for(const e of p.edges){if(e.state==='hidden')continue;const sh=geometry(points(p,e),e.radius),len=Math.max(1,lengthOf(pathData(sh))),path={ty:'sh',nm:'Rounded route',ks:stat(sh)};
  const stroke=(color,width,opacity,dash)=>({ty:'st',c:stat(rgb(color)),o:stat(opacity),w:stat(width),lc:2,lj:2,ml:4,bm:0,...(dash?{d:dash}:{})});
  layers.push(shapeLayer(`flow-${e.id} • track`,[clone(path),stroke(e.trackColor,e.trackWidth,e.state==='inactive'?30:85)]));
  if(e.state==='active')for(const glow of [true,false]){
   const repeats=op/Math.max(1,Math.round(e.duration*fps));const dash=[{n:'d',nm:'Dash',v:stat(len*.12)},{n:'g',nm:'Gap',v:stat(len*.88)},{n:'o',nm:'Offset',v:animated(0,-len*e.direction*repeats,op)}];
   layers.push(shapeLayer(`flow-${e.id} • ${glow?'glow':'pulse'}`,[clone(path),stroke(e.color,glow?e.width*2.8:e.width,glow?13:95,dash)]));
  }
 }
 const assetMap={};for(const n of p.nodes){if(n.state==='hidden')continue;let a=p.assets[n.kind];if(!a)continue;let ref=assetMap[n.kind];
  if(!ref){ref='art_'+Object.keys(assetMap).length;assetMap[n.kind]=ref;let src=a.src;if(!src.startsWith('data:image/png;')&&!src.startsWith('data:image/jpeg;')){const im=await image(src),c=document.createElement('canvas');c.width=a.width;c.height=a.height;c.getContext('2d').drawImage(im,0,0,c.width,c.height);src=c.toDataURL('image/png');}out.assets.push({id:ref,w:a.width,h:a.height,u:'',p:src,e:1});}
  const scale=Math.min(n.w/a.width,n.h/a.height),w=a.width*scale,h=a.height*scale,transform=ks([n.x-w/2,n.y-h/2],opacity(n.state)*100);transform.s=stat([scale*100,scale*100,100]);layers.push({...base(`node-${n.id} • icon`,2,transform),refId:ref});
  const b=labelBox(n);if(!b.lines.length)continue;const s=element('svg',{xmlns:NS,width:b.width,height:b.height,viewBox:`${b.x} ${b.y} ${b.width} ${b.height}`});s.append(labels(n));const c=await raster(s,b.width,b.height,3),id='label_'+n.id;out.assets.push({id,w:c.width,h:c.height,u:'',p:c.toDataURL('image/png'),e:1});const k=ks([b.x,b.y],opacity(n.state)*100);k.s=stat([100/3,100/3,100]);layers.push({...base(`node-${n.id} • label snapshot`,2,k),refId:id});
 }
 const groundNames=new Set(p.nodes.filter(isGround).flatMap(n=>[`node-${n.id} • icon`,`node-${n.id} • label snapshot`]));const layerOrder=l=>l.nm==='background'?0:groundNames.has(l.nm)?1:2;layers.sort((a,b)=>layerOrder(a)-layerOrder(b));
 out.layers=layers.reverse().map((l,i)=>({...l,ind:i+1}));return out;
}
function sanitizeSVG(text){const doc=new DOMParser().parseFromString(text,'image/svg+xml');if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw new Error('Invalid SVG');const root=doc.documentElement;
 const allowed=new Set(['svg','g','defs','path','rect','circle','ellipse','line','polyline','polygon','linearGradient','radialGradient','stop','clipPath','mask','pattern','symbol','use','image','text','tspan','title','desc','filter','feGaussianBlur','feOffset','feBlend','feColorMatrix','feMerge','feMergeNode','feComposite','feFlood','feDropShadow','feTurbulence','feDisplacementMap','feComponentTransfer','feFuncR','feFuncG','feFuncB','feFuncA','feMorphology','feTile','feImage','style']);
 const unsafeCSS=v=>/@import|@font-face|expression\s*\(|url\(\s*['"]?(?!#)/i.test(v);for(const el of [...root.querySelectorAll('*')]){if(el.localName==='style'&&unsafeCSS(el.textContent))throw new Error('SVG contains external CSS resources. Embed its assets first.');if(!allowed.has(el.localName)){el.remove();continue;}for(const attr of [...el.attributes]){const k=attr.localName.toLowerCase(),v=attr.value.trim();if(k.startsWith('on')||(k==='style'&&unsafeCSS(v))||((k==='href')&&!v.startsWith('#')&&!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(v))||/url\(\s*['"]?(?!#)/i.test(v))el.removeAttributeNode(attr);}}
 for(const a of [...root.attributes])if(a.localName.toLowerCase().startsWith('on')||(a.localName==='style'&&unsafeCSS(a.value)))root.removeAttributeNode(a);
 return serialize(root);
}
function validate(p){if(!p||p.format!=='flow-studio'||p.version!==1||!Array.isArray(p.nodes)||!Array.isArray(p.edges)||!p.assets)throw new Error('Choose a Flow Studio project JSON. Lottie JSON is an export, not an editable project.');
 if(p.nodes.length>100||p.edges.length>200)throw new Error('Project is too large (100 elements / 200 lines maximum).');
 const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;const color=v=>/^#[\da-f]{6}$/i.test(v);const ids=new Set();
 if(!finite(p.width,100,4096)||!finite(p.height,100,4096)||!color(p.background))throw new Error('Invalid canvas settings');
 for(const n of p.nodes){if(!n||typeof n.id!=='string'||ids.has(n.id)||!finite(n.x,-4096,8192)||!finite(n.y,-4096,8192)||!finite(n.w,1,4096)||!finite(n.h,1,4096)||!STATES.includes(n.state)||!finite(n.fontSize,8,60)||!color(n.color)||!['bottom','top','left','right'].includes(n.labelSide))throw new Error('Invalid element data');if(n.labelStyle!==undefined&&!['text','card'].includes(n.labelStyle))throw new Error('Invalid label style');for(const key of ['showLabel','showName','showValue','showStatus','showDetails'])if(n[key]!==undefined&&typeof n[key]!=='boolean')throw new Error('Invalid display option');ids.add(n.id);}
 const edgeIds=new Set();for(const e of p.edges){if(!e||typeof e.id!=='string'||edgeIds.has(e.id)||!ids.has(e.from)||!ids.has(e.to)||!STATES.includes(e.state)||!color(e.color)||!color(e.trackColor)||!finite(e.width,.5,30)||!finite(e.trackWidth,.5,30)||!finite(e.radius,0,100)||!finite(e.duration,.5,20)||![1,-1].includes(e.direction)||!['top','bottom','left','right','center'].includes(e.sourcePort)||!['top','bottom','left','right','center'].includes(e.targetPort)||!Array.isArray(e.waypoints)||e.waypoints.length>80||!e.waypoints.every(q=>Array.isArray(q)&&q.length===2&&q.every(v=>finite(v,-4096,8192))))throw new Error('Invalid line data');if(!canConnect(p.nodes.find(n=>n.id===e.from))||!canConnect(p.nodes.find(n=>n.id===e.to)))throw new Error('Nature elements cannot be connected');edgeIds.add(e.id);}
 for(const[k,a]of Object.entries(p.assets)){if(!a||!finite(a.width,1,10000)||!finite(a.height,1,10000)||typeof a.src!=='string'||!/^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/i.test(a.src))throw new Error('Project assets must be embedded images');if(a.src.startsWith('data:image/svg+xml;')){const text=decodeURIComponent(escape(atob(a.src.split(',')[1])));a.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(sanitizeSVG(text))));}}
 return p;
}
function bounds(p){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const take=(x,y)=>{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);};for(const n of p.nodes.filter(n=>n.state!=='hidden')){take(n.x-n.w/2,n.y-n.h/2);take(n.x+n.w/2,n.y+n.h/2);const b=labelBox(n);if(b.lines.length){take(b.x,b.y);take(b.x+b.width,b.y+b.height);}}for(const e of p.edges.filter(e=>e.state!=='hidden'))for(const q of points(p,e)){take(q[0]-e.width*1.4,q[1]-e.width*1.4);take(q[0]+e.width*1.4,q[1]+e.width*1.4);}if(!Number.isFinite(minX))return{minX:0,minY:0,maxX:80,maxY:80,width:100,height:100};return{minX,minY,maxX,maxY,width:Math.ceil(maxX+20),height:Math.ceil(maxY+20)};}
function fit(p){const b=bounds(p),dx=Math.max(0,20-b.minX),dy=Math.max(0,20-b.minY);for(const n of p.nodes){n.x+=dx;n.y+=dy;}for(const e of p.edges)e.waypoints=e.waypoints.map(q=>[q[0]+dx,q[1]+dy]);p.width=Math.min(4096,Math.max(100,b.width+dx));p.height=Math.min(4096,Math.max(100,b.height+dy));return p;}

const api={NS,STATES,clone,esc,num,element,svgAsset,extraAssets,domainCatalog,isGround,canConnect,node,edge,preset,port,points,geometry,pathData,labelBox,labelLines,labels,opacity,render,serialize,raster,lottie,standalone,validate,sanitizeSVG,bounds,fit};global.FlowCore=api;
})(window);

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {Project,Selection} from '../model';
import {copyProject} from '../model';
import {core} from '../engine';
interface Props {project:Project;selection:Selection;select:(s:Selection)=>void;commit:(fn:(p:Project)=>void)=>void;multiGround:boolean;connect:boolean;connectNode:(id:string)=>void;grid:boolean;snap:boolean;playing:boolean;time:number;zoom:number;viewRevision:number;setZoom:(n:number)=>void;report:(s:string)=>void}
export default function Canvas({project,selection,select,commit,multiGround,connect,connectNode,grid,snap,playing,time,zoom,setZoom,viewRevision,report}:Props){
 const ref=useRef<SVGSVGElement>(null),scroll=useRef<HTMLDivElement>(null),space=useRef(false),pan=useRef<{x:number;y:number;left:number;top:number}|null>(null),drag=useRef<{type:'node'|'waypoint';id:string;index?:number;dx:number;dy:number;value?:number[]}|null>(null);
 const [preview,setPreview]=useState<Project|null>(null),[size,setSize]=useState({w:800,h:600}),[panning,setPanning]=useState(false),previous=useRef<{width:number;height:number;zoom:number}|null>(null);
 useLayoutEffect(()=>{const el=scroll.current!;const observer=new ResizeObserver(()=>setSize({w:el.clientWidth,h:el.clientHeight}));observer.observe(el);return()=>observer.disconnect();},[]);
 const fit=Math.min((size.w-32)/project.width,(size.h-32)/project.height,1),scale=Math.max(.01,fit)*zoom/100,width=project.width*scale,height=project.height*scale;
 useLayoutEffect(()=>{const el=scroll.current!,old=previous.current;if(old&&old.zoom!==zoom){const cx=(el.scrollLeft+el.clientWidth/2)/Math.max(old.width,el.clientWidth),cy=(el.scrollTop+el.clientHeight/2)/Math.max(old.height,el.clientHeight);el.scrollLeft=cx*Math.max(width,el.clientWidth)-el.clientWidth/2;el.scrollTop=cy*Math.max(height,el.clientHeight)-el.clientHeight/2;}if(zoom===100){el.scrollLeft=0;el.scrollTop=0;}previous.current={width,height,zoom};},[width,height,zoom,viewRevision]);
 useEffect(()=>{const down=(e:KeyboardEvent)=>{if((e.target as Element).closest('input,textarea,select,button,dialog'))return;if(e.code==='Space'){space.current=true;e.preventDefault();}},up=(e:KeyboardEvent)=>{if(e.code==='Space')space.current=false;},blur=()=>{space.current=false;pan.current=null;setPanning(false);};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};},[]);
 useEffect(()=>{const el=scroll.current!;const wheel=(e:WheelEvent)=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const values=[25,50,75,100,125,150,200,300,400,600,800],index=values.indexOf(zoom);setZoom(values[Math.max(0,Math.min(values.length-1,index+(e.deltaY<0?1:-1)))]);};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[zoom,setZoom]);
 useLayoutEffect(()=>{const svg=ref.current;if(!svg)return;const rendered=core.render(preview||project,{editable:true,selection,grid,animate:playing,time});svg.setAttribute('viewBox',rendered.getAttribute('viewBox')!);svg.replaceChildren(...rendered.childNodes);},[project,preview,selection,grid,playing,time]);
 const coord=(event:React.PointerEvent)=>new DOMPoint(event.clientX,event.clientY).matrixTransform(ref.current!.getScreenCTM()!.inverse());
 const end=()=>{pan.current=null;setPanning(false);const d=drag.current;drag.current=null;setPreview(null);if(!d?.value)return;try{commit(p=>{if(d.type==='node'){const n=p.nodes.find(n=>n.id===d.id);if(n){[n.x,n.y]=d.value!;for(const e of p.edges)if(e.from===n.id||e.to===n.id)e.auto=true;}}else{const e=p.edges.find(e=>e.id===d.id);if(e)e.waypoints[d.index!]=d.value!;}});}catch(e){report((e as Error).message);}};
 return <div ref={scroll} className={'canvas-scroll'+(panning?' is-panning':'')} data-testid="board-viewport" onPointerDown={e=>{
  const target=e.target as Element,node=target.closest('[data-node]'),edge=target.closest('[data-edge]'),handle=target.closest('[data-waypoint]');
  if(e.button===1||space.current||(e.button===0&&!node&&!edge&&!handle)){
   pan.current={x:e.clientX,y:e.clientY,left:scroll.current!.scrollLeft,top:scroll.current!.scrollTop};setPanning(true);scroll.current!.setPointerCapture(e.pointerId);if(!space.current&&e.button===0)select(null);e.preventDefault();return;
  }
  if(e.button!==0)return;const point=coord(e);
  if(handle){const id=handle.getAttribute('data-edge-id')!;drag.current={type:'waypoint',id,index:Number(handle.getAttribute('data-waypoint')),dx:0,dy:0};}
  else if(node){const id=node.getAttribute('data-node')!;if(connect){connectNode(id);return;}const n=project.nodes.find(n=>n.id===id)!;
   if((e.shiftKey||multiGround)&&core.isGround(n)){
    const selected=selection?.type==='node'?project.nodes.filter(v=>(selection.ids||[selection.id]).includes(v.id)&&core.isGround(v)).map(v=>v.id):[];
    const ids=selected.includes(id)?selected.filter(v=>v!==id):[...selected,id];select(ids.length?{type:'node',id:ids.at(-1)!,ids}:null);return;
   }
   select({type:'node',id});drag.current={type:'node',id,dx:point.x-n.x,dy:point.y-n.y};
  }else{select(edge?{type:'edge',id:edge.getAttribute('data-edge')!}:null);return;}
  scroll.current!.setPointerCapture(e.pointerId);e.preventDefault();
 }} onPointerMove={e=>{
  if(pan.current){scroll.current!.scrollLeft=pan.current.left+pan.current.x-e.clientX;scroll.current!.scrollTop=pan.current.top+pan.current.y-e.clientY;return;}
  const d=drag.current;if(!d)return;const pt=coord(e),round=(v:number)=>snap?Math.round(v/10)*10:Math.round(v),p=copyProject(project);
  if(d.type==='node'){const n=p.nodes.find(n=>n.id===d.id)!;n.x=Math.max(n.w/2,Math.min(p.width-n.w/2,round(pt.x-d.dx)));n.y=Math.max(n.h/2,Math.min(p.height-n.h/2,round(pt.y-d.dy)));if(core.isGround(n)){const T=24;for(const o of p.nodes){if(o.id===n.id||!core.isGround(o))continue;const near=(a:number,b:number)=>Math.abs(a-b)<T;if(Math.abs(n.y-o.y)<(n.h+o.h)/2+T){if(near(n.x-n.w/2,o.x+o.w/2))n.x=o.x+o.w/2+n.w/2;else if(near(n.x+n.w/2,o.x-o.w/2))n.x=o.x-o.w/2-n.w/2;}if(Math.abs(n.x-o.x)<(n.w+o.w)/2+T){if(near(n.y-n.h/2,o.y+o.h/2))n.y=o.y+o.h/2+n.h/2;else if(near(n.y+n.h/2,o.y-o.h/2))n.y=o.y-o.h/2-n.h/2;}if(near(n.x-n.w/2,o.x-o.w/2)&&Math.abs(n.y-o.y)<(n.h+o.h)/2+T)n.x=o.x-o.w/2+n.w/2;if(near(n.y-n.h/2,o.y-o.h/2)&&Math.abs(n.x-o.x)<(n.w+o.w)/2+T)n.y=o.y-o.h/2+n.h/2;}}d.value=[n.x,n.y];for(const edge of p.edges)if(edge.from===n.id||edge.to===n.id)edge.auto=true;}
  else{d.value=[round(pt.x),round(pt.y)];p.edges.find(e=>e.id===d.id)!.waypoints[d.index!]=d.value;}setPreview(p);
 }} onPointerUp={end} onPointerCancel={()=>{drag.current=null;pan.current=null;setPanning(false);setPreview(null);}}>
 <div className="canvas-surface" style={{width:Math.max(width+32,size.w),height:Math.max(height+32,size.h)}}><svg ref={ref} data-testid="scene-canvas" className="scene-canvas" style={{width,height}} aria-label="بورد المجال"/></div>
 {!project.nodes.length&&<div className="canvas-empty"><h2>البورد جاهزة</h2><p>أضف أرضًا وعناصر من المكتبة، أو استورد صورة.</p></div>}
 </div>;
}

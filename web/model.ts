export type ItemState='active'|'inactive'|'hidden';
export type Port='top'|'bottom'|'left'|'right'|'center';
export type ProjectStatus='draft'|'active'|'complete';
export type NodeAnimation='none'|'spin'|'breathe'|'water';
export type FlowStyle='pulse'|'particles';
export interface Asset {src:string;width:number;height:number}
export interface SceneNode {id:string;kind:string;name:string;title?:string;x:number;y:number;w:number;h:number;state:ItemState;value:number|string;unit:string;current:number;currentUnit:string;efficiency:number;status:string;showDetails:boolean;showLabel?:boolean;showName?:boolean;showValue?:boolean;showStatus?:boolean;labelStyle?:'text'|'card'|'dash';icon?:string;progress?:number;leader?:boolean;labelSide:Exclude<Port,'center'>;labelGap:number;fontSize:number;color:string;role?:'decoration'|'equipment';terrainMaterial?:'grass'|'sand'|'stone'|'soil'|'concrete';terrainRects?:number[][];labelOffsetX?:number;labelOffsetY?:number;labelWidth?:number;animation?:NodeAnimation;animationDuration?:number}
export interface SceneEdge {id:string;name:string;title?:string;from:string;to:string;sourcePort:Port;targetPort:Port;waypoints:number[][];auto:boolean;state:ItemState;color:string;trackColor:string;width:number;trackWidth:number;radius:number;duration:number;direction:1|-1;flowStyle?:FlowStyle;particleCount?:number}
export interface Project {format:'flow-studio';version:1;title:string;width:number;height:number;background:string;nodes:SceneNode[];edges:SceneEdge[];assets:Record<string,Asset>}
export interface Metadata {id:string;title:string;status:ProjectStatus;folder:string;createdAt:string;updatedAt:string;nodes:number;edges:number;assets:number}
export type Selection={type:'node'|'edge';id:string;ids?:string[]}|null;
export interface RenderOptions {editable?:boolean;selection?:Selection;grid?:boolean;animate?:boolean;transparent?:boolean;time?:number}
export interface LottieData {fr:number;ip:number;op:number;w:number;h:number;layers:unknown[];assets:unknown[];[key:string]:unknown}
export interface Core {
 extraAssets:Record<string,Asset>;groundAsset(n:SceneNode):Asset;groundMaterial(n:SceneNode):string;mergeGround(p:Project,ids:string[]):string;domainCatalog:[string,string][];
 node(id:string,kind:string,name:string,x:number,y:number,w:number,h:number,fields?:Partial<SceneNode>):SceneNode;
 edge(id:string,from:string,to:string,sourcePort:Port,targetPort:Port,waypoints?:number[][]):SceneEdge;
 preset(kind:string,assets:Record<string,Asset>):Project;
 validate(p:Project):Project;isGround(n:SceneNode):boolean;isBackdrop(n:SceneNode):boolean;canConnect(n:SceneNode):boolean;
 render(p:Project,options?:RenderOptions):SVGSVGElement;serialize(svg:SVGSVGElement):string;
 raster(svg:SVGSVGElement,w:number,h:number,scale?:number):Promise<HTMLCanvasElement>;
 lottie(p:Project,options?:RenderOptions):Promise<LottieData>;
 standalone:((p:Project)=>string)&{coreSource?:string};
 points(p:Project,e:SceneEdge):number[][];
 fit(p:Project):Project;bounds(p:Project):{minX:number;minY:number;maxX:number;maxY:number};sanitizeSVG(s:string):string;
}
declare global {interface Window {FlowCore:Core}}
export const statusNames:Record<ProjectStatus,string>={draft:'مسودة',active:'قيد العمل',complete:'مكتمل'};
export function copyProject(p:Project):Project{return {...p,assets:{...p.assets},nodes:p.nodes.map(n=>({...n,...(n.terrainRects?{terrainRects:n.terrainRects.map(r=>[...r])}:{})})),edges:p.edges.map(e=>({...e,waypoints:e.waypoints.map(q=>[...q])}))};}
export function portable(p:Project):Project{const kinds=new Set(p.nodes.map(n=>n.kind));const assets=Object.fromEntries(Object.entries(p.assets).filter(([key])=>kinds.has(key)));for(const n of p.nodes)if(window.FlowCore.isGround(n))assets[n.kind]=window.FlowCore.groundAsset(n);return {...p,assets};}
export function unique(prefix:string,list:{id:string}[]){let id=prefix,i=1;while(list.some(n=>n.id===id))id=prefix+'-'+i++;return id;}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const window={};vm.runInNewContext(await readFile(new URL('../src/core.js',import.meta.url),'utf8'),{window,btoa:s=>Buffer.from(s,'binary').toString('base64'),unescape,escape,decodeURIComponent,atob:s=>Buffer.from(s,'base64').toString('binary'),encodeURIComponent,console});const core=window.FlowCore;
const tile=(id,x,y)=>core.node(id,'ground-grass','أرض',x,y,100,100,{showLabel:false,role:'decoration'});
function project(nodes){return{format:'flow-studio',version:1,title:'أرض',width:2400,height:1600,background:'#71885b',nodes,edges:[],assets:{}};}
function area(rects){const xs=[...new Set(rects.flatMap(r=>[r[0],r[0]+r[2]]))].sort((a,b)=>a-b),ys=[...new Set(rects.flatMap(r=>[r[1],r[1]+r[3]]))].sort((a,b)=>a-b);let result=0;for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;if(rects.some(r=>x>r[0]&&x<r[0]+r[2]&&y>r[1]&&y<r[1]+r[3]))result+=(xs[i+1]-xs[i])*(ys[j+1]-ys[j]);}return result;}
test('Merge retains an L shape, scales it and retains holes through a second merge',()=>{
 const p=project([tile('a',50,50),tile('b',150,50),tile('c',50,150)]);core.mergeGround(p,['a','b','c']);assert.equal(p.nodes.length,1);let n=p.nodes[0];assert.equal(n.w,200);assert.equal(n.h,200);assert.equal(area(core.groundRectangles(n)),30000);assert.equal(core.canConnect(n),false);core.validate({...p,assets:{}});
 n.w=400;n.h=400;assert.equal(area(core.groundRectangles(n)),120000);p.nodes.push(tile('d',350,50));core.mergeGround(p,[n.id,'d']);assert.equal(area(core.groundRectangles(p.nodes[0])),130000);assert.equal(p.nodes[0].terrainRects.length,4);
});
test('Overlapping land is a union and disconnected or incompatible land is rejected',()=>{
 const p=project([tile('a',50,50),tile('b',100,50)]);core.mergeGround(p,['a','b']);assert.equal(area(core.groundRectangles(p.nodes[0])),15000);
 for(const [x,y] of [[250,50],[150,150]])assert.throws(()=>core.mergeGround(project([tile('a',50,50),tile('b',x,y)]),['a','b']),/تتلامس/);
 const other=tile('b',150,50);other.kind='ground-sand';assert.throws(()=>core.mergeGround(project([tile('a',50,50),other]),['a','b']),/خامة/);
});
test('Saved ground validates its regions and remains unconnectable with an equipment role',()=>{
 const n=tile('a',50,50);n.kind='ground-merged-a';n.role='equipment';assert.equal(core.canConnect(n),false);n.terrainRects=[[0,0,2,1]];assert.throws(()=>core.validate(project([n])),/ground shape/);
 const p=project([]);p.width=8192;p.height=8192;core.validate(p);p.width=8193;assert.throws(()=>core.validate(p),/canvas/);
});

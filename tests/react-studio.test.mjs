import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('React project lifecycle, isolated saving, nature rules, GIF and actual Lottie playback', {timeout:120000}, async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'flow-react-test-')),port=8876,base=`http://127.0.0.1:${port}`;
 const server=spawn('python3',['server.py'],{env:{...process.env,FLOW_STUDIO_PORT:String(port),FLOW_STUDIO_PROJECTS:folder},stdio:'pipe'});
 let browser;try{
  for(let i=0;i<60;i++){try{if((await fetch(base+'/api/domain/projects')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:existsSync(chrome)?{executablePath:chrome}:{})});
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#board');await page.getByRole('heading',{name:'مشاريع المجال'}).waitFor();assert.equal(await page.locator('[data-testid=scene-canvas]').count(),0);
  await page.getByTestId('project-name').fill('اختبار React');await page.getByLabel('ابدأ من').selectOption('domain');await page.getByRole('button',{name:'إنشاء وفتح البورد'}).click();await page.waitForURL(/#board\/[a-f0-9]+/);await page.locator('[data-testid=scene-canvas] [data-node=home]').waitFor();const id=page.url().split('/').at(-1);
  assert.equal((await readdir(folder)).length,1);await page.getByLabel('حالة المشروع').selectOption('active');
  await page.getByRole('button',{name:'↗ ربط',exact:true}).click();await page.locator('[data-node=sun]').click();await page.getByRole('status').filter({hasText:'عناصر الطبيعة'}).waitFor();await page.getByRole('button',{name:'↗ ربط',exact:true}).click();
  const node=page.locator('[data-node=home]'),box=await node.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+20);await page.mouse.down();await page.mouse.move(box.x+box.width/2+35,box.y+45,{steps:6});await page.mouse.up();
  await page.getByLabel('اسم العنصر',{exact:true}).fill('منزل الاختبار');await page.getByLabel('اسم العنصر',{exact:true}).press('Tab');await page.getByRole('button',{name:'حفظ الآن',exact:true}).click();await page.getByRole('status').filter({hasText:'محفوظ في المجلد'}).waitFor();
  let saved=await (await fetch(base+'/api/domain/projects/'+id)).json();assert.equal(saved.metadata.status,'active');assert.equal(saved.project.nodes.find(n=>n.id==='home').name,'منزل الاختبار');assert.notEqual(saved.project.nodes.find(n=>n.id==='home').x,560);
  await page.getByRole('button',{name:'تراجع',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.inspector input')?.value==='المنزل');assert.equal(await page.getByLabel('اسم العنصر',{exact:true}).inputValue(),'المنزل');await page.getByRole('button',{name:'إعادة',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.inspector input')?.value==='منزل الاختبار');assert.equal(await page.getByLabel('اسم العنصر',{exact:true}).inputValue(),'منزل الاختبار');
  await page.locator('[data-node=sun]').click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'استبدال صورة العنصر'}).click();await(await chooser).setFiles({name:'sun.gif',mimeType:'image/gif',buffer:Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64')});await page.getByRole('status').filter({hasText:'تم استيراد الصورة'}).waitFor();
  await page.getByRole('button',{name:'معاينة وتصدير Lottie',exact:true}).click();await page.locator('.lottie-preview svg').waitFor();const downloadButton=page.getByRole('button',{name:'تنزيل ملف Lottie .json'});await downloadButton.waitFor();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='تنزيل ملف Lottie .json')?.disabled,{},{timeout:10000}).catch(async e=>{console.log('Preview diagnostic:',await page.locator('.export-dialog').innerText(),errors);throw e;});assert.match(await page.locator('.export-notes').textContent(),/GIF/);
  const animationBefore=await page.locator('.lottie-preview').innerHTML();await page.waitForTimeout(180);assert.notEqual(await page.locator('.lottie-preview').innerHTML(),animationBefore,'Lottie player must animate actual exported paths');
  const download=page.waitForEvent('download');await downloadButton.click();const exported=await download;const data=JSON.parse(await readFile(await exported.path(),'utf8'));assert.equal(data.fr,30);assert.ok(data.layers.some(l=>l.ty===4));assert.ok(data.layers.some(l=>l.nm.includes('pulse')));assert.ok(data.assets.every(a=>a.p.startsWith('data:image/')));
  await page.getByRole('button',{name:'إغلاق المعاينة'}).click();await page.getByRole('button',{name:'حفظ الآن',exact:true}).click();await page.getByRole('status').filter({hasText:'محفوظ في المجلد'}).waitFor();
  saved=await(await fetch(base+'/api/domain/projects/'+id)).json();assert.equal(saved.project.nodes.find(n=>n.id==='sun').role,'decoration');assert.ok((await readdir(path.join(folder,id,'assets'))).some(f=>f.endsWith('.gif')));
  await page.reload();await page.locator('[data-testid=scene-canvas]').waitFor();assert.equal(await page.getByRole('heading',{name:'اختبار React',exact:true}).count(),1);
  await page.getByRole('button',{name:'أصولي',exact:true}).click();await page.locator('.palette button').first().click();await page.getByRole('button',{name:'حفظ الآن',exact:true}).click();await page.getByRole('status').filter({hasText:'محفوظ في المجلد'}).waitFor();saved=await(await fetch(base+'/api/domain/projects/'+id)).json();assert.equal(saved.project.nodes.at(-1).role,'decoration','Reusing a natural asset must preserve its role');
  // A failed save must keep the active document available and prevent switching projects.
  await page.route('**/api/domain/projects/'+id,route=>route.request().method()==='PUT'?route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'اختبار فشل الحفظ'})}):route.continue());
  await page.getByRole('button',{name:'إعدادات البورد',exact:true}).click();await page.getByLabel('اسم المشروع',{exact:true}).fill('تغيير محفوظ لاحقًا');await page.getByLabel('اسم المشروع',{exact:true}).press('Tab');await page.locator('.board-identity a').click();await page.getByRole('alert').filter({hasText:'اختبار فشل الحفظ'}).first().waitFor();assert.equal(await page.locator('[data-testid=scene-canvas]').count(),1);
  await page.unroute('**/api/domain/projects/'+id);await page.getByRole('button',{name:'حفظ الآن',exact:true}).click();await page.getByRole('status').filter({hasText:'محفوظ في المجلد'}).waitFor();await page.locator('.board-identity a').click();await page.getByRole('heading',{name:'مشاريع المجال'}).waitFor();
  await page.getByTestId('project-name').fill('مشروع مستقل');await page.getByRole('button',{name:'إنشاء وفتح البورد'}).click();await page.locator('[data-testid=scene-canvas]').waitFor();assert.equal(await page.locator('[data-testid=scene-canvas] [data-node]').count(),0);assert.equal(await page.getByRole('button',{name:'تراجع',exact:true}).isDisabled(),true);
  const secondId=page.url().split('/').at(-1);await page.route('**/api/domain/projects/'+id,async route=>{if(route.request().method()==='GET')await new Promise(r=>setTimeout(r,250));await route.continue();});await page.evaluate(old=>{location.hash='#board/'+old;},id);await page.getByRole('status').filter({hasText:'جارٍ فتح مساحة العمل'}).waitFor();await page.evaluate(current=>{location.hash='#board/'+current;},secondId);await page.waitForFunction(()=>!document.querySelector('.route-progress'));await page.waitForTimeout(300);assert.equal(await page.locator('[data-testid=scene-canvas] [data-node]').count(),0);await page.unroute('**/api/domain/projects/'+id);
  await page.screenshot({path:path.join(os.tmpdir(),'flow-react-board.png'),fullPage:true});await page.locator('.board-identity a').click();await page.getByRole('heading',{name:'مشاريع المجال'}).waitFor();await page.screenshot({path:path.join(os.tmpdir(),'flow-react-projects.png'),fullPage:true});assert.deepEqual(errors,[]);
 }finally{await browser?.close();server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));await rm(folder,{recursive:true,force:true});}
});

test('Wide board, joined terrain, zoom/pan and folder round-trip', {timeout:120000}, async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'flow-land-test-')),port=8877,base=`http://127.0.0.1:${port}`;
 const server=spawn('python3',['server.py'],{env:{...process.env,FLOW_STUDIO_PORT:String(port),FLOW_STUDIO_PROJECTS:folder},stdio:'pipe'});let browser;
 try{
  for(let i=0;i<60;i++){try{if((await fetch(base+'/api/domain/projects')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:existsSync(chrome)?{executablePath:chrome}:{})});const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#board/'+'f'.repeat(32));await page.getByRole('heading',{name:'مشاريع المجال'}).waitFor();assert.equal(await page.getByTestId('scene-canvas').count(),0);
  await page.getByTestId('project-name').fill('أرض متصلة');await page.getByRole('button',{name:'إنشاء وفتح البورد'}).click();await page.getByTestId('scene-canvas').waitFor();const id=page.url().split('/').at(-1);
  await page.getByRole('button',{name:'طبيعة',exact:true}).click();await page.getByRole('button',{name:'+ أرض عشبية',exact:true}).click();await page.getByRole('button',{name:'يمين',exact:true}).click();await page.locator('[data-node=ground-grass]').click();await page.getByRole('button',{name:'تحديد الأرض',exact:true}).click();await page.locator('[data-node=ground-grass-1]').click();await page.getByRole('button',{name:'دمج الأرض',exact:true}).click();await page.getByRole('button',{name:'تحديد الأرض',exact:true}).click();assert.equal(await page.locator('[data-layer=terrain] [data-node]').count(),1);
  await page.getByRole('button',{name:'أسفل',exact:true}).click();await page.getByRole('button',{name:'دمج الأرض',exact:true}).click();await page.getByRole('button',{name:'حفظ الآن',exact:true}).click();await page.getByRole('status').filter({hasText:'محفوظ في المجلد'}).waitFor();
  let saved=await(await fetch(base+'/api/domain/projects/'+id)).json();const land=saved.project.nodes[0];assert.equal(land.terrainRects.length,3);assert.equal(saved.project.width,2400);assert.equal(saved.project.height,1600);assert.equal(saved.project.edges.length,0);
  assert.equal(await page.evaluate(()=>{const n=window.FlowCore.node('test','ground-merged-test','أرض',1,1,1,1,{role:'equipment'});return window.FlowCore.canConnect(n);}),false);
  // Actual raster pixels must retain the unfilled corner of the joined ground.
  const pixels=await page.evaluate(async p=>{p.background='#ffffff';const n=p.nodes[0];n.showLabel=false;const svg=window.FlowCore.render(p,{animate:false}),canvas=await window.FlowCore.raster(svg,p.width,p.height,1),ctx=canvas.getContext('2d'),x=n.x-n.w/2,y=n.y-n.h/2;return {gap:[...ctx.getImageData(x+30,y+n.h-30,1,1).data],land:[...ctx.getImageData(n.x,y+n.h-30,1,1).data]};},saved.project);assert.deepEqual(pixels.gap,[255,255,255,255]);assert.notDeepEqual(pixels.land,[255,255,255,255]);
  await page.getByRole('button',{name:'تراجع',exact:true}).click();assert.equal(await page.locator('[data-layer=terrain] [data-node]').count(),2);await page.getByRole('button',{name:'إعادة',exact:true}).click();assert.equal(await page.locator('[data-layer=terrain] [data-node]').count(),1);
  await page.getByRole('button',{name:'مساحة واسعة',exact:true}).click();const box=await page.getByTestId('board-viewport').boundingBox();assert.ok(box.width>1500);assert.equal(await page.locator('.library').isVisible(),false);
  await page.getByLabel('تكبير البورد').selectOption('400');const viewport=page.getByTestId('board-viewport');const before=await viewport.evaluate(e=>e.scrollLeft);const v=await viewport.boundingBox();await page.mouse.move(v.x+v.width/2,v.y+v.height/2);await page.mouse.down({button:'middle'});await page.mouse.move(v.x+v.width/2-120,v.y+v.height/2-50,{steps:4});await page.mouse.up({button:'middle'});assert.ok(await viewport.evaluate(e=>e.scrollLeft)>before);
  await page.getByRole('button',{name:'إعادة العرض',exact:true}).click();assert.equal(await page.getByLabel('تكبير البورد').inputValue(),'100');assert.equal(await viewport.evaluate(e=>e.scrollLeft),0);
  await page.getByRole('button',{name:'إظهار اللوحات',exact:true}).click();await page.getByRole('button',{name:'حفظ الآن',exact:true}).click();await page.getByRole('status').filter({hasText:'محفوظ في المجلد'}).waitFor();await page.reload();await page.getByTestId('scene-canvas').waitFor();saved=await(await fetch(base+'/api/domain/projects/'+id)).json();assert.equal(saved.project.nodes[0].terrainRects.length,3);assert.ok((await readdir(path.join(folder,id,'assets'))).some(f=>f.startsWith('ground-merged-')));
  await page.getByRole('button',{name:'معاينة وتصدير Lottie',exact:true}).click();await page.locator('.lottie-preview svg').waitFor();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='تنزيل ملف Lottie .json')?.disabled);await page.getByRole('button',{name:'إغلاق المعاينة'}).click();
  await page.screenshot({path:path.join(os.tmpdir(),'flow-land-board.png'),fullPage:true});
  for(const width of [390,768]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));await rm(folder,{recursive:true,force:true});}
});

test('Reference energy tools: independent cards, vector Lottie, particle and nature motion', {timeout:120000}, async()=>{
 const folder=await mkdtemp(path.join(os.tmpdir(),'flow-reference-test-')),port=8878,base=`http://127.0.0.1:${port}`;
 const server=spawn('python3',['server.py'],{env:{...process.env,FLOW_STUDIO_PORT:String(port),FLOW_STUDIO_PROJECTS:folder},stdio:'pipe'});let browser;
 try{
  for(let i=0;i<60;i++){try{if((await fetch(base+'/api/domain/projects')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const page=await browser.newPage({viewport:{width:1800,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#domain');await page.getByTestId('project-name').fill('المشهد المرجعي');await page.getByLabel('ابدأ من').selectOption('reference-energy');await page.getByRole('button',{name:'إنشاء وفتح البورد'}).click();await page.getByTestId('scene-canvas').waitFor();const id=page.url().split('/').at(-1);
  const getProject=async()=>(await(await fetch(base+'/api/domain/projects/'+id)).json()).project;
  const save=async()=>{await page.getByRole('button',{name:'حفظ الآن',exact:true}).click();await page.getByRole('status').filter({hasText:'محفوظ في المجلد'}).waitFor();};
  const original=await getProject(),originalHome=original.nodes.find(n=>n.id==='home');
  assert.equal(original.nodes.filter(n=>n.kind==='iso-solar').length,4);
  // Selecting a different object commits the previous input to its owner and resets the inspector.
  await page.locator('[data-node=home]').click();
  await page.getByLabel('اسم العنصر',{exact:true}).fill('منزل محدد');
  await page.locator('[data-node=sun]').click();
  assert.equal(await page.locator('.inspector').getAttribute('data-selection-id'),'sun');
  assert.match(await page.getByRole('status',{name:'التحديد الحالي'}).innerText(),/شمس متحركة/);
  assert.equal(await page.getByLabel('القيمة',{exact:true}).count(),0);
  assert.equal(await page.getByLabel('الكفاءة %',{exact:true}).count(),0);
  assert.equal(await page.getByLabel('نوع الحركة').count(),1);
  await save();let switched=await getProject();assert.equal(switched.nodes.find(n=>n.id==='home').name,'منزل محدد');assert.equal(switched.nodes.find(n=>n.id==='sun').name,'sun');
  await page.locator('.layer').filter({hasText:'منزل محدد'}).click();
  assert.equal(await page.getByLabel('اسم العنصر',{exact:true}).inputValue(),'منزل محدد');
  assert.equal(await page.getByLabel('نوع الحركة').count(),0);
  assert.equal(await page.getByLabel('الكفاءة %',{exact:true}).count(),1);
  await page.getByLabel('X',{exact:true}).fill('99999');
  await page.locator('[data-label=solar]').click();
  assert.equal(await page.locator('.inspector').getAttribute('data-selection-id'),'solar');
  assert.equal(Number(await page.getByLabel('X',{exact:true}).inputValue()),original.nodes.find(n=>n.id==='solar').x);
  assert.equal(await page.locator('.inspector').evaluate(e=>e.scrollTop),0);

  assert.equal(await page.locator('[data-layer=labels] [data-label=home]').count(),1);
  assert.equal(await page.locator('.scene-canvas text').first().evaluate(e=>getComputedStyle(e).direction),'ltr');
  const label=page.locator('[data-label=home]'),box=await label.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2-15,{steps:5});await page.mouse.up();await save();
  let saved=await getProject(),home=saved.nodes.find(n=>n.id==='home');assert.equal(home.x,originalHome.x);assert.equal(home.y,originalHome.y);assert.notEqual(home.labelOffsetX,originalHome.labelOffsetX);
  await page.getByRole('button',{name:'تراجع',exact:true}).click();await save();saved=await getProject();assert.equal(saved.nodes.find(n=>n.id==='home').labelOffsetX,originalHome.labelOffsetX);
  await page.getByLabel('عنوان اللوحة',{exact:true}).fill('منزل الطاقة');await page.getByLabel('عنوان اللوحة',{exact:true}).press('Tab');await page.getByLabel('نسبة الشريط %',{exact:true}).fill('72');await page.getByLabel('نسبة الشريط %',{exact:true}).press('Tab');
  await page.locator('.layer').filter({hasText:'solar-inverter'}).click();await page.getByLabel('عدد النقاط',{exact:true}).fill('12');await page.getByLabel('عدد النقاط',{exact:true}).press('Tab');await save();await page.reload();await page.getByTestId('scene-canvas').waitFor();saved=await getProject();assert.equal(saved.nodes.find(n=>n.id==='home').title,'منزل الطاقة');assert.equal(saved.nodes.find(n=>n.id==='home').progress,72);assert.equal(saved.edges[0].particleCount,12);
  await page.getByRole('button',{name:'معاينة وتصدير Lottie',exact:true}).click();await page.locator('.lottie-preview svg').waitFor({timeout:10000}).catch(async e=>{console.log('Reference export diagnostic',await page.locator('.export-dialog').innerText(),errors);throw e;});await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='تنزيل ملف Lottie .json')?.disabled);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'تنزيل ملف Lottie .json'}).click();const download=await downloadPromise,data=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(data.op,180);assert.equal(data.ddd,0);assert.ok(data.layers.filter(l=>l.nm.endsWith(' • leader')).length===6);assert.ok(data.layers.filter(l=>/node-(solar|inverter|home|sun) • icon/.test(l.nm)).every(l=>l.ty===4),'New equipment must remain vector shapes');assert.ok(data.assets.every(a=>a.e===1&&a.p.startsWith('data:image/')));
  const sunLayer=data.layers.find(l=>l.nm==='node-sun • icon');assert.equal(sunLayer.ks.r.a,1);assert.equal(sunLayer.ks.r.k.at(-1).s[0],360);
  const preview=page.locator('.lottie-preview'),before=await preview.innerHTML();await page.getByLabel('إطار معاينة Lottie').fill('37');assert.notEqual(await preview.innerHTML(),before);
  // Standalone nature exports have real vector keyframes, and inactive/hidden states stop them.
  const nature=await page.evaluate(async()=>{const c=window.FlowCore,p=c.preset('blank');p.nodes=[c.node('river','river','River',500,320,600,165,{showLabel:false,animation:'water',animationDuration:4})];p.assets={river:c.extraAssets.river};let data=await c.lottie(p);const moving=data.layers.filter(l=>l.nm.includes(' • water')),active={op:data.op,count:moving.length,animated:moving.every(l=>l.shapes[0].it.find(s=>s.ty==='st').d.find(d=>d.n==='o').v.a===1)};p.nodes[0].state='inactive';data=await c.lottie(p);const inactive=data.layers.filter(l=>l.nm.includes(' • water')).every(l=>l.shapes[0].it.find(s=>s.ty==='st').d.find(d=>d.n==='o').v.a===0);p.nodes[0].state='hidden';data=await c.lottie(p);const hidden=!data.layers.some(l=>l.nm.startsWith('node-river'));p.nodes[0].state='active';p.nodes[0].labelOffsetX=Infinity;let invalid=false;try{c.validate(p);}catch{invalid=true;}return{active,inactive,hidden,invalid,connect:c.canConnect(p.nodes[0])};});
  assert.deepEqual(nature,{active:{op:120,count:3,animated:true},inactive:true,hidden:true,invalid:true,connect:false});
  await page.getByRole('button',{name:'إغلاق المعاينة'}).click();await page.getByRole('button',{name:'طبيعة',exact:true}).click();await page.getByRole('button',{name:'+ شمس متحركة · Lottie',exact:true}).click();await page.getByLabel('نوع الحركة').waitFor({timeout:3000}).catch(async e=>{console.log('Motion UI diagnostic',await page.locator('.inspector').innerText(),await page.locator('.toast').allTextContents());throw e;});assert.equal(await page.getByLabel('نوع الحركة').inputValue(),'spin');await page.getByLabel('نوع الحركة').selectOption('breathe');await save();saved=await getProject();assert.equal(saved.nodes.at(-1).animation,'breathe');assert.deepEqual(errors,[]);
 }finally{await browser?.close();server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));await rm(folder,{recursive:true,force:true});}
});

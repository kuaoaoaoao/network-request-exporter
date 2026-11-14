import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {StringDecoder} from 'node:string_decoder';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
const profile=mkdtempSync(join(tmpdir(),'network-exporter-chrome-'));
const proc=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-pipe','--enable-unsafe-extension-debugging',`--user-data-dir=${profile}`,'--auto-open-devtools-for-tabs','about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
const exited=new Promise(resolve=>proc.once('exit',resolve));
let id=0,buffer='',pending=new Map();const decoder=new StringDecoder('utf8');
proc.stderr.on('data',()=>{});
proc.stdio[4].on('data',data=>{buffer+=decoder.write(data);let cut;while((cut=buffer.indexOf('\0'))>=0){const raw=buffer.slice(0,cut);buffer=buffer.slice(cut+1);if(!raw)continue;const message=JSON.parse(raw);if(message.id && pending.has(message.id)){const {resolve,reject,timer}=pending.get(message.id);pending.delete(message.id);clearTimeout(timer);message.error?reject(Error(JSON.stringify(message.error))):resolve(message.result);}}});
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const call=++id;const timer=setTimeout(()=>{pending.delete(call);reject(Error('CDP timeout: '+method));},15000);pending.set(call,{resolve,reject,timer});proc.stdio[3].write(JSON.stringify({id:call,method,params,...(sessionId?{sessionId}:{})})+'\0');});}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const evaluate=async(sessionId,expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
async function until(fn,label){for(let n=0;n<80;n++){const value=await fn();if(value)return value;await delay(100);}throw Error('Timed out: '+label);}
try{
 const version=(await send('Browser.getVersion')).product;
 const extension=(await send('Extensions.loadUnpacked',{path:resolve('extension')})).id;
 const before=(await send('Target.getTargets')).targetInfos.map(t=>t.targetId);
 const target=await send('Target.createTarget',{url:'http://127.0.0.1:8765/'});
 const dev=await until(async()=>(await send('Target.getTargets')).targetInfos.find(t=>t.url.startsWith('devtools://')&&!before.includes(t.targetId)),'DevTools window');
 const sid=(await send('Target.attachToTarget',{targetId:dev.targetId,flatten:true})).sessionId;
 await until(async()=>evaluate(sid,`(()=>{let count=0;function walk(root){for(const n of root.querySelectorAll('*')){if(n.getAttribute('role')==='tab')count++;if(n.shadowRoot)walk(n.shadowRoot);}}walk(document);return count>0;})()`),'DevTools UI initialization');
 await until(async()=>evaluate(sid,`(async()=>{const u=await import('devtools://devtools/bundled/ui/legacy/legacy.js');return u.InspectorView.InspectorView.instance().tabbedPane.tabIds().some(x=>x.includes('请求导出'));})()`),'extension panel registration');
 await evaluate(sid,`(async()=>{const u=await import('devtools://devtools/bundled/ui/legacy/legacy.js');const v=u.InspectorView.InspectorView.instance();await v.showPanel(v.tabbedPane.tabIds().find(x=>x.includes('请求导出')));})()`);
 const panel=await until(async()=>(await send('Target.getTargets')).targetInfos.find(t=>t.url===`chrome-extension://${extension}/panel.html`),'extension panel frame');
 const ps=(await send('Target.attachToTarget',{targetId:panel.targetId,flatten:true})).sessionId;
 await until(async()=>evaluate(ps,`!!window.exportStore && !!document.querySelector('#clear')`),'panel store bridge');
 const inspected=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
 await until(async()=>evaluate(inspected,`!!document.querySelector('#run')`),'fixture');
 await evaluate(inspected,`document.querySelector('#run').click()`);
 await until(async()=>evaluate(ps,`window.exportStore.records.filter(r=>r.entry.request.url.includes('/api/')&&r.body.status!=='pending').length===3`),'completed request bodies');
 const records=await evaluate(ps,`window.exportStore.records.filter(r=>r.entry.request.url.includes('/api/')).map(r=>({url:r.entry.request.url,method:r.entry.request.method,status:r.entry.response.status,body:r.body,post:r.entry.request.postData,headers:r.entry.request.headers}))`);
 assert.equal(records.length,3);
 assert.deepEqual(records.map(r=>r.status).sort(),[200,201,500]);
 const post=records.find(r=>r.method==='POST');
 assert.ok(post.post.text.includes('DEMO_SECRET'));
 assert.ok(post.headers.some(h=>h.name.toLowerCase()==='authorization'));
 assert.ok(post.body.text.includes('POST 测试响应'));
 assert.ok(records.every(r=>r.body.status==='ok'));
 // Compact layout regression: actions first, branding last, honest reserved controls.
 for(const width of [1200,480]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:820,deviceScaleFactor:1,mobile:false},sid);
   await delay(150);
   const geometry=await evaluate(ps,`(()=>{const box=s=>document.querySelector(s).getBoundingClientRect();return {toolbarTop:box('.export-bar').top,tableTop:box('table').top,aboutTop:box('.about').top,workspaceBottom:box('.workspace').bottom,overflow:document.documentElement.scrollWidth>innerWidth,reserved:[...document.querySelectorAll('.reserved-bar button')].map(b=>({disabled:b.disabled,text:b.textContent})),controls:['copy','download','scope','format','redact','preserve','clear'].every(id=>!!document.querySelector('.export-bar #'+id))};})()`);
   assert.ok(geometry.toolbarTop<15);assert.ok(geometry.tableTop<(width===1200?160:230),JSON.stringify(geometry));
   assert.ok(geometry.aboutTop>=geometry.workspaceBottom);assert.ok(!geometry.overflow);assert.ok(geometry.controls);
   assert.equal(geometry.reserved.length,3);assert.ok(geometry.reserved.every(b=>b.disabled&&b.text.includes('预留')));
   const screenshot=await send('Page.captureScreenshot',{format:'png'},sid);
   writeFileSync(resolve('tests',width===1200?'panel-compact-desktop.png':'panel-compact-narrow.png'),Buffer.from(screenshot.data,'base64'));
 }
 const redacted=await evaluate(ps,`(async()=>{const {exportData}=await import('./core.js');return exportData(window.exportStore.records.filter(r=>r.entry.request.url.includes('/api/')),'har',true);})()`);
 assert.ok(!redacted.includes('DEMO_SECRET'));
 assert.equal(JSON.parse(redacted).log.entries.length,3);
 // Exercise the installed panel's actual file-download click handler.
 const downloads=mkdtempSync(join(tmpdir(),'network-exporter-downloads-'));
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
 await evaluate(ps,`(()=>{const k=document.querySelector('#keyword');k.value='/api/';k.dispatchEvent(new Event('input'));document.querySelector('#scope').value='filtered';document.querySelector('#format').value='json';document.querySelector('#redact').checked=true;document.querySelector('#download').click();})()`);
 const filename=await until(async()=>readdirSync(downloads).find(x=>x.endsWith('.json')),'JSON download');
 const downloaded=JSON.parse(readFileSync(join(downloads,filename),'utf8'));
 assert.equal(downloaded.count,3);assert.ok(!JSON.stringify(downloaded).includes('DEMO_SECRET'));
 await evaluate(ps,`document.querySelector('#clear').click()`);
 assert.equal(await evaluate(ps,'window.exportStore.records.length'),0);
 await evaluate(inspected,`document.querySelector('#run').click()`);
 await until(async()=>evaluate(ps,`window.exportStore.records.filter(r=>r.entry.request.url.includes('/api/')&&r.body.status==='ok').length===3`),'capture after clear');
 // Switch to Network and back: hidden panel collector must keep working.
 await evaluate(sid,`(async()=>{const u=await import('devtools://devtools/bundled/ui/legacy/legacy.js');await u.InspectorView.InspectorView.instance().showPanel('network');})()`);
 await evaluate(inspected,`fetch('/api/users?repeat=1')`);
 await until(async()=>evaluate(ps,`window.exportStore.records.some(r=>r.entry.request.url.includes('repeat=1')&&r.body.status==='ok')`),'capture with panel hidden');
 console.log(`PASS: ${version}; real installed DevTools extension; GET/POST/500, authorization/header/postData, UTF-8 responses, redacted HAR, actual JSON download, clear/resume, hidden-panel capture; compact toolbar, footer branding, reserved controls and 480px layout.`);
 rmSync(downloads,{recursive:true,force:true});
 await send('Browser.close');
}catch(error){console.error(error.stack || error.message);process.exitCode=1;}finally{proc.kill();await Promise.race([exited,delay(3000)]);rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}

// Reproducible code-native brand assets + actual panel screenshots, synthetic data only.
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {StringDecoder} from 'node:string_decoder';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const executable=process.env.CHROME_PATH || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'google-chrome');
const profile=mkdtempSync(join(tmpdir(),'exporter-assets-'));
const server=spawn('python3',['-m','http.server','8767','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const chrome=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-pipe',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
const exited=new Promise(r=>chrome.once('exit',r));
let buffer='',id=0;const decoder=new StringDecoder('utf8'),pending=new Map();
chrome.on('error',e=>{console.error(e.message);process.exitCode=1;});
chrome.stdio[4].on('data',data=>{buffer+=decoder.write(data);let n;while((n=buffer.indexOf('\0'))>=0){const msg=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}});
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const call=++id;const timer=setTimeout(()=>reject(Error('CDP timeout: '+method)),15000);pending.set(call,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id:call,method,params,...(sessionId?{sessionId}:{})})+'\0');});}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(sessionId,expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function open(url,width,height){const {targetId}=await send('Target.createTarget',{url});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);for(let i=0;i<60;i++){if(await evaluate(sessionId,"document.readyState==='complete'"))break;await delay(100);}await delay(150);return sessionId;}
async function screenshot(sid,path){await evaluate(sid,'document.fonts.ready.then(()=>true)');const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sid);writeFileSync(join(root,path),Buffer.from(r.data,'base64'));}
try{
 await send('Browser.getVersion');
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8767/package.json')).ok)break;}catch{}await delay(100);}
 const brand=await open('http://127.0.0.1:8767/store/artwork.html',1280,480);
 const icons=await evaluate(brand,`(async()=>{const img=document.querySelector('.logo');await img.decode();return [16,32,48,128].map(n=>{const canvas=document.createElement('canvas');canvas.width=n;canvas.height=n;canvas.getContext('2d').drawImage(img,0,0,n,n);return {n,png:canvas.toDataURL('image/png').split(',')[1]};});})()`);
 for(const icon of icons)writeFileSync(join(root,`extension/icons/icon${icon.n}.png`),Buffer.from(icon.png,'base64'));
 await screenshot(brand,'docs/images/banner.png');
 const tile=await open('http://127.0.0.1:8767/store/artwork.html?tile',440,280);await screenshot(tile,'store/promo-440x280.png');
 const panel=await open('http://127.0.0.1:8767/extension/panel.html',1280,800);
 await evaluate(panel,`(async()=>{
 const {createCollector}=await import('/extension/collector.js');
 const paths=[['GET','/api/products?page=1',200,{items:[{id:'P1001',name:'Demo Product',price:99}],total:24}],['POST','/api/orders',201,{orderId:'DEMO-2026-001',status:'created',token:'demo-not-a-real-token'}],['GET','/api/checkout',500,{code:'DEMO_SERVICE_ERROR',message:'演示：服务暂时不可用'}]];
 const entries=paths.map(([method,path,status,body],i)=>({startedDateTime:'2026-11-14T02:00:00.000Z',time:[42,128,68][i],_resourceType:'fetch',request:{method,url:'https://demo.example.test'+path,headers:[{name:'Content-Type',value:'application/json'},...(method==='POST'?[{name:'Authorization',value:'Bearer demo-not-a-real-token'}]:[])],queryString:path.includes('?')?[{name:'page',value:'1'}]:[],...(method==='POST'?{postData:{mimeType:'application/json',text:JSON.stringify({productId:'P1001',quantity:2,password:'demo-password'})}}:{})},response:{status,statusText:status===500?'Internal Server Error':status===201?'Created':'OK',headers:[{name:'Content-Type',value:'application/json'}],content:{mimeType:'application/json',size:100}},cache:{},timings:{send:1,wait:35,receive:6},getContent:cb=>cb(JSON.stringify(body),'')}));
 const network={getHAR:cb=>cb({entries}),onRequestFinished:{addListener:()=>{}},onNavigated:{addListener:()=>{}}};
 window.exportStore=createCollector(network);window.dispatchEvent(new Event('export-store-ready'));await window.exportStore.ready;await Promise.all(window.exportStore.records.map(r=>r.done));
 document.querySelector('.about-title').append(Object.assign(document.createElement('span'),{textContent:'演示数据 / Synthetic data'}));
 })()`);
 await delay(200);
 assert.equal(await evaluate(panel,"document.querySelectorAll('tbody tr').length"),3);
 await evaluate(panel,"document.querySelectorAll('.open-detail')[1].click()");
 await screenshot(panel,'docs/images/screenshot-overview.png');
 await evaluate(panel,"document.querySelector('#close-detail').click();document.querySelectorAll('tbody input')[0].click();document.querySelectorAll('tbody input')[1].click();document.querySelector('#scope').value='selected';document.querySelector('#scope').dispatchEvent(new Event('change'));");
 await screenshot(panel,'docs/images/screenshot-selection.png');
 await evaluate(panel,"document.querySelector('#redact').click();document.querySelectorAll('.open-detail')[1].click()");
 assert.ok(!(await evaluate(panel,"document.querySelector('#detail-content').textContent")).includes('demo-password'));
 await evaluate(panel,"const pre=document.querySelector('#detail-content');pre.scrollTop=pre.scrollHeight;");
 await screenshot(panel,'docs/images/screenshot-redaction.png');
 await send('Browser.close');console.log('PASS: icons 16/32/48/128, banner 1280x480, promo 440x280, three real-panel screenshots 1280x800; all synthetic data');
}finally{chrome.kill();server.kill();await Promise.race([exited,delay(2000)]);rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}

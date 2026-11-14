const encoder = new TextEncoder();
const keyOf = e => JSON.stringify([e.startedDateTime,e.request?.method,e.request?.url,e.request?.postData,e.time,e.response?.status,e.response?.bodySize]);
export function createCollector(network, options={}) {
  const cfg={maxRecords:2000,maxBodyBytes:2*1024*1024,maxTotalBytes:32*1024*1024,timeoutMs:8000,concurrency:4,...options};
  let records=[],id=0,generation=0,active=0,booting=true,bootEvents=[],queue=[],bodyBytes=0,dropped=0;
  const listeners=new Set();
  const notify=()=>{for(const fn of listeners) fn();};
  let readyResolve; const ready=new Promise(r=>{readyResolve=r;});
  const store={get records(){return records;},preserve:true,ready,
    get stats(){return {bodyBytes,dropped,pending:records.filter(r=>r.body.status==='pending').length};},
    subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    clear(){generation++;const previous=records;records=[];bodyBytes=0;dropped=0;bootEvents=[];queue=[];for(const record of previous) if(record.body.status==='pending')record.cancel();notify();}};
  function pump() {while(active<cfg.concurrency && queue.length){const job=queue.shift();if(!records.includes(job.record)){job.cancel();continue;}active++;job.run().finally(()=>{active--;pump();});}}
  function add(source) {
    // Strip getContent and any other API functions; keep HAR data unmodified.
    const entry=JSON.parse(JSON.stringify(source));
    if(entry.response?.content){delete entry.response.content.text;delete entry.response.content.encoding;}
    if(records.length>=cfg.maxRecords){const old=records.shift();bodyBytes-=old.bytes || 0;dropped++;if(old.body.status==='pending')old.cancel();}
    const record={id:++id,entry,body:{status:'pending',text:'',encoding:''},bytes:0};
    let resolve,stop;record.done=new Promise(r=>{resolve=r;});records.push(record);
    const epoch=generation;
    const cancel=()=>{record.body={status:'unavailable',text:'',encoding:'',reason:'记录已清除或超出保留条数'};if(stop)stop();else resolve();};
    record.cancel=cancel;
    queue.push({record,cancel,run:()=>new Promise(finish=>{
      let finished=false;
      const end=(text,encoding='',reason='',status='ok')=>{
        if(finished)return;finished=true;clearTimeout(timer);
        if(epoch===generation && records.includes(record)) {
          if(typeof text!=='string') {if(status==='ok')status='unavailable';reason=reason || '浏览器未提供响应正文';text='';}
          const bytes=encoder.encode(text); const budget=Math.max(0,Math.min(cfg.maxBodyBytes,cfg.maxTotalBytes-bodyBytes));
          if(bytes.length>budget){
            // Base64 must remain decodable: cut only at a multiple of four.
            text=encoding==='base64' ? text.slice(0,Math.floor(budget/4)*4) : new TextDecoder('utf-8',{fatal:false}).decode(bytes.slice(0,budget),{stream:true});
            status=budget>0?'truncated':'omitted';reason=budget>0?'正文超过单条或总内存限制，已截断':'总正文内存已达上限，已省略';
          }
          record.bytes=encoder.encode(text).length;bodyBytes+=record.bytes;
          record.body={status,text,encoding,reason};notify();
        }
        resolve();finish();
      };
      stop=()=>end(undefined,'','记录已清除','unavailable');
      const timer=setTimeout(()=>end(undefined,'','读取正文超时','timeout'),cfg.timeoutMs);
      try {
        if(typeof source.getContent==='function') source.getContent((text,encoding)=>end(text,encoding || ''));
        else if(typeof source.response?.content?.text==='string')end(source.response.content.text,source.response.content.encoding || '');
        else end(undefined);
      }catch(error){end(undefined,'',`读取正文失败: ${error.message}`);}
    })});
    pump();notify();
  }
  network.onRequestFinished.addListener(request=>{if(booting)bootEvents.push(request);else add(request);});
  network.onNavigated.addListener(()=>{if(!store.preserve)store.clear();});
  const initialEpoch=generation;
  // Timeout allows future events even if initial getHAR never answers.
  let initialized=false;
  const initialize=har=>{
    if(initialized)return;initialized=true;clearTimeout(initTimer);
    const initial=initialEpoch===generation ? har?.entries || [] : [];
    const counts=new Map();
    for(const request of initial){const key=keyOf(request);counts.set(key,(counts.get(key)||0)+1);add(request);}
    for(const request of bootEvents){const key=keyOf(request),count=counts.get(key)||0;if(count)counts.set(key,count-1);else add(request);}
    bootEvents=[];booting=false;readyResolve();notify();
  };
  const initTimer=setTimeout(()=>initialize({entries:[]}),cfg.timeoutMs);
  try{network.getHAR(initialize);}catch{initialize({entries:[]});}
  return store;
}

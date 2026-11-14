import {filterRecords, selectRecords, exportData} from './core.js';
const $=id=>document.getElementById(id);
let store,unsubscribe,selected=new Set(),detailId,busy=false,renderTimer;
const states={pending:'读取中',ok:'已获取',unavailable:'不可用',timeout:'读取超时',truncated:'已截断',omitted:'已省略',redacted:'已脱敏'};
function filters(){return {keyword:$('keyword').value.trim(),method:$('method').value,status:$('status').value,type:$('type').value};}
function chosen(){return selectRecords(store?.records || [],$('scope').value,selected,filters());}
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function showDetail(){const record=store?.records.find(r=>r.id===detailId);$('detail').hidden=!record;if(record)$('detail-content').textContent=exportData([record],'txt',$('redact').checked);}
function updateControls(){const count=chosen().length;$('export-count').textContent=`导出 ${count} 条`;$('copy').disabled=busy || !count;$('download').disabled=busy || !count;}
function render(){
  if(!store)return;
  const rows=filterRecords(store.records,filters()),ids=new Set(store.records.map(r=>r.id));
  selected=new Set([...selected].filter(id=>ids.has(id)));
  $('total').textContent=store.records.length;
  const fragment=document.createDocumentFragment();
  for(const r of rows){
    const tr=document.createElement('tr');tr.dataset.id=r.id;
    const cell=document.createElement('td');cell.className='selection';
    const input=document.createElement('input');input.type='checkbox';input.checked=selected.has(r.id);input.setAttribute('aria-label',`勾选 ${r.entry.request?.url}`);
    input.addEventListener('change',()=>{if(input.checked)selected.add(r.id);else selected.delete(r.id);updateControls();updateSelectAll(rows);});cell.append(input);tr.append(cell);
    const method=document.createElement('td');method.className='method';method.textContent=r.entry.request?.method;tr.append(method);
    const url=document.createElement('td'),open=document.createElement('button');open.className='open-detail';open.textContent=r.entry.request?.url;open.title=r.entry.request?.url;open.addEventListener('click',()=>{detailId=r.id;showDetail();});url.append(open);tr.append(url);
    const status=document.createElement('td');status.textContent=r.entry.response?.status || '失败';status.className=r.entry.response?.status>=400 || !r.entry.response?.status?'status-error':'status-good';tr.append(status);
    const time=document.createElement('td');time.textContent=`${Math.round(r.entry.time || 0)} ms`;tr.append(time);
    const body=document.createElement('td');body.className='body-state';body.textContent=states[r.body.status] || r.body.status;body.title=r.body.reason || (r.body.encoding ? `编码: ${r.body.encoding}` : '');tr.append(body);fragment.append(tr);
  }
  $('rows').replaceChildren(fragment);$('empty').hidden=rows.length>0;
  if(!rows.length){$('empty').querySelector('h3').textContent=store.records.length?'没有匹配的请求':'等待网络请求';$('empty').querySelector('p').textContent=store.records.length?'尝试更换地址关键词或筛选条件。':'保持 F12 打开，刷新页面或执行一次业务操作。请求完成后会显示在这里。';}
  const stats=store.stats;
  $('summary').textContent=`显示 ${rows.length} 条 · 已选 ${selected.size} 条 · 正文 ${(stats.bodyBytes/1024/1024).toFixed(1)} MiB${stats.pending ? ` · ${stats.pending} 条读取中` : ''}${stats.dropped ? ` · 超限移除 ${stats.dropped} 条` : ''}`;
  updateSelectAll(rows);updateControls();showDetail();
}
function updateSelectAll(rows){const count=rows.filter(r=>selected.has(r.id)).length;$('select-visible').checked=rows.length>0 && count===rows.length;$('select-visible').indeterminate=count>0 && count<rows.length;$('select-visible').disabled=!rows.length;}
function attach(){if(!window.exportStore || store===window.exportStore)return;unsubscribe?.();store=window.exportStore;$('preserve').checked=store.preserve;unsubscribe=store.subscribe(()=>{if(renderTimer)return;renderTimer=setTimeout(()=>{renderTimer=undefined;render();},80);});render();}
window.addEventListener('export-store-ready',attach);attach();
for(const id of ['keyword','method','status','type'])$(id).addEventListener(id==='keyword'?'input':'change',render);
$('scope').addEventListener('change',updateControls);
$('redact').addEventListener('change',showDetail);
$('select-visible').addEventListener('change',()=>{for(const r of filterRecords(store?.records || [],filters())){if($('select-visible').checked)selected.add(r.id);else selected.delete(r.id);}render();});
$('preserve').addEventListener('change',()=>{if(store)store.preserve=$('preserve').checked;});
$('clear').addEventListener('click',()=>{store?.clear();selected.clear();detailId=undefined;render();notice('已清空本插件记录。后续请求会继续采集。');});
$('close-detail').addEventListener('click',()=>{detailId=undefined;showDetail();});
$('close-manual').addEventListener('click',()=>$('manual').close());
async function getExport(format){
  const snapshot=chosen(); // Freeze membership before awaiting response bodies.
  if(!snapshot.length)throw Error('当前导出范围没有请求，请先采集或勾选请求。');
  const redact=$('redact').checked;
  busy=true;updateControls();notice(`正在整理 ${snapshot.length} 条请求的正文…`);
  await Promise.all(snapshot.map(r=>r.done));
  return {text:exportData(snapshot,format,redact),count:snapshot.length,incomplete:snapshot.filter(r=>r.body.status!=='ok').length};
}
$('copy').addEventListener('click',async()=>{
  try{
    const result=await getExport('txt');
    try{await navigator.clipboard.writeText(result.text);notice(`已复制 ${result.count} 条请求${result.incomplete ? `，其中 ${result.incomplete} 条正文不完整，详见正文状态` : ''}。`);}
    catch{$('manual-text').value=result.text;$('manual').showModal();$('manual-text').focus();$('manual-text').select();notice('自动复制不可用，可在弹窗中手动复制，或下载文件。',true);}
  }catch(error){notice(error.message,true);}finally{busy=false;updateControls();}
});
$('download').addEventListener('click',async()=>{
  try{
    const format=$('format').value,result=await getExport(format);
    const blob=new Blob([result.text],{type:format==='txt'?'text/plain;charset=utf-8':'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`network-${new Date().toISOString().replace(/[:.]/g,'-')}.${format}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    notice(`已生成 ${result.count} 条请求的 ${format.toUpperCase()} 文件${result.incomplete ? `；${result.incomplete} 条正文不完整，详见正文状态` : ''}。`);
  }catch(error){notice(`下载失败: ${error.message}`,true);}finally{busy=false;updateControls();}
});

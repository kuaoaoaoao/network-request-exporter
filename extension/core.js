const secret = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|.*token.*|password|passwd|pwd|secret|client[-_]?secret|session[-_]?id|access[-_]?key|credential|key)$/i;
const MASK = '[REDACTED]';
const clone = value => JSON.parse(JSON.stringify(value));
function redactURL(value) {
  try { const url = new URL(value); if (url.username) url.username = MASK; if (url.password) url.password = MASK;
    for (const key of [...url.searchParams.keys()]) if (secret.test(key)) url.searchParams.set(key, MASK);
    // Fragments may contain OAuth access tokens.
    if (url.hash.includes('=')) {const parts = new URLSearchParams(url.hash.slice(1)); for(const key of [...parts.keys()]) if(secret.test(key)) parts.set(key,MASK); url.hash = parts.toString();}
    return url.href;
  } catch { return value; }
}
function redactTree(value) {
  if (Array.isArray(value)) return value.map(redactTree);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (secret.test(key)) result[key] = MASK;
    else if ((key === 'url' || key === 'redirectURL') && typeof item === 'string') result[key] = redactURL(item);
    else result[key] = redactTree(item);
  }
  if (typeof value.name === 'string' && secret.test(value.name) && 'value' in value) result.value = MASK;
  if (/^referer$/i.test(value.name || '') && typeof value.value === 'string') result.value = redactURL(value.value);
  return result;
}
function redactText(text, mime) {
  try {return JSON.stringify(redactTree(JSON.parse(text)), null, 2);} catch { /* non JSON */ }
  if (/json/i.test(mime) || /^\s*[\[{]/.test(text)) return '（脱敏模式已省略无法解析的 JSON 正文）';
  if (/multipart\/form-data/i.test(mime)) return '（脱敏模式已省略 multipart 原始正文；可用表单字段见 params）';
  if (/x-www-form-urlencoded/i.test(mime)) {const params = new URLSearchParams(text); for(const key of [...params.keys()]) if(secret.test(key)) params.set(key,MASK); return params.toString();}
  return text;
}
function exportRecord(record, redact) {
  const copy = clone({id:record.id, entry:record.entry, body:record.body});
  if (!redact) return copy;
  const result = redactTree(copy);
  for (const side of ['request', 'response']) {
    const data = result.entry[side];
    if (data?.cookies) data.cookies = data.cookies.map(cookie => ({...cookie,value:MASK}));
  }
  const post = result.entry.request?.postData;
  if (post?.text) post.text = redactText(post.text, post.mimeType);
  // Browser-specific duplicated body fields must not bypass redaction.
  if (result.entry.response?.content) {delete result.entry.response.content.text; delete result.entry.response.content.encoding;}
  if (result.body.encoding === 'base64' && result.body.text) {
    // Binary / encoded bodies cannot be safely inspected by field name.
    result.body = {status:'redacted', text:'', encoding:'', reason:'脱敏模式省略编码正文；如需原始内容请关闭脱敏'};
  } else if (result.body.text) result.body.text = redactText(result.body.text, result.entry.response?.content?.mimeType);
  return result;
}
export function filterRecords(records, filters = {}) {
  return records.filter(({entry:e}) => {
    const status=Number(e.response?.status || 0), type=(e._resourceType || '').toLowerCase();
    const api = ['fetch','xhr','xmlhttprequest'].includes(type) || /json|graphql/i.test(e.response?.content?.mimeType || '');
    return (!filters.keyword || (e.request?.url || '').toLowerCase().includes(filters.keyword.toLowerCase())) &&
      (!filters.method || e.request?.method === filters.method) &&
      (!filters.status || (filters.status === 'failed' ? status === 0 : Math.floor(status/100) === Number(filters.status[0]))) &&
      (!filters.type || filters.type !== 'api' || api);
  });
}
export function selectRecords(records, scope, selected = new Set(), filters = {}) {
  if (scope === 'selected') return records.filter(r => selected.has(r.id));
  return scope === 'filtered' ? filterRecords(records, filters) : [...records];
}
function pretty(value) {if (typeof value !== 'string') return JSON.stringify(value,null,2);try {return JSON.stringify(JSON.parse(value),null,2);}catch{return value;}}
const pairs = values => values?.length ? values.map(v=>`${v.name}: ${v.value ?? ''}`).join('\n') : '（无 / 浏览器未提供）';
export function formatRecord(record) {
  const {entry:e,body:b} = record, req=e.request || {}, res=e.response || {};
  return [`${req.method || '?'} ${req.url || ''}`,`时间: ${e.startedDateTime || '未知'} | 耗时: ${e.time ?? '?'} ms`,
    `状态: ${res.status ?? 0} ${res.statusText || ''} | 类型: ${res.content?.mimeType || '未知'}`,
    '\n[请求头]',pairs(req.headers),'\n[查询参数]',pairs(req.queryString),'\n[负载]',
    req.postData ? [req.postData.mimeType || '',req.postData.text !== undefined ? pretty(req.postData.text) : '',req.postData.params?.length ? pairs(req.postData.params) : ''].filter(Boolean).join('\n') : '（无 / 浏览器未提供）',
    '\n[响应头]',pairs(res.headers),'\n[响应正文]',`正文状态: ${b.status}${b.encoding ? ` | 编码: ${b.encoding}` : ''}${b.reason ? ` | ${b.reason}` : ''}`,
    b.status === 'ok' && b.text === '' ? '（空正文）' : (b.encoding ? b.text : pretty(b.text))].join('\n');
}
export function exportData(records, format='txt', redact=false) {
  const prepared=records.map(r=>exportRecord(r,redact));
  if (format === 'json') return JSON.stringify({exportedAt:new Date().toISOString(),redacted:redact,count:prepared.length,requests:prepared},null,2);
  if (format === 'har') return JSON.stringify({log:{version:'1.2',creator:{name:'请求导出',version:'1.0.0'},entries:prepared.map(({entry:e,body:b})=>{
    e.response ||= {}; e.response.content ||= {};
    delete e.response.content.text; delete e.response.content.encoding;
    if (b.status === 'ok') {e.response.content.text=b.text;if(b.encoding)e.response.content.encoding=b.encoding;}
    e._exportBody={status:b.status,reason:b.reason || '',encoding:b.encoding || ''};
    // A truncated body is explicitly marked and not misrepresented as a full HAR response.
    if (b.status === 'truncated') e._exportBody.preview=b.text;
    return e;
  })}},null,2);
  return `网络请求导出 | ${prepared.length} 条 | ${redact ? '已启用常见字段脱敏' : '原始数据'}\n` +
    prepared.map((r,i)=>`\n${'='.repeat(28)} ${i+1} ${'='.repeat(28)}\n${formatRecord(r)}`).join('\n');
}

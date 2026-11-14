"""Render the public policy from the same Markdown used by the repository."""
from pathlib import Path
from html import escape
ROOT = Path(__file__).resolve().parent.parent
source = (ROOT/'PRIVACY.md').read_text()
parts = []
for block in source.split('\n\n'):
    block = block.strip()
    if not block: continue
    if block.startswith('# '): parts.append('<h1>'+escape(block[2:])+'</h1>')
    elif block.startswith('## '): parts.append('<h2>'+escape(block[3:])+'</h2>')
    else: parts.append('<p>'+escape(block).replace('\n',' ')+'</p>')
html = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>隐私政策 · Network Request Exporter</title><style>body{max-width:840px;margin:40px auto;padding:0 20px;background:#fff;color:#1c2940;font:15px/1.85 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}h1{font-size:28px}h2{font-size:20px;margin-top:30px}a{color:#3159bd}header{border-bottom:1px solid #dbe3ef;padding-bottom:14px}footer{margin-top:36px;border-top:1px solid #dbe3ef;padding-top:14px;font-size:13px;color:#64738a}</style></head><body><header><a href="../">Network Request Exporter</a> · Local processing / 本机处理</header><main>'''+ '\n'.join(parts)+'''</main><footer>本页面与仓库 PRIVACY.md 同源生成。<a data-repo hidden>项目源码 / Source</a></footer><script src="../repo-link.js"></script></body></html>'''
(ROOT/'docs/privacy/index.html').write_text(html)
print('docs/privacy/index.html')

"""Local-only synthetic traffic for manual and automated extension acceptance."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json
import os
import sys
os.chdir(Path(__file__).resolve().parent.parent)
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            status=500 if '/fail' in self.path else 200
            data=json.dumps({'message':'测试响应','token':'DEMO_SECRET','path':self.path.split('?')[0]},ensure_ascii=False).encode()
            self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.send_header('X-Demo','local-fixture');self.end_headers();self.wfile.write(data)
        elif self.path=='/':
            data=b'''<!doctype html><meta charset="utf-8"><title>Network Exporter Acceptance</title><h1>Network Exporter fixture</h1><p>Synthetic requests only. Open F12, then click.</p><button id="run">Generate GET / POST / 500</button><pre id="result"></pre><script>document.querySelector('#run').onclick=async()=>{const responses=await Promise.all([fetch('/api/users?token=DEMO_SECRET&q=test',{headers:{'X-Demo':'example'}}),fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer DEMO_SECRET'},body:JSON.stringify({message:'hello',password:'DEMO_SECRET'})}),fetch('/api/fail')]);document.querySelector('#result').textContent=(await Promise.all(responses.map(r=>r.text()))).join('\\n');}</script>'''
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        else: super().do_GET()
    def do_POST(self):
        length=int(self.headers.get('Content-Length',0));body=self.rfile.read(length).decode()
        data=json.dumps({'message':'POST 测试响应','received':json.loads(body),'token':'DEMO_SECRET'},ensure_ascii=False).encode()
        self.send_response(201);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def log_message(self,*args): pass
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1]) if len(sys.argv)>1 else 8765),Handler).serve_forever()

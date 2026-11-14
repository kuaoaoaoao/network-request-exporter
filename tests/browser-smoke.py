"""UI integration with mocked DevTools only; fixture data is synthetic."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys
BASE = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    context=browser.new_context(permissions=['clipboard-read','clipboard-write'],accept_downloads=True,viewport={'width':1200,'height':820})
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.goto(BASE+'/extension/panel.html');page.wait_for_load_state('networkidle')
    page.evaluate("""async () => {
      const {createCollector}=await import('/extension/collector.js');
      let receive;const network={getHAR:cb=>cb({entries:[]}),onRequestFinished:{addListener:cb=>receive=cb},onNavigated:{addListener:()=>{}}};
      const store=createCollector(network);window.exportStore=store;window.dispatchEvent(new Event('export-store-ready'));
      const make=(url,status,token)=>({startedDateTime:new Date().toISOString(),time:24,_resourceType:'fetch',request:{method:'POST',url,headers:[{name:'Authorization',value:'Bearer '+token}],queryString:[],postData:{mimeType:'application/json',text:JSON.stringify({message:'你好',password:token})}},response:{status,statusText:'OK',headers:[{name:'Content-Type',value:'application/json'}],content:{mimeType:'application/json',size:48}},cache:{},timings:{send:0,wait:20,receive:4},getContent:cb=>cb(JSON.stringify({data:'测试响应',token}),'')});
      receive(make('https://example.test/api/users?token=DEMO_SECRET',200,'DEMO_SECRET'));
      receive(make('https://example.test/api/fail',500,'DEMO_SECRET'));
      window.addSynthetic=()=>receive(make('https://example.test/api/later',201,'LATER'));
    }""")
    page.wait_for_selector('tbody tr[data-id]')
    assert page.locator('tbody tr[data-id]').count()==2
    page.locator('#keyword').fill('/users');assert page.locator('tbody tr[data-id]').count()==1
    page.locator('tbody input[type=checkbox]').check()
    page.locator('#scope').select_option('selected')
    page.locator('#redact').check()
    page.locator('#copy').click()
    page.wait_for_function("document.querySelector('#notice').textContent.includes('已复制')")
    clipboard=page.evaluate('navigator.clipboard.readText()')
    assert 'DEMO_SECRET' not in clipboard and '测试响应' in clipboard and 'Authorization' in clipboard
    page.locator('#format').select_option('har')
    with page.expect_download() as info: page.locator('#download').click()
    download=info.value
    assert download.suggested_filename.endswith('.har')
    text=Path(download.path()).read_text()
    assert 'DEMO_SECRET' not in text and '测试响应' in text
    page.locator('#keyword').fill('')
    page.locator('#scope').select_option('all')
    page.locator('tbody tr[data-id]').first.locator('.open-detail').click()
    assert '响应正文' in page.locator('#detail-content').inner_text()
    # Deliberate clipboard failure must expose a manual-copy fallback.
    page.evaluate("() => { navigator.clipboard.writeText=async()=>{throw Error('denied')}; }")
    page.locator('#copy').click();page.wait_for_selector('dialog[open]')
    assert '测试响应' in page.locator('#manual-text').input_value()
    page.locator('#close-manual').click()
    page.evaluate('window.stream=setInterval(window.addSynthetic,20)')
    page.wait_for_timeout(250)
    assert int(page.locator('#total').inner_text())>2,'continuous traffic prevented UI refresh'
    page.evaluate('clearInterval(window.stream)')
    page.wait_for_timeout(150)
    page.screenshot(path=str(Path(__file__).parent/'panel-desktop.png'),full_page=True)
    page.set_viewport_size({'width':480,'height':850})
    page.screenshot(path=str(Path(__file__).parent/'panel-narrow.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('#clear').click();assert page.locator('tbody tr[data-id]').count()==0
    assert not errors,errors
    browser.close()
    print('PASS: UI filter, selection, redacted clipboard, HAR download, details, clipboard fallback, narrow layout, clear; mocked DevTools API')

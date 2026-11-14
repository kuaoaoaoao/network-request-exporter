import {createCollector} from './collector.js';
const store=createCollector(chrome.devtools.network);
chrome.devtools.panels.create('请求导出','','panel.html',panel=>{
  panel.onShown.addListener(win=>{
    win.exportStore=store;
    win.dispatchEvent(new Event('export-store-ready'));
  });
});

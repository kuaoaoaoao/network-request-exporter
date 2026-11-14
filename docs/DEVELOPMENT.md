# 开发与验证

## 工程入口

- `extension/devtools.js`：DevTools 隐藏页创建采集器，面板显示时共享状态。
- `extension/collector.js`：getHAR 初始记录与实时事件，按次数消除启动重叠，异步正文队列与容量管理。
- `extension/core.js`：过滤、导出范围、脱敏、可读文本及 JSON/HAR 序列化。
- `extension/panel.*`：紧凑面板、详情、复制降级和下载。
- `scripts/package.py`：可复现 ZIP，独立商店包和源码包。
- `scripts/store-assets.mjs`：用本机 Chrome 生成图标/宣传素材/合成数据界面截图。

无需 npm install。核心测试使用 Node 20+，打包和合成接口使用 Python 3。浏览器测试默认 Chrome 的 macOS 路径；其他系统可调整测试文件中的路径。素材生成器支持 `CHROME_PATH` 环境变量。

```sh
npm test
npm run package
npm run test:store
```

真实扩展验收：终端一 `python3 tests/fixture-server.py`，终端二 `node tests/real-extension-smoke.mjs`。它使用临时 Chrome 配置；需要允许本机监听和浏览器启动。`tests/browser-smoke.py` 另需 Python Playwright，使用模拟 DevTools API 验证复制降级等界面行为。

## 正文状态与格式

每条记录有 `entry`（HAR 字段）和 `body`（status/text/encoding/reason）。`ok`、`unavailable`、`timeout`、`truncated`、`omitted` 等状态区分可用、缺失、超时和额度限制。浏览器返回空串时无法进一步判断原因。

HAR 导出只有完整正文写入 `response.content.text`；不完整正文使用 `_exportBody.preview`，并保留状态与编码。base64 保留编码信息。JSON 包含逐条正文状态，可供程序读取。TXT 以段落组织请求与响应，JSON 正文尽量美化。

默认最多 2000 条、单正文 2 MiB、总正文 32 MiB，按存储文本 UTF-8 字节计算，base64 按编码后长度计算；请求头与请求负载不计入这些额度。并发 4，超时 8 秒。清空与导航使用代际保护，防止旧回调恢复记录。

## 素材生成

```sh
npm run assets
```

生成器只读取本机页面，所有请求示例为合成数据，截图呈现实际 panel.html 界面。`docs/images` 的三张截图为 1280×800；`store/promo-440x280.png` 是可选宣传图。图标为自有 SVG 渲染出的 PNG，无外部图片或字体依赖。

素材生成依赖本机 Chrome；核心测试、打包与插件运行不依赖此步骤。更新素材前确认端口 8767 未被其他任务使用。

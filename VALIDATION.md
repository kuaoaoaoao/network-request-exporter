# 验证记录

日期：2026-11-12（Asia/Shanghai）

## 已执行

- `npm test`：15 项测试通过，0 失败。覆盖过滤/范围选择、TXT/JSON/HAR 字段、脱敏及原件不变、表单、截断 JSON/multipart 省略、base64 和编码、启动去重保留次数、空/缺失/超时正文、清空及导航异步竞态、容量与并发。
- Chrome 157.0.8103.50，macOS，独立临时 profile，真实安装扩展和真实 DevTools：通过 GET/POST/500、本机合成 Authorization / 负载、UTF-8 中文响应、脱敏 HAR、通过面板按钮实际下载 JSON、清空/恢复采集及切换至 Network 后后台采集。测试脚本为 `tests/real-extension-smoke.mjs`。
- Playwright + Chrome 157，模拟 DevTools API 的界面集成：通过地址筛选、勾选范围、脱敏复制、HAR 下载、详情预览、剪贴板拒绝时手动复制弹窗、持续每 20ms 请求下自动刷新、480px 窄面板、清空。脚本为 `tests/browser-smoke.py`，桌面与窄面板截图存于 tests。
- 四个扩展 JS 文件通过 `node --check`。
- Manifest V3、引用文件存在、权限仅 clipboardWrite 已检查。
- ZIP 由 `scripts/package.py` 构建并完成完整性检查；压缩包内扩展文件与源文件逐一比对。
- 独立只读代码审查已完成。发现的截断 JSON/multipart 脱敏和连续请求刷新问题均先复现失败，再修复并通过回归；HAR 截断二进制预览补充 encoding 元数据。

## 测试范围

真实测试使用本机合成接口，不接触用户网站和账号。Edge 使用相同 Chromium 扩展接口设计，但未在 Edge 中实测；也未穷举全部 Chrome 版本、第三方业务网站、缓存策略和流式内容。

自动化不会把 Console 历史、WebSocket 帧、未完成 SSE 作为已支持能力。浏览器没有提供的数据无法补造，正文状态在界面和导出中注明。

## 复跑

插件本身无需依赖。核心测试：`npm test`。浏览器脚本需本机 Chrome；界面脚本另需 Python Playwright。

终端一：

```sh
python3 tests/fixture-server.py
```

终端二：

```sh
node tests/real-extension-smoke.mjs
python3 tests/browser-smoke.py
```

自动化仅使用临时 Chrome 配置，真实测试加载本地扩展；不会把扩展安装进用户日常配置。测试脚本中的 Chrome 可执行文件路径适用于 macOS，其他系统需调整。

## 1.0.1 紧凑布局复验（2026-11-14）

- 15 项核心测试通过；采集与导出逻辑未改动。
- Chrome 157.0.8103.52 中真实加载扩展，验证 GET/POST/500、请求头/负载/中文正文、脱敏 HAR、实际 JSON 下载、清空恢复和隐藏面板采集通过。
- 实测浏览器窗口宽度 1200px 和 480px：顶部操作栏靠上，标题及说明在请求列表下方；Console、WebSocket、复制 cURL 三个预留按钮均不可点击且标注预留；面板本身无横向溢出，表格可独立横向滚动。
- 视觉检查了 tests/panel-compact-desktop.png 与 tests/panel-compact-narrow.png；截图为真实 DevTools。
- npm 与 manifest 版本同步更新为 1.0.1，重新生成 ZIP。

## 1.0.2 发布材料验证（2026-11-14）

- 15 项核心测试通过；新增 4 项发布契约检查，覆盖商店 ZIP 根目录/运行文件范围、16/32/48/128 PNG 图标、完整源码包和私有执行记录排除、文档相对链接、截图尺寸、隐私页面及版本一致性。
- 素材由本机 Chrome 生成：三张实际 panel 界面截图 1280×800、banner 1280×480、宣传图 440×280，均使用合成数据；已做视觉检查。
- 商店 ZIP、源码 ZIP 与本地安装 ZIP 分离；默认 MIT 许可证。隐私页面从 PRIVACY.md 同源生成。
- GitHub Actions 仅提供配置；尚未创建远程仓库，未在 GitHub 运行、启用 Pages 或提交商店审核。Chrome 157.0.8103.52 真实安装 1.0.2 复验通过：GET/POST/500、请求头/负载/中文正文、脱敏 HAR、实际 JSON 下载、清空恢复、隐藏面板采集及紧凑布局。

- 新读者检查已完成，区分源码包与本地安装包加载目录的中英文说明已补齐。
- 源码 ZIP 解压到独立临时目录后，可独立通过 npm test、重新打包和发布契约检查，无需父工作区文件。

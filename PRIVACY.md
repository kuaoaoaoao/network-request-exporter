# 隐私政策 / Privacy Policy

生效日期 / Effective date：2026-11-14

适用产品：请求导出 · Network Request Exporter（浏览器扩展）。

## 处理哪些数据

当用户打开网页的开发者工具（F12）时，扩展通过浏览器 DevTools 网络接口读取当前可用及后续完成的网络请求。数据可能包括请求 URL、方法、查询参数、请求头、Cookie、请求负载、响应状态、响应头、响应正文及时间信息。根据被调试页面的内容，这些字段可能包含身份验证信息、个人信息或其他敏感数据。

扩展不读取完整浏览历史数据库，不采集 Console 输入历史、键盘输入或 WebSocket 消息帧。网络 URL 来自用户正在调试页面的网络记录。

## 用途与处理位置

数据仅用于向用户展示、筛选、选择、可选脱敏，以及用户主动触发的复制或文件导出。扩展在本机 DevTools 页面的内存中处理这些数据，无开发者运营的采集服务器、遥测、广告或第三方分析 SDK；不会把捕获的请求上传给开发者或第三方，也不会重放请求。

扩展不会自动向 AI 服务发送内容。用户自行把导出内容发送给他人或其他服务时，由用户选择的接收方处理该内容。

## 保存与清除

扩展不将请求记录持久化到 localStorage、Chrome Storage 或云端。清空记录会从扩展当前列表和采集存储中移除记录；如已导出或仍有当前操作持有的临时副本，不会自动撤回这些副本。关闭 DevTools 后，其页面内存释放。

用户复制的内容保留在系统剪贴板中，下载文件保留在用户选定的下载位置。用户需要自行清除剪贴板或删除文件，扩展不会自动删除它们。

## 权限与用户选择

扩展仅声明 `clipboardWrite` 权限，用于用户点击复制按钮后的写入操作。网络数据通过 DevTools 专用 API 获取，不申请 debugger、全部网站访问或浏览历史权限。

用户可以筛选请求、指定导出范围、清空记录、关闭 DevTools 或卸载扩展。脱敏默认关闭，开启后仅处理导出/预览副本。脱敏不是完整的秘密扫描器，自定义字段和自由文本仍需用户检查。

## 共享、出售及有限使用

开发者不会出售捕获的数据，不会将其用于广告、信用评估或与本产品目的无关的用途。通过 Google/Chrome API 获取的信息仅用于用户可见的网络请求查看与导出功能；其使用遵守 Chrome Web Store User Data Policy，包括 Limited Use 要求。

## 公开网站与联系方式

本项目的公开文档可托管在 GitHub Pages。访问托管页面适用托管服务自身的隐私规则，与扩展的本机采集过程分开。

如需询问本政策，请通过扩展商店的支持链接或本项目 GitHub 仓库的 Issue 联系维护者。安全问题按仓库 SECURITY.md 中的流程反馈，不要在公开 Issue 中附带真实登录凭证或敏感网络响应。

## 政策更新

如数据处理行为发生变化，将随版本更新本政策与生效日期。商店声明、产品说明与实际行为应保持一致。

## English summary

Network Request Exporter processes network requests available through DevTools when the user opens DevTools. These may include URLs, headers, cookies, authentication information, payloads, responses and timing, and may contain personal or sensitive information from the inspected page.

Data is used only for local display, filtering, selection, optional redaction and user-initiated copy or export. There is no developer-operated collection server, telemetry, advertising SDK, cloud storage or automatic transmission to AI services. Captured requests are not replayed. The extension does not read the full browsing-history database, console input history, keystrokes or WebSocket frames.

Records are held in DevTools memory, not persistent extension storage. Clearing removes them from the capture store, but cannot recall exported or already-held temporary copies. Closing DevTools releases its page memory. Users must manage downloaded files and clipboard contents themselves.

Only clipboardWrite is declared for user-initiated copy. Redaction is optional and is not a guarantee that all secrets are removed. The developer does not sell captured data or use it for advertising, credit decisions or unrelated purposes. Use of information received through Google/Chrome APIs adheres to the Chrome Web Store User Data Policy, including Limited Use requirements.

For policy questions, contact the maintainer through the support link in the store listing or this project's GitHub Issues. For security issues follow SECURITY.md; never publish real secrets. This policy will be updated if data-handling behavior changes.

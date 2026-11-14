# GitHub 开源与 Chrome Web Store 发布

此目录提供发布材料，不会自动创建仓库、部署网站或提交商店审核。仓库尚未创建，因此没有虚构的仓库地址、商店 ID 或下载量徽章。

## 先发布 GitHub 仓库

将 `dist/network-request-exporter-1.0.2-source.zip` 解压后的 `network-request-exporter` 文件夹作为一个独立仓库上传。也可使用当前工程目录，遵守 .gitignore；不要把上层包含其他项目的工作目录整体上传。

建议仓库名：`network-request-exporter`。

About 描述：

> Batch-export Chrome DevTools requests, headers, payloads and responses to text, JSON or HAR. 本机处理的网络请求批量导出工具。

建议 Topics：`chrome-extension`, `devtools`, `network`, `har`, `debugging`, `developer-tools`, `javascript`, `edge-extension`。

主 README 是中文，README.en.md 提供英文入口。LICENSE 默认 MIT（允许商用、修改和分发并保留许可声明），版权署名为项目贡献者。若你需要个人/公司署名，发布前修改 LICENSE 对应行，README 与实际许可证保持一致。

发布一个 `v1.0.2` Release，附上本地安装版 ZIP 和商店版 ZIP；Release notes 可用 CHANGELOG 对应段落。GitHub 自动生成的源码 ZIP 也能安装，只需选择其中的 extension 文件夹。

启用 GitHub 仓库的 Private vulnerability reporting；功能入口见仓库 Settings/Security 相关设置。贡献与安全文档不含虚构邮箱或响应时效承诺。

## 让项目容易被找到

- 在 About 放清楚用途和 Topics；仓库名、第一段和截图都围绕“批量提取网络请求”这一件事。
- 先展示实际功能，再说明安装；把可复现例子、已知限制和 Issue 模板保留完整。
- 发布时用合成数据演示“多个请求 → 勾选 → 一份文本”，比堆关键词更容易说明价值。
- 可把 README banner 用作 GitHub Social Preview；社交预览最佳尺寸可能随平台调整，当前 banner 为 1280×480，必要时在上传界面裁切。
- 不宣称官方推荐、虚构星标或用户数；Star 由使用价值和持续维护积累，材料本身不保证增长。

## 发布隐私政策网页

GitHub 仓库 Settings → Pages → Source 选择 Deploy from a branch → 选择已存在的主分支（如 main）和 `/docs` → Save。

发布后以 GitHub Pages 显示的真实地址为准。项目页通常形如：

```text
https://你的用户名.github.io/你的仓库名/
https://你的用户名.github.io/你的仓库名/privacy/
```

第二个地址是填入 Chrome Web Store 的隐私政策链接；请打开验证能匿名访问后再填写。页面由 PRIVACY.md 生成，更新政策后运行 `python3 scripts/render-privacy.py`。不要把本模板地址原样提交。公开文档页面不会托管或读取你的请求导出文件。

## 生成并核对商店上传包

```sh
npm test
npm run package
npm run test:store
```

上传 `dist/network-request-exporter-1.0.2-store.zip`，不要使用本地安装版或源码版。商店包的 `manifest.json` 和图标位于根目录，没有套一层工程文件夹，也不包含测试、文档或宣传 HTML。

## 后台字段对应材料

- 名称、简介、详细介绍：`listing.zh-CN.txt`；英文介绍：`listing.en.txt`。英文介绍明确当前 UI 是中文。
- 类别：按后台现有分类选择最贴近开发者工具/生产力的类别。
- 图标：扩展内 `extension/icons/icon128.png`；另有 16/32/48 图标。
- 至少一张截图：`docs/images/screenshot-overview.png`（1280×800）；另两张展示选择范围和脱敏。全部是实际 panel 界面与合成数据。
- 可选宣传图：`store/promo-440x280.png`。正式要求以后台与官方图片文档为准。
- 主页：发布后的实际 GitHub Pages 首页；支持链接：实际 GitHub 仓库 Issue 页面；隐私政策：实际 Pages `/privacy/` 页面。
- 测试说明：`review-instructions.txt`；无需账号、登录或付费网站。

## Privacy practices 可填写内容

**Single purpose / 单一用途**

> 在开发者工具中查看并批量导出当前调试网页的网络请求，包括请求头、负载与响应正文，供用户本地调试、复制和保存。

**clipboardWrite 权限说明**

> 仅在用户点击“复制文本”后，将所选请求的导出文本写入系统剪贴板。扩展不读取剪贴板。

**Remote code**：选择不使用远程代码；运行逻辑和图片均在扩展包内，不加载远程脚本。

**数据使用说明**

> 扩展通过 DevTools API 访问被调试页面的网络 URL、请求/响应头、Cookie、负载、响应正文和时间信息，其中可能包含身份验证和个人敏感数据。数据仅在本机 DevTools 内存中用于查看、过滤、可选脱敏和用户主动复制/下载，不发送给开发者或第三方，不出售、不用于广告或信用评估。用户自行分享导出文件是其主动选择。关闭 DevTools 后内存记录释放，已导出文件及剪贴板由用户管理。

后台数据类别必须按届时界面定义与实际行为逐项填写：应核对网络 URL/浏览活动、网站内容、身份验证信息，以及被查看请求可能包含的个人或其他敏感信息。不要把“没有上传给开发者”写成“不读取、不处理任何用户数据”。官方明确仅在本机处理也需要披露数据处理。隐私政策、商店声明和实现保持一致。

## 最后一步由发布者完成

注册开发者账号、支付费用、邮箱/身份等后台要求的验证、开启两步验证、确认分发地区和最终声明，然后上传并提交审核。上架结果与审核时间由 Google 决定。本材料没有执行任何付款、外部发布或提交。

## 官方依据

- [准备扩展与 ZIP 根目录](https://developer.chrome.com/docs/webstore/prepare)
- [发布流程](https://developer.chrome.com/docs/webstore/publish)
- [图片要求](https://developer.chrome.com/docs/webstore/images)
- [隐私字段](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [本机处理也需披露的数据 FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [GitHub Pages 发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

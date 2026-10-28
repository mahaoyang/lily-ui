# 来源与拆分记录

迁入的是本机工作区快照，不修改源项目，不保证与其未来更新自动同步。代码与外观一起迁入，后端通过原有接口连接。

| 来源 | 无头实现 | 浏览器适配 | 外观 |
| --- | --- | --- | --- |
| 原 Lily UI src/machines | controls：accordion、tabs、dialog 状态；修正重名方法和空列表边界 | 移除全局注册与 DOM 副作用 | 旧外观、演示与构建产物已删除 |
| fox-cli/public | headless/fox；headless/index 保留包级兼容导出 | 原客户端支持注入 fetch/EventSource | themes/fox |
| ipqcheck/public/ipq | diagnostics/ip、scoring、leaks | ipq-transport、ipq-media、ipq-fingerprint | ui/ipqcheck 路由；adapters/browser/diagnostics/runtime 组装 |
| ipqcheck/public/main.js | browser/authenticity、leaks/dns、session | scan-signals、dns | 页面渲染、导航、状态提示及扫描结果展示仍在 main.js |
| ipqcheck/public/tools | diagnostics/network、text、browser/report | llm-browser、reachability | 表单、翻译、地区名称格式化 |
| ai-flow/src/workflows/controllers | workflow/graph、workflow/runtime、workflow/persistence | workflow/page-state、workflow/task-codec | 画布、文件选择、节点面板和业务 UI 控制器 |
| ai-flow/src/workflows/audio | audio/spectrum-dsp、spectrum-processing | spectrum-worker | 音频节点交互 |
| ai-flow/src/shared | workflow/runtime（task-name、job-events）；audio（mix-options、mix-weights） | SSE 由浏览器适配器注入 | 下拉、旋钮、UI 辅助 |
| FinPriBrowser/.../console/data | browser-manager/client | 401 由浏览器适配器跳转 | adapters/browser/browser-manager/client 是组装入口 |
| FinPriBrowser/.../console/lib | browser-manager/proxy、runtime、geo-options、region-options | appearance、select 等保留在 ui/finpri | 控件、格式化消息、图标、动画 |

## 主题范围

- AI Flow：仅浅色拟物。移除深色偏好监听、切换按钮、深色覆盖，CSS 的 light-dark 保留浅色表达式。使用源码入口，避免旧 bundle 绕过新的分层。
- FinPriBrowser：保留现有 light/dark/system 外观、CSS 分层、Tom Select、GSAP、图标和浏览器 playground 资源。
- ipqcheck：保留六个 LLM 页、四个社媒页、IP 基准、浏览器指纹、工具与多语言；评分版本保持原值，浏览器检测仍测访问者出口。

## 运行边界

源项目后端、数据库、推理模型、浏览器引擎及桌面发行包不属于此次 UI 提取。FinPri 的硬件策略版本检查、认证行为和同源 API 契约保持；不兼容的旧服务仍拒绝保存保护设置。

ipqcheck 服务端动态文章继续代理原后端；完整真实检测要求外网和运行中的 DNS 泄漏服务。浏览器原有不同用途的 WebRTC 采样不强行合并，避免改变传输探测和公共出口检测的判定语义。

把数据与控件连接的页面控制器位于 `ui/<应用>`，CSS 与视觉资源位于 `themes/<主题>`，应用入口负责组合两者。独立可复用的纯规则、图/DSP、来源客户端与批次生命周期已移入无头层。

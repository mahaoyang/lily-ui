# Lily UI

从本机 Fox、ipqcheck、AI Flow 和 FinPriBrowser 提取的前端与无头能力库。原 Lily UI 仅保留提纯后的无头控件状态，旧外观和归档已移除。原生 ES 模块，Node.js 22+，开发、构建和单元测试无需安装依赖。

## 运行

每次选择一个应用，各自连接原项目后端。默认 UI 地址为 http://127.0.0.1:4173；多开时使用不同 `PORT`。

| 应用 | 命令 | 后端配置 | 默认后端 |
| --- | --- | --- | --- |
| Fox | `npm run dev:fox`（或 `npm run dev`） | `FOX_BACKEND_URL` | `http://127.0.0.1:4177` |
| ipqcheck | `npm run dev:ipqcheck` | `IPQCHECK_BACKEND_URL` | `http://127.0.0.1:8787` |
| AI Flow | `npm run dev:ai-flow` | `AI_FLOW_BACKEND_URL` | `http://127.0.0.1:4174` |
| FinPriBrowser | `npm run dev:finpri` | `FINPRI_BACKEND_URL` | `http://127.0.0.1:3189` |

```bash
IPQCHECK_BACKEND_URL=http://127.0.0.1:8787 PORT=4180 npm run dev:ipqcheck
AI_FLOW_BACKEND_URL=http://127.0.0.1:4174 npm run dev:ai-flow
npm run verify  # 模块检查、测试、构建
```

AI Flow 原后端默认也是 4173，可用 `AI_FLOW_PORT=4174 python3 web_server.py` 在原项目启动，或设置本仓库的 UI `PORT` 和后端 URL。Fox、ipqcheck、FinPriBrowser 分别在原项目启动 `npm start`、`npm start`、`npm run ui`。开发服务代理当前应用的 `/api/*`（含 SSE）和 `/auth`，不会把几个应用的同名 API 混到一起。未启动后端时 API 返回 502。

## 分层与分类

```text
src/
  headless/
    fox/                      配置、模型、用量、代理、协议事件、资源状态
    diagnostics/
      ip/                     归一化、IP 情报来源、IP 检测聚合
      browser/                浏览器真实性与出口一致性
      leaks/                  DNS 泄漏流程、传输与泄漏判定
      scoring/                风险评分、LLM 策略与地区规则
      network/                HTTP 连通计时、DNS 查询与结果统计
      session/                检测批次、订阅、刷新隔离、取消
    workflow/
      graph/                  图调度、复合节点、循环、重试与编辑状态
      runtime/                任务池、任务命名、运行时客户端、SSE
      persistence/            工作流输入持久化与编码注入契约
    audio/                    频谱/DSP、预览处理、音色混合规则
    browser-manager/          API 客户端、代理链接、运行环境、地区/语言数据
    controls/                 折叠面板、标签页、弹窗状态
    text/                     字数与字符统计
    color/                    OKLCH 转换与格式化
  adapters/browser/
    diagnostics/              WebRTC、HTTP3、指纹、DNS 与连通采集
    workflow/                 页面偏好存储、任务文件编码与读取
    audio/                    频谱 Worker 适配
  ui/<应用>/                 DOM 组件、页面交互、模板、多语言
  themes/<主题>/             CSS、视觉资源、统一 OKLCH 语义色
  themes/shared/             跨主题状态色与焦点色
  apps/<应用>/               页面入口、UI 与主题组合
```

无头层不导入主题或浏览器适配器；请求、存储及环境采集通过参数注入，评分返回原因码，由 UI 翻译并渲染。领域独立导出，浏览器采集归适配器。表单、弹窗、布局和页面控制器位于 UI；主题只提供外观，应用入口组合两者。OKLCH 计算位于 `headless/color`，共享视觉角色位于 `themes/shared/colors.css`。AI Flow 只保留浅色，移除了深色切换、深色覆盖和 `light-dark()` 的深色分支。

```js
import { createDiagnosticSession } from './src/headless/diagnostics/session/index.js';
import { computeLlmIpScores } from './src/headless/diagnostics/scoring/index.js';
import { compileGraph } from './src/headless/workflow/graph/index.js';
import { createBrowserManagerClient } from './src/headless/browser-manager/index.js';

const session = createDiagnosticSession({ checks: { ip: injectedIpCheck } });
const unsubscribe = session.subscribe(snapshot => console.log(snapshot));
await session.run({ stack: 'auto' });
// 切页读取快照和重新评分；刷新才调用 run()。旧批次不能覆盖新批次。
unsubscribe();
session.dispose();
```

`src/headless/index.js` 保留 Fox 包级兼容导出；实现统一位于领域目录，原平铺文件与主题内的纯转发文件已删除。内部引用直接指向实现，新的外部调用使用各领域子入口。`createClient`、IP 来源工厂和 FinPri 客户端支持注入传输；`createWorkflowStorage`、`createTaskRuntimeClient` 注入文件编码/解码；`createTaskPool` 和 `createDiagnosticSession` 每次创建独立状态。没有为了目录对称建立空的共享 core；未来只抽取经过验证的共同契约。

## 构建与部署

`npm run build` 生成四个独立站点：Fox 的 `dist/`，以及 `dist/ipqcheck/`、`dist/ai-flow/`、`dist/finpri/`。**每个目录分别作为独立域名/端口的站点根目录**，不能把另外三个当成 Fox 的子路径直接挂载。绝对资源 URL 和 API 仍沿用上游应用契约。

部署时分别反向代理 `/api/*` 至对应后端，SSE 关闭代理缓冲。FinPriBrowser 还需代理 `/auth`。ipqcheck 的检测页深层链接回退至应用 HTML；无扩展名 `/methodology/*`、`/guides/*` 的本地化/SEO 文章由原后端生成，开发服务已代理，静态部署也需相同规则。该仓库没有迁入文章服务端生成器。

## 验证与来源

`npm test` 覆盖 Fox 回归、IP 归一化/风险/六平台策略、浏览器一致性、DNS 流程、批次刷新与取消、工作流图/循环/重试、音频 DSP、代理编码及客户端兼容检查。浏览器冒烟检查使用模拟后端响应验证页面加载、深层链接、弹窗及窄屏；真实 IP/WebRTC、音频推理、隐私内核启动需连接原后端及对应运行环境验证。

来源是 `../fox-cli/public`、`../ipqcheck/public`、`../ai-flow/src` 和 `../FinPriBrowser/src/apps/ui/public` 当前工作区。源项目未改动；未复制后端、Electron 壳、私钥、环境变量或运行数据库。各项目可用的 LICENSE/NOTICE 和第三方资源许可证随主题保留，分拆模块的来源见 [迁移记录](docs/source-migrations.md)。

模块职责、依赖规则和维护约定见 [模块规范](docs/modules.md)。`npm run check` 检查语法、本地依赖、包导出及分层；`npm run verify` 完成检查、测试与构建。每个构建站点只携带自身主题。

外部项目借鉴本项目时，复制所需代码到外部项目后再修改；不要为外部项目需求改动本项目代码。详细维护约定见模块规范。

原 Lily UI 的 MIT 授权保留在根目录 LICENSE。

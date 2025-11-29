# Repository Guidelines

## Project Structure & Module Organization
- `src/input.css`: Tailwind 入口；base/components/utilities 分层。
- `src/machines/`: 组件状态机（TS），每组件一工厂（如 `tabs.ts`）。
- `tailwind.config.ts`: Radix 令牌源，编译为 `tailwind.config.js`（生成物）；勿改生成物。
- `dist/output.css`: 构建产物；不手改。
- `public/index.html`: 演示/验证页，可附示例。
- `public/playground/`: 组件示例目录（子页面按组件拆分，如 `switch.html`）；`public/playground/index.html` 为入口导航。
- `node_modules/@radix-ui/themes/tokens`: 上游令牌，只读。
- 额外示例可放在 `public` 下独立 HTML，便于视觉回归。

## Build, Test, and Development Commands
- `bun install`: 安装依赖。
- `bun dev`: 编译配置 + Tailwind watch，输出 `dist/output.css`。
- `bun run build`: 一次性构建并压缩；提交前跑。
- `bun run build:config`: 单独生成 CJS（dev/build 已包含）。
- 一键开发：`./dev.sh`（或 `bun run dev:all` / `bash scripts/dev.sh`），同时 watch 状态机 + Tailwind，并在仓库根开静态服务（默认端口 4173）。
- 验证：访问 `http://localhost:4173/playground.html`（跳转到 `/public/playground/index.html`）查看目录，再进入各组件示例；或直接打开 `public/index.html`。

## Coding Style & Naming Conventions
- TypeScript ESM，2 空格，偏好 `const` + 箭头函数；状态机用工厂返回普通对象供 Alpine `x-data`。
- Tailwind 优先，少写魔法值；令牌 key 小写连字符（`space-3`, `blue-9`, `radius-2`）。
- 生成文件（`dist/output.css`, `tailwind.config.cjs`）不提交手改。

## 组件状态机 & Alpine 集成
- Logic-View 分离：逻辑在 `src/machines/*.ts`，HTML 用 `x-bind`。
- 工厂签名：`export default (config = {}) => ({ state, actions, propGetters })`；prop getter 返回 Alpine 友好键（`@click`, `@keydown.space.prevent`, `x-show`, `role` 等）。
- 注册示例：`import Alpine from 'alpinejs'; import createTabs from './machines/tabs'; Alpine.data('tabs', createTabs); Alpine.start();`
- 关注焦点回退、外部点击、滚动锁定：在 `init()`/`destroy()` 或动作内用 DOM API、`@click.outside` 处理。
- 常用命名：`triggerProps`, `contentProps`；内置 ARIA 与键盘交互，保持 HTML 干净。
- 文件命名保持 kebab-case，并与 Alpine `x-data` 名称对应，便于复用。
- 色彩系统基于 Radix 变量：父级 `.dark/.dark-theme` 切暗色；用 `[data-accent-color="blue"]` 或 `.accent-blue` 等切换 accent，类如 `bg-accent-9` 自动跟随。Tailwind 原生 dark 模式已关闭。

## Testing Guidelines
- 暂无自动化；确保 `bun run build` 通过且无报错。
- 在 `public/index.html` 手动查视觉、ARIA、键盘交互。
- 若写 JS 测试，命名 `<name>.test.ts` 以备未来 `bun test`。

## Commit & Pull Request Guidelines
- Conventional Commits（`feat:`, `chore:`, `fix:`），粒度小。
- 描述说明调整令牌、配置或状态机的原因。
- PR 附摘要、关联 issue（如有）、`bun run build` 结果，以及更新示例截图/录屏。

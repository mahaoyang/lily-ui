# Repository Guidelines

## 项目结构与模块
- 源码：`src/machines/*.ts` 存放组件状态机（逻辑层，Alpine 可直接 `x-data="machine()"` 使用）。`src/input.css` 生成全局样式与 Radix 主题变量。
- 产物：`public/machines/*.js` 为打包后的浏览器端状态机；`dist/output.css` 为 Tailwind 编译结果。
- Playground：`public/playground/*.html` 按组件拆页，`public/playground/index.html` 为目录。静态资源直接走 `public`。
- 设计原则：遵循 notice.txt 的 “Logic-View Separation”。逻辑文件提供 prop getters（ARIA、事件、class），HTML 只负责绑定。

## 构建、调试与预览
- 本地开发（监听样式 + 状态机）：`bun run dev:all`（执行 `scripts/dev.sh`，并行跑 Tailwind 与机器打包）。
- 单独看样式：`bun run dev`；单独看状态机：`bun run dev:machines`。
- 生产构建：`bun run build`（含 `build:config` + Tailwind 压缩）；仅重新打包状态机：`bun run build:machines`。
- Playground 预览：构建后可 `bunx serve public` 或 `python -m http.server 8000`，然后打开 `/public/playground/*.html`。

## 代码风格与命名
- TypeScript 逻辑：保持纯函数/闭包工厂，返回 `state + actions + prop getters`。变量/方法用 `camelCase`，配置接口以 `Config` 结尾。
- HTML 层：使用 `x-bind="...Props()"` 挂载，避免内联逻辑；Class 以 Tailwind 原子类组合，允许主题/Accent 透传（不要封死样式）。
- 样式：Tailwind 4 + Radix 色板，accent 通过 `data-accent-color` 或 `.accent-*` 切换；暗黑靠 `dark` 类切换。使用 1px 边框、无多余阴影的扁平风格。

## 测试与验证
- 目前未写自动化测试；新增状态机时至少自测：键盘可达性（Enter/Space）、ARIA `aria-*`/`role` 是否随状态同步，禁用态是否阻断事件。
- 如需脚本化测试，优先用 Bun（`bun test`）并放在 `tests/` 目录，数据依赖放 `public/fixtures`。

## 提交与变更流程
- 提交信息沿用本仓库历史风格：`feat|fix|chore|docs: 描述`（例：`chore: add component machines and playground`）。
- PR/合并说明应包含：变更范围要点、影响的 Playground 页面、验证方式（命令行输出或截图），以及是否需要重新跑 `build:machines`/`build`。

## 安全与配置
- Tailwind 配置由 `tailwind.config.ts` 动态生成颜色变量，会覆盖默认色板；如改主题记得同步跑 `bun run build:config`。
- 公共页面默认走静态服务，不依赖 Node SSR；避免在浏览器端暴露私有 Token/接口地址。***

# Lily UI / Tailwindix

基于 Tailwind v4 + Radix 令牌的 Alpine 组件实验库，遵循 notice.txt 的「Logic-View Separation」：状态机写在 `src/machines/*.ts`，HTML 只做绑定。

## 结构
- `src/input.css`：Tailwind 入口（含 Radix token 与主题变量）→ `dist/output.css`
- `src/machines/*.ts`：组件状态机，打包到 `public/machines/*.js`
- `public/playground/*.html`：按组件拆分的 Playground，`public/playground/index.html` 为目录

## 开发
```bash
bun install
# 同时监听状态机 + 样式并启动静态服务（http://localhost:4173/playground.html）
bun run dev:all

# 仅样式 watch
bun dev
# 仅状态机 watch
bun run dev:machines
```

## 构建
```bash
# 全量（生成 tailwind.config.js + 压缩 CSS）
bun run build
# 仅打包状态机
bun run build:machines
# 仅生成 Tailwind 配置（Radix 颜色变量）
bun run build:config
```

## 预览
构建后可 `bunx serve public` 或 `python -m http.server 8000`，然后访问 `/playground/*.html`。默认 accent 可通过 `data-accent-color` 或 `.accent-*` 切换，暗色模式用 `.dark`。

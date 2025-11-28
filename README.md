# Lily UI / Tailwindix (Reset)

项目已重置，仅保留 Tailwind 4 基础构建。

结构：
- `src/input.css`: Tailwind 入口（默认仅 `@import "tailwindcss"`）
- `dist/output.css`: 编译产物
- `public/index.html`: 简单验证页

脚本：
- `bun dev`：监听编译 CSS
- `bun run build`：一次性编译并压缩

使用：
```bash
bun install
bun dev   # 或 bun run build
```

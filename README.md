# Lily UI

> **Write Once (Lit), Run Everywhere (Native Custom Elements)**

## 包管理器

**本项目使用 Bun 作为包管理器和运行时。**

```bash
# 安装依赖
bun install

# 构建
bun run build
```

> **禁止使用 npm / yarn / pnpm**
>
> 本项目使用 Bun Workspaces 管理 monorepo，依赖解析和锁文件格式与 npm 不兼容。
> 使用 npm 会导致依赖安装失败或版本不一致。

## 设计理念

### 策略核心

**Write Once (Lit), Run Everywhere (Native Custom Elements)**

基于 Lit 构建原生 Custom Elements，通过适配层支持 React、Vue 等主流框架，一次编写，处处运行。

### 隔离策略

**Light DOM + BEM 命名空间 + CSS Layers**

- **Light DOM**：不使用 Shadow Root，组件结构在 DOM 树中一目了然，便于调试，完美兼容 Tailwind CSS
- **BEM 命名空间**：所有类名以 `lily-` 为前缀，避免样式冲突
- **CSS Layers**：使用 `@layer lily-ui` 包裹框架样式，用户样式可直接覆盖，无需 `!important`

### 项目结构

```
lily-ui/
├── packages/
│   ├── core/       # Lit 核心组件
│   ├── react/      # React 适配层
│   └── vue/        # Vue 适配层
└── examples/
    ├── react-app/
    └── vue-app/
```

## 开发

```bash
# 安装依赖
bun install

# 构建 core 包
bun run --filter @lily-ui/core build

# 构建所有包
bun run --filter './packages/*' build
```

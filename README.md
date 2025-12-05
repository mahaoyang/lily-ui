# Lily UI

A component library based on [Radix Themes](https://radix-ui.com/themes) design tokens, reimplemented with **Alpine.js** and **Tailwind CSS**.

## Features

- **Alpine.js** for lightweight interactivity
- **Tailwind CSS v4** for styling
- **Radix Themes** design tokens (colors, spacing, typography, shadows)
- **State machines** for complex component logic
- **Accessible** components following WAI-ARIA patterns

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js

### Installation

```bash
bun install
```

### Development

Start the development server with hot reload:

```bash
bun run dev:all
```

This will:
- Build and watch TypeScript state machines
- Build and watch Tailwind CSS
- Start a local server at http://localhost:4173/public/playground/

### Build

Build for production:

```bash
bun run build
```

## Project Structure

```
lily-ui/
├── public/
│   ├── playground/     # Component demos
│   │   ├── index.html  # Component directory
│   │   ├── button.html
│   │   ├── dialog.html
│   │   └── ...
│   └── machines/       # Compiled JS state machines
├── src/
│   ├── input.css       # Tailwind entry point
│   ├── styles/
│   │   └── tokens/     # Radix design tokens
│   └── machines/       # TypeScript state machines
├── dist/
│   └── output.css      # Compiled CSS
├── scripts/
│   └── dev.sh          # Development script
├── tailwind.config.ts  # Tailwind configuration
└── package.json
```

## Components

### Layout
- Box, Flex, Grid, Container

### Typography
- Text, Heading, Code

### Forms
- Button, Checkbox, Switch, TextField, Select, Slider

### Feedback
- Badge, Callout, Progress, Spinner

### Overlay
- Dialog, AlertDialog, DropdownMenu, Popover, Tooltip, HoverCard

### Navigation
- Tabs, Accordion

### Data Display
- Avatar, Card, Table, Separator

## Design Tokens

This library uses Radix Themes design tokens, providing:

- **12-step color scales** for consistent color usage
- **9-step spacing scale** for layout
- **9-step typography scale** for text
- **6-step shadow scale** for elevation
- **6-step radius scale** for borders

## License

MIT - Based on [Radix Themes](https://github.com/radix-ui/themes) by WorkOS.

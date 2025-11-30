const fs = require("fs");
const path = require("path");

const scaling = 1;
const radiusFactor = 1;
const radixTokenRoot = path.join(process.cwd(), "node_modules", "@radix-ui", "themes", "tokens");

function parseVarBlock(block) {
  if (!block) return {};
  const vars = {};
  const regex = /--([\w-]+):\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(block)) !== null) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function resolveCalc(value) {
  return value
    .replace(/var\(--scaling\)/g, scaling.toString())
    .replace(/var\(--radius-factor\)/g, radiusFactor.toString());
}

const baseCss = fs.readFileSync(path.join(radixTokenRoot, "base.css"), "utf8");
const vars = parseVarBlock(baseCss);

// Radix font-size-N to Tailwind text-* mapping
// Custom: 4xs=8px, 3xs=10px
// Radix: 1=12px, 2=14px, 3=16px, 4=18px, 5=20px, 6=24px, 7=28px, 8=35px, 9=60px
const textSizeMap = {
  "1": "2xs",   // 12px
  "2": "xs",    // 14px
  "3": "sm",    // 16px
  "4": "base",  // 18px
  "5": "lg",    // 20px
  "6": "xl",    // 24px
  "7": "2xl",   // 28px
  "8": "3xl",   // 35px
  "9": "4xl",   // 60px (changed from 5xl)
};

let themeContent = "@theme {\n";

// ============================================
// Base Radix variables (for direct reference)
// ============================================

// Spacing (--space-1 through --space-9)
Object.entries(vars)
  .filter(([key]) => key.startsWith("space-"))
  .forEach(([key, value]) => {
    themeContent += "  --" + key + ": " + resolveCalc(value) + ";\n";
  });

// Font sizes (--font-size-1 through --font-size-9)
Object.entries(vars)
  .filter(([key]) => key.startsWith("font-size-"))
  .forEach(([key, value]) => {
    themeContent += "  --" + key + ": " + resolveCalc(value) + ";\n";
  });

// Line heights (--line-height-1 through --line-height-9)
Object.entries(vars)
  .filter(([key]) => key.startsWith("line-height-"))
  .forEach(([key, value]) => {
    themeContent += "  --" + key + ": " + resolveCalc(value) + ";\n";
  });

// Letter spacing (--letter-spacing-1 through --letter-spacing-9)
Object.entries(vars)
  .filter(([key]) => key.startsWith("letter-spacing-"))
  .forEach(([key, value]) => {
    themeContent += "  --" + key + ": " + value + ";\n";
  });

// Border radius (--radius-1 through --radius-6, --radius-full, --radius-thumb)
Object.entries(vars)
  .filter(([key]) => key.startsWith("radius-"))
  .forEach(([key, value]) => {
    themeContent += "  --" + key + ": " + resolveCalc(value) + ";\n";
  });

// Font weight
Object.entries(vars)
  .filter(([key]) => key.startsWith("font-weight-"))
  .forEach(([key, value]) => {
    themeContent += "  --" + key + ": " + value + ";\n";
  });

themeContent += "\n";

// ============================================
// Tailwind theme variables (reference Radix vars)
// ============================================

themeContent += "  /* Tailwind spacing -> Radix space */\n";
for (let i = 1; i <= 9; i++) {
  themeContent += "  --spacing-" + i + ": var(--space-" + i + ");\n";
}

themeContent += "\n  /* Tailwind text sizes -> Radix font sizes */\n";

// Custom small sizes (not in Radix)
themeContent += "  /* Custom small sizes */\n";
themeContent += "  --text-4xs: 8px;\n";
themeContent += "  --text-4xs--line-height: 12px;\n";
themeContent += "  --text-4xs--letter-spacing: 0.005em;\n";
themeContent += "  --text-3xs: 10px;\n";
themeContent += "  --text-3xs--line-height: 14px;\n";
themeContent += "  --text-3xs--letter-spacing: 0.004em;\n";

// Radix-based sizes
Object.entries(textSizeMap).forEach(([radixNum, twName]) => {
  themeContent += "  --text-" + twName + ": var(--font-size-" + radixNum + ");\n";
  themeContent += "  --text-" + twName + "--line-height: var(--line-height-" + radixNum + ");\n";
  themeContent += "  --text-" + twName + "--letter-spacing: var(--letter-spacing-" + radixNum + ");\n";
});

// Disable Tailwind default text sizes that we don't use
themeContent += "\n  /* Disable unused Tailwind defaults */\n";
themeContent += "  --text-5xl: initial;\n";
themeContent += "  --text-6xl: initial;\n";
themeContent += "  --text-7xl: initial;\n";
themeContent += "  --text-8xl: initial;\n";
themeContent += "  --text-9xl: initial;\n";

themeContent += "\n  /* Tailwind leading -> Radix line heights */\n";
for (let i = 1; i <= 9; i++) {
  themeContent += "  --leading-" + i + ": var(--line-height-" + i + ");\n";
}

themeContent += "\n  /* Tailwind tracking -> Radix letter spacing */\n";
for (let i = 1; i <= 9; i++) {
  themeContent += "  --tracking-" + i + ": var(--letter-spacing-" + i + ");\n";
}

themeContent += "}\n";

fs.writeFileSync(path.join(process.cwd(), "src", "radix-tokens.css"), themeContent);
console.log("Generated src/radix-tokens.css");

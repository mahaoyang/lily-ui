// tailwind.config.ts
import fs from "fs";
import path from "path";

// node_modules/tailwindcss/dist/plugin.mjs
function g(i, n) {
  return { handler: i, config: n };
}
g.withOptions = function(i, n = () => ({})) {
  function t(o) {
    return { handler: i(o), config: n(o) };
  }
  return t.__isOptionsFunction = true, t;
};
var u = g;

// tailwind.config.ts
var scaling = 1;
var radiusFactor = 1;
var radixTokenRoot = path.join(process.cwd(), "node_modules", "@radix-ui", "themes", "tokens");
function parseVarBlock(block) {
  if (!block)
    return {};
  const vars = {};
  const regex = /--([\w-]+):\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(block)) !== null) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}
function resolveCalc(value) {
  return value.replace(/var\(--scaling\)/g, scaling.toString()).replace(/var\(--radius-factor\)/g, radiusFactor.toString());
}
function loadBaseTokens() {
  const baseCss = fs.readFileSync(path.join(radixTokenRoot, "base.css"), "utf8");
  const vars = parseVarBlock(baseCss);
  const spacing = {};
  Object.entries(vars).filter(([key]) => key.startsWith("space-")).forEach(([key, value]) => {
    spacing[key.replace("space-", "")] = resolveCalc(value);
  });
  const fontSize = {};
  const lineHeights = {};
  const letterSpacing = {};
  Object.entries(vars).filter(([key]) => key.startsWith("font-size-")).forEach(([key, value]) => {
    const k = key.replace("font-size-", "");
    fontSize[k] = resolveCalc(value);
  });
  Object.entries(vars).filter(([key]) => key.startsWith("line-height-")).forEach(([key, value]) => {
    const k = key.replace("line-height-", "");
    lineHeights[k] = resolveCalc(value);
  });
  Object.entries(vars).filter(([key]) => key.startsWith("letter-spacing-")).forEach(([key, value]) => {
    const k = key.replace("letter-spacing-", "");
    letterSpacing[k] = value;
  });
  const borderRadius = {};
  Object.entries(vars).filter(([key]) => key.startsWith("radius-")).forEach(([key, value]) => {
    const k = key.replace("radius-", "");
    borderRadius[k] = resolveCalc(value);
  });
  const boxShadow = {};
  Object.entries(vars).filter(([key]) => key.startsWith("shadow-")).forEach(([key, value]) => {
    const k = key.replace("shadow-", "");
    boxShadow[k] = value;
  });
  const cursor = {};
  Object.entries(vars).filter(([key]) => key.startsWith("cursor-")).forEach(([key, value]) => {
    const k = key.replace("cursor-", "");
    cursor[k] = value;
  });
  return { spacing, fontSize, lineHeights, letterSpacing, borderRadius, boxShadow, cursor };
}
function parseColorFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lightBlock = content.match(/:root,\s*\.light,\s*\.light-theme\s*{([\s\S]*?)}/);
  const darkBlock = content.match(/\.dark,\s*\.dark-theme\s*{([\s\S]*?)}/);
  const rootBlocks = Array.from(content.matchAll(/:root\s*{([\s\S]*?)}/g));
  const light = parseVarBlock(lightBlock?.[1]);
  const dark = parseVarBlock(darkBlock?.[1]);
  const rootVars = rootBlocks.reduce((acc, match) => {
    Object.assign(acc, parseVarBlock(match[1]));
    return acc;
  }, {});
  return { light, dark, rootVars };
}
function loadRadixColorVars() {
  const colorsDir = path.join(radixTokenRoot, "colors");
  const lightVars = {};
  const darkVars = {};
  fs.readdirSync(colorsDir).forEach((file) => {
    if (!file.endsWith(".css"))
      return;
    const { light, dark, rootVars } = parseColorFile(path.join(colorsDir, file));
    Object.assign(lightVars, rootVars, light);
    Object.assign(darkVars, rootVars, dark);
  });
  return { light: lightVars, dark: darkVars };
}
function buildPaletteSuffixMap(colorVarNames) {
  const paletteMap = {};
  colorVarNames.forEach((name) => {
    const match = name.match(/^([a-zA-Z]+)-(.*)$/);
    if (!match)
      return;
    const [, palette, suffix] = match;
    if (!paletteMap[palette])
      paletteMap[palette] = new Set;
    paletteMap[palette].add(suffix);
  });
  return paletteMap;
}
function buildRadixColors(paletteSuffixMap, accentSuffixes) {
  const colors = {};
  Object.entries(paletteSuffixMap).forEach(([palette, suffixes]) => {
    colors[palette] = {};
    suffixes.forEach((suffix) => {
      colors[palette][suffix] = `var(--${palette}-${suffix})`;
    });
  });
  colors.accent = accentSuffixes.reduce((acc, suffix) => {
    acc[suffix] = `var(--accent-${suffix})`;
    return acc;
  }, {});
  colors.black = "#000000";
  colors.white = "#ffffff";
  return colors;
}
function buildAccentAliases(palette, paletteSuffixMap) {
  const suffixes = Array.from(paletteSuffixMap[palette] ?? []);
  const aliases = {};
  suffixes.forEach((suffix) => {
    aliases[`--accent-${suffix}`] = `var(--${palette}-${suffix})`;
  });
  return aliases;
}
var baseTokens = loadBaseTokens();
var colorVars = loadRadixColorVars();
var colorVarNames = Array.from(new Set([...Object.keys(colorVars.light), ...Object.keys(colorVars.dark)]));
var paletteSuffixMap = buildPaletteSuffixMap(colorVarNames);
var defaultAccent = paletteSuffixMap.iris ? "iris" : Object.keys(paletteSuffixMap)[0];
var accentSuffixes = Array.from(paletteSuffixMap[defaultAccent] ?? []);
var colors = buildRadixColors(paletteSuffixMap, accentSuffixes);
var fontSize = Object.fromEntries(Object.entries(baseTokens.fontSize).map(([k, size]) => [
  k,
  [size, { lineHeight: baseTokens.lineHeights[k], letterSpacing: baseTokens.letterSpacing[k] }]
]));
var tailwind_config_default = {
  content: ["./public/**/*.{html,js,ts,jsx,tsx}", "./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    colors,
    spacing: baseTokens.spacing,
    fontSize,
    lineHeight: baseTokens.lineHeights,
    letterSpacing: baseTokens.letterSpacing,
    borderRadius: baseTokens.borderRadius,
    boxShadow: baseTokens.boxShadow,
    cursor: baseTokens.cursor
  },
  plugins: [
    u(({ addBase }) => {
      const accentSelectors = {};
      Object.keys(paletteSuffixMap).forEach((palette) => {
        const selector = `[data-accent-color="${palette}"], .accent-${palette}`;
        accentSelectors[selector] = buildAccentAliases(palette, paletteSuffixMap);
      });
      const defaultAccentAliases = buildAccentAliases(defaultAccent, paletteSuffixMap);
      addBase({
        ":root, .light, .light-theme": { ...colorVars.light, ...defaultAccentAliases },
        ".dark, .dark-theme": { ...colorVars.light, ...colorVars.dark, ...defaultAccentAliases },
        ...accentSelectors
      });
    })
  ]
};
export {
  tailwind_config_default as default
};

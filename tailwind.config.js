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
      colors[palette][suffix] = "var(--" + palette + "-" + suffix + ")";
    });
  });
  colors.accent = accentSuffixes.reduce((acc, suffix) => {
    acc[suffix] = "var(--accent-" + suffix + ")";
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
    aliases["--accent-" + suffix] = "var(--" + palette + "-" + suffix + ")";
  });
  return aliases;
}
var colorVars = loadRadixColorVars();
var colorVarNames = Array.from(new Set([...Object.keys(colorVars.light), ...Object.keys(colorVars.dark)]));
var paletteSuffixMap = buildPaletteSuffixMap(colorVarNames);
var defaultAccent = paletteSuffixMap.iris ? "iris" : Object.keys(paletteSuffixMap)[0];
var accentSuffixes = Array.from(paletteSuffixMap[defaultAccent] ?? []);
var colors = buildRadixColors(paletteSuffixMap, accentSuffixes);
var spacing = {};
for (let i = 1;i <= 9; i++) {
  spacing[i.toString()] = "var(--spacing-" + i + ")";
}
var fontSize = {
  "4xs": ["var(--text-4xs)", { lineHeight: "var(--text-4xs--line-height)", letterSpacing: "var(--text-4xs--letter-spacing)" }],
  "3xs": ["var(--text-3xs)", { lineHeight: "var(--text-3xs--line-height)", letterSpacing: "var(--text-3xs--letter-spacing)" }],
  "2xs": ["var(--text-2xs)", { lineHeight: "var(--text-2xs--line-height)", letterSpacing: "var(--text-2xs--letter-spacing)" }],
  xs: ["var(--text-xs)", { lineHeight: "var(--text-xs--line-height)", letterSpacing: "var(--text-xs--letter-spacing)" }],
  sm: ["var(--text-sm)", { lineHeight: "var(--text-sm--line-height)", letterSpacing: "var(--text-sm--letter-spacing)" }],
  base: ["var(--text-base)", { lineHeight: "var(--text-base--line-height)", letterSpacing: "var(--text-base--letter-spacing)" }],
  lg: ["var(--text-lg)", { lineHeight: "var(--text-lg--line-height)", letterSpacing: "var(--text-lg--letter-spacing)" }],
  xl: ["var(--text-xl)", { lineHeight: "var(--text-xl--line-height)", letterSpacing: "var(--text-xl--letter-spacing)" }],
  "2xl": ["var(--text-2xl)", { lineHeight: "var(--text-2xl--line-height)", letterSpacing: "var(--text-2xl--letter-spacing)" }],
  "3xl": ["var(--text-3xl)", { lineHeight: "var(--text-3xl--line-height)", letterSpacing: "var(--text-3xl--letter-spacing)" }],
  "4xl": ["var(--text-4xl)", { lineHeight: "var(--text-4xl--line-height)", letterSpacing: "var(--text-4xl--letter-spacing)" }]
};
var lineHeight = {};
for (let i = 1;i <= 9; i++) {
  lineHeight[i.toString()] = "var(--leading-" + i + ")";
}
var letterSpacing = {};
for (let i = 1;i <= 9; i++) {
  letterSpacing[i.toString()] = "var(--tracking-" + i + ")";
}
var borderRadius = {
  "1": "var(--radius-1)",
  "2": "var(--radius-2)",
  "3": "var(--radius-3)",
  "4": "var(--radius-4)",
  "5": "var(--radius-5)",
  "6": "var(--radius-6)",
  full: "9999px",
  adaptive: "var(--radius-full)",
  thumb: "var(--radius-thumb)"
};
var tailwind_config_default = {
  content: ["./public/**/*.{html,js,ts,jsx,tsx}", "./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    colors,
    spacing,
    fontSize,
    lineHeight,
    letterSpacing,
    borderRadius
  },
  plugins: [
    u(({ addBase }) => {
      const accentSelectors = {};
      Object.keys(paletteSuffixMap).forEach((palette) => {
        const selector = '[data-accent-color="' + palette + '"], .accent-' + palette;
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

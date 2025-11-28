import fs from "fs";
import path from "path";
import type { Config } from "tailwindcss";

const scaling = 1;
const radiusFactor = 1;
const radixTokenRoot = path.join(process.cwd(), "node_modules", "@radix-ui", "themes", "tokens");

function parseVarsFromCss(content: string) {
  const section = content.split("@supports")[0];
  const vars: Record<string, string> = {};
  const regex = /--([\w-]+):\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(section)) !== null) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function resolveCalc(value: string) {
  return value
    .replace(/var\(--scaling\)/g, scaling.toString())
    .replace(/var\(--radius-factor\)/g, radiusFactor.toString());
}

function loadBaseTokens() {
  const baseCss = fs.readFileSync(path.join(radixTokenRoot, "base.css"), "utf8");
  const vars = parseVarsFromCss(baseCss);

  const spacing: Record<string, string> = {};
  Object.entries(vars)
    .filter(([key]) => key.startsWith("space-"))
    .forEach(([key, value]) => {
      spacing[key.replace("space-", "")] = resolveCalc(value);
    });

  const fontSize: Record<string, string> = {};
  const lineHeights: Record<string, string> = {};
  const letterSpacing: Record<string, string> = {};

  Object.entries(vars)
    .filter(([key]) => key.startsWith("font-size-"))
    .forEach(([key, value]) => {
      const k = key.replace("font-size-", "");
      fontSize[k] = resolveCalc(value);
    });

  Object.entries(vars)
    .filter(([key]) => key.startsWith("line-height-"))
    .forEach(([key, value]) => {
      const k = key.replace("line-height-", "");
      lineHeights[k] = resolveCalc(value);
    });

  Object.entries(vars)
    .filter(([key]) => key.startsWith("letter-spacing-"))
    .forEach(([key, value]) => {
      const k = key.replace("letter-spacing-", "");
      letterSpacing[k] = value;
    });

  const borderRadius: Record<string, string> = {};
  Object.entries(vars)
    .filter(([key]) => key.startsWith("radius-"))
    .forEach(([key, value]) => {
      const k = key.replace("radius-", "");
      borderRadius[k] = resolveCalc(value);
    });

  const boxShadow: Record<string, string> = {};
  Object.entries(vars)
    .filter(([key]) => key.startsWith("shadow-"))
    .forEach(([key, value]) => {
      const k = key.replace("shadow-", "");
      boxShadow[k] = value;
    });

  const cursor: Record<string, string> = {};
  Object.entries(vars)
    .filter(([key]) => key.startsWith("cursor-"))
    .forEach(([key, value]) => {
      const k = key.replace("cursor-", "");
      cursor[k] = value;
    });

  return { spacing, fontSize, lineHeights, letterSpacing, borderRadius, boxShadow, cursor };
}

function loadRadixColors() {
  const colorsDir = path.join(radixTokenRoot, "colors");
  const colors: Record<string, Record<string, string> | string> = {};

  fs.readdirSync(colorsDir).forEach((file) => {
    if (!file.endsWith(".css")) return;
    const name = file.replace(".css", "");
    const content = fs.readFileSync(path.join(colorsDir, file), "utf8");
    const vars = parseVarsFromCss(content);

    Object.entries(vars).forEach(([key, value]) => {
      const match = key.match(/^([a-zA-Z]+)-(a?\d+)/);
      if (!match) return;
      const [, colorName, step] = match;
      if (!colors[colorName]) colors[colorName] = {};
      (colors[colorName] as Record<string, string>)[step] = value;
    });
  });

  colors.black = "#000000";
  colors.white = "#ffffff";

  return colors;
}

const baseTokens = loadBaseTokens();
const colors = loadRadixColors();

const fontSize = Object.fromEntries(
  Object.entries(baseTokens.fontSize).map(([k, size]) => [
    k,
    [size, { lineHeight: baseTokens.lineHeights[k], letterSpacing: baseTokens.letterSpacing[k] }],
  ]),
);

export default {
  content: ["./public/**/*.{html,js,ts,jsx,tsx}", "./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    colors,
    spacing: baseTokens.spacing,
    fontSize,
    lineHeight: baseTokens.lineHeights,
    letterSpacing: baseTokens.letterSpacing,
    borderRadius: baseTokens.borderRadius,
    boxShadow: baseTokens.boxShadow,
    cursor: baseTokens.cursor,
  },
} satisfies Config;

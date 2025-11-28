// Extract all Radix colors to Tailwind config (including alpha)
import { readFileSync, readdirSync } from 'fs';

const colorsDir = 'node_modules/@radix-ui/colors';
const files = readdirSync(colorsDir);

// Filter for base color files
const colorFiles = files.filter(f =>
  f.endsWith('.css') &&
  !f.includes('dark') &&
  !f.includes('black') &&
  !f.includes('white')
);

const solidColors: Record<string, Record<string, string>> = {};
const alphaColors: Record<string, Record<string, string>> = {};

for (const file of colorFiles) {
  const isAlpha = file.includes('-alpha');
  const colorName = file.replace('.css', '').replace('-alpha', '');
  const content = readFileSync(`${colorsDir}/${file}`, 'utf-8');

  if (isAlpha) {
    // Extract alpha colors (--colorname-a1 format)
    const matches = content.matchAll(/--(\w+)-a(\d+):\s*(#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{4}|#[0-9a-fA-F]{3});/g);

    alphaColors[colorName] = {};

    for (const match of matches) {
      const [, name, step, value] = match;
      if (name === colorName) {
        alphaColors[colorName][step] = value;
      }
    }
  } else {
    // Extract solid colors (--colorname-1 format)
    const matches = content.matchAll(/--(\w+)-(\d+):\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3});/g);

    solidColors[colorName] = {};

    for (const match of matches) {
      const [, name, step, value] = match;
      if (name === colorName) {
        solidColors[colorName][step] = value;
      }
    }
  }
}

// Generate TypeScript exports
console.log('// Radix Colors - Solid (opaque) colors');
console.log('export const radixColors = {');
for (const [colorName, steps] of Object.entries(solidColors).sort()) {
  console.log(`  '${colorName}': {`);
  for (let i = 1; i <= 12; i++) {
    if (steps[i]) {
      console.log(`    ${i}: '${steps[i]}',`);
    }
  }
  console.log('  },');
}
console.log('};\n');

console.log('// Radix Colors - Alpha (transparent) colors');
console.log('export const radixAlphaColors = {');
for (const [colorName, steps] of Object.entries(alphaColors).sort()) {
  console.log(`  '${colorName}A': {`);
  for (let i = 1; i <= 12; i++) {
    if (steps[i]) {
      console.log(`    ${i}: '${steps[i]}',`);
    }
  }
  console.log('  },');
}
console.log('};');

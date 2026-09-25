import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sizes = new Map();

// Width and height attributes let browsers reserve a diagram's space before it loads.
export function svgSizeAttributes(src) {
  if (!sizes.has(src)) {
    let attributes = '';
    try {
      const svg = readFileSync(resolve(root, src), 'utf8').match(/<svg\b[^>]*>/)?.[0] || '';
      const box = svg.match(/\bviewBox="\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
      if (box) attributes = ` width="${Math.round(Number(box[1]))}" height="${Math.round(Number(box[2]))}"`;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    sizes.set(src, attributes);
  }
  return sizes.get(src);
}

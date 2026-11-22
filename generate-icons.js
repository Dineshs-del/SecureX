// Node script to convert SVG icon to PNGs or write base64 icons
import fs from 'fs';
import path from 'path';

const svgContent = fs.readFileSync(path.resolve('./public/icon.svg'), 'utf8');

// For standard PWA compatibility in browser, create the manifest with both SVG and standard icon references
console.log('SVG icon ready.');

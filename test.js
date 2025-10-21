import { build } from './index.js';

console.log('Building example.js...');
await build('./example.js', './output.js');
console.log('Done! Check output.js');

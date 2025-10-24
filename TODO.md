```javascript
// v1.0
import { mergeClasses, transform } from './old-version.js';
const result = await transform(code);

// v2.0
import { compileClasses } from 'ignorant';
const result = await compileClasses(code);
console.log(result.code); // Access the compiled code
```

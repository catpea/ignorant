# ⚡ Quick Start Guide - ClassCompiler v2.0

Get up and running in 5 minutes!

## 📦 Installation

```bash
# 1. Install dependencies
npm install acorn astring prettier

# 2. You're ready to go!
```

## 🎯 Basic Usage (30 seconds)

```javascript
import { compileClasses } from './class-compiler-v2.js';

const code = `
class Animal {
    constructor(name) {
        this.name = name;
    }
    speak() {
        console.log(\`\${this.name} makes a sound\`);
    }
}

export class Dog extends Animal {
    constructor(name, breed) {
        super(name);
        this.breed = breed;
    }
    speak() {
        console.log(\`\${this.name} barks!\`);
    }
}
`;

const result = await compileClasses(code);
console.log(result.code);
```

**Output:**
```javascript
export class Dog {
    constructor(name, breed) {
        // inherited from Animal constructor
        this.name = name;
        this.breed = breed;
    }

    // inherited from Animal
    speak() {
        console.log(`${this.name} barks!`);
    }
}
```

## 🚀 Run Examples

```bash
# See all examples in action
node example-usage.js

# Run comprehensive tests
node test-class-compiler.js
```

## 🎨 Common Use Cases

### 1. Flatten React Components
```javascript
const result = await compileClasses(componentCode, {
    excludeIntermediate: true  // Only keep final components
});
```

### 2. Remove Non-Exported Classes
```javascript
const result = await compileClasses(code, {
    exportOnly: true  // Only compile exported classes
});
```

### 3. Get Detailed Information
```javascript
import { ClassCompiler } from './class-compiler-v2.js';

const compiler = new ClassCompiler();
const result = await compiler.compile(code);

console.log('Classes:', result.classMap);
console.log('Inheritance:', result.inheritanceGraph);
console.log('Errors:', result.errors);
```

## 📋 What You Get

1. **class-compiler-v2.js** - Main compiler (22KB)
2. **test-class-compiler.js** - Test suite (8KB)
3. **example-usage.js** - Real examples (9KB)
4. **README.md** - Full documentation (9KB)
5. **COMPARISON.md** - v1 vs v2 comparison (12KB)
6. **QUICKSTART.md** - This guide
7. **package.json** - NPM configuration

## 🎓 Next Steps

1. ✅ Try the examples: `node example-usage.js`
2. ✅ Read the [README.md](./README.md) for full API
3. ✅ Check [COMPARISON.md](./COMPARISON.md) for improvements
4. ✅ Run tests: `node test-class-compiler.js`

## 💡 Key Features

- ✅ **Pure AST manipulation** - No regex parsing
- ✅ **Accurate inheritance** - Handles all cases correctly
- ✅ **Private members** - Preserves visibility correctly
- ✅ **Error detection** - Catches circular inheritance
- ✅ **Clean output** - Prettier formatting
- ✅ **Well documented** - Extensive comments

## 🤝 Need Help?

- Check the examples in `example-usage.js`
- Read the full API in `README.md`
- Look at test cases in `test-class-compiler.js`

---

**Happy coding! 🎉**

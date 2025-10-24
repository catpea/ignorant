# 🚀 ignorant

A robust AST-based JavaScript class inheritance compiler that accurately flattens class hierarchies through proper AST parsing and manipulation.

1. **Pure AST Manipulation**
   - No more regex string operations
   - Uses Acorn for parsing and Astring for code generation
   - Proper AST traversal and transformation

2. **Accurate Inheritance Handling**
   - Correctly processes constructor chains
   - Proper method override resolution
   - Maintains member order and visibility

3. **Comprehensive Member Support**
   - Static and instance fields
   - Public and private members
   - Getters and setters
   - Computed property names
   - Method overrides with proper resolution

4. **Robust Error Handling**
   - Circular inheritance detection
   - Missing parent class validation
   - Detailed error reporting
   - Graceful degradation

5. **Better Code Organization**
   - Object-oriented design with ClassCompiler class
   - Modular methods for easy extension
   - Clear separation of concerns
   - Comprehensive documentation

## 📦 Installation

```bash
npm install ignorant
```

## 🎓 Usage

### Basic Usage

```javascript
import { compileClasses } from 'ignorant';

const code = `
class Animal {
    constructor(name) {
        this.name = name;
    }
    
    makeSound() {
        console.log('Some sound');
    }
}

export class Dog extends Animal {
    constructor(name, breed) {
        super(name);
        this.breed = breed;
    }
    
    makeSound() {
        console.log('Woof!');
    }
    
    fetch() {
        console.log('Fetching ball');
    }
}
`;

const result = await compileClasses(code);
console.log(result.code);
```

**Output:**
```javascript
export class Dog {
    // Constructor inlines entire chain
    constructor(name, breed) {
        // inherited from Animal constructor
        this.name = name;
        this.breed = breed;
    }
    
    // inherited from Animal
    makeSound() {
        console.log('Woof!');  // Overridden version
    }
    
    fetch() {
        console.log('Fetching ball');
    }
}
```

### Advanced Usage with Options

```javascript
import { ClassCompiler } from 'ignorant';

const compiler = new ClassCompiler({
    excludeIntermediate: true,  // Skip classes that are extended by others
    exportOnly: false,           // Include non-exported classes
    preserveComments: true,      // Add source annotations
    validateInheritance: true    // Validate inheritance chains
});

const result = await compiler.compile(code);

// Access detailed information
console.log('Class Map:', result.classMap);
console.log('Inheritance Graph:', result.inheritanceGraph);
console.log('Errors:', result.errors);
console.log('Compiled Code:', result.code);
```

### Extract Individual Classes

```javascript
import { extractClasses } from 'ignorant';

const code = `
class A {}
class B extends A {}
export class C extends B {}
`;

const classes = extractClasses(code);
// Returns: [
//   { name: 'A', code: 'class A {}', node: {...} },
//   { name: 'B', code: 'class B extends A {}', node: {...} },
//   { name: 'C', code: 'export class C extends B {}', node: {...} }
// ]
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `excludeIntermediate` | boolean | `true` | Exclude intermediate classes that are extended by other classes |
| `exportOnly` | boolean | `false` | Only compile exported classes |
| `preserveComments` | boolean | `true` | Add comments indicating source class for inherited members |
| `validateInheritance` | boolean | `true` | Validate inheritance chains for errors |

## 🔍 How It Works

### 1. **Parsing Phase**
```javascript
const ast = acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
    ranges: true
});
```

### 2. **Class Registry Building**
- Identifies all class declarations
- Tracks export information
- Builds inheritance graph
- Categorizes members by type

### 3. **Validation Phase**
- Detects circular inheritance
- Checks for missing parent classes
- Validates member compatibility

### 4. **Transformation Phase**
- Collects members from entire inheritance chain
- Resolves method overrides
- Inlines constructor chains
- Flattens class hierarchy

### 5. **Code Generation**
- Uses Astring to generate code from AST
- Formats with Prettier
- Preserves export declarations

## 📊 Member Categories

The compiler categorizes and orders members as follows:

1. **Static Private Fields**
2. **Static Public Fields**
3. **Static Private Methods**
4. **Static Public Methods**
5. **Instance Private Fields**
6. **Instance Public Fields**
7. **Constructor** (inlined from entire chain)
8. **Getters and Setters**
9. **Instance Private Methods**
10. **Instance Public Methods**

## 🎯 Key Features

### Constructor Chain Inlining

The compiler properly inlines constructor chains by:
- Collecting all constructors in inheritance order
- Removing `super()` calls
- Preserving all initialization logic
- Maintaining proper execution order

**Before:**
```javascript
class A {
    constructor(x) {
        this.x = x;
    }
}

class B extends A {
    constructor(x, y) {
        super(x);
        this.y = y;
    }
}
```

**After:**
```javascript
class B {
    constructor(x, y) {
        // from A constructor
        this.x = x;
        this.y = y;
    }
}
```

### Method Override Resolution

The compiler correctly identifies and resolves method overrides:

```javascript
class Animal {
    makeSound() { return 'generic'; }
}

class Dog extends Animal {
    makeSound() { return 'woof'; }  // Overrides Animal.makeSound
}
```

### Private Member Handling

Respects private fields and methods:

```javascript
class Base {
    #privateField = 0;
    
    #privateMethod() {
        return this.#privateField;
    }
}

class Derived extends Base {
    // Private members from Base are preserved
}
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
node test-class-compiler.js
```

This will run tests for:
- Simple inheritance chains
- Multiple inheritance branches
- Getters and setters
- Private members
- Export modes
- Class extraction
- Performance benchmarks

## 🔧 API Reference

### ClassCompiler

The main compiler class.

#### Constructor

```javascript
new ClassCompiler(options)
```

#### Methods

##### `compile(code)`
Compiles the given code and returns a result object.

**Returns:**
```javascript
{
    code: string,              // Compiled code
    errors: Array,             // Compilation errors/warnings
    classMap: Map,             // Class information map
    inheritanceGraph: Map      // Inheritance relationships
}
```

##### `static extractClasses(code)`
Extracts individual class definitions from code.

**Returns:**
```javascript
[{
    name: string,    // Class name
    code: string,    // Class source code
    node: object     // AST node
}]
```

### Convenience Functions

#### `compileClasses(code, options)`
Quick compilation without creating a ClassCompiler instance.

#### `extractClasses(code)`
Quick class extraction without creating a ClassCompiler instance.

## 🚨 Error Types

The compiler reports the following error types:

- `MISSING_PARENT`: Parent class not found
- `CIRCULAR_INHERITANCE`: Circular inheritance detected
- `COMPILATION_ERROR`: General compilation error

Example error object:
```javascript
{
    type: 'MISSING_PARENT',
    class: 'Dog',
    parent: 'Animal',
    message: 'Class "Dog" extends "Animal" which is not defined'
}
```

## 🎨 Code Quality

- **Pure AST manipulation** - No string regex operations
- **Type-safe operations** - Proper AST node handling
- **Comprehensive error handling** - Graceful failure modes
- **Well-documented** - Clear code comments and documentation
- **Modular design** - Easy to extend and maintain

 
### Migration Steps

```javascript
// v1.0
import { mergeClasses, transform } from './old-version.js';
const result = await transform(code);

// v2.0
import { compileClasses } from 'ignorant';
const result = await compileClasses(code);
console.log(result.code); // Access the compiled code
```

## 🤝 Contributing

Contributions are welcome! This is a clean, well-structured codebase designed for easy extension.

## 📝 License

MIT

## 🙏 Acknowledgments

Built with:
- [Acorn](https://github.com/acornjs/acorn) - JavaScript parser
- [Astring](https://github.com/davidbonnet/astring) - Code generator
- [Prettier](https://prettier.io/) - Code formatter

---

**Made with 🙃 for better JavaScript inheritance handling**

# ignorant

Flattening the Inheritance Hierarchy for Enhanced Deployability

A build system that pre-compiles Object-Oriented Programming inheritance patterns into standalone, dependency-free classes. Because sometimes the best inheritance is no inheritance at all.

[![npm version](https://img.shields.io/npm/v/ignorant.svg)](https://www.npmjs.com/package/ignorant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Abstract](#abstract)
- [Motivation](#motivation)
- [Technical Approach](#technical-approach)
- [Installation](#installation)
- [Command Line Usage](#command-line-usage)
- [What It Does](#what-it-does)
- [Features](#features)
  - [Constructor Merging](#constructor-merging)
  - [Method Inheritance and Override](#method-inheritance-and-override)
  - [Member Ordering](#member-ordering)
  - [Property and Field Support](#property-and-field-support)
- [JavaScript API](#javascript-api)
- [Testing](#testing)
- [Benefits](#benefits)
- [Use Cases](#use-cases)
- [Design Philosophy](#design-philosophy)

## Abstract

This document describes a mechanism for transforming hierarchical class structures into flattened, self-contained implementations. By eliminating runtime inheritance resolution, `ignorant` enables strategic source code organization at the engineering level while delivering compact, autonomous modules at the deployment level.

## Motivation

Traditional Object-Oriented Programming advocates extensive use of inheritance hierarchies to promote code reuse and abstraction. However, this architectural pattern introduces several challenges in modern JavaScript deployment:

1. **Dependency Coupling**: Each class maintains runtime dependencies on its parent classes
2. **Distribution Complexity**: Shipping a single class requires bundling its entire inheritance chain
3. **Cognitive Overhead**: Understanding class behavior requires traversing multiple levels of abstraction

`ignorant` addresses these concerns by performing compile-time inheritance resolution. The resulting artifacts are blissfully unaware of their ancestral lineage—hence the name.

## Technical Approach

The system operates by:

1. Parsing JavaScript class hierarchies using AST analysis
2. Flattening inheritance chains through member collection and inlining
3. Eliminating `extends` clauses and `super()` calls
4. Producing standalone class definitions with all inherited members present

This approach permits engineering teams to maintain deep class hierarchies for organizational clarity while delivering flat, portable classes for production use.

## Installation

### Global Installation (CLI)
```bash
npm install -g ignorant
```

### Local Installation (API)
```bash
npm install ignorant
```

## Command Line Usage

```bash
# Process a single file
ignorant ./example.js  # creates dist/example.js

# Process multiple files
ignorant ./src/*.js    # creates dist/ with flattened classes
```

## What It Does

### Input
```javascript
export class Animal {
  sneak() {
    console.log('shwooshes');
  }
  speak() {
    console.log('Makes noise');
  }
}

export class Cat extends Animal {
  speak() {
    console.log('Meows');
  }
}
```

### Output
```javascript
export default class Cat {
  speak() {
    console.log("Meows")
  }
  // from Animal
  sneak() {
    console.log("shwooshes")
  }
}
```

Note that intermediate classes (those extended by other classes) are excluded from output by default, as they serve only as organizational scaffolding.

## Features

### Constructor Merging
Constructors from the entire inheritance chain are merged in proper OOP execution order (base class first, derived class last). Constructor parameters are promoted from the first non-empty parameter list in the hierarchy.

**Input:**
```javascript
export class A {
  constructor(){ console.log('a'); }
}
export class B extends A {
  constructor(b){ console.log('b'); }
}
export class C extends B {
  constructor(c){ console.log('c'); }
}
export class D extends C {
  constructor(){ console.log('d'); }
}
```

**Output:**
```javascript
export class D {
  constructor(c) {
    console.log("a")
    console.log("b")
    console.log("c")
    console.log("d")
  }
}
```

### Method Inheritance and Override
Methods are inherited from parent classes while respecting override behavior. Overridden methods from the topmost class take precedence, and inherited methods are clearly marked with comments.

**Input:**
```javascript
export class Animal {
  move(){ console.log('moving'); }
  speak(){ console.log('generic sound'); }
}
export class Dog extends Animal {
  speak(){ console.log('bark'); }
  fetch(){ console.log('fetching'); }
}
```

**Output:**
```javascript
export class Dog {
  speak() {
    console.log("bark")
  }
  fetch() {
    console.log("fetching")
  }
  // from Animal
  move() {
    console.log("moving")
  }
}
```

### Member Ordering
Class members are automatically ordered according to JavaScript conventions:
- Static private properties
- Static public properties
- Static private methods
- Static public methods
- Instance private properties
- Instance public properties
- Constructor
- Getters and setters
- Instance private methods
- Instance public methods

### Property and Field Support
Supports class properties (PropertyDefinition), static members, private members (using `#` syntax), getters, setters, and all modern JavaScript class features.

## JavaScript API

```bash
npm i ignorant
```

### Basic Usage

```javascript
import { transform, extractClasses, formatCode } from 'ignorant';
import fs from 'fs';
import { join, resolve } from 'path';

const code = fs.readFileSync(inputFile, 'utf-8');

// Standard transformation: flatten all hierarchies
const transformed = await transform(code);

// Extract individual classes for separate file output
const extractedClasses = extractClasses(transformed);

// Write each class to its own file
for (const {className, content} of extractedClasses) {
  const outputFile = join(resolve(outputDir), className + '.js');
  fs.writeFileSync(outputFile, content);
}
```

### Available Functions

- **`transform(code, options)`** - Main transformation function that flattens class hierarchies
  - `code`: JavaScript source code as a string
  - `options.excludeIntermediate`: (default: `true`) Exclude intermediate classes from output
  - Returns: Transformed and formatted code

- **`mergeClasses(code, options)`** - Merge class hierarchies without formatting
  - Returns: Merged code without formatting

- **`extractClasses(code)`** - Extract individual classes from transformed code
  - Returns: Array of `{className, content}` objects

- **`formatCode(code)`** - Format code using Prettier
  - Returns: Formatted code with semicolons removed

## Testing

This package is tested using [Politician](https://github.com/catpea/politician), a bureaucratic test framework with 1980s government documentation aesthetics. Tests verify:

- Constructor merging and execution order
- Constructor parameter promotion
- Method inheritance and override behavior
- Member ordering and organization
- Property and field support

Run tests with:
```bash
npm test
```

## Benefits

- **Zero Runtime Dependencies**: Each class is entirely self-contained
- **Simplified Distribution**: Ship individual class files without bundling parent classes
- **Reduced Bundle Size**: Eliminate unused parent class members from final artifacts
- **Enhanced Portability**: Classes can be copied between projects without dependency graphs
- **Improved Debuggability**: All behavior is present in a single definition
- **Constructor Intelligence**: Automatic merging of constructor chains with parameter promotion
- **Override Preservation**: Correctly handles method overrides while inheriting non-overridden methods

## Use Cases

- **Library Distribution**: Ship individual, self-contained classes without requiring users to import entire inheritance chains
- **Micro-Frontend Architecture**: Deploy standalone class modules that don't depend on shared parent classes
- **Legacy Code Migration**: Flatten complex inheritance hierarchies into simpler, more maintainable structures
- **Bundle Size Optimization**: Eliminate unused parent class methods from final bundles
- **Code Portability**: Create classes that can be easily copied between projects without dependency graphs

## Design Philosophy

`ignorant` embodies a pragmatic approach to code organization: maintain whatever class hierarchy aids comprehension during development, then flatten it for deployment. The system remains deliberately ignorant of OOP dogma, focusing solely on producing practical, standalone artifacts.

After all, inheritance is really just copying code with extra steps. We're simply removing the steps.

## Security Considerations

The transformation process performs static code analysis and generation. No code is executed during transformation. Users should review generated output before deployment, as with any build tool.

## Contributing

Contributions are welcome! This project is tested using the [Politician](https://github.com/catpea/politician) test framework. Please ensure all tests pass before submitting pull requests.

## License

MIT - see LICENSE file for details

## Author

**catpea** - [GitHub](https://github.com/catpea)

## Links

- **Repository**: https://github.com/catpea/ignorant
- **npm Package**: https://www.npmjs.com/package/ignorant
- **Test Framework**: https://github.com/catpea/politician

---

*"We choose to flatten the class hierarchy not because it is easy, but because inheritance is hard."*

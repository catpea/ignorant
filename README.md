# ignorant

Flattening the Inheritance Hierarchy for Enhanced Deployability

A build system that pre-compiles Object-Oriented Programming inheritance patterns into standalone, dependency-free classes. Because sometimes the best inheritance is no inheritance at all.

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

## Command Line Usage

```bash
npm i -g ignorant
ignorant ./example.js  # creates dist/example.js
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

## JavaScript API

```javascript
npm i ignorant
```

```javascript
import { transform, extractClasses } from 'ignorant';
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

## Benefits

- **Zero Runtime Dependencies**: Each class is entirely self-contained
- **Simplified Distribution**: Ship individual class files without bundling parent classes
- **Reduced Bundle Size**: Eliminate unused parent class members from final artifacts
- **Enhanced Portability**: Classes can be copied between projects without dependency graphs
- **Improved Debuggability**: All behavior is present in a single definition

## Design Philosophy

`ignorant` embodies a pragmatic approach to code organization: maintain whatever class hierarchy aids comprehension during development, then flatten it for deployment. The system remains deliberately ignorant of OOP dogma, focusing solely on producing practical, standalone artifacts.

After all, inheritance is really just copying code with extra steps. We're simply removing the steps.

## Implementation Status

This specification is implemented and operational. The reference implementation is written in JavaScript and processes JavaScript class hierarchies.

## Security Considerations

The transformation process performs static code analysis and generation. No code is executed during transformation. Users should review generated output before deployment, as with any build tool.

## License

MIT

## Author

catpea (https://github.com/catpea)

## Repository

https://github.com/catpea/ignorant

---

*"We choose to flatten the class hierarchy not because it is easy, but because inheritance is hard."*

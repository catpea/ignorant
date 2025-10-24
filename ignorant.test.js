import { ClassCompiler, compileClasses, extractClasses } from './index.js';

/**
 * Test Suite for ClassCompiler v2.0
 */

// Example 1: Simple three-level inheritance
const example1 = `
class Animal {
    #species;

    constructor(name) {
        this.name = name;
        this.#species = 'unknown';
    }

    makeSound() {
        console.log('Some sound');
    }

    getSpecies() {
        return this.#species;
    }
}

class Mammal extends Animal {
    constructor(name, furColor) {
        super(name);
        this.furColor = furColor;
    }

    makeSound() {
        console.log('Mammal sound');
    }

    nurse() {
        console.log('Nursing offspring');
    }
}

export default class Dog extends Mammal {
    constructor(name, furColor, breed) {
        super(name, furColor);
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

// Example 2: Multiple inheritance chains with static members
const example2 = `
class Base {
    static baseStaticField = 'base';
    #privateField = 0;

    constructor(value) {
        this.value = value;
    }

    static staticMethod() {
        return 'Base static';
    }

    instanceMethod() {
        return 'Base instance';
    }
}

class MiddleA extends Base {
    constructor(value, extraA) {
        super(value);
        this.extraA = extraA;
    }

    methodA() {
        return 'Method A';
    }
}

class MiddleB extends Base {
    constructor(value, extraB) {
        super(value);
        this.extraB = extraB;
    }

    methodB() {
        return 'Method B';
    }
}

export class DerivedA extends MiddleA {
    constructor(value, extraA, finalA) {
        super(value, extraA);
        this.finalA = finalA;
    }

    finalMethodA() {
        return 'Final A';
    }
}

export class DerivedB extends MiddleB {
    constructor(value, extraB, finalB) {
        super(value, extraB);
        this.finalB = finalB;
    }

    finalMethodB() {
        return 'Final B';
    }
}
`;

// Example 3: Getters, setters, and method overriding
const example3 = `
class Shape {
    constructor(color) {
        this._color = color;
    }

    get color() {
        return this._color;
    }

    set color(value) {
        this._color = value;
    }

    area() {
        return 0;
    }

    describe() {
        console.log(\`A \${this.color} shape\`);
    }
}

class Rectangle extends Shape {
    constructor(color, width, height) {
        super(color);
        this.width = width;
        this.height = height;
    }

    area() {
        return this.width * this.height;
    }

    describe() {
        console.log(\`A \${this.color} rectangle with area \${this.area()}\`);
    }
}

export default class Square extends Rectangle {
    constructor(color, size) {
        super(color, size, size);
    }

    get size() {
        return this.width;
    }

    set size(value) {
        this.width = value;
        this.height = value;
    }

    describe() {
        console.log(\`A \${this.color} square with side \${this.size}\`);
    }
}
`;

// Example 4: Private methods and fields
const example4 = `
class Counter {
    #count = 0;

    constructor(initial) {
        this.#count = initial || 0;
    }

    #validate(value) {
        return typeof value === 'number' && value >= 0;
    }

    increment() {
        this.#count++;
        return this.#count;
    }

    getCount() {
        return this.#count;
    }
}

export class LimitedCounter extends Counter {
    #maxCount;

    constructor(initial, max) {
        super(initial);
        this.#maxCount = max;
    }

    increment() {
        const current = super.getCount();
        if (current < this.#maxCount) {
            return super.increment();
        }
        return current;
    }

    getMax() {
        return this.#maxCount;
    }
}
`;

/**
 * Run all tests
 */
async function runTests() {
    console.log('========================================');
    console.log('ClassCompiler v2.0 - Test Suite');
    console.log('========================================\n');

    // Test 1: Basic inheritance flattening
    await runTest('Example 1: Simple Three-Level Inheritance', example1);

    // Test 2: Multiple inheritance branches
    await runTest('Example 2: Multiple Inheritance Branches', example2, {
        excludeIntermediate: true
    });

    // Test 3: Getters and setters
    await runTest('Example 3: Getters, Setters, and Overrides', example3);

    // Test 4: Private members
    await runTest('Example 4: Private Methods and Fields', example4);

    // Test 5: Export only option
    await runTest('Example 5: Export Only Mode', example2, {
        excludeIntermediate: false,
        exportOnly: true
    });

    // Test 6: Extract classes
    testExtractClasses();

    console.log('\n========================================');
    console.log('All tests completed!');
    console.log('========================================');
}

/**
 * Run a single test
 */
async function runTest(testName, code, options = {}) {
    console.log(`\n📋 ${testName}`);
    console.log('─'.repeat(60));

    try {
        const compiler = new ClassCompiler(options);
        const result = await compiler.compile(code);

        console.log('✅ Compilation successful');
        console.log(`   Classes found: ${result.classMap.size}`);
        console.log(`   Errors: ${result.errors.length}`);

        if (result.errors.length > 0) {
            console.log('\n⚠️  Compilation warnings/errors:');
            result.errors.forEach(err => {
                console.log(`   - ${err.type}: ${err.message}`);
            });
        }

        console.log('\n📊 Class Map:');
        for (const [name, info] of result.classMap) {
            const parent = info.superClass || 'none';
            const exported = info.exported ? '(exported)' : '';
            console.log(`   - ${name} extends ${parent} ${exported}`);
        }

        console.log('\n📊 Inheritance Graph:');
        for (const [parent, children] of result.inheritanceGraph) {
            console.log(`   - ${parent} ← ${children.join(', ')}`);
        }

        console.log('\n🔧 Compiled Output (first 500 chars):');
        console.log(result.code.substring(0, 500) + '...\n');

        return result;
    } catch (error) {
        console.log('❌ Compilation failed');
        console.log(`   Error: ${error.message}\n`);
        throw error;
    }
}

/**
 * Test class extraction
 */
function testExtractClasses() {
    console.log('\n📋 Example 6: Extract Classes');
    console.log('─'.repeat(60));

    const classes = extractClasses(example1);
    console.log(`✅ Extracted ${classes.length} classes:`);
    classes.forEach(cls => {
        console.log(`   - ${cls.name} (${cls.code.length} chars)`);
    });
    console.log();
}

/**
 * Performance test
 */
async function performanceTest() {
    console.log('\n📋 Performance Test');
    console.log('─'.repeat(60));

    // Generate a deep inheritance chain
    let deepCode = 'class Level0 { constructor() { this.level = 0; } }\n';
    for (let i = 1; i <= 20; i++) {
        deepCode += `class Level${i} extends Level${i-1} { constructor() { super(); this.level = ${i}; } }\n`;
    }
    deepCode += `export default class Level21 extends Level20 { constructor() { super(); this.level = 21; } }`;

    const start = Date.now();
    const compiler = new ClassCompiler();
    await compiler.compile(deepCode);
    const end = Date.now();

    console.log(`✅ Compiled 22-level deep inheritance chain in ${end - start}ms`);
    console.log();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests()
        .then(() => performanceTest())
        .catch(console.error);
}

export { runTests, runTest, performanceTest };

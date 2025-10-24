import { compileClasses, ClassCompiler, extractClasses } from './index.js';

console.log('🎯 ClassCompiler v2.0 - Example Usage\n');

// =============================================================================
// Example 1: Simple Component Inheritance
// =============================================================================
console.log('📘 Example 1: React-like Component Hierarchy');
console.log('─'.repeat(70));

const componentExample = `
class Component {
    constructor(props) {
        this.props = props;
        this.state = {};
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    render() {
        return null;
    }
}

class PureComponent extends Component {
    constructor(props) {
        super(props);
        this.prevProps = props;
    }

    shouldUpdate(newProps) {
        return JSON.stringify(newProps) !== JSON.stringify(this.prevProps);
    }
}

export default class Button extends PureComponent {
    constructor(props) {
        super(props);
        this.state = { clicked: false };
    }

    handleClick() {
        this.setState({ clicked: true });
        if (this.props.onClick) {
            this.props.onClick();
        }
    }

    render() {
        return \`<button>\${this.props.label}</button>\`;
    }
}
`;

try {
    const result1 = await compileClasses(componentExample, {
        excludeIntermediate: true,  // Only output Button (skip intermediate classes)
        preserveComments: true
    });

    console.log('✅ Compiled successfully!\n');
    console.log('Output:');
    console.log(result1.code);
    console.log('\n');
} catch (error) {
    console.error('❌ Error:', error.message);
}

// =============================================================================
// Example 2: Multiple Inheritance Branches
// =============================================================================
console.log('📘 Example 2: Multiple Inheritance Branches');
console.log('─'.repeat(70));

const multipleInheritance = `
class Vehicle {
    constructor(brand) {
        this.brand = brand;
    }

    start() {
        console.log(\`\${this.brand} starting...\`);
    }
}

class Car extends Vehicle {
    constructor(brand, model) {
        super(brand);
        this.model = model;
        this.wheels = 4;
    }

    drive() {
        console.log('Driving on road');
    }
}

class Motorcycle extends Vehicle {
    constructor(brand, model) {
        super(brand);
        this.model = model;
        this.wheels = 2;
    }

    drive() {
        console.log('Riding on road');
    }
}

export class ElectricCar extends Car {
    constructor(brand, model, batterySize) {
        super(brand, model);
        this.batterySize = batterySize;
    }

    charge() {
        console.log('Charging battery');
    }
}

export class ElectricMotorcycle extends Motorcycle {
    constructor(brand, model, batterySize) {
        super(brand, model);
        this.batterySize = batterySize;
    }

    charge() {
        console.log('Charging battery');
    }
}
`;

try {
    const compiler2 = new ClassCompiler({
        excludeIntermediate: true,
        exportOnly: true
    });

    const result2 = await compiler2.compile(multipleInheritance);

    console.log('✅ Compiled successfully!\n');
    console.log(`Found ${result2.classMap.size} classes:`);
    for (const [name, info] of result2.classMap) {
        console.log(`  - ${name}${info.superClass ? ' extends ' + info.superClass : ''}`);
    }
    console.log('\nInheritance Graph:');
    for (const [parent, children] of result2.inheritanceGraph) {
        console.log(`  ${parent} ← ${children.join(', ')}`);
    }
    console.log('\nOutput (first 800 chars):');
    console.log(result2.code.substring(0, 800) + '...\n\n');
} catch (error) {
    console.error('❌ Error:', error.message);
}

// =============================================================================
// Example 3: Working with Private Members
// =============================================================================
console.log('📘 Example 3: Private Members and Getters/Setters');
console.log('─'.repeat(70));

const privateExample = `
class BankAccount {
    #balance = 0;

    constructor(initialBalance) {
        this.#balance = initialBalance;
    }

    get balance() {
        return this.#balance;
    }

    deposit(amount) {
        if (amount > 0) {
            this.#balance += amount;
        }
    }

    #validateAmount(amount) {
        return amount > 0 && amount <= this.#balance;
    }
}

export class SavingsAccount extends BankAccount {
    #interestRate;

    constructor(initialBalance, interestRate) {
        super(initialBalance);
        this.#interestRate = interestRate;
    }

    get interestRate() {
        return this.#interestRate;
    }

    applyInterest() {
        const interest = this.balance * this.#interestRate;
        this.deposit(interest);
    }
}
`;

try {
    const result3 = await compileClasses(privateExample);

    console.log('✅ Compiled successfully!\n');
    console.log('Output:');
    console.log(result3.code);
    console.log('\n');
} catch (error) {
    console.error('❌ Error:', error.message);
}

// =============================================================================
// Example 4: Extract Individual Classes
// =============================================================================
console.log('📘 Example 4: Extract Individual Classes');
console.log('─'.repeat(70));

const mixedCode = `
class Helper {
    static format(value) {
        return String(value);
    }
}

class DataModel {
    constructor(data) {
        this.data = data;
    }
}

export class UserModel extends DataModel {
    constructor(userData) {
        super(userData);
        this.type = 'user';
    }
}

export default class AdminModel extends UserModel {
    constructor(userData) {
        super(userData);
        this.type = 'admin';
        this.permissions = ['all'];
    }
}
`;

const extracted = extractClasses(mixedCode);
console.log(`Found ${extracted.length} classes:\n`);
extracted.forEach(cls => {
    console.log(`Class: ${cls.name}`);
    console.log(`Code length: ${cls.code.length} characters`);
    console.log('─'.repeat(40));
});
console.log('\n');

// =============================================================================
// Example 5: Error Handling
// =============================================================================
console.log('📘 Example 5: Error Detection and Handling');
console.log('─'.repeat(70));

const errorExample = `
class Child extends NonExistentParent {
    constructor() {
        super();
    }
}

export class GrandChild extends Child {
    constructor() {
        super();
    }
}
`;

try {
    const result5 = await compileClasses(errorExample);

    if (result5.errors.length > 0) {
        console.log('⚠️  Detected errors during compilation:\n');
        result5.errors.forEach(error => {
            console.log(`  Type: ${error.type}`);
            console.log(`  Message: ${error.message}`);
            if (error.class) console.log(`  Class: ${error.class}`);
            if (error.parent) console.log(`  Parent: ${error.parent}`);
            console.log('');
        });
    } else {
        console.log('✅ No errors detected\n');
    }
} catch (error) {
    console.error('❌ Compilation failed:', error.message, '\n');
}

// =============================================================================
// Example 6: Performance with Deep Inheritance
// =============================================================================
console.log('📘 Example 6: Deep Inheritance Chain Performance');
console.log('─'.repeat(70));

// Generate a 10-level deep inheritance chain
let deepCode = 'class Level0 { constructor(value) { this.value = value; this.level = 0; } }\n';
for (let i = 1; i <= 10; i++) {
    deepCode += `class Level${i} extends Level${i-1} {
        constructor(value) {
            super(value);
            this.level = ${i};
        }
        method${i}() {
            return 'Level ${i}';
        }
    }\n`;
}
deepCode += `export default class FinalLevel extends Level10 {
    constructor(value) {
        super(value);
        this.level = 11;
    }
    finalMethod() {
        return 'Final level reached';
    }
}`;

const startTime = Date.now();
try {
    const result6 = await compileClasses(deepCode, {
        excludeIntermediate: true
    });
    const endTime = Date.now();

    console.log('✅ Successfully compiled 11-level deep inheritance!');
    console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
    console.log(`📊 Output size: ${result6.code.length} characters`);
    console.log('\nFinal class has all methods from entire chain:');
    const methodMatches = result6.code.match(/method\d+\(\)/g) || [];
    console.log(`  Found ${methodMatches.length} inherited methods: ${methodMatches.join(', ')}`);
    console.log('\n');
} catch (error) {
    console.error('❌ Error:', error.message);
}

console.log('═'.repeat(70));
console.log('🎉 All examples completed!');
console.log('═'.repeat(70));

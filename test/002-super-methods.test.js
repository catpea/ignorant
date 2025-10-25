#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// SUPER METHOD CALL TEST SPECIFICATION
// Classification: UNCLASSIFIED
// Document Control Number: CITS-2025-002
// ═══════════════════════════════════════════════════════════════════════════════

import { createTestSuite, VERBOSITY_LEVELS } from 'politician';
import { compileClasses, formatCode } from '../index.js';

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 1: TEST CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

const suite = createTestSuite('Super Method Call Resolution', {
  verbosity: VERBOSITY_LEVELS.VERBOSE,
  classification: 'UNCLASSIFIED',
  documentId: 'CITS-2025-002',
  metadata: {
    purpose: 'Verify super.method() call transformation in flattened classes',
    author: 'Automated Test System',
    framework: 'Politician Test Framework v1.0'
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 2: TEST DATA PREPARATION
// ──────────────────────────────────────────────────────────────────────────────

const originalCode = await formatCode(`
class Counter {
    #count = 0;

    constructor(initial) {
        this.#count = initial || 0;
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
}`);

const result = await compileClasses(originalCode);
const transformedCode = result.code;

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 3: TEST EXECUTION
// ──────────────────────────────────────────────────────────────────────────────

suite
  .header()
  .section('PRELIMINARY DOCUMENTATION')
  .subsection('Original Source Code')
  .javascript(originalCode, 'INPUT: Class with super.method() calls')
  .subsection('Actual Transformation Result')
  .javascript(transformedCode, 'ACTUAL: Transformer Output with Preserved Parent Methods')

  .section('COMPLIANCE VERIFICATION')

  .test('All super.method() calls must be transformed', () => {
    const hasSuperCalls = transformedCode.includes('super.');
    return {
      passed: !hasSuperCalls,
      actual: hasSuperCalls ? 'Found super. calls' : 'No super. calls',
      expected: 'No super. calls',
      message: hasSuperCalls
        ? 'Flattened class still contains super. calls which will fail at runtime'
        : 'All super. calls successfully transformed to renamed method calls'
    };
  })

  .test('Parent methods must be preserved with renamed identifiers', () => {
    const hasCounterGetCount = transformedCode.includes('_super_Counter_getCount');
    const hasCounterIncrement = transformedCode.includes('_super_Counter_increment');
    const bothPreserved = hasCounterGetCount && hasCounterIncrement;

    return {
      passed: bothPreserved,
      actual: {
        getCount: hasCounterGetCount,
        increment: hasCounterIncrement
      },
      expected: {
        getCount: true,
        increment: true
      },
      message: bothPreserved
        ? 'Both parent methods preserved with proper naming convention'
        : 'Missing preserved parent methods'
    };
  })

  .test('Transformed calls must use this._super_ pattern', () => {
    const usesThisSuperPattern = transformedCode.includes('this._super_Counter_getCount()') &&
                                 transformedCode.includes('this._super_Counter_increment()');
    return {
      passed: usesThisSuperPattern,
      actual: usesThisSuperPattern ? 'Uses this._super_ pattern' : 'Missing pattern',
      expected: 'Uses this._super_ pattern',
      message: usesThisSuperPattern
        ? 'Super calls correctly transformed to this._super_ClassName_method()'
        : 'Super call transformation pattern incorrect'
    };
  })

  .test('Child class methods must be preserved', () => {
    const hasIncrementOverride = transformedCode.match(/increment\s*\(\)/g)?.length >= 2;
    const hasGetMax = transformedCode.includes('getMax()');

    return {
      passed: hasIncrementOverride && hasGetMax,
      actual: {
        incrementCount: transformedCode.match(/increment\s*\(\)/g)?.length || 0,
        hasGetMax
      },
      expected: {
        incrementCount: 2, // One override + one preserved
        hasGetMax: true
      },
      message: hasIncrementOverride && hasGetMax
        ? 'Child class methods correctly preserved alongside parent methods'
        : 'Missing child class methods'
    };
  })

  .test('Private fields must be accessible in preserved methods', () => {
    const hasPrivateCount = transformedCode.includes('#count');
    const preservedMethodHasCount = transformedCode.match(/_super_Counter_\w+[^]*?#count/);

    return {
      passed: hasPrivateCount && preservedMethodHasCount,
      actual: {
        hasPrivateField: hasPrivateCount,
        accessibleInPreserved: !!preservedMethodHasCount
      },
      expected: {
        hasPrivateField: true,
        accessibleInPreserved: true
      },
      message: hasPrivateCount && preservedMethodHasCount
        ? 'Private fields correctly accessible in all methods'
        : 'Private field access issue in preserved methods'
    };
  })

  .exit();

// ═══════════════════════════════════════════════════════════════════════════════
// END OF TEST SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

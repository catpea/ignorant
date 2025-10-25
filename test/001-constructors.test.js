#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRUCTOR INHERITANCE TEST SPECIFICATION (SUPER PATTERN)
// Classification: UNCLASSIFIED
// Document Control Number: CITS-2025-001-V2
// ═══════════════════════════════════════════════════════════════════════════════

import { createTestSuite, VERBOSITY_LEVELS } from 'politician';
import { compileClasses, formatCode } from '../index.js';
import query from '../query.js';

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 1: TEST CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

const suite = createTestSuite('Constructor Inheritance with _super_ Pattern', {
  verbosity: VERBOSITY_LEVELS.VERBOSE,
  classification: 'UNCLASSIFIED',
  documentId: 'CITS-2025-001-V2',
  metadata: {
    purpose: 'Verify constructor _super_ pattern transformation in class inheritance',
    author: 'Automated Test System',
    framework: 'Politician Test Framework v1.0',
    notes: 'Uses _super_ClassName_constructor pattern instead of inlining'
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 2: TEST DATA PREPARATION
// ──────────────────────────────────────────────────────────────────────────────

const originalCode = await formatCode(`
class A {
  constructor(){ console.log('a'); }
}
class B extends A {
  constructor(){ super(); console.log('b'); }
}
class C extends B {
  constructor(){ super(); console.log('c'); }
}
class D extends C {
  constructor(){ super(); console.log('d'); }
}`);

const expectedCode = await formatCode(`
export class D {
  constructor() {
    this._super_C_constructor();
    console.log("d");
  }
  _super_A_constructor() {
    console.log("a");
  }
  _super_B_constructor() {
    this._super_A_constructor();
    console.log("b");
  }
  _super_C_constructor() {
    this._super_B_constructor();
    console.log("c");
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
  .javascript(originalCode, 'INPUT: Multi-level Class Hierarchy')
  .subsection('Expected Output')
  .javascript(expectedCode, 'EXPECTED: Flattened Class with _super_ Constructors')
  .subsection('Actual Transformation Result')
  .javascript(transformedCode, 'ACTUAL: Transformer Output')

  .section('COMPLIANCE VERIFICATION')
  .test('Source Code Exact Match', () => ({
    passed: transformedCode === expectedCode,
    actual: transformedCode,
    expected: expectedCode,
    message: transformedCode === expectedCode
      ? 'Transformed code matches expected output exactly'
      : 'Transformed code does not match expected output'
  }))

  .test('All resulting classes must have export keyword', () => {
    const existenceOfExport = query(transformedCode).ExportNamedDeclaration.get().length === 1;
    return {
      passed: existenceOfExport,
      actual: existenceOfExport,
      expected: true,
      message: existenceOfExport
        ? 'Transformed class has export keyword for external access/import'
        : 'Transformed class is missing export keyword'
    };
  })

  .test('All super() calls must be transformed to _super_ pattern', () => {
    const hasSuperCalls = transformedCode.includes('super(');
    return {
      passed: !hasSuperCalls,
      actual: hasSuperCalls ? 'Found super() calls' : 'No super() calls',
      expected: 'No super() calls',
      message: hasSuperCalls
        ? 'Flattened class still contains super() calls which will fail at runtime'
        : 'All super() calls successfully transformed to _super_ constructor calls'
    };
  })

  .test('Parent constructors must be preserved with _super_ naming', () => {
    const hasA = transformedCode.includes('_super_A_constructor');
    const hasB = transformedCode.includes('_super_B_constructor');
    const hasC = transformedCode.includes('_super_C_constructor');
    const allPreserved = hasA && hasB && hasC;

    return {
      passed: allPreserved,
      actual: { A: hasA, B: hasB, C: hasC },
      expected: { A: true, B: true, C: true },
      message: allPreserved
        ? 'All parent constructors preserved with proper _super_ naming convention'
        : 'Missing preserved parent constructors'
    };
  })

  .test('Constructor calls must use this._super_ pattern', () => {
    const usesPattern = transformedCode.includes('this._super_C_constructor()') &&
                        transformedCode.includes('this._super_B_constructor()') &&
                        transformedCode.includes('this._super_A_constructor()');
    return {
      passed: usesPattern,
      actual: usesPattern ? 'Uses this._super_ pattern' : 'Missing pattern',
      expected: 'Uses this._super_ pattern',
      message: usesPattern
        ? 'Constructor super() calls correctly transformed to this._super_ClassName_constructor()'
        : 'Constructor call transformation pattern incorrect'
    };
  })

  .test('Constructor execution order preserved via chain', () => {
    // The chain should be: D calls C, C calls B, B calls A
    const hasCorrectChain =
      transformedCode.match(/constructor\s*\([^)]*\)\s*{[^}]*this\._super_C_constructor/) &&
      transformedCode.match(/_super_C_constructor\s*\([^)]*\)\s*{[^}]*this\._super_B_constructor/) &&
      transformedCode.match(/_super_B_constructor\s*\([^)]*\)\s*{[^}]*this\._super_A_constructor/);

    return {
      passed: !!hasCorrectChain,
      actual: hasCorrectChain ? 'Chain order correct' : 'Chain order incorrect',
      expected: 'Chain order correct',
      message: hasCorrectChain
        ? 'Constructor chain maintains proper execution order (D→C→B→A)'
        : 'Constructor chain order is incorrect'
    };
  })

  .exit();

// ═══════════════════════════════════════════════════════════════════════════════
// END OF TEST SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

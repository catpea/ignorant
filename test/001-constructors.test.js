#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRUCTOR INHERITANCE TEST SPECIFICATION
// Classification: UNCLASSIFIED
// Document Control Number: CITS-2025-001
// ═══════════════════════════════════════════════════════════════════════════════

import { createTestSuite, VERBOSITY_LEVELS } from 'politician';
import { transform, formatCode } from '../index.js';
import query from '../query.js';

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 1: TEST CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

const suite = createTestSuite('Constructor Inheritance Compliance', {
  verbosity: VERBOSITY_LEVELS.VERBOSE,
  classification: 'UNCLASSIFIED',
  documentId: 'CITS-2025-001',
  metadata: {
    purpose: 'Verify constructor merging behavior in class inheritance',
    author: 'Automated Test System',
    framework: 'Politician Test Framework v1.0'
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
  constructor(b){ console.log('b'); }
}
class C extends B {
  constructor(c){ console.log('c'); }
}
class D extends C {
  constructor(){ console.log('d'); }
}`);

const expectedCode = await formatCode(`
export class D {
  constructor(c) {
    console.log("a")
    console.log("b")
    console.log("c")
    console.log("d")
  }
}`);

const transformedCode = await transform(originalCode);

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 3: TEST EXECUTION
// ──────────────────────────────────────────────────────────────────────────────

suite
  .header()
  .section('PRELIMINARY DOCUMENTATION')
  .subsection('Original Source Code')
  .javascript(originalCode, 'INPUT: Multi-level Class Hierarchy')
  .subsection('Expected Output')
  .javascript(expectedCode, 'EXPECTED: Flattened Class with Merged Constructor')
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
    const existenceOfExport = query(transformedCode).ExportNamedDeclaration.get().length==1;
    return {
      passed: existenceOfExport,
      actual: existenceOfExport,
      expected: true,
      message: existenceOfExport
        ? 'Transformed class has export keyword for external access/import and sease of use'
        : 'Transformed class is missing export keyword and will not be accessible via import'
    };
  })

  .test('Constructor Method Execution Order', () => {
    const actualMethodOrder = query(transformedCode)
      .ClassDeclaration
      .MethodDefinition
      .Literal
      .map(Literal => Literal.value)
      .join('');

    const expectedMethodOrder = query(originalCode)
      .ClassDeclaration
      .MethodDefinition
      .Literal
      .map(Literal => Literal.value)
      .join('');

    return {
      passed: actualMethodOrder === expectedMethodOrder,
      actual: actualMethodOrder,
      expected: expectedMethodOrder,
      message: actualMethodOrder === expectedMethodOrder
        ? 'Constructor payloads merged in correct OOP execution order'
        : 'Constructor payloads not in standard OOP order of execution'
    };
  })

  .test('Constructor Parameter Promotion', () => {
    const expectedArguments = query(expectedCode)
      .ClassDeclaration
      .MethodDefinition
      .Identifier
      .map(o => o.name)[0];

    const actualArguments = query(transformedCode)
      .ClassDeclaration
      .MethodDefinition
      .Identifier
      .map(o => o.name)[0];

    return {
      passed: expectedArguments === actualArguments,
      actual: actualArguments,
      expected: expectedArguments,
      message: expectedArguments === actualArguments
        ? 'Constructor parameters correctly promoted from inheritance chain'
        : 'Constructor parameters were incorrectly promoted'
    };
  })

  .exit();

// ═══════════════════════════════════════════════════════════════════════════════
// END OF TEST SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

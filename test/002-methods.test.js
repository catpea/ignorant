#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// METHOD INHERITANCE AND OVERRIDE TEST SPECIFICATION
// Classification: UNCLASSIFIED
// Document Control Number: MITS-2025-002
// ═══════════════════════════════════════════════════════════════════════════════

import { createTestSuite, VERBOSITY_LEVELS } from 'politician';
import { transform, formatCode } from '../index.js';
import query from '../query.js';

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 1: TEST CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

const suite = createTestSuite('Method Inheritance and Override Compliance', {
  verbosity: VERBOSITY_LEVELS.VERBOSE,
  classification: 'UNCLASSIFIED',
  documentId: 'MITS-2025-002',
  metadata: {
    purpose: 'Verify method inheritance and override behavior in class hierarchy',
    author: 'Automated Test System',
    framework: 'Politician Test Framework v1.0'
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 2: TEST DATA PREPARATION
// ──────────────────────────────────────────────────────────────────────────────

const originalCode = `
class Animal {
  c(){ console.log('c'); }
  b(){ console.log('b base'); }
}
class Ape extends Animal {
  d(){ console.log('d'); }
  b(){ console.log('b intermediate'); }
}
class Hominid extends Ape {
  e(){ console.log('e'); }
  b(){ console.log('b intermediate'); }
}
class Human extends Hominid {
  a(){ console.log('a'); }
  b(){ console.log('b (top overwrite)'); }
}
`;

const expectedCode = await formatCode(`
export class Human {
  a(){ console.log('a'); }
  b(){ console.log('b (top overwrite)'); }
  c(){ console.log('c'); }
  d(){ console.log('d'); }
  e(){ console.log('e'); }
}
`);

const transformedCode = await transform(originalCode);

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 3: TEST EXECUTION
// ──────────────────────────────────────────────────────────────────────────────

suite
  .header()
  .section('PRELIMINARY DOCUMENTATION')
  .subsection('Original Source Code')
  .javascript(originalCode, 'INPUT: Multi-level Inheritance with Method Overrides')
  .subsection('Expected Output')
  .javascript(expectedCode, 'EXPECTED: Flattened Class with Inherited Methods')
  .subsection('Actual Transformation Result')
  .javascript(transformedCode, 'ACTUAL: Transformer Output')

  .section('COMPLIANCE VERIFICATION')

  .section('COMPLIANCE VERIFICATION')
  .test('Source Code Exact Match', () => ({
    passed: transformedCode === expectedCode,
    actual: transformedCode,
    expected: expectedCode,
    message: transformedCode === expectedCode
      ? 'Transformed code matches expected output exactly'
      : 'Transformed code does not match expected output'
  }))

  .test('Method Order and Inheritance', () => {
    const actual = query(transformedCode)
      .ClassDeclaration
      .MethodDefinition
      .name();

    const expected = query(expectedCode)
      .ClassDeclaration
      .MethodDefinition
      .name();

    const arraysEqual = (a, b) =>
      a.length === b.length && a.every((element, index) => element === b[index]);

    return {
      passed: arraysEqual(actual, expected),
      actual: actual.join(', '),
      expected: expected.join(', '),
      message: arraysEqual(actual, expected)
        ? 'Methods inherited and ordered correctly, overrides preserved'
        : 'Methods not properly inherited or ordered incorrectly'
    };
  })

  .test('Override Behavior', () => {
    // Verify that method 'b' from the topmost class is used, not base class
    // Get all Literals and check if the expected override value exists
    const literals = query(transformedCode)
      .ClassDeclaration
      .MethodDefinition
      .Literal
      .map(l => l.value);

    const hasTopOverride = literals.includes('b (top overwrite)');
    const hasBaseVersion = literals.includes('b base');
    const hasIntermediateVersion = literals.includes('b intermediate');

    return {
      passed: hasTopOverride && !hasBaseVersion && !hasIntermediateVersion,
      actual: literals.filter(l => l.startsWith('b')).join(', '),
      expected: 'b (top overwrite)',
      message: (hasTopOverride && !hasBaseVersion && !hasIntermediateVersion)
        ? 'Method override from topmost class correctly preserved'
        : 'Method override not properly handled - base or intermediate version found'
    };
  })

  .test('Inherited Method Presence', () => {
    const actual = query(transformedCode)
      .ClassDeclaration
      .MethodDefinition
      .name();

    // Check that all inherited methods are present
    const hasA = actual.includes('a');
    const hasB = actual.includes('b');
    const hasC = actual.includes('c');
    const hasD = actual.includes('d');
    const hasE = actual.includes('e');
    const allPresent = hasA && hasB && hasC && hasD && hasE;

    return {
      passed: allPresent,
      actual: actual.join(', '),
      expected: 'a, b, c, d, e',
      message: allPresent
        ? 'All methods from inheritance chain present'
        : 'Missing inherited methods'
    };
  })

  .exit();

// ═══════════════════════════════════════════════════════════════════════════════
// END OF TEST SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

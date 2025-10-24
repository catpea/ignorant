#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ORDER OF OPERATIONS TEST SPECIFICATION
// Classification: UNCLASSIFIED
// Document Control Number: MITS-2025-004
// ═══════════════════════════════════════════════════════════════════════════════

import { createTestSuite, VERBOSITY_LEVELS } from 'politician';
import { transform, formatCode } from '../index.js';
import query from '../query.js';

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 1: TEST CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

const suite = createTestSuite('Allow super() and super.method() to structure fused methods.', {
  verbosity: VERBOSITY_LEVELS.VERBOSE,
  classification: 'UNCLASSIFIED',
  documentId: 'MITS-2025-004',
  metadata: {
    purpose: 'Honoring super() and super.method() allow for flexible code ordering',
    author: 'Automated Test System',
    framework: 'Politician Test Framework v1.0'
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 2: TEST DATA PREPARATION
// ──────────────────────────────────────────────────────────────────────────────


const originalCode = `
class One {
  constructor() {
    console.log("line #2 | Mary Had a Little Lamb");
  }
  print() {
    console.log("line #6 | had");
  }
}
class Two extends One {
  constructor() {
    console.log("line #1 | ----------------------");
    super();
  }
  print() {
    super.print();
    console.log("line #7 | a little");
  }
}
class Three extends Two {
  constructor() {
    super();
    console.log("line #3 | by Sarah Josepha Hale ");
  }

  print() {
    console.log("line #5 | Mary");
    super.print();
  }
}
export class Mary extends Three {
  constructor() {
    super();
    console.log("line #4 | ----------------------");
    this.print();
  }
  print() {
    super.print();
    console.log("line #8 | lamb...");
  }
}
`;

const expectedCode = await formatCode(`
export default class Mary {
  constructor() {
    console.log("line #1 | ----------------------");
    console.log("line #2 | Mary Had a Little Lamb");
    console.log("line #3 | by Sarah Josepha Hale ");
    console.log("line #4 | ----------------------");
    this.print();
  }
  print(){
    console.log("line #5 | Mary");
    console.log("line #6 | had");
    console.log("line #7 | a little");
    console.log("line #8 | lamb...");
  }
}
`);

const transformedCode = await transform(originalCode, {exportOnly:true});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 3: TEST EXECUTION
// ──────────────────────────────────────────────────────────────────────────────

suite
  .header()
  .section('PRELIMINARY DOCUMENTATION')
  .subsection('Original Source Code')
  .javascript(originalCode, 'INPUT: Class heavily reliant on super()/super.method() for order of operations')
  .subsection('Expected Output')
  .javascript(expectedCode, 'EXPECTED: Correctly ordered methods')
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

  .exit();

// ═══════════════════════════════════════════════════════════════════════════════
// END OF TEST SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ONLY TEST SPECIFICATION
// Classification: UNCLASSIFIED
// Document Control Number: MITS-2025-003
// ═══════════════════════════════════════════════════════════════════════════════

import { createTestSuite, VERBOSITY_LEVELS } from 'politician';
import { transform, formatCode } from '../index.js';
import query from '../query.js';

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 1: TEST CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

const suite = createTestSuite('Output Only Export Classes Compliance in exportOnly mode', {
  verbosity: VERBOSITY_LEVELS.VERBOSE,
  classification: 'UNCLASSIFIED',
  documentId: 'MITS-2025-003',
  metadata: {
    purpose: 'Only the calsses marked export sould be included in transfomred output',
    author: 'Automated Test System',
    framework: 'Politician Test Framework v1.0'
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// SECTION 2: TEST DATA PREPARATION
// ──────────────────────────────────────────────────────────────────────────────


// NOTE: only Ape and Human are marked export
// NOTE: exportOnly:true is set in options await transform(originalCode, {exportOnly:true});

const originalCode = `
class Animal {
  animal(){ console.log('animal'); }
}
export class Ape extends Animal {
  ape(){ console.log('ape'); }
}
class Hominid extends Ape {
  hominid(){ console.log('hominid'); }
}
export class Human extends Hominid {
  human(){ console.log('human'); }
}
`;

const expectedCode = await formatCode(`
  export class Ape {
    ape() {
      console.log("ape")
    }
    animal() {
      console.log("animal")
    }
  }

  export class Human {
    human() {
      console.log("human")
    }
    animal() {
      console.log("animal")
    }
    ape() {
      console.log("ape")
    }
    hominid() {
      console.log("hominid")
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
  .javascript(originalCode, 'INPUT: exportOnly:true, Ape And Human Marked For Export')
  .subsection('Expected Output')
  .javascript(expectedCode, 'EXPECTED: Only Ape And Human Should Be Exported')
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

  .exit();

// ═══════════════════════════════════════════════════════════════════════════════
// END OF TEST SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

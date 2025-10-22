#!/usr/bin/env node

import { transform } from "../index.js";
import query from "../query.js";

const originalCode = `
export class Animal {
  c(){ console.log('c'); }
  b(){ console.log('b base'); }
}
export class Ape extends Animal {
  d(){ console.log('d'); }
  b(){ console.log('b intermediate'); }
}
export class Hominid extends Ape {
  e(){ console.log('e'); }
  b(){ console.log('b intermediate'); }
}
export class Human extends Hominid {
  a(){ console.log('a'); }
  b(){ console.log('b (top overwrite)'); }
}
`;
const expectedCode = `
export class Human extends Hominid {
  a(){ console.log('a'); }
  b(){ console.log('b (top overwrite)'); }
  c(){ console.log('c'); }
  d(){ console.log('d'); }
  e(){ console.log('e'); }
}
`;

const transformedCode = await transform(originalCode);

const actual = query(transformedCode).ClassDeclaration.MethodDefinition.name();
const expected = query(expectedCode).ClassDeclaration.MethodDefinition.name();

const arraysEqual = (a, b) => a.length === b.length && a.every((element, index) => element === b[index]);

if (! arraysEqual(actual, expected) ){
  console.error('Methods must be well structured');
  console.error('TEST FAILED: ACTUAL:', actual, 'NOT EQUAL TO EXPECTED:', expected, );
  process.exit(1);
}

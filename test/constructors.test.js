#!/usr/bin/env node
import { arraysEqual, print, printInfo,  printSuccess,  printError,  printDivider, printCode, printJavaScript } from './assert.js';

import { transform, formatCode } from '../index.js';
import query from '../query.js';

const originalCode = await formatCode(`
export class A {
  constructor(){ console.log('a'); }
}
export class B extends A {
  constructor(b){ console.log('b'); }
}
export class C extends B {
  constructor(c){ console.log('c'); }
}
export class D extends C {
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

printDivider('ORIGINAL CODE');
printJavaScript(originalCode);

printDivider('EXPECTED CODE');
printJavaScript(expectedCode);

const transformedCode = await transform(originalCode);

printDivider('TRANSFORMED CODE');

printJavaScript(transformedCode);

if (transformedCode == expectedCode ){
  printSuccess('RESULT: SOURCE CODE TEST PASS');
}else{
  printError('RESULT: SOURCE CODE TEST FAILED');
}

///

let failureCount = 0;

const actualMethodOrder   = query(transformedCode).ClassDeclaration.MethodDefinition.Literal.map(Literal=>Literal.value).join('');
const expectedMethodOrder = query(originalCode).ClassDeclaration.MethodDefinition.Literal.map(Literal=>Literal.value).join('');

if ( actualMethodOrder == expectedMethodOrder ){
  printSuccess('METHOD ORDER TEST PASS');
}else{
  failureCount++
  printError('METHOD ORDER TEST FAILED: Constructor payloads should be listed in standard OOP order of execution');
}

//

// const expectedArguments = query(expectedCode).ClassDeclaration.MethodDefinition({kind:constructor}).FunctionExpression.map(FunctionExpression=>FunctionExpression.params.map(o=>o.name)).flat(Infinity)[0];
// const actualArguments = query(transformedCode).ClassDeclaration.MethodDefinition({kind:constructor}).FunctionExpression.map(FunctionExpression=>FunctionExpression.params.map(o=>o.name)).flat(Infinity)[0];

const expectedArguments = query(expectedCode).ClassDeclaration.MethodDefinition.Identifier.map(o=>o.name)[0]
const actualArguments = query(transformedCode).ClassDeclaration.MethodDefinition.Identifier.map(o=>o.name)[0]

if ( expectedArguments == actualArguments ){
  printSuccess('CONSTRUCTOR ARGUMENTS TEST PASSED');
}else{
  failureCount++
  printError('CONSTRUCTOR ARGUMENTS TEST FAILED: Constructor arguments were incorrectly promoted');
}



process.exit(failureCount?1:0);

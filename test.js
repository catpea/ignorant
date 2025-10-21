#!/usr/bin/env node
import { suite, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { transform } from './index.js';
import query from './query.js';
suite('Transform Tests', () => {
  describe('friendly code structure', () => {
    it('should be well ordered', async () => {
      const code = `
        export class Animal {
          c(){ console.log('a'); }
          b(){ console.log('d base'); }
        }
        export class Ape extends Animal {
          d(){ console.log('b'); }
          b(){ console.log('d intermediate'); }
        }
        export class Hominid extends Animal {
          e(){ console.log('b'); }
          b(){ console.log('d intermediate'); }
        }
        export class Human extends Hominid {
          a(){ console.log('c'); }
          b(){ console.log('d top'); }
          // c - base class here as it sets foundation for what follows (intermediate)
          // d - middle intermediate here
          // e - last intermediate here
        }
      `;
      const transformed = await transform(code);
      const actual = query(transformed).ClassDeclaration.MethodDefinition.name();
      console.log(actual, [ 'a', 'b', 'c', 'd', 'e' ])
      assert.deepEqual(actual, [ 'a', 'b', 'c', 'd', 'e' ], 'a b define purpose, then with c we begin at the base, and move up one by one.');
    });
  });
});

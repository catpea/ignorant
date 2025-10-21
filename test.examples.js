#!/usr/bin/env node
import { suite, describe, it } from 'node:test';

import assert from 'node:assert/strict';

//NOTE: assert.equal(1, 1); is legacy! Use assert.strictEqual() instead.
// assert.doesNotMatch('I will fail', /fail/);
// assert.deepEqual([[[1, 2, 3]], 4, 5], [[[1, 2, '3']], 4, 5]);
// assert.strictEqual(1, 2);

suite('Command Tests', () => {
  describe('should work', () => {
    before(() => console.log('about to run some test'));
    after(() => console.log('finished running tests'));
    beforeEach(() => console.log('about to run a test'));
    afterEach(() => console.log('finished running a test'));
    it('should be 1', () => {
      assert.strictEqual(1, 1, 'should be 1');
    });
  });
});

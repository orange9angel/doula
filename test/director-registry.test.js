import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DirectorRegistry, registerDirector } from '../lib/DirectorRegistry.js';

test('registerDirector stores the class under the given name', () => {
  class FakeDirector {}
  registerDirector('FakeDirector', FakeDirector);
  assert.equal(DirectorRegistry.FakeDirector, FakeDirector);
});

test('registerDirector overwrites an existing registration', () => {
  class A {}
  class B {}
  registerDirector('Overwrite', A);
  registerDirector('Overwrite', B);
  assert.equal(DirectorRegistry.Overwrite, B);
});

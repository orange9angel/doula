import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  easeInOutQuad,
  lerp,
  clamp,
  smoothstep,
  parabolicHeight,
} from '../lib/MathUtils.js';

const EPS = 1e-9;

test('easeInOutQuad hits 0, 0.5, 1 at t = 0, 0.5, 1', () => {
  assert.equal(easeInOutQuad(0), 0);
  assert.equal(easeInOutQuad(0.5), 0.5);
  assert.ok(Math.abs(easeInOutQuad(1) - 1) < EPS);
  // ease-in 段慢于线性，ease-out 段快于线性
  assert.ok(easeInOutQuad(0.25) < 0.25);
  assert.ok(easeInOutQuad(0.75) > 0.75);
});

test('lerp interpolates linearly', () => {
  assert.equal(lerp(0, 10, 0), 0);
  assert.equal(lerp(0, 10, 1), 10);
  assert.equal(lerp(0, 10, 0.3), 3);
  assert.equal(lerp(2, 4, 0.5), 3);
});

test('clamp bounds values to [min, max]', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test('smoothstep hits endpoints and midpoint', () => {
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  assert.equal(smoothstep(0.5), 0.5);
});

test('parabolicHeight is zero at both ends and peaks mid-flight', () => {
  assert.equal(parabolicHeight(0, 1.5), 0);
  assert.ok(Math.abs(parabolicHeight(0.5, 1.5) - 1.5) < EPS);
  assert.ok(Math.abs(parabolicHeight(1, 1.5)) < EPS);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROCEDURAL_REGISTRY,
  listProceduralTypes,
  getProceduralInfo,
  parseProceduralSFXTag,
} from '../lib/ProceduralAudioProtocol.js';

test('listProceduralTypes returns a sorted list covering documented types', () => {
  const types = listProceduralTypes();
  const sorted = [...types].sort();
  assert.deepEqual(types, sorted);
  for (const t of ['gunfight', 'engine_idle', 'wind', 'rain', 'vault_hum', 'traffic']) {
    assert.ok(types.includes(t), `missing documented type: ${t}`);
  }
});

test('getProceduralInfo returns registry entry or null', () => {
  const wind = getProceduralInfo('wind');
  assert.equal(wind.category, 'nature');
  assert.deepEqual(wind.defaults, { intensity: 0.5 });
  assert.equal(getProceduralInfo('no_such_type'), null);
});

test('parseProceduralSFXTag parses params with numeric coercion', () => {
  const event = parseProceduralSFXTag(
    'Procedural|type=gunfight|start=36|end=40|density=0.6|volume=0.35'
  );
  assert.deepEqual(event, {
    type: 'gunfight',
    start: 36,
    end: 40,
    density: 0.6,
    volume: 0.35,
  });
});

test('parseProceduralSFXTag rejects empty body, wrong prefix and missing type', () => {
  assert.equal(parseProceduralSFXTag(''), null);
  assert.equal(parseProceduralSFXTag(null), null);
  assert.equal(parseProceduralSFXTag('Play|file=whoosh.wav'), null);
  assert.equal(parseProceduralSFXTag('Procedural|start=1|end=2'), null);
});

test('every registry entry declares params including duration', () => {
  for (const [type, info] of Object.entries(PROCEDURAL_REGISTRY)) {
    assert.ok(info.params.includes('duration'), `${type} missing duration param`);
    assert.ok(typeof info.description === 'string' && info.description.length > 0);
  }
});

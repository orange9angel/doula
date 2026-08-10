import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StoryParser } from '../lib/StoryParser.js';

const SAMPLE = `1
00:00:00,000 --> 00:00:02,500
@RoomScene
[Doraemon] 你好大雄！{WaveHand}
{Camera:ZoomIn|duration=2}

2
00:00:02,500 --> 00:00:05,000
@ParkScene
{Nobita}{SwingRacket|duration=0.6}
{Ball:Serve|from=Doraemon|to=Nobita|arcHeight=1.5|speed=8}

3
00:00:05,000 --> 00:00:06,000
{Position:Doraemon|coords=1,2,3}
{SFX:Procedural|type=wind|start=5|end=6|volume=0.2}
`;

test('parse returns one entry per SRT-style block with seconds timestamps', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.equal(entries.length, 3);

  assert.equal(entries[0].index, 1);
  assert.equal(entries[0].startTime, 0);
  assert.equal(entries[0].endTime, 2.5);

  assert.equal(entries[1].index, 2);
  assert.equal(entries[1].startTime, 2.5);
  assert.equal(entries[1].endTime, 5);
});

test('extracts @Scene and [Character] tags', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.equal(entries[0].scene, 'RoomScene');
  assert.equal(entries[0].character, 'Doraemon');
  assert.equal(entries[1].scene, 'ParkScene');
  // {Nobita}{SwingRacket} 是定向动画标签，不应被误识别为说话角色
  assert.equal(entries[1].character, null);
  assert.equal(entries[2].scene, null);
});

test('dialogue strips all tags, keeping only spoken text', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.equal(entries[0].dialogue, '你好大雄！');
  assert.equal(entries[1].dialogue, '');
});

test('bare capitalized tags become animation cues, namespaced tags do not', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.deepEqual(entries[0].animations, ['WaveHand']);
  assert.deepEqual(entries[0].animationCues, [{ name: 'WaveHand', options: {} }]);
});

test('{Character}{Action|params} produces a targeted animation cue', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.deepEqual(entries[1].animationCues, [
    { name: 'SwingRacket', options: { duration: 0.6 }, character: 'Nobita' },
  ]);
});

test('camera move params are parsed with numeric coercion', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.deepEqual(entries[0].cameraMove, { name: 'ZoomIn', options: { duration: 2 } });
  assert.equal(entries[1].cameraMove, null);
});

test('ball events keep string params and coerce numeric params', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.deepEqual(entries[1].ballEvents, [
    {
      name: 'Serve',
      options: { from: 'Doraemon', to: 'Nobita', arcHeight: 1.5, speed: 8 },
    },
  ]);
});

test('comma-separated values become arrays', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.deepEqual(entries[2].positions, [
    { name: 'Doraemon', options: { coords: [1, 2, 3] } },
  ]);
});

test('SFX namespaced tags land in sfxEvents', () => {
  const entries = StoryParser.parse(SAMPLE);
  assert.deepEqual(entries[2].sfxEvents, [
    { name: 'Procedural', options: { type: 'wind', start: 5, end: 6, volume: 0.2 } },
  ]);
});

test('handles CRLF line endings and skips malformed blocks', () => {
  const crlf = SAMPLE.replace(/\n/g, '\r\n');
  assert.equal(StoryParser.parse(crlf).length, 3);

  const malformed = `1
not a time line
some text

2
00:00:01,000 --> 00:00:02,000
[Doraemon] ok
`;
  const entries = StoryParser.parse(malformed);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].index, 2);
  assert.equal(entries[0].dialogue, 'ok');
});

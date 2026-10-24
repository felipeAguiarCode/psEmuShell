import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COMBO_RECORD_STABLE_MS } from '../../src/main/constants/input.js';
import {
  buildInitialRecording,
  calculateRecordingStep,
} from '../../src/main/input/combo-recorder.js';

const runSteps = (heldSteps) =>
  heldSteps.reduce(
    (state, [buttons, now]) =>
      state.result ? state : calculateRecordingStep(state.recording, new Set(buttons), now),
    { recording: buildInitialRecording(), result: null },
  );

describe('calculateRecordingStep', () => {
  it('waits for every button to be released before recording', () => {
    const state = runSteps([
      [['a'], 0],
      [[], 10],
    ]);
    assert.equal(state.result, null);
    assert.equal(state.recording.isArmed, true);
  });

  it('records the buttons in press order once they are released', () => {
    const state = runSteps([
      [[], 0],
      [['back'], 10],
      [['back', 'start'], 20],
      [['start'], 30],
      [[], 40],
    ]);
    assert.deepEqual(state.result, ['back', 'start']);
  });

  it('confirms a combo held steady long enough', () => {
    const state = runSteps([
      [[], 0],
      [['lb', 'rb', 'y'], 10],
      [['lb', 'rb', 'y'], 10 + COMBO_RECORD_STABLE_MS],
    ]);
    assert.deepEqual(state.result, ['lb', 'rb', 'y']);
  });

  it('replaces the combo when a different set is held', () => {
    const state = runSteps([
      [[], 0],
      [['a'], 10],
      [['x'], 20],
      [[], 30],
    ]);
    assert.deepEqual(state.result, ['x']);
  });
});

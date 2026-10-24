import {
  COMBO_RECORD_POLL_MS,
  COMBO_RECORD_STABLE_MS,
  COMBO_RECORD_TIMEOUT_MS,
} from '../constants/input.js';

export const buildInitialRecording = () => ({ isArmed: false, buttons: [], stableSince: 0 });

const isSameButtonSet = (buttons, heldButtons) =>
  buttons.length === heldButtons.size && buttons.every((button) => heldButtons.has(button));

const pickLargestButtonSet = (heldButtonSets) =>
  heldButtonSets.reduce((largest, held) => (held.size > largest.size ? held : largest), new Set());

export const calculateRecordingStep = (recording, heldButtons, now) => {
  if (!recording.isArmed) {
    return { recording: { ...recording, isArmed: heldButtons.size === 0 }, result: null };
  }
  if (heldButtons.size === 0) {
    return { recording, result: recording.buttons.length ? recording.buttons : null };
  }
  if (isSameButtonSet(recording.buttons, heldButtons)) {
    const isStable = now - recording.stableSince >= COMBO_RECORD_STABLE_MS;
    return { recording, result: isStable ? recording.buttons : null };
  }
  if (heldButtons.size < recording.buttons.length) return { recording, result: null };
  const buttons = [
    ...recording.buttons.filter((button) => heldButtons.has(button)),
    ...[...heldButtons].filter((button) => !recording.buttons.includes(button)),
  ];
  return { recording: { ...recording, buttons, stableSince: now }, result: null };
};

export const makeComboRecorder = ({ listHeldButtonSets, onProgress }) => {
  let pending = null;

  const finish = (result) => {
    if (!pending) return;
    const { resolve, pollTimer, timeoutTimer } = pending;
    pending = null;
    clearInterval(pollTimer);
    clearTimeout(timeoutTimer);
    resolve(result);
  };

  const record = () => {
    finish(null);
    return new Promise((resolve) => {
      let recording = buildInitialRecording();
      const pollTimer = setInterval(() => {
        const heldButtons = pickLargestButtonSet(listHeldButtonSets());
        const step = calculateRecordingStep(recording, heldButtons, Date.now());
        if (step.recording.buttons !== recording.buttons) onProgress(step.recording.buttons);
        recording = step.recording;
        if (step.result) finish(step.result);
      }, COMBO_RECORD_POLL_MS);
      const timeoutTimer = setTimeout(() => finish(null), COMBO_RECORD_TIMEOUT_MS);
      pending = { resolve, pollTimer, timeoutTimer };
    });
  };

  return { record, cancel: () => finish(null) };
};

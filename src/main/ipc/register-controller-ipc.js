import { ipcMain } from 'electron';
import { makeComboRecorder } from '../input/combo-recorder.js';

export const registerControllerIpc = ({ controllerHub, sendToRenderer }) => {
  const comboRecorder = makeComboRecorder({
    listHeldButtonSets: controllerHub.listHeldButtonSets,
    onProgress: (buttons) => sendToRenderer('combo:recording', buttons),
  });
  ipcMain.handle('pads:list', () => controllerHub.listControllers());
  ipcMain.handle('pads:assign', (_event, slot, key) => controllerHub.assignSlot(slot, key));
  ipcMain.handle('pads:clear', (_event, slot) => controllerHub.clearSlot(slot));
  ipcMain.handle('pads:autoAssign', (_event, isEnabled) => controllerHub.setAutoAssign(isEnabled));
  ipcMain.handle('pads:detect', () => controllerHub.detectController());
  ipcMain.handle('pads:cancelDetect', () => controllerHub.cancelDetection());
  ipcMain.handle('pads:watch', (_event, key) => controllerHub.watchController(key));
  ipcMain.handle('pads:rumble', (_event, key) => controllerHub.rumble(key));
  ipcMain.handle('combo:record', () => comboRecorder.record());
  ipcMain.handle('combo:cancelRecord', () => comboRecorder.cancel());
};

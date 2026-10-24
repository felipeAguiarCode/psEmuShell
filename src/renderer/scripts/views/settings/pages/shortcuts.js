import { invokeMain, listenToMain } from '../../../core/api.js';
import { escapeHtml, queryOne } from '../../../core/dom.js';
import { formatComboId, listComboButtons } from '../../../core/selectors.js';
import { formatButtonName, renderGlyph } from '../../../ui/glyphs.js';
import { ICONS } from '../../../ui/icons.js';
import { closeModal, openModal } from '../../../ui/modal.js';
import { showToast } from '../../../ui/toast.js';
import { HOLD_TIMES_MS, SHORTCUT_COMBOS } from '../settings-constants.js';

const OTHER_COMBO_KEY = { killCombo: 'homeCombo', homeCombo: 'killCombo' };

const buildComboSignature = (buttons) => [...buttons].sort().join('+');

const findPresetComboId = (comboId) =>
  SHORTCUT_COMBOS.find(
    (option) =>
      buildComboSignature(option.v.split('+')) === buildComboSignature(comboId.split('+')),
  )?.v ?? comboId;

const listComboOptions = (comboId) => {
  const combos = SHORTCUT_COMBOS.some((option) => option.v === comboId)
    ? SHORTCUT_COMBOS
    : [...SHORTCUT_COMBOS, { v: comboId }];
  return combos.map((option) => ({
    v: option.v,
    l: formatButtonName(option.v),
    html: renderGlyph(option.v),
  }));
};

const describeCombo = (config, comboKey, description) => {
  const buttons = listComboButtons(config[comboKey]);
  const otherButtons = listComboButtons(config[OTHER_COMBO_KEY[comboKey]]);
  if (buildComboSignature(buttons) === buildComboSignature(otherButtons))
    return '⚠ Igual ao outro atalho — escolha combinações diferentes.';
  if (buttons.length === 1)
    return `⚠ Só um botão: segurá-lo no jogo dispara o atalho. ${description}`;
  return `${description} Pressione para gravar · ◀ ▶ para as predefinições.`;
};

const renderRecordingPreview = (box, buttons) => {
  const preview = queryOne('.cr-preview', box);
  if (preview) preview.innerHTML = buttons.length ? renderGlyph(buttons.join('+')) : '—';
};

const recordCombo = async (context, comboKey, title) => {
  let box = null;
  let isClosed = false;
  const stopListening = listenToMain('combo:recording', (buttons) => {
    if (box) renderRecordingPreview(box, buttons);
  });
  const shown = openModal({
    className: 'pad-detect',
    html:
      `<div class="pd-wait"><div class="pd-pulse">${ICONS.gamepad}</div><h3>${escapeHtml(title)}</h3>` +
      '<div class="sub">Solte todos os botões e então segure a combinação que você quer.</div>' +
      '<div class="cr-preview">—</div>' +
      '<div class="sub faint">Solte os botões ou segure 1,5 s para confirmar · Esc ou 15 s para cancelar.</div></div>',
    hints: [],
    onButton: () => true,
    onKey: (event) => {
      if (event.key === 'Escape') invokeMain('combo:cancelRecord');
      return true;
    },
    onMount: (modalBox) => {
      box = modalBox;
    },
  });
  shown.then(() => {
    isClosed = true;
  });
  const buttons = await invokeMain('combo:record');
  stopListening();
  if (!isClosed) closeModal();
  if (!buttons) {
    showToast('Combinação não gravada', 'Nenhum botão foi pressionado.', {
      kind: 'padOff',
      ms: 2600,
    });
    return;
  }
  context.getDraft()[comboKey].buttons = buttons;
  context.changed();
  showToast('Combinação gravada', formatButtonName(buttons.join('+')), {
    kind: 'padOn',
    ms: 2600,
  });
};

const buildComboRows = (context, comboKey, title, description) => {
  const config = context.getDraft();
  const comboId = findPresetComboId(formatComboId(config[comboKey]));
  return [
    {
      type: 'select',
      label: 'Combinação',
      desc: describeCombo(config, comboKey, description),
      options: listComboOptions(comboId),
      get: () => comboId,
      set: (value) => {
        config[comboKey].buttons = value.split('+');
      },
      run: () => recordCombo(context, comboKey, title),
    },
    {
      type: 'select',
      label: 'Tempo segurando',
      desc: 'Quanto tempo os botões precisam ficar pressionados juntos.',
      options: HOLD_TIMES_MS.map((ms) => ({ v: ms, l: ms ? `${ms / 1000} s` : 'Imediato' })),
      get: () => config[comboKey].holdMs,
      set: (value) => {
        config[comboKey].holdMs = value;
      },
    },
  ];
};

export const buildShortcutsRows = (context) => {
  const config = context.getDraft();
  return [
    { type: 'title', label: 'Atalhos' },
    {
      type: 'info',
      label: 'Funcionam durante o jogo',
      desc: 'O launcher continua lendo o controle mesmo escondido atrás do emulador.',
    },
    { type: 'section', label: 'Fechar jogo e voltar ao launcher' },
    ...buildComboRows(
      context,
      'killCombo',
      'Fechar jogo e voltar ao launcher',
      'Encerra o emulador e volta para o launcher.',
    ),
    { type: 'section', label: 'Voltar ao launcher (sem fechar o jogo)' },
    ...buildComboRows(
      context,
      'homeCombo',
      'Voltar ao launcher',
      'Mostra o launcher por cima do jogo, com as opções Retomar e Fechar. Repita para voltar ao jogo.',
    ),
    { type: 'section', label: 'Teclado' },
    {
      type: 'toggle',
      label: 'Atalhos de teclado durante o jogo',
      desc: 'Ctrl+Shift+Q fecha o jogo · Ctrl+Shift+L volta ao launcher. Desative se conflitar com algum emulador.',
      get: () => config.keyboardShortcuts !== false,
      set: (value) => {
        config.keyboardShortcuts = value;
      },
    },
  ];
};

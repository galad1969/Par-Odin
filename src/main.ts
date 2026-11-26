import { registerSW } from 'virtual:pwa-register';
import { SoundEngine } from './audio.ts';
import { Board3D } from './board3d.ts';
import { CAMPAIGN_CHALLENGES, CHAPTERS, type ChapterId } from './campaign.ts';
import {
  decodeSeed,
  encodeSeed,
  evaluateArmy,
  FACE_INFO,
  filterCatalog,
  generateChallenge,
  mapSolutionToDice,
  pickHintPlacement,
  solveChallenge,
  type DieFace,
  type DieInstance,
  type GeneratorFilter,
  type Solution,
  type SolutionCountMode,
  type SpecialWhiteFace,
  type UnitFilterState,
  type WhiteFace,
} from './rules.ts';

type GameMode = 'campaign' | 'generator' | 'freeroll';

interface PersistedState {
  solvedCampaign: number[];
  muted: boolean;
}

const STORAGE_KEY = 'par-odin-3d-v1';

function loadStorage(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { solvedCampaign: [], muted: false };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      solvedCampaign: Array.isArray(parsed.solvedCampaign)
        ? parsed.solvedCampaign.filter((n): n is number => typeof n === 'number')
        : [],
      muted: Boolean(parsed.muted),
    };
  } catch {
    return { solvedCampaign: [], muted: false };
  }
}

function saveStorage(data: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

const persisted = loadStorage();
const solvedSet = new Set<number>(persisted.solvedCampaign);
const sound = new SoundEngine(persisted.muted);

// App state
let mode: GameMode = 'campaign';
let aidMode = false; // Mode Puriste par défaut (Q5)
let status: 'rolling' | 'playing' | 'won' | 'solution' = 'playing';
let campaignId = 1;
let dice: DieInstance[] = [];
let solutions: Solution[] = [];
let solutionIdx = 0;
let currentKey = '';
let currentSeed = '';
let freeRollFenrir = false;
let freeRollGuaranteeSolvable = false;
let genPanelOpen = false;
let toastTimer: number | null = null;

const genFilter: GeneratorFilter = {
  solutionMode: 'unique',
  hasFenrir: false,
  units: { traitre: 'allowed', maudit: 'allowed', mage: 'allowed' },
};

// DOM elements
const canvas = document.getElementById('board-canvas') as HTMLCanvasElement;
const contextBar = document.getElementById('context-bar')!;
const toastEl = document.getElementById('toast')!;
const solutionBar = document.getElementById('solution-bar')!;
const solutionEqEl = document.getElementById('solution-eq')!;
const solutionNavEl = document.getElementById('solution-nav')!;
const solutionIndexEl = document.getElementById('solution-index')!;
const btnAid = document.getElementById('btn-aid')!;
const aidLabel = document.getElementById('aid-label')!;
const btnLandscape = document.getElementById('btn-landscape') as HTMLButtonElement;
const btnInstall = document.getElementById('btn-install') as HTMLButtonElement;
const btnSound = document.getElementById('btn-sound')!;
const btnVerify = document.getElementById('btn-verify') as HTMLButtonElement;
const btnImpossible = document.getElementById('btn-impossible') as HTMLButtonElement;
const btnHint = document.getElementById('btn-hint') as HTMLButtonElement;
const btnSolution = document.getElementById('btn-solution') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const modalBackdrop = document.getElementById('modal-backdrop')!;
const modalBox = document.getElementById('modal-box')!;

const board = new Board3D(canvas, sound, (dieId, targetZone) => {
  if (status === 'rolling') return;
  let statusChanged = false;
  if (status === 'solution' || status === 'won') {
    status = 'playing';
    statusChanged = true;
    solutionBar.classList.add('hidden');
  }
  const d = dice.find((x) => x.id === dieId);
  if (!d || d.lockedByHint) return;
  d.zone = targetZone;
  sound.playMove();
  syncBoardAndUI(statusChanged);
});

function showToast(msg: string, tone: 'info' | 'ok' | 'err' = 'info', durationMs = 3200) {
  toastEl.textContent = msg;
  toastEl.className = `toast ${tone}`;
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.add('hidden');
  }, durationMs);
}

function buildDiceInstances(whiteFaces: readonly WhiteFace[], hasFenrir: boolean): DieInstance[] {
  const list: DieInstance[] = whiteFaces.map((face, i) => ({
    id: i,
    isBlack: false,
    face,
    zone: 'reserve',
    lockedByHint: false,
  }));
  if (hasFenrir) {
    list.push({
      id: list.length,
      isBlack: true,
      face: 'fenrir',
      zone: 'reserve',
      lockedByHint: false,
    });
  }
  return list;
}

function syncBoardAndUI(refreshContext = false) {
  const leftDice = dice.filter((d) => d.zone === 'left');
  const rightDice = dice.filter((d) => d.zone === 'right');
  const leftEval = evaluateArmy(leftDice);
  const rightEval = evaluateArmy(rightDice);

  const showAid = aidMode || status === 'won' || status === 'solution';
  board.syncDice(dice, { showAid, leftEval, rightEval });

  // Action bar states
  const allPlaced = dice.length > 0 && dice.every((d) => d.zone !== 'reserve');
  const rolling = status === 'rolling';
  const playing = status === 'playing';
  btnVerify.disabled = !playing || !allPlaced;
  btnHint.disabled = !playing;
  btnSolution.disabled = rolling;
  btnReset.disabled = rolling;

  const showImpossible = mode === 'freeroll' && !freeRollGuaranteeSolvable;
  btnImpossible.classList.toggle('hidden', !showImpossible);
  btnImpossible.disabled = !playing;

  btnAid.classList.toggle('aid-active', aidMode);
  aidLabel.textContent = aidMode ? 'Mode Aide' : 'Mode Puriste';
  btnSound.textContent = sound.isMuted() ? '🔇' : '🔊';

  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  if (refreshContext) renderContextBar();
}

function launchGuidedChallenge(whiteFaces: readonly WhiteFace[], hasFenrir: boolean) {
  status = 'rolling';
  solutionBar.classList.add('hidden');
  dice = buildDiceInstances(whiteFaces, hasFenrir);
  solutions = solveChallenge(whiteFaces, hasFenrir);
  solutionIdx = 0;
  currentSeed = encodeSeed(whiteFaces, hasFenrir);

  board.rollDice(dice, true, () => {
    status = 'playing';
    syncBoardAndUI(true);
  });
  syncBoardAndUI(true);
}

function startCampaignChallenge(id: number) {
  mode = 'campaign';
  campaignId = id;
  const ch = CAMPAIGN_CHALLENGES.find((c) => c.id === id) ?? CAMPAIGN_CHALLENGES[0];
  currentKey = `campaign-${ch.id}`;
  updateUrlSeed(null);
  launchGuidedChallenge(ch.whiteFaces, ch.hasFenrir);
}

function startGeneratedChallenge() {
  mode = 'generator';
  const entry = generateChallenge(genFilter, currentKey);
  if (!entry) {
    showToast('Aucun défi ne correspond à ces filtres. Assouplis une contrainte !', 'err', 4200);
    syncBoardAndUI(true);
    return;
  }
  currentKey = entry.key;
  updateUrlSeed(encodeSeed(entry.whiteFaces, entry.hasFenrir));
  launchGuidedChallenge(entry.whiteFaces, entry.hasFenrir);
}

function startFreeRoll() {
  mode = 'freeroll';
  status = 'rolling';
  solutionBar.classList.add('hidden');
  updateUrlSeed(null);

  if (freeRollGuaranteeSolvable) {
    // Pick uniformly among solvable physical rolls via rejection sampling
    let whiteFaces: WhiteFace[] = [];
    for (let tries = 0; tries < 80; tries++) {
      const pool: WhiteFace[] = ['heros', 'capitaine', 'soldat', 'traitre', 'maudit', 'mage'];
      whiteFaces = Array.from({ length: 7 }, () => pool[Math.floor(Math.random() * 6)]);
      if (solveChallenge(whiteFaces, freeRollFenrir).length > 0) break;
    }
    launchGuidedChallenge(whiteFaces, freeRollFenrir);
    return;
  }

  // Truly unguided physical roll: resting top faces decide the puzzle!
  const placeholder: WhiteFace[] = Array(7).fill('heros');
  dice = buildDiceInstances(placeholder, freeRollFenrir);
  solutions = [];
  solutionIdx = 0;
  currentSeed = '';

  board.rollDice(dice, false, (finalFaces) => {
    finalFaces.forEach((f, idx) => {
      dice[idx].face = f;
    });
    const whites = finalFaces.filter((f): f is WhiteFace => f !== 'fenrir');
    solutions = solveChallenge(whites, freeRollFenrir);
    currentSeed = encodeSeed(whites, freeRollFenrir);
    status = 'playing';
    syncBoardAndUI(true);
  });
  syncBoardAndUI(true);
}

function updateUrlSeed(seed: string | null) {
  const url = new URL(window.location.href);
  if (seed) url.searchParams.set('seed', seed);
  else url.searchParams.delete('seed');
  window.history.replaceState(null, '', url.toString());
}

function applySolutionIndex(idx: number) {
  if (solutions.length === 0) return;
  solutionIdx = (idx + solutions.length) % solutions.length;
  const sol = solutions[solutionIdx];
  const mapping = mapSolutionToDice(dice, sol);
  for (const d of dice) {
    d.lockedByHint = false;
    d.zone = mapping.get(d.id) ?? 'right';
  }
  status = 'solution';
  solutionBar.classList.remove('hidden');
  solutionEqEl.innerHTML = `<span>${sol.leftEquation}</span><span class="eq-sep">⚖</span><span>${sol.rightEquation}</span>`;
  solutionIndexEl.textContent = `Solution ${solutionIdx + 1} / ${solutions.length}`;
  solutionNavEl.classList.toggle('hidden', solutions.length <= 1);
  syncBoardAndUI(true);
}

function openModal(html: string) {
  modalBox.innerHTML = html;
  modalBackdrop.classList.remove('hidden');
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
}

function showRulesModal() {
  const rows = (Object.keys(FACE_INFO) as DieFace[])
    .map((f) => {
      const info = FACE_INFO[f];
      return `
        <div class="rule-row">
          <span class="rule-chip" style="border-color:${info.color};color:${info.color}">${info.badge}</span>
          <div>
            <strong>${info.name}</strong>
            <p>${info.rule}</p>
          </div>
        </div>
      `;
    })
    .join('');

  openModal(`
    <div class="modal-head">
      <h2>Règles de Par Odin</h2>
      <button class="mini-btn" data-close-modal>✕</button>
    </div>
    <p class="modal-lead">
      Répartis <strong>tous les dés</strong> en <strong>deux armées</strong> de force strictement égale
      (chaque armée doit compter <strong>au moins 1 guerrier blanc</strong>).
    </p>
    <div class="rules-grid">${rows}</div>
    <p class="modal-footnote">
      <strong>Contrôles 3D :</strong> glisse un dé vers un camp, clique/tape pour cycler (Réserve → Gauche → Droite → Réserve),
      ou clic droit PC pour envoyer directement à droite. Glisse le fond pour orienter la caméra.
    </p>
  `);
}

function showCampaignDrawer() {
  const chapters: ChapterId[] = ['brokk', 'loki', 'frigg'];
  const sections = chapters
    .map((cid) => {
      const chInfo = CHAPTERS[cid];
      const items = CAMPAIGN_CHALLENGES.filter((c) => c.chapter === cid)
        .map((c) => {
          const solved = solvedSet.has(c.id);
          const active = mode === 'campaign' && campaignId === c.id;
          return `<button class="ch-cell${solved ? ' solved' : ''}${active ? ' active' : ''}" data-pick-ch="${c.id}">
            <span>${String(c.id).padStart(2, '0')}</span>
            ${solved ? '<small>✓</small>' : ''}
          </button>`;
        })
        .join('');
      return `
        <div class="ch-group">
          <div class="ch-group-head" style="border-left: 4px solid ${chInfo.accent}">
            <strong>${chInfo.name}</strong> — <span>${chInfo.subtitle}</span>
            <p>${chInfo.intro}</p>
          </div>
          <div class="ch-grid">${items}</div>
        </div>
      `;
    })
    .join('');

  openModal(`
    <div class="modal-head">
      <h2>Campagne Officielle (${solvedSet.size} / 18 résolus)</h2>
      <button class="mini-btn" data-close-modal>✕</button>
    </div>
    ${sections}
  `);
}

function showLoadSeedModal() {
  openModal(`
    <div class="modal-head">
      <h2>Charger un code de défi</h2>
      <button class="mini-btn" data-close-modal>✕</button>
    </div>
    <p class="modal-lead">Saisis un code partagé (ex. <code>ODIN-HHCSSMG-F1</code>) :</p>
    <div class="seed-form">
      <input id="seed-input" type="text" value="${currentSeed}" placeholder="ODIN-HHHCSSS-F0" autocomplete="off" />
      <button id="btn-seed-go" class="action-btn primary">Charger</button>
    </div>
  `);
  const input = document.getElementById('seed-input') as HTMLInputElement;
  input.focus();
  input.select();
  document.getElementById('btn-seed-go')?.addEventListener('click', () => {
    const decoded = decodeSeed(input.value);
    if (!decoded) {
      showToast('Code invalide. Format attendu : ODIN-7LETTRES-F0/F1.', 'err');
      return;
    }
    mode = 'generator';
    currentKey = '';
    closeModal();
    updateUrlSeed(encodeSeed(decoded.whiteFaces, decoded.hasFenrir));
    launchGuidedChallenge(decoded.whiteFaces, decoded.hasFenrir);
  });
}

function confirmAndShowSolution() {
  if (solutions.length === 0) {
    sound.playHint();
    showToast('Ce tirage ne possède aucune solution possible (0 solution).', 'info', 4200);
    return;
  }

  const shouldConfirm = status === 'playing';
  if (!shouldConfirm) {
    applySolutionIndex(0);
    return;
  }

  const campaignNote =
    mode === 'campaign' ? ' Ce défi ne sera pas marqué comme résolu.' : '';
  openModal(`
    <div class="modal-head">
      <h2>Révéler la solution ?</h2>
      <button class="mini-btn" data-close-modal>✕</button>
    </div>
    <p class="modal-lead">
      Les dés 3D vont se ranger automatiquement dans une répartition gagnante (${solutions.length} solution${solutions.length > 1 ? 's' : ''} au total).${campaignNote}
    </p>
    <div class="modal-actions">
      <button class="action-btn subtle" data-close-modal>Continuer à chercher</button>
      <button id="btn-confirm-sol" class="action-btn primary">Afficher la solution</button>
    </div>
  `);
  document.getElementById('btn-confirm-sol')?.addEventListener('click', () => {
    closeModal();
    sound.playHint();
    applySolutionIndex(0);
  });
}

function renderContextBar() {
  if (mode === 'campaign') {
    const ch = CAMPAIGN_CHALLENGES.find((c) => c.id === campaignId) ?? CAMPAIGN_CHALLENGES[0];
    const chap = CHAPTERS[ch.chapter];
    const solved = solvedSet.has(ch.id);
    contextBar.innerHTML = `
      <div class="ctx-row">
        <span class="chapter-pill" style="background:${chap.accent}24;border-color:${chap.accent};color:${chap.accent}">
          ${chap.name}
        </span>
        <div class="ch-stepper">
          <button class="mini-btn" id="btn-ch-prev" ${ch.id <= 1 ? 'disabled' : ''}>◀</button>
          <button class="mini-btn strong" id="btn-ch-drawer">
            Défi ${String(ch.id).padStart(2, '0')} / 18 ${solved ? '✓' : ''}
          </button>
          <button class="mini-btn" id="btn-ch-next" ${ch.id >= 18 ? 'disabled' : ''}>▶</button>
        </div>
        <span class="sol-badge">1 solution unique</span>
      </div>
      ${ch.ruleTip ? `<p class="ctx-tip">${ch.ruleTip}</p>` : ''}
      <p class="ctx-quote">« ${ch.quote} » — <span>${ch.author}</span></p>
    `;
    document.getElementById('btn-ch-prev')?.addEventListener('click', () => startCampaignChallenge(ch.id - 1));
    document.getElementById('btn-ch-next')?.addEventListener('click', () => startCampaignChallenge(ch.id + 1));
    document.getElementById('btn-ch-drawer')?.addEventListener('click', showCampaignDrawer);
    return;
  }

  if (mode === 'generator') {
    const matchCount = filterCatalog(genFilter).length;
    const solLabel =
      status === 'rolling'
        ? 'Calcul...'
        : `${solutions.length} solution${solutions.length > 1 ? 's' : ''} possible${solutions.length > 1 ? 's' : ''}`;

    const unitPill = (face: SpecialWhiteFace, label: string) => {
      const st = genFilter.units[face];
      const text = st === 'forbidden' ? 'Interdit' : st === 'required' ? 'Requis ≥1' : 'Autorisé';
      return `<button class="unit-pill state-${st}" data-unit="${face}">${label} : <strong>${text}</strong></button>`;
    };

    contextBar.innerHTML = `
      <div class="ctx-row">
        <button class="mini-btn primary-mini" id="btn-gen-new">🎲 Générer (${matchCount})</button>
        <span class="sol-badge">${solLabel}</span>
        <button class="mini-btn" id="btn-gen-toggle">${genPanelOpen ? 'Masquer filtres ▲' : 'Filtres ▼'}</button>
        <button class="mini-btn" id="btn-seed-copy" title="Copier le lien du défi">🔗 ${currentSeed || 'Seed'}</button>
        <button class="mini-btn" id="btn-seed-open" title="Charger un code de défi">Saisir code</button>
      </div>
      <div class="gen-panel${genPanelOpen ? '' : ' hidden'}">
        <div class="gen-group">
          <span class="gen-label">Solutions :</span>
          <button class="chip-btn${genFilter.solutionMode === 'unique' ? ' active' : ''}" data-solmode="unique">Unique (1)</button>
          <button class="chip-btn${genFilter.solutionMode === 'multiple' ? ' active' : ''}" data-solmode="multiple">Multiples (2+)</button>
          <button class="chip-btn${genFilter.solutionMode === 'solvable' ? ' active' : ''}" data-solmode="solvable">Solvable (≥1)</button>
        </div>
        <div class="gen-group">
          <span class="gen-label">Unités :</span>
          ${unitPill('traitre', 'Traître')}
          ${unitPill('maudit', 'Maudit')}
          ${unitPill('mage', 'Mage')}
          <button class="unit-pill state-${genFilter.hasFenrir ? 'required' : 'forbidden'}" id="btn-gen-fenrir">
            Fenrir : <strong>${genFilter.hasFenrir ? 'Avec' : 'Sans'}</strong>
          </button>
        </div>
        <div class="gen-group">
          <span class="gen-label">Préréglages :</span>
          <button class="chip-btn" data-preset="brokk">Brokk</button>
          <button class="chip-btn" data-preset="loki">Loki</button>
          <button class="chip-btn" data-preset="frigg">Frigg (Fenrir)</button>
        </div>
      </div>
    `;

    document.getElementById('btn-gen-new')?.addEventListener('click', startGeneratedChallenge);
    document.getElementById('btn-gen-toggle')?.addEventListener('click', () => {
      genPanelOpen = !genPanelOpen;
      renderContextBar();
    });
    document.getElementById('btn-seed-copy')?.addEventListener('click', async () => {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `Par Odin — Défi ${currentSeed}`,
            text: `Résous ce défi Par Odin (${currentSeed}) :`,
            url: window.location.href,
          });
          return;
        } catch {
          // User cancelled or share unsupported in context; fallback to clipboard
        }
      }
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast(`Lien copié (${currentSeed}) !`, 'ok', 2400);
      } catch {
        showToast(`Code du défi : ${currentSeed}`, 'info', 3500);
      }
    });
    document.getElementById('btn-seed-open')?.addEventListener('click', showLoadSeedModal);

    contextBar.querySelectorAll<HTMLButtonElement>('[data-solmode]').forEach((b) => {
      b.addEventListener('click', () => {
        genFilter.solutionMode = b.dataset.solmode as SolutionCountMode;
        renderContextBar();
      });
    });

    const cycle: Record<UnitFilterState, UnitFilterState> = {
      allowed: 'required',
      required: 'forbidden',
      forbidden: 'allowed',
    };
    contextBar.querySelectorAll<HTMLButtonElement>('[data-unit]').forEach((b) => {
      b.addEventListener('click', () => {
        const face = b.dataset.unit as SpecialWhiteFace;
        genFilter.units[face] = cycle[genFilter.units[face]];
        renderContextBar();
      });
    });
    document.getElementById('btn-gen-fenrir')?.addEventListener('click', () => {
      genFilter.hasFenrir = !genFilter.hasFenrir;
      renderContextBar();
    });

    contextBar.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => {
      b.addEventListener('click', () => {
        const p = b.dataset.preset;
        if (p === 'brokk') {
          genFilter.hasFenrir = false;
          genFilter.units = { traitre: 'allowed', maudit: 'allowed', mage: 'forbidden' };
        } else if (p === 'loki') {
          genFilter.hasFenrir = false;
          genFilter.units = { traitre: 'allowed', maudit: 'allowed', mage: 'required' };
        } else if (p === 'frigg') {
          genFilter.hasFenrir = true;
          genFilter.units = { traitre: 'allowed', maudit: 'allowed', mage: 'allowed' };
        }
        renderContextBar();
      });
    });
    return;
  }

  // Free roll mode
  const revealCount = aidMode || status === 'won' || status === 'solution';
  const countText =
    status === 'rolling'
      ? 'Lancer en cours...'
      : revealCount
        ? `${solutions.length} solution${solutions.length > 1 ? 's' : ''}`
        : freeRollGuaranteeSolvable
          ? 'Tirage garanti solvable'
          : 'Solutions masquées (Puriste)';

  contextBar.innerHTML = `
    <div class="ctx-row">
      <button class="mini-btn primary-mini" id="btn-roll-free">🎲 Lancer les dés</button>
      <label class="toggle-check">
        <input type="checkbox" id="chk-free-fenrir" ${freeRollFenrir ? 'checked' : ''} />
        Inclure Fenrir
      </label>
      <label class="toggle-check">
        <input type="checkbox" id="chk-free-solvable" ${freeRollGuaranteeSolvable ? 'checked' : ''} />
        Garantir ≥ 1 solution
      </label>
      <span class="sol-badge">${countText}</span>
    </div>
  `;
  document.getElementById('btn-roll-free')?.addEventListener('click', startFreeRoll);
  document.getElementById('chk-free-fenrir')?.addEventListener('change', (e) => {
    freeRollFenrir = (e.target as HTMLInputElement).checked;
    startFreeRoll();
  });
  document.getElementById('chk-free-solvable')?.addEventListener('change', (e) => {
    freeRollGuaranteeSolvable = (e.target as HTMLInputElement).checked;
    if (freeRollGuaranteeSolvable && solutions.length === 0) {
      startFreeRoll();
    } else {
      syncBoardAndUI(true);
    }
  });
}

// Wire top bar & action bar controls
document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.mode as GameMode;
    if (next === mode) return;
    if (next === 'campaign') startCampaignChallenge(campaignId);
    else if (next === 'generator') startGeneratedChallenge();
    else startFreeRoll();
  });
});

btnAid.addEventListener('click', () => {
  aidMode = !aidMode;
  syncBoardAndUI(true);
});

document.getElementById('btn-rules')!.addEventListener('click', showRulesModal);
document.getElementById('btn-camera')!.addEventListener('click', () => board.resetCamera());
btnSound.addEventListener('click', () => {
  sound.setMuted(!sound.isMuted());
  saveStorage({ solvedCampaign: [...solvedSet], muted: sound.isMuted() });
  syncBoardAndUI();
});

btnVerify.addEventListener('click', () => {
  if (status !== 'playing') return;
  const leftDice = dice.filter((d) => d.zone === 'left');
  const rightDice = dice.filter((d) => d.zone === 'right');
  const leftEval = evaluateArmy(leftDice);
  const rightEval = evaluateArmy(rightDice);

  if (!leftEval.valid || !rightEval.valid) {
    sound.playError();
    showToast('Chaque armée doit contenir au moins 1 guerrier (face blanche) !', 'err');
    return;
  }

  if (leftEval.total === rightEval.total) {
    status = 'won';
    sound.playVictory();
    if (mode === 'campaign') {
      solvedSet.add(campaignId);
      saveStorage({ solvedCampaign: [...solvedSet], muted: sound.isMuted() });
    }
    showToast(`Par Odin ! Égalité parfaite : ${leftEval.equation}  ⚖  ${rightEval.equation}`, 'ok', 5200);
    syncBoardAndUI(true);
  } else {
    sound.playError();
    // Mode Puriste ne révèle jamais les totaux en cas d'échec (Q12=A)
    const msg = aidMode
      ? `Déséquilibre : Armée Gauche (${leftEval.total}) ≠ Armée Droite (${rightEval.total}).`
      : 'Les deux armées ne sont pas de force égale ! Vérifie tes calculs.';
    showToast(msg, 'err', 3400);
  }
});

btnImpossible.addEventListener('click', () => {
  if (status !== 'playing') return;
  if (solutions.length === 0) {
    status = 'won';
    sound.playVictory();
    showToast('Bien vu ! Ce tirage est mathématiquement impossible (0 solution).', 'ok', 4500);
    syncBoardAndUI(true);
  } else {
    sound.playError();
    // Message sans spoiler en Mode Puriste (Q17=A)
    showToast('Faux : au moins une répartition équilibrée existe ! Continue à chercher.', 'err', 3600);
  }
});

btnHint.addEventListener('click', () => {
  if (status !== 'playing') return;
  if (solutions.length === 0) {
    sound.playHint();
    showToast('Indice : aucune répartition équilibrée n’existe pour ce tirage !', 'info', 4000);
    return;
  }
  const placement = pickHintPlacement(dice, solutions);
  if (!placement) {
    showToast('Tous les dés clés possibles sont déjà verrouillés par indice.', 'info');
    return;
  }
  const dLeft = dice.find((d) => d.id === placement.leftDieId)!;
  const dRight = dice.find((d) => d.id === placement.rightDieId)!;
  dLeft.zone = 'left';
  dLeft.lockedByHint = true;
  dRight.zone = 'right';
  dRight.lockedByHint = true;
  sound.playHint();
  showToast('Indice : 2 dés clés (1 par armée) ont été verrouillés avec un halo doré.', 'info', 3000);
  syncBoardAndUI();
});

btnSolution.addEventListener('click', confirmAndShowSolution);

btnReset.addEventListener('click', () => {
  if (status === 'rolling') return;
  const statusChanged = status !== 'playing';
  status = 'playing';
  solutionBar.classList.add('hidden');
  for (const d of dice) {
    d.zone = 'reserve';
    d.lockedByHint = false;
  }
  sound.playMove();
  syncBoardAndUI(statusChanged);
});

document.getElementById('btn-sol-prev')!.addEventListener('click', () => applySolutionIndex(solutionIdx - 1));
document.getElementById('btn-sol-next')!.addEventListener('click', () => applySolutionIndex(solutionIdx + 1));
document.getElementById('btn-sol-close')!.addEventListener('click', () => {
  solutionBar.classList.add('hidden');
  status = 'playing';
  for (const d of dice) {
    d.zone = 'reserve';
    d.lockedByHint = false;
  }
  syncBoardAndUI(true);
});

modalBackdrop.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target === modalBackdrop || target.closest('[data-close-modal]')) {
    closeModal();
    return;
  }
  const pickBtn = target.closest<HTMLElement>('[data-pick-ch]');
  if (pickBtn) {
    closeModal();
    startCampaignChallenge(Number(pickBtn.dataset.pickCh));
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// PWA & Android install flow
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function tryLockLandscape() {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
  };
  if (orientation && typeof orientation.lock === 'function') {
    void orientation.lock('landscape').catch(() => {
      // Browsers require fullscreen or standalone mode to lock orientation
    });
  }
}

function setupMobileInstall() {
  const win = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
    navigator: Navigator & { standalone?: boolean };
  };
  const isNative = Boolean(win.Capacitor?.isNativePlatform?.());
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || win.navigator.standalone === true;

  if (!isNative && 'serviceWorker' in navigator) {
    registerSW({ immediate: true });
  }

  // Attempt landscape lock immediately (works automatically in standalone PWA / WebAPK / APK)
  tryLockLandscape();

  const updateLandscapeButton = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    const isTouchMobile = window.matchMedia('(pointer: coarse)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    const canShow = !isNative && isTouchMobile && isPortrait;
    btnLandscape.classList.toggle('hidden', !canShow);
  };

  window.addEventListener('resize', updateLandscapeButton);
  window.addEventListener('orientationchange', () => {
    updateLandscapeButton();
    if (isStandalone) tryLockLandscape();
  });
  updateLandscapeButton();

  btnLandscape.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape');
        updateLandscapeButton();
        return;
      }
    } catch {
      // Orientation lock unsupported (e.g. iOS Safari or blocked by browser)
    }
    showToast('Pivote ton téléphone à l’horizontale pour le mode Paysage.', 'info', 3000);
  });

  if (isNative || isStandalone) {
    btnInstall.classList.add('hidden');
    return;
  }

  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  const updateInstallVisibility = () => {
    const show = Boolean(deferredPrompt) || isIOS || isAndroid;
    btnInstall.classList.toggle('hidden', !show);
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    updateInstallVisibility();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    btnInstall.classList.add('hidden');
    showToast('Par Odin est installé sur ton appareil !', 'ok', 3200);
  });

  btnInstall.addEventListener('click', async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          deferredPrompt = null;
          btnInstall.classList.add('hidden');
        }
        return;
      } catch {
        // Fallback to instruction modal if prompt fails
      }
    }
    if (isIOS) {
      openModal(`
        <div class="modal-head">
          <h2>Installer sur iPhone / iPad</h2>
          <button class="mini-btn" data-close-modal>✕</button>
        </div>
        <p class="modal-lead">
          1. Appuie sur le bouton <strong>Partager</strong> dans Safari.<br />
          2. Fais défiler et touche <strong>Sur l'écran d'accueil</strong>.
        </p>
        <div class="modal-actions">
          <button class="action-btn primary" data-close-modal>Compris</button>
        </div>
      `);
      return;
    }
    const previewNote = window.location.hostname.includes('.run.app')
      ? '<br /><br /><small>Note : sur l’adresse privée d’aperçu AI Studio, Chrome Android ne permet souvent qu’un raccourci. Pour une vraie installation hors-ligne ou un fichier APK, utilise une adresse publique ou le projet <code>android/</code>.</small>'
      : '';
    openModal(`
      <div class="modal-head">
        <h2>Installer sur Android</h2>
        <button class="mini-btn" data-close-modal>✕</button>
      </div>
      <p class="modal-lead">
        Pour installer l'application sur ton téléphone :<br /><br />
        1. Ouvre le menu <strong>⋮</strong> (les trois petits points) en haut à droite de <strong>Chrome</strong>.<br />
        2. Touche <strong>Installer l'application</strong> (ou <strong>Ajouter à l'écran d'accueil</strong>).<br /><br />
        L'icône apparaîtra sur ton bureau et tu pourras y jouer en plein écran, même hors-ligne !${previewNote}
      </p>
      <div class="modal-actions">
        <button class="action-btn primary" data-close-modal>Compris</button>
      </div>
    `);
  });

  updateInstallVisibility();
}

setupMobileInstall();

// Boot: load shared ?seed= if present, else start at first unsolved campaign challenge
const urlSeed = new URLSearchParams(window.location.search).get('seed');
const decodedUrl = urlSeed ? decodeSeed(urlSeed) : null;
if (decodedUrl) {
  mode = 'generator';
  launchGuidedChallenge(decodedUrl.whiteFaces, decodedUrl.hasFenrir);
} else {
  const nextUnsolved = CAMPAIGN_CHALLENGES.find((c) => !solvedSet.has(c.id))?.id ?? 1;
  startCampaignChallenge(nextUnsolved);
}

export type WhiteFace = 'heros' | 'capitaine' | 'soldat' | 'traitre' | 'maudit' | 'mage';
export type BlackFace = 'fenrir';
export type DieFace = WhiteFace | BlackFace;
export type Zone = 'reserve' | 'left' | 'right';

export interface DieInstance {
  id: number;
  isBlack: boolean;
  face: DieFace;
  zone: Zone;
  lockedByHint: boolean;
}

export interface DieContribution {
  dieId: number;
  face: DieFace;
  baseValue: number | null;
  effectiveValue: number | null;
  cancelledByDieId?: number;
  boostedByFenrirId?: number;
}

export interface ArmyEvaluation {
  valid: boolean;
  total: number;
  contributions: DieContribution[];
  equation: string;
}

export interface Solution {
  left: DieFace[];
  right: DieFace[];
  leftEquation: string;
  rightEquation: string;
  key: string;
}

export type SpecialWhiteFace = 'traitre' | 'maudit' | 'mage';
export type UnitFilterState = 'forbidden' | 'allowed' | 'required';
export type SolutionCountMode = 'unique' | 'multiple' | 'solvable';

export interface GeneratorFilter {
  solutionMode: SolutionCountMode;
  hasFenrir: boolean;
  units: Record<SpecialWhiteFace, UnitFilterState>;
}

export interface CatalogEntry {
  whiteFaces: WhiteFace[];
  hasFenrir: boolean;
  solutionCount: number;
  key: string;
}

export const WHITE_FACES: readonly WhiteFace[] = [
  'heros',
  'capitaine',
  'soldat',
  'traitre',
  'maudit',
  'mage',
];

const FACE_ORDER: Record<DieFace, number> = {
  heros: 0,
  capitaine: 1,
  soldat: 2,
  traitre: 3,
  maudit: 4,
  mage: 5,
  fenrir: 6,
};

const FACE_CODE: Record<WhiteFace, string> = {
  heros: 'H',
  capitaine: 'C',
  soldat: 'S',
  traitre: 'T',
  maudit: 'M',
  mage: 'G',
};

const CODE_TO_FACE: Record<string, WhiteFace> = {
  H: 'heros',
  C: 'capitaine',
  S: 'soldat',
  T: 'traitre',
  M: 'maudit',
  G: 'mage',
};

export const FACE_INFO: Record<DieFace, { name: string; badge: string; color: string; rule: string }> = {
  heros: { name: 'Héros', badge: '3', color: '#9b1fa8', rule: 'Force de 3.' },
  capitaine: { name: 'Capitaine', badge: '2', color: '#8e969e', rule: 'Force de 2.' },
  soldat: { name: 'Soldat', badge: '1', color: '#2ea824', rule: 'Force de 1.' },
  traitre: {
    name: 'Traître',
    badge: '1',
    color: '#e02b20',
    rule: "Force de 1. Réduit à 0 la force d'un seul Héros présent dans son armée.",
  },
  maudit: { name: 'Maudit', badge: '-1', color: '#f2be00', rule: 'Force de -1.' },
  mage: {
    name: 'Mage',
    badge: '?',
    color: '#009ee3',
    rule: 'Force égale au nombre de faces blanches non-mages de son armée (Héros annulé inclus, hors dé noir).',
  },
  fenrir: {
    name: 'Loup Fenrir',
    badge: '×2',
    color: '#00b4ff',
    rule: 'Dé noir : intervient après les faces blanches et multiplie par 2 la force de la plus forte face blanche de son armée.',
  },
};

export function sortFaces<T extends DieFace>(faces: readonly T[]): T[] {
  return [...faces].sort((a, b) => FACE_ORDER[a] - FACE_ORDER[b]);
}

function multisetKey(faces: readonly DieFace[]): string {
  return sortFaces(faces)
    .map((f) => (f === 'fenrir' ? 'F' : FACE_CODE[f]))
    .join('');
}

export function evaluateArmy(dice: readonly Pick<DieInstance, 'id' | 'face'>[]): ArmyEvaluation {
  const whites = dice.filter((d) => d.face !== 'fenrir');
  const fenrirs = dice.filter((d) => d.face === 'fenrir');

  if (whites.length === 0) {
    return { valid: false, total: 0, contributions: [], equation: '—' };
  }

  const nonMageWhiteCount = whites.filter((d) => d.face !== 'mage').length;
  const herosList = whites.filter((d) => d.face === 'heros');
  const traitreList = whites.filter((d) => d.face === 'traitre');
  const cancelCount = Math.min(herosList.length, traitreList.length);

  const cancelledHerosMap = new Map<number, number>();
  for (let i = 0; i < cancelCount; i++) {
    cancelledHerosMap.set(herosList[i].id, traitreList[i].id);
  }

  const contributions: DieContribution[] = whites.map((d) => {
    switch (d.face) {
      case 'heros': {
        const cancelledBy = cancelledHerosMap.get(d.id);
        return {
          dieId: d.id,
          face: d.face,
          baseValue: 3,
          effectiveValue: cancelledBy !== undefined ? 0 : 3,
          cancelledByDieId: cancelledBy,
        };
      }
      case 'capitaine':
        return { dieId: d.id, face: d.face, baseValue: 2, effectiveValue: 2 };
      case 'soldat':
        return { dieId: d.id, face: d.face, baseValue: 1, effectiveValue: 1 };
      case 'traitre':
        return { dieId: d.id, face: d.face, baseValue: 1, effectiveValue: 1 };
      case 'maudit':
        return { dieId: d.id, face: d.face, baseValue: -1, effectiveValue: -1 };
      case 'mage':
        return { dieId: d.id, face: d.face, baseValue: null, effectiveValue: nonMageWhiteCount };
      default:
        return { dieId: d.id, face: d.face, baseValue: 0, effectiveValue: 0 };
    }
  });

  // Black dice apply after all white faces; Fenrir doubles a single max-value white face (verified on PDF Defi 18).
  for (const fen of fenrirs) {
    let bestIdx = 0;
    let bestVal = contributions[0].effectiveValue!;
    for (let i = 1; i < contributions.length; i++) {
      const val = contributions[i].effectiveValue!;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    contributions[bestIdx].effectiveValue = bestVal * 2;
    contributions[bestIdx].boostedByFenrirId = fen.id;
    contributions.push({ dieId: fen.id, face: 'fenrir', baseValue: null, effectiveValue: null });
  }

  const whiteContribs = contributions.filter((c) => c.effectiveValue !== null);
  const total = whiteContribs.reduce((sum, c) => sum + c.effectiveValue!, 0);
  const parts = whiteContribs.map((c, idx) => {
    const v = c.effectiveValue!;
    if (idx === 0) return String(v);
    return v < 0 ? `- ${Math.abs(v)}` : `+ ${v}`;
  });

  return {
    valid: true,
    total,
    contributions,
    equation: `${parts.join(' ')} = ${total}`,
  };
}

function fastArmyScore(counts: readonly number[], hasFenrir: boolean): number | null {
  const totalWhites = counts[0] + counts[1] + counts[2] + counts[3] + counts[4] + counts[5];
  if (totalWhites === 0) return null;

  const h = counts[0];
  const c = counts[1];
  const s = counts[2];
  const t = counts[3];
  const m = counts[4];
  const g = counts[5];
  const nonMage = h + c + s + t + m;
  const activeH = Math.max(0, h - t);

  let sum = activeH * 3 + c * 2 + (s + t) - m + g * nonMage;
  if (hasFenrir) {
    let maxVal = -Infinity;
    if (activeH > 0) maxVal = Math.max(maxVal, 3);
    if (h > activeH) maxVal = Math.max(maxVal, 0);
    if (c > 0) maxVal = Math.max(maxVal, 2);
    if (s > 0 || t > 0) maxVal = Math.max(maxVal, 1);
    if (m > 0) maxVal = Math.max(maxVal, -1);
    if (g > 0) maxVal = Math.max(maxVal, nonMage);
    sum += maxVal;
  }
  return sum;
}

function countsToFaces(counts: readonly number[], hasFenrir: boolean): DieFace[] {
  const out: DieFace[] = [];
  for (let i = 0; i < 6; i++) {
    for (let k = 0; k < counts[i]; k++) out.push(WHITE_FACES[i]);
  }
  if (hasFenrir) out.push('fenrir');
  return out;
}

export function solveChallenge(whiteFaces: readonly WhiteFace[], hasFenrir: boolean): Solution[] {
  const totals = [0, 0, 0, 0, 0, 0];
  for (const f of whiteFaces) totals[FACE_ORDER[f]]++;

  const seen = new Set<string>();
  const solutions: Solution[] = [];
  const left = [0, 0, 0, 0, 0, 0];
  const right = [0, 0, 0, 0, 0, 0];
  const fenrirSplits: readonly [boolean, boolean][] = hasFenrir
    ? [
        [true, false],
        [false, true],
      ]
    : [[false, false]];

  function walk(idx: number) {
    if (idx === 6) {
      for (const [fL, fR] of fenrirSplits) {
        const sL = fastArmyScore(left, fL);
        if (sL === null) continue;
        const sR = fastArmyScore(right, fR);
        if (sR === null || sL !== sR) continue;

        const leftFaces = countsToFaces(left, fL);
        const rightFaces = countsToFaces(right, fR);
        const kL = multisetKey(leftFaces);
        const kR = multisetKey(rightFaces);
        const canonical = kL <= kR ? `${kL} == ${kR}` : `${kR} == ${kL}`;
        if (seen.has(canonical)) continue;
        seen.add(canonical);

        const orderedLeft = kL <= kR ? leftFaces : rightFaces;
        const orderedRight = kL <= kR ? rightFaces : leftFaces;
        const evalL = evaluateArmy(orderedLeft.map((face, id) => ({ id, face })));
        const evalR = evaluateArmy(orderedRight.map((face, id) => ({ id: id + 10, face })));
        solutions.push({
          left: orderedLeft,
          right: orderedRight,
          leftEquation: evalL.equation,
          rightEquation: evalR.equation,
          key: canonical,
        });
      }
      return;
    }

    const maxK = totals[idx];
    for (let k = 0; k <= maxK; k++) {
      left[idx] = k;
      right[idx] = maxK - k;
      walk(idx + 1);
    }
  }

  walk(0);
  solutions.sort((a, b) => a.key.localeCompare(b.key));
  return solutions;
}

let cachedCatalog: CatalogEntry[] | null = null;

export function getCatalog(): readonly CatalogEntry[] {
  if (cachedCatalog) return cachedCatalog;
  const entries: CatalogEntry[] = [];
  const counts = [0, 0, 0, 0, 0, 0];

  function build(idx: number, remaining: number) {
    if (idx === 5) {
      counts[5] = remaining;
      const whiteFaces = countsToFaces(counts, false) as WhiteFace[];
      const baseKey = multisetKey(whiteFaces);
      for (const hasFenrir of [false, true]) {
        const sols = solveChallenge(whiteFaces, hasFenrir);
        entries.push({
          whiteFaces,
          hasFenrir,
          solutionCount: sols.length,
          key: `${baseKey}${hasFenrir ? '+F' : ''}`,
        });
      }
      return;
    }
    for (let k = 0; k <= remaining; k++) {
      counts[idx] = k;
      build(idx + 1, remaining - k);
    }
  }

  build(0, 7);
  cachedCatalog = entries;
  return entries;
}

export function filterCatalog(filter: GeneratorFilter): CatalogEntry[] {
  const specials: readonly SpecialWhiteFace[] = ['traitre', 'maudit', 'mage'];
  return getCatalog().filter((entry) => {
    if (entry.hasFenrir !== filter.hasFenrir) return false;
    if (filter.solutionMode === 'unique' && entry.solutionCount !== 1) return false;
    if (filter.solutionMode === 'multiple' && entry.solutionCount < 2) return false;
    if (filter.solutionMode === 'solvable' && entry.solutionCount < 1) return false;

    for (const face of specials) {
      const mode = filter.units[face];
      const present = entry.whiteFaces.includes(face);
      if (mode === 'forbidden' && present) return false;
      if (mode === 'required' && !present) return false;
    }
    return true;
  });
}

export function generateChallenge(
  filter: GeneratorFilter,
  excludeKey?: string,
): CatalogEntry | null {
  const pool = filterCatalog(filter);
  if (pool.length === 0) return null;
  const candidates =
    pool.length > 1 && excludeKey ? pool.filter((e) => e.key !== excludeKey) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function encodeSeed(whiteFaces: readonly WhiteFace[], hasFenrir: boolean): string {
  const sorted = sortFaces(whiteFaces);
  const body = sorted.map((f) => FACE_CODE[f]).join('');
  return `ODIN-${body}-${hasFenrir ? 'F1' : 'F0'}`;
}

export function decodeSeed(raw: string): { whiteFaces: WhiteFace[]; hasFenrir: boolean } | null {
  const clean = raw.trim().toUpperCase();
  const match = /^(?:ODIN-)?([HCSTMG]{7})(?:-?F([01]))?$/.exec(clean);
  if (!match) return null;
  const whiteFaces: WhiteFace[] = [];
  for (const ch of match[1]) {
    const face = CODE_TO_FACE[ch];
    if (!face) return null;
    whiteFaces.push(face);
  }
  return { whiteFaces: sortFaces(whiteFaces), hasFenrir: match[2] === '1' };
}

function multisetContains(superset: readonly DieFace[], subset: readonly DieFace[]): boolean {
  const avail = new Map<DieFace, number>();
  for (const f of superset) avail.set(f, (avail.get(f) ?? 0) + 1);
  for (const f of subset) {
    const n = avail.get(f) ?? 0;
    if (n <= 0) return false;
    avail.set(f, n - 1);
  }
  return true;
}

export function pickHintPlacement(
  dice: readonly DieInstance[],
  solutions: readonly Solution[],
): { leftDieId: number; rightDieId: number } | null {
  if (solutions.length === 0) return null;

  const lockedLeft = dice.filter((d) => d.lockedByHint && d.zone === 'left').map((d) => d.face);
  const lockedRight = dice.filter((d) => d.lockedByHint && d.zone === 'right').map((d) => d.face);

  // Find a solution orientation compatible with already locked hint dice.
  let target: { left: DieFace[]; right: DieFace[] } | null = null;
  for (const sol of solutions) {
    if (multisetContains(sol.left, lockedLeft) && multisetContains(sol.right, lockedRight)) {
      target = { left: sol.left, right: sol.right };
      break;
    }
    if (multisetContains(sol.right, lockedLeft) && multisetContains(sol.left, lockedRight)) {
      target = { left: sol.right, right: sol.left };
      break;
    }
  }
  if (!target) return null;

  const remainingLeft = [...target.left];
  for (const f of lockedLeft) remainingLeft.splice(remainingLeft.indexOf(f), 1);
  const remainingRight = [...target.right];
  for (const f of lockedRight) remainingRight.splice(remainingRight.indexOf(f), 1);
  if (remainingLeft.length === 0 || remainingRight.length === 0) return null;

  const unlocked = dice.filter((d) => !d.lockedByHint);
  // Prefer picking a die not already in the right target zone, starting with reserve dice.
  const pickForZone = (neededFaces: DieFace[], zone: 'left' | 'right', excludeId?: number) => {
    for (const wantZone of ['reserve', zone === 'left' ? 'right' : 'left', zone] as const) {
      for (const d of unlocked) {
        if (d.id === excludeId || d.zone !== wantZone) continue;
        if (neededFaces.includes(d.face)) return d.id;
      }
    }
    return null;
  };

  const leftDieId = pickForZone(remainingLeft, 'left');
  if (leftDieId === null) return null;
  const rightDieId = pickForZone(remainingRight, 'right', leftDieId);
  if (rightDieId === null) return null;

  return { leftDieId, rightDieId };
}

export function mapSolutionToDice(
  dice: readonly DieInstance[],
  solution: Solution,
): Map<number, 'left' | 'right'> {
  const result = new Map<number, 'left' | 'right'>();
  const needLeft = new Map<DieFace, number>();
  for (const f of solution.left) needLeft.set(f, (needLeft.get(f) ?? 0) + 1);

  for (const d of dice) {
    const rem = needLeft.get(d.face) ?? 0;
    if (rem > 0) {
      needLeft.set(d.face, rem - 1);
      result.set(d.id, 'left');
    } else {
      result.set(d.id, 'right');
    }
  }
  return result;
}

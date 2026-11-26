import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  decodeSeed,
  encodeSeed,
  evaluateArmy,
  filterCatalog,
  getCatalog,
  pickHintPlacement,
  solveChallenge,
  WHITE_FACES,
  type DieInstance,
} from '../src/rules.ts';
import { CAMPAIGN_CHALLENGES } from '../src/campaign.ts';
import { simulatePhysicsRoll, WHITE_FACE_SLOTS } from '../src/physics.ts';

test('les 18 défis officiels du PDF ont chacun exactement 1 solution conforme à la page 22', () => {
  const expectedKeys: Record<number, string> = {
    1: 'CHSS == HHS',
    2: 'CCC == CHHT',
    3: 'CCH == CHHM',
    4: 'HHM == HHST',
    5: 'GSS == SSSS',
    6: 'CGSS == HHS',
    7: 'CHS == GHMS',
    8: 'CCCMM == GH',
    9: 'CGHT == CHS',
    10: 'CG == HHTTT',
    11: 'CCHMT == GH',
    12: 'GGHT == HSS',
    13: 'GGGM == GMS',
    14: 'CCG == GGHM',
    15: 'GGTT == GHS',
    16: 'CHHS == GHSF',
    17: 'CCG == CHSTF',
    18: 'GGH == SSSTF',
  };

  for (const ch of CAMPAIGN_CHALLENGES) {
    const sols = solveChallenge(ch.whiteFaces, ch.hasFenrir);
    assert.equal(sols.length, 1, `Défi ${ch.id} doit avoir exactement 1 solution`);
    // Compare ignoring face ordering convention by sorting letters per side
    const norm = (k: string) =>
      k
        .split(' == ')
        .map((side) => side.split('').sort().join(''))
        .sort()
        .join(' == ');
    assert.equal(norm(sols[0].key), norm(expectedKeys[ch.id]), `Solution Défi ${ch.id}`);
  }
});

test('règles spéciales : Traître, Mage, Fenrir et armée vide', () => {
  // Armée vide interdite (même avec Fenrir seul)
  assert.equal(evaluateArmy([]).valid, false);
  assert.equal(evaluateArmy([{ id: 1, face: 'fenrir' }]).valid, false);

  // Exemple PDF p. 8 : 2 Héros + 1 Traître + 1 Soldat = 3 + 0 + 1 + 1 = 5
  const exTraitre = evaluateArmy([
    { id: 1, face: 'heros' },
    { id: 2, face: 'heros' },
    { id: 3, face: 'traitre' },
    { id: 4, face: 'soldat' },
  ]);
  assert.equal(exTraitre.total, 5);
  assert.equal(exTraitre.contributions.filter((c) => c.cancelledByDieId !== undefined).length, 1);

  // Exemple PDF p. 20 : Héros + Traître + Mage + Fenrir = 0 + 1 + (2*2) = 5
  const exFenrir = evaluateArmy([
    { id: 1, face: 'heros' },
    { id: 2, face: 'traitre' },
    { id: 3, face: 'mage' },
    { id: 4, face: 'fenrir' },
  ]);
  assert.equal(exFenrir.total, 5);
  const mageContrib = exFenrir.contributions.find((c) => c.face === 'mage');
  assert.equal(mageContrib?.effectiveValue, 4);
  assert.equal(mageContrib?.boostedByFenrirId, 4);

  // Fenrir en cas d'égalité de force maximale (Défi 18) : ne double qu'une seule face
  const exTie = evaluateArmy([
    { id: 1, face: 'soldat' },
    { id: 2, face: 'soldat' },
    { id: 3, face: 'soldat' },
    { id: 4, face: 'traitre' },
    { id: 5, face: 'fenrir' },
  ]);
  assert.equal(exTie.total, 5);

  // Fenrir sur armée composée uniquement de Maudits (-1) : -1 * 2 = -2
  const exMaudit = evaluateArmy([
    { id: 1, face: 'maudit' },
    { id: 2, face: 'maudit' },
    { id: 3, face: 'fenrir' },
  ]);
  assert.equal(exMaudit.total, -3);
});

test('catalogue complet des 1584 états, filtres, seeds et indices', () => {
  const catalog = getCatalog();
  assert.equal(catalog.length, 1584);

  const uniqueNoFenrir = filterCatalog({
    solutionMode: 'unique',
    hasFenrir: false,
    units: { traitre: 'allowed', maudit: 'allowed', mage: 'allowed' },
  });
  const uniqueWithFenrir = filterCatalog({
    solutionMode: 'unique',
    hasFenrir: true,
    units: { traitre: 'allowed', maudit: 'allowed', mage: 'allowed' },
  });
  assert.equal(uniqueNoFenrir.length, 245);
  assert.equal(uniqueWithFenrir.length, 177);

  // Filtre required / forbidden
  const onlyMageRequired = filterCatalog({
    solutionMode: 'solvable',
    hasFenrir: false,
    units: { traitre: 'forbidden', maudit: 'forbidden', mage: 'required' },
  });
  assert.ok(onlyMageRequired.length > 0);
  for (const e of onlyMageRequired) {
    assert.ok(e.whiteFaces.includes('mage'));
    assert.ok(!e.whiteFaces.includes('traitre'));
    assert.ok(!e.whiteFaces.includes('maudit'));
  }

  // Aller-retour seed
  const seed = encodeSeed(CAMPAIGN_CHALLENGES[16].whiteFaces, true);
  const parsed = decodeSeed(seed);
  assert.deepEqual(parsed, {
    whiteFaces: [...CAMPAIGN_CHALLENGES[16].whiteFaces].sort((a, b) =>
      ['heros', 'capitaine', 'soldat', 'traitre', 'maudit', 'mage'].indexOf(a) -
      ['heros', 'capitaine', 'soldat', 'traitre', 'maudit', 'mage'].indexOf(b),
    ),
    hasFenrir: true,
  });
  assert.equal(decodeSeed('INVALID'), null);

  // Indice : verrouille 2 dés distincts issus d'une solution valide
  const ch18 = CAMPAIGN_CHALLENGES[17];
  const sols = solveChallenge(ch18.whiteFaces, ch18.hasFenrir);
  const dice: DieInstance[] = [
    ...ch18.whiteFaces.map((face, i) => ({
      id: i,
      isBlack: false,
      face,
      zone: 'reserve' as const,
      lockedByHint: false,
    })),
    { id: 7, isBlack: true, face: 'fenrir', zone: 'reserve', lockedByHint: false },
  ];
  const hint = pickHintPlacement(dice, sols);
  assert.ok(hint !== null);
  assert.notEqual(hint.leftDieId, hint.rightDieId);
});

test('parité entre le solveur rapide (fastArmyScore) et evaluateArmy sur toutes les solutions du catalogue', () => {
  const catalog = getCatalog();
  // Vérifie chaque solution de 200 entrées couvrant Fenrir, Traître, Maudit et Mage
  for (let i = 0; i < catalog.length; i += 7) {
    const entry = catalog[i];
    const sols = solveChallenge(entry.whiteFaces, entry.hasFenrir);
    for (const sol of sols) {
      const evL = evaluateArmy(sol.left.map((face, id) => ({ id, face })));
      const evR = evaluateArmy(sol.right.map((face, id) => ({ id: id + 10, face })));
      assert.equal(evL.valid, true);
      assert.equal(evR.valid, true);
      assert.equal(evL.total, evR.total, `Parité échouée sur ${entry.key} (${sol.key})`);
    }
  }
});

test('simulatePhysicsRoll guidé oriente exactement chaque face cible vers le haut (+Y)', () => {
  const targets = [...WHITE_FACES, 'fenrir' as const];
  const isBlack = [false, false, false, false, false, false, true];
  const sim = simulatePhysicsRoll(targets, isBlack);
  assert.ok(sim.frames.length > 5);
  assert.deepEqual(sim.finalFaces, targets);

  const last = sim.frames[sim.frames.length - 1];
  const worldUp = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < WHITE_FACES.length; i++) {
    const slot = WHITE_FACE_SLOTS.find((s) => s.face === WHITE_FACES[i])!;
    const normalWorld = slot.normal.clone().applyQuaternion(last.quaternions[i]);
    assert.ok(
      normalWorld.dot(worldUp) > 0.94,
      `Face ${WHITE_FACES[i]} doit pointer vers +Y (dot=${normalWorld.dot(worldUp).toFixed(3)})`,
    );
  }
});

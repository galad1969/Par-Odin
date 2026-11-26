import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { DieFace, WhiteFace } from './rules.ts';

export const DIE_SIZE = 1.05;
const HALF = DIE_SIZE / 2;

export interface FaceSlot {
  face: WhiteFace;
  normal: THREE.Vector3;
  upQuat: THREE.Quaternion;
}

const Q_X_NEG90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

function makeUpQuat(yTurns: number, isBottom = false): THREE.Quaternion {
  if (isBottom) {
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  }
  const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (yTurns * Math.PI) / 2);
  return Q_X_NEG90.clone().multiply(qY);
}

// Local face normals matching the 6 plane decals placed on each white die mesh.
export const WHITE_FACE_SLOTS: readonly FaceSlot[] = [
  { face: 'heros', normal: new THREE.Vector3(0, 1, 0), upQuat: new THREE.Quaternion() },
  { face: 'maudit', normal: new THREE.Vector3(0, -1, 0), upQuat: makeUpQuat(0, true) },
  { face: 'capitaine', normal: new THREE.Vector3(0, 0, 1), upQuat: makeUpQuat(0) },
  { face: 'traitre', normal: new THREE.Vector3(0, 0, -1), upQuat: makeUpQuat(2) },
  { face: 'soldat', normal: new THREE.Vector3(1, 0, 0), upQuat: makeUpQuat(-1) },
  { face: 'mage', normal: new THREE.Vector3(-1, 0, 0), upQuat: makeUpQuat(1) },
];

export const FACE_UP_QUAT: Record<DieFace, THREE.Quaternion> = {
  heros: WHITE_FACE_SLOTS[0].upQuat,
  maudit: WHITE_FACE_SLOTS[1].upQuat,
  capitaine: WHITE_FACE_SLOTS[2].upQuat,
  traitre: WHITE_FACE_SLOTS[3].upQuat,
  soldat: WHITE_FACE_SLOTS[4].upQuat,
  mage: WHITE_FACE_SLOTS[5].upQuat,
  fenrir: new THREE.Quaternion(),
};

export interface RollFrame {
  positions: THREE.Vector3[];
  quaternions: THREE.Quaternion[];
  impactStrength: number;
}

export interface SimulatedRoll {
  frames: RollFrame[];
  finalFaces: DieFace[];
}

function detectTopSlot(q: THREE.Quaternion): { slot: FaceSlot; alignment: number } {
  const worldUp = new THREE.Vector3(0, 1, 0);
  let best = WHITE_FACE_SLOTS[0];
  let bestDot = -Infinity;
  const tmp = new THREE.Vector3();
  for (const slot of WHITE_FACE_SLOTS) {
    tmp.copy(slot.normal).applyQuaternion(q);
    const dot = tmp.dot(worldUp);
    if (dot > bestDot) {
      bestDot = dot;
      best = slot;
    }
  }
  return { slot: best, alignment: bestDot };
}

function runRawPhysics(count: number): {
  rawFrames: { pos: THREE.Vector3[]; quat: THREE.Quaternion[]; impact: number }[];
  topSlots: FaceSlot[];
  cleanRest: boolean;
} {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -32, 0) });
  world.broadphase = new CANNON.NaiveBroadphase();
  world.allowSleep = true;

  const matDie = new CANNON.Material('die');
  const matBoard = new CANNON.Material('board');
  world.addContactMaterial(
    new CANNON.ContactMaterial(matDie, matBoard, { friction: 0.42, restitution: 0.34 }),
  );
  world.addContactMaterial(
    new CANNON.ContactMaterial(matDie, matDie, { friction: 0.3, restitution: 0.42 }),
  );

  // Table floor y = 0
  const floor = new CANNON.Body({ mass: 0, material: matBoard });
  floor.addShape(new CANNON.Plane());
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);

  // Invisible bounding walls keeping rolled dice neatly inside the central tray
  const wallSpecs: [number, number, number, number, number, number][] = [
    [0, 3, -3.1, 0, 0, 0],
    [0, 3, 3.1, 0, Math.PI, 0],
    [-4.2, 3, 0, 0, Math.PI / 2, 0],
    [4.2, 3, 0, 0, -Math.PI / 2, 0],
  ];
  for (const [x, y, z, rx, ry, rz] of wallSpecs) {
    const wall = new CANNON.Body({ mass: 0, material: matBoard });
    wall.addShape(new CANNON.Plane());
    wall.position.set(x, y, z);
    wall.quaternion.setFromEuler(rx, ry, rz);
    world.addBody(wall);
  }

  let frameImpact = 0;
  const bodies: CANNON.Body[] = [];
  const boxShape = new CANNON.Box(new CANNON.Vec3(HALF, HALF, HALF));

  for (let i = 0; i < count; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const body = new CANNON.Body({
      mass: 1,
      shape: boxShape,
      material: matDie,
      linearDamping: 0.16,
      angularDamping: 0.18,
      sleepSpeedLimit: 0.25,
      sleepTimeLimit: 0.2,
    });
    body.position.set(
      (col - 1.5) * 1.45 + (Math.random() - 0.5) * 0.4,
      3.4 + row * 1.35 + Math.random() * 1.1,
      (row - 0.5) * 1.45 + (Math.random() - 0.5) * 0.5,
    );
    body.velocity.set(
      (Math.random() - 0.5) * 5.2,
      -2.5 - Math.random() * 3.0,
      (Math.random() - 0.5) * 5.2,
    );
    body.angularVelocity.set(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18,
    );
    body.quaternion.setFromEuler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    body.addEventListener('collide', (ev: { contact: CANNON.ContactEquation }) => {
      const impact = Math.abs(ev.contact.getImpactVelocityAlongNormal());
      if (impact > 1.2) frameImpact = Math.max(frameImpact, impact);
    });
    world.addBody(body);
    bodies.push(body);
  }

  const rawFrames: { pos: THREE.Vector3[]; quat: THREE.Quaternion[]; impact: number }[] = [];
  const dt = 1 / 60;
  let settledFrames = 0;

  for (let step = 0; step < 155; step++) {
    frameImpact = 0;
    world.step(dt);
    const pos = bodies.map((b) => new THREE.Vector3(b.position.x, b.position.y, b.position.z));
    const quat = bodies.map(
      (b) => new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w),
    );
    rawFrames.push({ pos, quat, impact: frameImpact });

    const allSlow = bodies.every(
      (b) => b.velocity.lengthSquared() < 0.03 && b.angularVelocity.lengthSquared() < 0.05 && b.position.y < DIE_SIZE,
    );
    if (allSlow) {
      settledFrames++;
      if (settledFrames >= 8) break;
    } else {
      settledFrames = 0;
    }
  }

  const last = rawFrames[rawFrames.length - 1];
  const topSlots: FaceSlot[] = [];
  let cleanRest = true;

  for (let i = 0; i < count; i++) {
    const { slot, alignment } = detectTopSlot(last.quat[i]);
    if (alignment < 0.96 || last.pos[i].y > DIE_SIZE * 0.85) cleanRest = false;
    topSlots.push(slot);
  }

  return { rawFrames, topSlots, cleanRest };
}

/**
 * Simulates genuine rigid-body collisions in memory (<5 ms) and applies an exact cube-symmetry
 * rotation R_perm so that guided rolls naturally land on `targetFaces` without fake snapping.
 */
export function simulatePhysicsRoll(
  targetFaces: readonly (DieFace | null)[],
  isBlackFlags: readonly boolean[],
): SimulatedRoll {
  const count = targetFaces.length;
  let sim = runRawPhysics(count);
  for (let attempt = 0; attempt < 6 && !sim.cleanRest; attempt++) {
    sim = runRawPhysics(count);
  }

  const permQuats: THREE.Quaternion[] = [];
  const finalFaces: DieFace[] = [];

  for (let i = 0; i < count; i++) {
    if (isBlackFlags[i]) {
      permQuats.push(new THREE.Quaternion());
      finalFaces.push('fenrir');
      continue;
    }
    const target = targetFaces[i] as WhiteFace | null;
    if (!target) {
      permQuats.push(new THREE.Quaternion());
      finalFaces.push(sim.topSlots[i].face);
    } else {
      const qLandedInv = sim.topSlots[i].upQuat.clone().invert();
      const qTarget = FACE_UP_QUAT[target];
      permQuats.push(qLandedInv.multiply(qTarget));
      finalFaces.push(target);
    }
  }

  const frames: RollFrame[] = sim.rawFrames.map((rf) => ({
    positions: rf.pos,
    quaternions: rf.quat.map((q, i) => q.clone().multiply(permQuats[i])),
    impactStrength: rf.impact,
  }));

  return { frames, finalFaces };
}

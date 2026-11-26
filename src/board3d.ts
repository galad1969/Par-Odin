import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ArmyEvaluation, DieFace, DieInstance, Zone } from './rules.ts';
import {
  DIE_SIZE,
  FACE_UP_QUAT,
  simulatePhysicsRoll,
  type SimulatedRoll,
} from './physics.ts';
import { createFaceTextures, createTableTextures, type FaceMaterialSet } from './textures.ts';
import type { SoundEngine } from './audio.ts';

interface DieMeshEntry {
  id: number;
  group: THREE.Group;
  halo: THREE.Mesh;
  targetPos: THREE.Vector3;
  targetQuat: THREE.Quaternion;
  shakeTime: number;
}

export interface BoardOverlayData {
  showAid: boolean;
  leftEval: ArmyEvaluation;
  rightEval: ArmyEvaluation;
}

const FACE_PLANE_SPECS: readonly {
  face: DieFace;
  pos: [number, number, number];
  rot: [number, number, number];
}[] = [
  { face: 'heros', pos: [0, DIE_SIZE / 2 + 0.003, 0], rot: [-Math.PI / 2, 0, 0] },
  { face: 'maudit', pos: [0, -DIE_SIZE / 2 - 0.003, 0], rot: [Math.PI / 2, 0, 0] },
  { face: 'capitaine', pos: [0, 0, DIE_SIZE / 2 + 0.003], rot: [0, 0, 0] },
  { face: 'traitre', pos: [0, 0, -DIE_SIZE / 2 - 0.003], rot: [0, Math.PI, 0] },
  { face: 'soldat', pos: [DIE_SIZE / 2 + 0.003, 0, 0], rot: [0, Math.PI / 2, 0] },
  { face: 'mage', pos: [-DIE_SIZE / 2 - 0.003, 0, 0], rot: [0, -Math.PI / 2, 0] },
];

export class Board3D {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private faceTextures: Record<DieFace, FaceMaterialSet>;
  private whiteBodyMat: THREE.MeshStandardMaterial;
  private blackBodyMat: THREE.MeshStandardMaterial;
  private haloMat: THREE.MeshBasicMaterial;
  private faceMats: Record<DieFace, THREE.MeshStandardMaterial>;
  private dieGeo: RoundedBoxGeometry;
  private planeGeo: THREE.PlaneGeometry;
  private haloGeo: THREE.RingGeometry;
  private wasPortrait = false;
  private lastBadgesHtml = '';
  private lastLinesHtml = '';
  private lastLeftScore = '';
  private lastRightScore = '';

  private meshes = new Map<number, DieMeshEntry>();
  private diceState: readonly DieInstance[] = [];
  private overlayData: BoardOverlayData | null = null;

  private zonePlanes: Record<Zone, THREE.Mesh>;
  private activeRoll: {
    sim: SimulatedRoll;
    elapsed: number;
    lastFrame: number;
    onDone: (finalFaces: DieFace[]) => void;
  } | null = null;

  // Pointer & Drag state
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.15);
  private dragHit = new THREE.Vector3();
  private dragDieId: number | null = null;
  private pointerDownXY = { x: 0, y: 0 };
  private isDragging = false;
  private hoveredZone: Zone | null = null;

  private canvas: HTMLCanvasElement;
  private svgEl: SVGSVGElement;
  private badgesEl: HTMLElement;
  private bannerLeftEl: HTMLElement;
  private bannerRightEl: HTMLElement;
  private scoreLeftEl: HTMLElement;
  private scoreRightEl: HTMLElement;
  private sound: SoundEngine;
  private onMoveDie: (dieId: number, targetZone: Zone) => void;
  private rafId = 0;
  private lastTime = 0;

  constructor(
    canvas: HTMLCanvasElement,
    sound: SoundEngine,
    onMoveDie: (dieId: number, targetZone: Zone) => void,
  ) {
    this.canvas = canvas;
    this.sound = sound;
    this.onMoveDie = onMoveDie;
    this.svgEl = document.getElementById('aid-links') as unknown as SVGSVGElement;
    this.badgesEl = document.getElementById('aid-badges')!;
    this.bannerLeftEl = document.getElementById('banner-left')!;
    this.bannerRightEl = document.getElementById('banner-right')!;
    this.scoreLeftEl = document.getElementById('score-left')!;
    this.scoreRightEl = document.getElementById('score-right')!;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#120c08');
    this.scene.fog = new THREE.Fog('#120c08', 22, 42);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 8.5;
    this.controls.maxDistance = 34;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2.45;

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.faceTextures = createFaceTextures(maxAniso);
    this.whiteBodyMat = new THREE.MeshStandardMaterial({
      color: '#f4eee0',
      roughness: 0.28,
      metalness: 0.04,
    });
    this.blackBodyMat = new THREE.MeshStandardMaterial({
      color: '#17191f',
      roughness: 0.36,
      metalness: 0.16,
    });
    this.haloMat = new THREE.MeshBasicMaterial({
      color: '#ffd454',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.faceMats = {} as Record<DieFace, THREE.MeshStandardMaterial>;
    for (const face of Object.keys(this.faceTextures) as DieFace[]) {
      const tex = this.faceTextures[face];
      this.faceMats[face] = new THREE.MeshStandardMaterial({
        map: tex.map,
        bumpMap: tex.bumpMap,
        bumpScale: 0.035,
        roughness: face === 'fenrir' ? 0.34 : 0.32,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
    }
    this.dieGeo = new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 4, 0.14);
    this.planeGeo = new THREE.PlaneGeometry(DIE_SIZE * 0.84, DIE_SIZE * 0.84);
    this.haloGeo = new THREE.RingGeometry(DIE_SIZE * 0.62, DIE_SIZE * 0.76, 32);

    this.zonePlanes = this.buildTable(maxAniso);
    this.setupLights();
    this.wasPortrait = window.innerHeight > window.innerWidth;
    this.resize();
    this.resetCamera();
    this.bindEvents();

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight('#ffe9c2', '#2b1a12', 0.95));

    const key = new THREE.DirectionalLight('#fff2da', 1.65);
    key.position.set(5, 14, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    const warmCandleLeft = new THREE.PointLight('#ff9d3b', 16, 22, 1.6);
    warmCandleLeft.position.set(-7.5, 4.2, -3.5);
    this.scene.add(warmCandleLeft);

    const coolRimRight = new THREE.PointLight('#79b8ff', 9, 22, 1.6);
    coolRimRight.position.set(7.5, 4.2, -3.5);
    this.scene.add(coolRimRight);
  }

  private buildTable(maxAniso: number): Record<Zone, THREE.Mesh> {
    const { woodMap, woodBump } = createTableTextures(maxAniso);

    // Main wooden tabletop
    const tableMesh = new THREE.Mesh(
      new THREE.BoxGeometry(19.5, 0.8, 12.2),
      new THREE.MeshStandardMaterial({
        map: woodMap,
        bumpMap: woodBump,
        bumpScale: 0.04,
        roughness: 0.74,
        metalness: 0.06,
      }),
    );
    tableMesh.position.set(0, -0.4, 0);
    tableMesh.receiveShadow = true;
    this.scene.add(tableMesh);

    // Carved wooden trim frame around the board
    const trimMat = new THREE.MeshStandardMaterial({ color: '#26150c', roughness: 0.6, metalness: 0.15 });
    const trimSpecs: [number, number, number, number, number, number][] = [
      [19.9, 0.36, 0.42, 0, 0.08, -6.1],
      [19.9, 0.36, 0.42, 0, 0.08, 6.1],
      [0.42, 0.36, 12.2, -9.75, 0.08, 0],
      [0.42, 0.36, 12.2, 9.75, 0.08, 0],
    ];
    for (const [w, h, d, x, y, z] of trimSpecs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trimMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }

    const makeZoneMat = (w: number, d: number, x: number, z: number, color: string, border: string) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(14, 14, 484, 484, 34);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.roundRect(18, 18, 476, 476, 30);
      ctx.stroke();
      ctx.setLineDash([14, 14]);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(36, 36, 440, 440, 22);
      ctx.stroke();

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        opacity: 0.9,
        roughness: 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.012, z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      return mesh;
    };

    const left = makeZoneMat(5.4, 5.9, -5.2, -0.05, 'rgba(138, 48, 32, 0.28)', 'rgba(235, 168, 86, 0.72)');
    const right = makeZoneMat(5.4, 5.9, 5.2, -0.05, 'rgba(32, 78, 128, 0.28)', 'rgba(128, 198, 245, 0.72)');
    const reserve = makeZoneMat(4.1, 5.9, 0, -0.05, 'rgba(20, 14, 10, 0.34)', 'rgba(202, 168, 114, 0.35)');

    return { left, reserve, right };
  }

  private createDieMesh(die: DieInstance): DieMeshEntry {
    const group = new THREE.Group();
    group.userData.dieId = die.id;

    const body = new THREE.Mesh(this.dieGeo, die.isBlack ? this.blackBodyMat : this.whiteBodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.dieId = die.id;
    group.add(body);

    for (const spec of FACE_PLANE_SPECS) {
      const faceKey: DieFace = die.isBlack ? 'fenrir' : spec.face;
      const plane = new THREE.Mesh(this.planeGeo, this.faceMats[faceKey]);
      plane.position.set(...spec.pos);
      plane.rotation.set(...spec.rot);
      plane.userData.dieId = die.id;
      group.add(plane);
    }

    const halo = new THREE.Mesh(this.haloGeo, this.haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.025;
    halo.visible = false;
    this.scene.add(halo);

    this.scene.add(group);
    return {
      id: die.id,
      group,
      halo,
      targetPos: new THREE.Vector3(0, DIE_SIZE / 2, 0),
      targetQuat: FACE_UP_QUAT[die.face].clone(),
      shakeTime: 0,
    };
  }

  private clearDiceMeshes() {
    for (const entry of this.meshes.values()) {
      this.scene.remove(entry.group);
      this.scene.remove(entry.halo);
    }
    this.meshes.clear();
  }

  rollDice(
    dice: readonly DieInstance[],
    guided: boolean,
    onDone: (finalFaces: DieFace[]) => void,
  ) {
    this.clearDiceMeshes();
    this.diceState = dice;
    for (const die of dice) {
      this.meshes.set(die.id, this.createDieMesh(die));
    }

    const targets = dice.map((d) => (guided ? d.face : null));
    const isBlackFlags = dice.map((d) => d.isBlack);
    const sim = simulatePhysicsRoll(targets, isBlackFlags);

    // Position meshes on frame 0 immediately
    const f0 = sim.frames[0];
    dice.forEach((d, idx) => {
      const m = this.meshes.get(d.id)!;
      m.group.position.copy(f0.positions[idx]);
      m.group.quaternion.copy(f0.quaternions[idx]);
    });

    this.activeRoll = { sim, elapsed: 0, lastFrame: -1, onDone };
  }

  syncDice(dice: readonly DieInstance[], overlay: BoardOverlayData) {
    this.diceState = dice;
    this.overlayData = overlay;

    // Ensure all meshes exist (in case synced without roll)
    if (this.meshes.size !== dice.length) {
      this.clearDiceMeshes();
      for (const die of dice) {
        this.meshes.set(die.id, this.createDieMesh(die));
      }
    }

    const byZone: Record<Zone, DieInstance[]> = { left: [], reserve: [], right: [] };
    for (const d of dice) byZone[d.zone].push(d);

    const layoutZone = (zone: Zone, centerX: number, cols: number, spacingX: number, spacingZ: number) => {
      const list = byZone[zone];
      const rows = Math.ceil(list.length / cols);
      list.forEach((die, idx) => {
        const entry = this.meshes.get(die.id);
        if (!entry) return;
        const row = Math.floor(idx / cols);
        const inRow = Math.min(cols, list.length - row * cols);
        const col = idx % cols;
        const x = centerX + (col - (inRow - 1) / 2) * spacingX;
        const z = 0.08 + (row - (rows - 1) / 2) * spacingZ;
        entry.targetPos.set(x, DIE_SIZE / 2, z);
        entry.targetQuat.copy(FACE_UP_QUAT[die.face]);
        entry.halo.visible = die.lockedByHint;
      });
    };

    layoutZone('left', -5.2, 2, 1.55, 1.36);
    layoutZone('reserve', 0, 2, 1.42, 1.28);
    layoutZone('right', 5.2, 2, 1.55, 1.36);
  }

  resetCamera() {
    const portrait = window.innerHeight > window.innerWidth;
    if (portrait) {
      this.camera.position.set(0, 24.5, 11.8);
    } else {
      this.camera.position.set(0, 12.2, 9.6);
    }
    this.controls.target.set(0, 0, -0.15);
    this.controls.update();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const portrait = h > w;
    this.camera.aspect = w / h;
    this.camera.fov = portrait ? 52 : 38;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    if (portrait !== this.wasPortrait) {
      this.wasPortrait = portrait;
      this.resetCamera();
    }
  }

  private zoneFromX(x: number): Zone {
    if (x < -2.3) return 'left';
    if (x > 2.3) return 'right';
    return 'reserve';
  }

  private hitDie(clientX: number, clientY: number): number | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const groups = [...this.meshes.values()].map((m) => m.group);
    const hits = this.raycaster.intersectObjects(groups, true);
    if (hits.length === 0) return null;
    const id = hits[0].object.userData.dieId;
    return typeof id === 'number' ? id : null;
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      cancelAnimationFrame(this.rafId);
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.activeRoll) return;
      const dieId = this.hitDie(e.clientX, e.clientY);
      if (dieId === null) return;
      const die = this.diceState.find((d) => d.id === dieId);
      if (!die) return;
      if (die.lockedByHint) {
        this.triggerShake(dieId);
        return;
      }
      const next: Zone = die.zone === 'right' ? 'reserve' : 'right';
      this.onMoveDie(dieId, next);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.activeRoll) return;
      const dieId = this.hitDie(e.clientX, e.clientY);
      if (dieId === null) return;
      const die = this.diceState.find((d) => d.id === dieId);
      if (!die) return;
      if (die.lockedByHint) {
        this.triggerShake(dieId);
        return;
      }
      this.dragDieId = dieId;
      this.isDragging = false;
      this.pointerDownXY = { x: e.clientX, y: e.clientY };
      this.controls.enabled = false;
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.dragDieId === null) return;
      const dist = Math.hypot(e.clientX - this.pointerDownXY.x, e.clientY - this.pointerDownXY.y);
      if (dist > 8) this.isDragging = true;
      if (!this.isDragging) return;

      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragHit)) {
        const entry = this.meshes.get(this.dragDieId);
        if (entry) {
          entry.group.position.set(
            THREE.MathUtils.clamp(this.dragHit.x, -8.2, 8.2),
            1.15,
            THREE.MathUtils.clamp(this.dragHit.z, -4.5, 4.2),
          );
          this.hoveredZone = this.zoneFromX(entry.group.position.x);
        }
      }
    });

    const finishPointer = (e: PointerEvent) => {
      if (this.dragDieId === null) return;
      const dieId = this.dragDieId;
      const die = this.diceState.find((d) => d.id === dieId);
      const wasDragging = this.isDragging;
      const dropZone = this.hoveredZone;

      this.dragDieId = null;
      this.isDragging = false;
      this.hoveredZone = null;
      this.controls.enabled = true;
      if (this.canvas.hasPointerCapture(e.pointerId)) {
        this.canvas.releasePointerCapture(e.pointerId);
      }

      if (!die) return;
      if (wasDragging && dropZone) {
        if (dropZone !== die.zone) this.onMoveDie(dieId, dropZone);
      } else {
        // Quick click / tap cycle: reserve -> left -> right -> reserve
        const next: Zone =
          die.zone === 'reserve' ? 'left' : die.zone === 'left' ? 'right' : 'reserve';
        this.onMoveDie(dieId, next);
      }
    };

    this.canvas.addEventListener('pointerup', finishPointer);
    this.canvas.addEventListener('pointercancel', finishPointer);
  }

  private triggerShake(dieId: number) {
    const entry = this.meshes.get(dieId);
    if (entry) entry.shakeTime = 0.28;
    this.sound.playError();
  }

  private projectToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const p = pos.clone().project(this.camera);
    return {
      x: Math.round((p.x * 0.5 + 0.5) * window.innerWidth * 2) / 2,
      y: Math.round((-p.y * 0.5 + 0.5) * window.innerHeight * 2) / 2,
    };
  }

  private setOverlayHtml(leftScore: string, rightScore: string, badges: string, lines: string) {
    if (leftScore !== this.lastLeftScore) {
      this.lastLeftScore = leftScore;
      this.scoreLeftEl.textContent = leftScore;
    }
    if (rightScore !== this.lastRightScore) {
      this.lastRightScore = rightScore;
      this.scoreRightEl.textContent = rightScore;
    }
    if (badges !== this.lastBadgesHtml) {
      this.lastBadgesHtml = badges;
      this.badgesEl.innerHTML = badges;
    }
    if (lines !== this.lastLinesHtml) {
      this.lastLinesHtml = lines;
      this.svgEl.innerHTML = lines;
    }
  }

  private updateOverlays() {
    // Zone banners sit cleanly above each army mat without overlapping top-row die badges
    const pLeft = this.projectToScreen(new THREE.Vector3(-5.2, 0.1, -3.45));
    const pRight = this.projectToScreen(new THREE.Vector3(5.2, 0.1, -3.45));
    this.bannerLeftEl.style.left = `${pLeft.x}px`;
    this.bannerLeftEl.style.top = `${pLeft.y}px`;
    this.bannerRightEl.style.left = `${pRight.x}px`;
    this.bannerRightEl.style.top = `${pRight.y}px`;

    const data = this.overlayData;
    if (!data || !data.showAid || this.activeRoll) {
      this.setOverlayHtml('', '', '', '');
      return;
    }

    const leftScore = data.leftEval.valid ? `= ${data.leftEval.total}` : '—';
    const rightScore = data.rightEval.valid ? `= ${data.rightEval.total}` : '—';

    const badgesHtml: string[] = [];
    const linesHtml: string[] = [];

    const renderArmyOverlay = (evalData: ArmyEvaluation) => {
      for (const c of evalData.contributions) {
        const entry = this.meshes.get(c.dieId);
        if (!entry) continue;
        const scr = this.projectToScreen(
          entry.group.position.clone().add(new THREE.Vector3(0, DIE_SIZE * 0.65, 0)),
        );

        if (c.cancelledByDieId !== undefined) {
          badgesHtml.push(
            `<div class="die-badge cancelled" style="left:${scr.x}px;top:${scr.y}px">3 → 0</div>`,
          );
          const src = this.meshes.get(c.cancelledByDieId);
          if (src) {
            const p1 = this.projectToScreen(src.group.position.clone().add(new THREE.Vector3(0, 0.55, 0)));
            const p2 = this.projectToScreen(entry.group.position.clone().add(new THREE.Vector3(0, 0.55, 0)));
            const mx = (p1.x + p2.x) / 2;
            const my = Math.min(p1.y, p2.y) - 34;
            linesHtml.push(
              `<path class="aid-link traitre" d="M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}" />`,
            );
          }
        } else if (c.face === 'mage') {
          const text = c.boostedByFenrirId !== undefined ? `? → ${c.effectiveValue} (×2)` : `? → ${c.effectiveValue}`;
          badgesHtml.push(
            `<div class="die-badge mage${c.boostedByFenrirId !== undefined ? ' fenrir' : ''}" style="left:${scr.x}px;top:${scr.y}px">${text}</div>`,
          );
        } else if (c.boostedByFenrirId !== undefined) {
          badgesHtml.push(
            `<div class="die-badge fenrir" style="left:${scr.x}px;top:${scr.y}px">×2 → ${c.effectiveValue}</div>`,
          );
        }

        if (c.boostedByFenrirId !== undefined) {
          const fen = this.meshes.get(c.boostedByFenrirId);
          if (fen) {
            const p1 = this.projectToScreen(fen.group.position.clone().add(new THREE.Vector3(0, 0.55, 0)));
            const p2 = this.projectToScreen(entry.group.position.clone().add(new THREE.Vector3(0, 0.55, 0)));
            const mx = (p1.x + p2.x) / 2;
            const my = Math.min(p1.y, p2.y) - 38;
            linesHtml.push(
              `<path class="aid-link fenrir" d="M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}" />`,
            );
          }
        }
      }
    };

    renderArmyOverlay(data.leftEval);
    renderArmyOverlay(data.rightEval);
    this.setOverlayHtml(leftScore, rightScore, badgesHtml.join(''), linesHtml.join(''));
  }

  private loop = (now: number) => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.max(0, Math.min(0.05, (now - this.lastTime) / 1000));
    this.lastTime = now;

    // Highlight hovered drop zone
    (['left', 'reserve', 'right'] as Zone[]).forEach((z) => {
      const mat = this.zonePlanes[z].material as THREE.MeshStandardMaterial;
      mat.opacity = this.hoveredZone === z ? 1 : 0.78;
    });

    if (this.activeRoll) {
      this.activeRoll.elapsed += dt * 1.15;
      const frameIdx = Math.max(
        0,
        Math.min(this.activeRoll.sim.frames.length - 1, Math.floor(this.activeRoll.elapsed * 60)),
      );
      if (frameIdx > this.activeRoll.lastFrame) {
        for (let f = this.activeRoll.lastFrame + 1; f <= frameIdx; f++) {
          const imp = this.activeRoll.sim.frames[f].impactStrength;
          if (imp > 1.2) this.sound.playDiceHit(imp);
        }
        this.activeRoll.lastFrame = frameIdx;
      }
      const frame = this.activeRoll.sim.frames[frameIdx];
      this.diceState.forEach((d, idx) => {
        const entry = this.meshes.get(d.id);
        if (!entry) return;
        entry.group.position.copy(frame.positions[idx]);
        entry.group.quaternion.copy(frame.quaternions[idx]);
      });

      if (frameIdx >= this.activeRoll.sim.frames.length - 1) {
        const { sim, onDone } = this.activeRoll;
        this.activeRoll = null;
        onDone(sim.finalFaces);
      }
    } else {
      const alpha = 1 - Math.exp(-12 * dt);
      for (const entry of this.meshes.values()) {
        if (this.isDragging && this.dragDieId === entry.id) {
          entry.group.quaternion.slerp(entry.targetQuat, alpha);
        } else {
          entry.group.position.lerp(entry.targetPos, alpha);
          entry.group.quaternion.slerp(entry.targetQuat, alpha);
        }
        if (entry.shakeTime > 0) {
          entry.shakeTime = Math.max(0, entry.shakeTime - dt);
          entry.group.position.x += Math.sin(entry.shakeTime * 55) * 0.08;
        }
        entry.halo.position.set(entry.group.position.x, 0.025, entry.group.position.z);
        entry.halo.rotation.z = now * 0.0012;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateOverlays();
  };
}

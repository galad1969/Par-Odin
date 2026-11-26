import * as THREE from 'three';
import { FACE_INFO, type DieFace } from './rules.ts';

export interface FaceMaterialSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

const SIZE = 512;

function drawHeros(ctx: CanvasRenderingContext2D, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Left & right upward Viking horns
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(256, 260);
    ctx.scale(dir, 1);
    ctx.beginPath();
    ctx.moveTo(74, -44);
    ctx.quadraticCurveTo(155, -55, 168, -145);
    ctx.quadraticCurveTo(122, -96, 86, -86);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Helmet dome
  ctx.beginPath();
  ctx.arc(256, 255, 102, Math.PI, 0, false);
  ctx.lineTo(358, 290);
  ctx.lineTo(154, 290);
  ctx.closePath();
  ctx.fill();

  // Cheek guards + nose guard
  ctx.beginPath();
  ctx.moveTo(154, 286);
  ctx.lineTo(166, 396);
  ctx.lineTo(222, 422);
  ctx.lineTo(224, 344);
  ctx.lineTo(192, 326);
  ctx.lineTo(192, 286);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(358, 286);
  ctx.lineTo(346, 396);
  ctx.lineTo(290, 422);
  ctx.lineTo(288, 344);
  ctx.lineTo(320, 326);
  ctx.lineTo(320, 286);
  ctx.closePath();
  ctx.fill();

  // Nose bridge
  ctx.beginPath();
  ctx.moveTo(234, 272);
  ctx.lineTo(278, 272);
  ctx.lineTo(268, 368);
  ctx.lineTo(256, 384);
  ctx.lineTo(244, 368);
  ctx.closePath();
  ctx.fill();

  // Carved ridge lines in ivory/background cutout
  ctx.strokeStyle = color === '#3c3c3c' ? '#cfcfcf' : '#f5efe2';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(256, 152);
  ctx.lineTo(256, 276);
  ctx.moveTo(154, 274);
  ctx.lineTo(358, 274);
  ctx.stroke();

  ctx.restore();
}

function drawCapitaine(ctx: CanvasRenderingContext2D, color: string) {
  ctx.save();
  const bgCut = color === '#3c3c3c' ? '#cfcfcf' : '#f5efe2';

  for (const angle of [-Math.PI / 4, Math.PI / 4]) {
    ctx.save();
    ctx.translate(256, 268);
    ctx.rotate(angle);

    // Outline cutout so overlapping sword reads crisply
    ctx.strokeStyle = bgCut;
    ctx.lineWidth = 14;
    ctx.fillStyle = color;

    // Blade
    ctx.beginPath();
    ctx.moveTo(0, -172);
    ctx.lineTo(26, -124);
    ctx.lineTo(24, 72);
    ctx.lineTo(-24, 72);
    ctx.lineTo(-26, -124);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Crossguard
    ctx.beginPath();
    ctx.roundRect(-62, 66, 124, 24, 10);
    ctx.stroke();
    ctx.fill();

    // Grip & pommel
    ctx.beginPath();
    ctx.roundRect(-14, 90, 28, 60, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 156, 20, 0, Math.PI * 2);
    ctx.fill();

    // Fuller center line
    ctx.strokeStyle = bgCut;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, -135);
    ctx.lineTo(0, 56);
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}

function drawSoldat(ctx: CanvasRenderingContext2D, color: string) {
  ctx.save();
  const bgCut = color === '#3c3c3c' ? '#cfcfcf' : '#f5efe2';

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(256, 270, 154, 0, Math.PI * 2);
  ctx.fill();

  // Inner ring cutout
  ctx.strokeStyle = bgCut;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(256, 270, 118, 0, Math.PI * 2);
  ctx.stroke();

  // Diagonal wood planks
  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 270, 112, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineWidth = 10;
  for (const offset of [-68, -22, 22, 68]) {
    ctx.beginPath();
    ctx.moveTo(256 - 140, 270 + offset + 75);
    ctx.lineTo(256 + 140, 270 + offset - 75);
    ctx.stroke();
  }
  ctx.restore();

  // Center metal boss
  ctx.fillStyle = color;
  ctx.strokeStyle = bgCut;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(256, 270, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rim rivets
  ctx.fillStyle = bgCut;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    ctx.beginPath();
    ctx.arc(256 + Math.cos(a) * 136, 270 + Math.sin(a) * 136, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTraitre(ctx: CanvasRenderingContext2D, color: string, isBump: boolean) {
  ctx.save();
  const bgCut = isBump ? '#cfcfcf' : '#f5efe2';

  // Red assassin hood silhouette
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(256, 128);
  ctx.bezierCurveTo(345, 134, 384, 214, 396, 366);
  ctx.quadraticCurveTo(352, 412, 304, 414);
  ctx.quadraticCurveTo(286, 376, 296, 326);
  ctx.quadraticCurveTo(256, 344, 216, 326);
  ctx.quadraticCurveTo(226, 376, 208, 414);
  ctx.quadraticCurveTo(160, 412, 116, 366);
  ctx.bezierCurveTo(128, 214, 167, 134, 256, 128);
  ctx.closePath();
  ctx.fill();

  // Inner hooded face shadow cutout
  ctx.fillStyle = bgCut;
  ctx.beginPath();
  ctx.moveTo(256, 186);
  ctx.bezierCurveTo(318, 208, 326, 296, 256, 348);
  ctx.bezierCurveTo(186, 296, 194, 208, 256, 186);
  ctx.closePath();
  ctx.fill();

  // Fierce slanted eyes
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(214, 254);
  ctx.lineTo(246, 266);
  ctx.lineTo(224, 276);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(298, 254);
  ctx.lineTo(266, 266);
  ctx.lineTo(288, 276);
  ctx.closePath();
  ctx.fill();

  // Top-left crossed-out purple mini helmet (exact PDF p. 14 indicator)
  ctx.save();
  ctx.translate(22, 22);
  ctx.scale(0.26, 0.26);
  drawHeros(ctx, isBump ? '#505050' : '#9b1fa8');
  ctx.strokeStyle = isBump ? '#222222' : '#e02b20';
  ctx.lineWidth = 34;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(110, 120);
  ctx.lineTo(395, 420);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawMaudit(ctx: CanvasRenderingContext2D, color: string, isBump: boolean) {
  ctx.save();
  const bgCut = isBump ? '#cfcfcf' : '#f5efe2';

  ctx.translate(256, 276);
  ctx.rotate(-0.45);

  // Thick ring of Andvari
  ctx.strokeStyle = color;
  ctx.lineWidth = 64;
  ctx.beginPath();
  ctx.ellipse(0, 0, 122, 92, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Braided twist slashes along the gold band
  ctx.strokeStyle = bgCut;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + 0.2;
    const x1 = Math.cos(a) * 86;
    const y1 = Math.sin(a) * 60;
    const x2 = Math.cos(a + 0.38) * 158;
    const y2 = Math.sin(a + 0.38) * 124;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Subtle golden inner shine on albedo
  if (!isBump) {
    ctx.strokeStyle = '#fff09c';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 134, 102, 0, -2.3, -0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMage(ctx: CanvasRenderingContext2D, color: string, isBump: boolean) {
  ctx.save();
  const bgCut = isBump ? '#cfcfcf' : '#f5efe2';
  ctx.fillStyle = color;

  // Curved wide brim
  ctx.beginPath();
  ctx.ellipse(254, 354, 168, 56, -0.06, 0, Math.PI * 2);
  ctx.fill();

  // Pointed bent wizard cone
  ctx.beginPath();
  ctx.moveTo(156, 338);
  ctx.quadraticCurveTo(186, 174, 304, 130);
  ctx.quadraticCurveTo(286, 178, 356, 182);
  ctx.quadraticCurveTo(298, 222, 344, 342);
  ctx.closePath();
  ctx.fill();

  // Hat band & buckle cutout
  ctx.strokeStyle = bgCut;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(152, 326);
  ctx.quadraticCurveTo(254, 358, 350, 326);
  ctx.stroke();

  ctx.fillStyle = bgCut;
  ctx.fillRect(228, 308, 54, 48);
  ctx.fillStyle = color;
  ctx.fillRect(242, 320, 26, 24);

  // Inner brim highlight arc
  ctx.strokeStyle = bgCut;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(254, 360, 146, 40, -0.06, 0.2, Math.PI - 0.25);
  ctx.stroke();

  ctx.restore();
}

function drawFenrir(ctx: CanvasRenderingContext2D, color: string, isBump: boolean) {
  ctx.save();
  const bgCut = isBump ? '#cfcfcf' : '#15171c';
  ctx.fillStyle = color;

  // Fierce jagged Norse wolf profile (PDF p. 14)
  ctx.beginPath();
  ctx.moveTo(114, 396);
  ctx.lineTo(132, 336);
  ctx.lineTo(98, 302);
  ctx.lineTo(134, 264);
  ctx.lineTo(106, 214);
  ctx.lineTo(156, 184);
  ctx.lineTo(148, 136);
  ctx.lineTo(208, 146);
  ctx.lineTo(240, 102); // ear 1
  ctx.lineTo(268, 152);
  ctx.lineTo(304, 118); // ear 2
  ctx.lineTo(314, 186);
  ctx.lineTo(398, 250); // upper snout
  ctx.lineTo(418, 286); // nose tip
  ctx.lineTo(382, 314); // upper jaw
  ctx.lineTo(342, 298);
  ctx.lineTo(378, 344); // lower jaw
  ctx.lineTo(324, 356);
  ctx.lineTo(282, 342);
  ctx.lineTo(246, 398);
  ctx.lineTo(196, 376);
  ctx.lineTo(154, 412);
  ctx.closePath();
  ctx.fill();

  // Sharp glowing wolf eye & fang gap cutout
  ctx.fillStyle = bgCut;
  ctx.beginPath();
  ctx.moveTo(270, 226);
  ctx.lineTo(312, 216);
  ctx.lineTo(298, 244);
  ctx.closePath();
  ctx.fill();

  // Mane notches
  ctx.strokeStyle = bgCut;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(174, 212);
  ctx.lineTo(212, 246);
  ctx.moveTo(164, 280);
  ctx.lineTo(206, 306);
  ctx.stroke();

  ctx.restore();
}

function drawFaceCanvas(face: DieFace, isBump: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  const isBlack = face === 'fenrir';

  // Background with rounded border mask matching bevelled cube face
  ctx.fillStyle = isBump ? '#d6d6d6' : isBlack ? '#15171c' : '#f5efe2';
  ctx.fillRect(0, 0, SIZE, SIZE);

  if (!isBump) {
    // Subtle resin/bone grain
    const grad = ctx.createRadialGradient(SIZE * 0.42, SIZE * 0.35, 30, SIZE * 0.5, SIZE * 0.5, SIZE * 0.72);
    if (isBlack) {
      grad.addColorStop(0, 'rgba(255,255,255,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    } else {
      grad.addColorStop(0, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(175,152,115,0.16)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Subtle inset engraved border frame
    ctx.strokeStyle = isBlack ? 'rgba(0, 175, 240, 0.16)' : 'rgba(120, 96, 66, 0.14)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(18, 18, SIZE - 36, SIZE - 36, 36);
    ctx.stroke();
  }

  const fg = isBump ? '#3c3c3c' : FACE_INFO[face].color;

  switch (face) {
    case 'heros':
      drawHeros(ctx, fg);
      break;
    case 'capitaine':
      drawCapitaine(ctx, fg);
      break;
    case 'soldat':
      drawSoldat(ctx, fg);
      break;
    case 'traitre':
      drawTraitre(ctx, fg, isBump);
      break;
    case 'maudit':
      drawMaudit(ctx, fg, isBump);
      break;
    case 'mage':
      drawMage(ctx, fg, isBump);
      break;
    case 'fenrir':
      drawFenrir(ctx, fg, isBump);
      break;
  }

  // Corner force badge (white dice only, matching PDF p. 14)
  if (!isBlack) {
    ctx.fillStyle = isBump ? '#3c3c3c' : '#1b1a18';
    ctx.font = '900 84px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(FACE_INFO[face].badge, SIZE - 32, 24);
  }

  return canvas;
}

export function createFaceTextures(maxAnisotropy: number): Record<DieFace, FaceMaterialSet> {
  const faces: DieFace[] = ['heros', 'capitaine', 'soldat', 'traitre', 'maudit', 'mage', 'fenrir'];
  const sets = {} as Record<DieFace, FaceMaterialSet>;
  for (const face of faces) {
    const map = new THREE.CanvasTexture(drawFaceCanvas(face, false));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = maxAnisotropy;

    const bumpMap = new THREE.CanvasTexture(drawFaceCanvas(face, true));
    bumpMap.anisotropy = maxAnisotropy;

    sets[face] = { map, bumpMap };
  }
  return sets;
}

export function createTableTextures(maxAnisotropy: number): {
  woodMap: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const b = document.createElement('canvas');
  b.width = w;
  b.height = h;
  const bctx = b.getContext('2d')!;

  // Warm dark oak planks
  ctx.fillStyle = '#3b2416';
  ctx.fillRect(0, 0, w, h);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, w, h);

  const plankCount = 8;
  const plankH = h / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const y0 = p * plankH;
    const tone = (p % 3) * 8 - 8;
    ctx.fillStyle = `rgb(${64 + tone}, ${39 + Math.round(tone * 0.6)}, ${24 + Math.round(tone * 0.4)})`;
    ctx.fillRect(0, y0, w, plankH - 3);

    // Wood grain lines
    for (let i = 0; i < 48; i++) {
      const gy = y0 + (i / 48) * plankH;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(20,10,4,0.22)' : 'rgba(130,84,48,0.12)';
      ctx.lineWidth = 1.5 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= w; x += 64) {
        ctx.lineTo(x, gy + Math.sin(x * 0.012 + p * 1.7 + i) * 3.5);
      }
      ctx.stroke();

      bctx.strokeStyle = i % 2 === 0 ? 'rgba(60,60,60,0.35)' : 'rgba(180,180,180,0.22)';
      bctx.lineWidth = 1.5;
      bctx.beginPath();
      bctx.moveTo(0, gy);
      bctx.lineTo(w, gy);
      bctx.stroke();
    }

    // Plank seam
    ctx.fillStyle = '#1d1009';
    ctx.fillRect(0, y0 + plankH - 4, w, 4);
    bctx.fillStyle = '#181818';
    bctx.fillRect(0, y0 + plankH - 4, w, 4);
  }

  // Carved Elder Futhark runes along top & bottom edges
  const runes = 'ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ';
  ctx.font = '700 34px "Segoe UI Symbol", serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(218, 174, 96, 0.25)';
  ctx.fillText(runes, w / 2, 56);
  ctx.fillText(runes, w / 2, h - 30);

  bctx.font = '700 34px "Segoe UI Symbol", serif';
  bctx.textAlign = 'center';
  bctx.fillStyle = '#2a2a2a';
  bctx.fillText(runes, w / 2, 56);
  bctx.fillText(runes, w / 2, h - 30);

  const woodMap = new THREE.CanvasTexture(c);
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.anisotropy = maxAnisotropy;

  const woodBump = new THREE.CanvasTexture(b);
  woodBump.anisotropy = maxAnisotropy;

  return { woodMap, woodBump };
}

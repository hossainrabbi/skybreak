import * as THREE from 'three';
import { LevelPiece } from '../shared/types';
import { getDivisionByCheckpoint } from '../shared/constants';
import { LEVEL_PIECES } from '../shared/levelData';
import {
  sampleCrushingPiston,
  sampleDisappearingPlatform,
  sampleMovingPlatform,
  samplePendulum,
  sampleRotatingBarAngle,
} from '../shared/obstacleMath';

interface WavingFlagHandle {
  clothGeo: THREE.PlaneGeometry;
  basePositions: Float32Array;
  clothMat: THREE.MeshStandardMaterial;
  clothMesh: THREE.Mesh;
  finialMat: THREE.MeshStandardMaterial;
}

interface DynamicPieceEntry {
  piece: LevelPiece;
  root: THREE.Group;
  mainMaterial?: THREE.MeshPhysicalMaterial;
  wireframeMesh?: THREE.LineSegments;
  rotorGroup?: THREE.Group;
  pendulumArmGroup?: THREE.Group;
  pistonHeadGroup?: THREE.Group;
  gearRimGroup?: THREE.Group;
  bounceRingMesh?: THREE.Mesh;
  checkpointRing?: THREE.Mesh;
  checkpointCrystal?: THREE.Mesh;
  checkpointRingMat?: THREE.MeshStandardMaterial;
  checkpointFlag?: WavingFlagHandle;
  divisionSignMat?: THREE.MeshStandardMaterial;
  finishFlags?: WavingFlagHandle[];
  finishCrown?: THREE.Mesh;
}

/**
 * Generates the authentic National Flag of Bangladesh (#006a4e bottle green
 * with the #f42a41 red sun disc shifted slightly toward the hoist).
 * Strictly no yellow border or text on any side of the flag.
 */
function createBangladeshFlagTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 320, 192);
  bgGrad.addColorStop(0.0, '#007a5a');
  bgGrad.addColorStop(0.5, '#006a4e');
  bgGrad.addColorStop(1.0, '#00563f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 320, 192);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 320; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 192);
    ctx.stroke();
  }

  const centerX = 320 * 0.45;
  const centerY = 192 * 0.5;
  const radius = 192 * 0.33;

  const sunGrad = ctx.createRadialGradient(
    centerX - radius * 0.2,
    centerY - radius * 0.2,
    radius * 0.1,
    centerX,
    centerY,
    radius
  );
  sunGrad.addColorStop(0.0, '#ff3b52');
  sunGrad.addColorStop(1.0, '#f42a41');

  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createDivisionSignTexture(
  checkpointIndex: number,
  nameEn: string,
  nameBn: string,
  isActivated: boolean
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, 512, 160);
  bgGrad.addColorStop(0, isActivated ? '#064e3b' : '#0f172a');
  bgGrad.addColorStop(0.5, isActivated ? '#047857' : '#1e293b');
  bgGrad.addColorStop(1, isActivated ? '#064e3b' : '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 160);

  ctx.strokeStyle = isActivated ? '#34d399' : '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 502, 150);

  ctx.font = '800 21px "Orbitron", "Rajdhani", "Chakra Petch", sans-serif';
  ctx.fillStyle = isActivated ? '#6ee7b7' : '#38bdf8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    isActivated
      ? `CHECKPOINT ${checkpointIndex} ACTIVATED`
      : `CHECKPOINT ${checkpointIndex} OF 7`,
    256,
    46
  );

  ctx.font = '900 38px "Orbitron", "Rajdhani", "Noto Sans Bengali", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${nameEn} • ${nameBn}`, 256, 106);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createProceduralTexture(
  kind: 'stone_deck' | 'cliff_rock' | 'tech_barge' | 'phase_hex' | 'asphalt_road' | 'wood_plank',
  baseHex: string
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  if (typeof document === 'undefined') {
    const dummy = new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
    return { map: dummy, bumpMap: dummy };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);

  if (kind === 'stone_deck') {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.lineWidth = 3;
    bCtx.strokeStyle = '#303030';
    bCtx.lineWidth = 4;

    const tile = 64;
    for (let y = 0; y < 256; y += tile) {
      const offset = (y / tile) % 2 === 0 ? 0 : 32;
      for (let x = -32; x < 256; x += tile) {
        ctx.strokeRect(x + offset, y, tile, tile);
        bCtx.strokeRect(x + offset, y, tile, tile);
      }
    }
  } else if (kind === 'wood_plank') {
    ctx.strokeStyle = 'rgba(20, 10, 4, 0.45)';
    ctx.lineWidth = 3;
    bCtx.strokeStyle = '#252525';
    bCtx.lineWidth = 4;
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
      bCtx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      bCtx.stroke();
    }
  } else if (kind === 'asphalt_road') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);
    // Dashed yellow center highway stripe
    ctx.fillStyle = '#facc15';
    for (let y = 16; y < 256; y += 64) {
      ctx.fillRect(120, y, 16, 36);
    }
    // White edge lines
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(14, 0, 8, 256);
    ctx.fillRect(234, 0, 8, 256);
  } else if (kind === 'cliff_rock') {
    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? 'rgba(15,23,42,0.35)' : 'rgba(148,163,184,0.12)';
      ctx.fillRect(0, y, 256, 10);
      bCtx.fillStyle = y % 32 === 0 ? '#404040' : '#b8b8b8';
      bCtx.fillRect(0, y, 256, 10);
    }
  } else if (kind === 'tech_barge') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, 240, 240);
    for (let y = 24; y < 232; y += 16) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(20, y, 216, 6);
    }
  } else if (kind === 'phase_hex') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

export class ObstacleController {
  public group: THREE.Group;
  private entries: DynamicPieceEntry[] = [];
  private activatedCheckpoints: Set<number> = new Set();

  constructor(scene: THREE.Scene, pieces: LevelPiece[] = LEVEL_PIECES) {
    this.group = new THREE.Group();
    this.buildCourse(pieces);
    scene.add(this.group);
  }

  private buildBangladeshWavingFlag(
    parent: THREE.Group,
    posX: number,
    posY: number,
    posZ: number
  ): WavingFlagHandle {
    const flagGroup = new THREE.Group();
    flagGroup.position.set(posX, posY, posZ);

    const poleMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.25,
      metalness: 0.85,
    });

    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.56, 0.4, 16),
      new THREE.MeshStandardMaterial({
        color: '#006a4e',
        roughness: 0.4,
        metalness: 0.3,
      })
    );
    baseMesh.position.y = 0.2;
    flagGroup.add(baseMesh);

    const poleHeight = 5.2;
    const poleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.105, poleHeight, 14),
      poleMat
    );
    poleMesh.position.y = poleHeight * 0.5;
    poleMesh.castShadow = true;
    flagGroup.add(poleMesh);

    const finialMat = new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#006a4e',
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.6,
    });
    const finialOrb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), finialMat);
    finialOrb.position.y = poleHeight + 0.14;
    flagGroup.add(finialOrb);

    const clothWidth = 2.4;
    const clothHeight = 1.44;
    const clothGeo = new THREE.PlaneGeometry(clothWidth, clothHeight, 16, 8);
    clothGeo.translate(clothWidth * 0.5 + 0.06, 0, 0);

    const bdFlagTex = createBangladeshFlagTexture();
    const clothMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: bdFlagTex || undefined,
      emissive: '#006a4e',
      emissiveIntensity: 0.22,
      roughness: 0.45,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    const clothMesh = new THREE.Mesh(clothGeo, clothMat);
    clothMesh.position.y = poleHeight - clothHeight * 0.52;
    clothMesh.castShadow = true;
    flagGroup.add(clothMesh);

    parent.add(flagGroup);

    const posAttr = clothGeo.attributes.position as THREE.BufferAttribute;
    const basePositions = new Float32Array(posAttr.array.length);
    basePositions.set(posAttr.array);

    return {
      clothGeo,
      basePositions,
      clothMat,
      clothMesh,
      finialMat,
    };
  }

  private buildDivisionSignboard(
    parent: THREE.Group,
    posX: number,
    posY: number,
    posZ: number,
    checkpointIndex: number
  ): THREE.MeshStandardMaterial {
    const divInfo = getDivisionByCheckpoint(checkpointIndex) || {
      index: checkpointIndex,
      nameEn: `DIVISION ${checkpointIndex}`,
      nameBn: 'বাংলাদেশ',
      label: `DIVISION ${checkpointIndex}`,
    };

    const signGroup = new THREE.Group();
    signGroup.position.set(posX, posY, posZ);

    const postMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.35,
      metalness: 0.75,
    });

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 2.5, 10), postMat);
    leftPost.position.set(-1.35, 1.25, 0);
    signGroup.add(leftPost);

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 2.5, 10), postMat);
    rightPost.position.set(1.35, 1.25, 0);
    signGroup.add(rightPost);

    const signTex = createDivisionSignTexture(
      checkpointIndex,
      divInfo.nameEn,
      divInfo.nameBn,
      false
    );
    const signMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: signTex || undefined,
      emissive: '#0f172a',
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.2,
    });

    const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.14), signMat);
    boardMesh.position.set(0, 2.15, 0);
    boardMesh.castShadow = true;
    signGroup.add(boardMesh);

    parent.add(signGroup);
    return signMat;
  }

  /**
   * Attaches bespoke 3D architectural / wreckage details based on piece.visualPreset
   * so each checkpoint zone looks and feels like a completely distinct world!
   */
  private attachZoneSetPieceDecorations(piece: LevelPiece, root: THREE.Group, entry: DynamicPieceEntry): void {
    const preset = piece.visualPreset;
    const topY = piece.size.y * 0.5;

    // Sky-Geyser High Bounce Pad visual rings
    if (piece.bounceVelocity && piece.bounceVelocity > 0) {
      const ringGeo = new THREE.TorusGeometry(Math.min(piece.size.x, piece.size.z) * 0.36, 0.16, 12, 28);
      const ringMat = new THREE.MeshStandardMaterial({
        color: '#fde047',
        emissive: '#10b981',
        emissiveIntensity: 1.5,
        roughness: 0.15,
      });
      const bounceRing = new THREE.Mesh(ringGeo, ringMat);
      bounceRing.rotation.x = Math.PI * 0.5;
      bounceRing.position.y = topY + 0.18;
      root.add(bounceRing);
      entry.bounceRingMesh = bounceRing;
    }

    if (!preset) return;

    if (preset === 'ruins_stone') {
      // Cracked ancient stone pillars and broken parapet blocks along edges
      const stoneMat = new THREE.MeshStandardMaterial({
        color: '#64748b',
        roughness: 0.9,
        metalness: 0.1,
      });
      const colLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.6, 8), stoneMat);
      colLeft.position.set(-piece.size.x * 0.4, topY + 0.8, -piece.size.z * 0.35);
      colLeft.rotation.z = 0.14;
      root.add(colLeft);

      const colRight = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.95, 8), stoneMat);
      colRight.position.set(piece.size.x * 0.4, topY + 0.45, piece.size.z * 0.3);
      colRight.rotation.x = -0.18;
      root.add(colRight);
    } else if (preset === 'airplane_tail') {
      // Crashed Airliner Tail Section with giant vertical tail fin & horizontal stabilizers
      const tailFinMat = new THREE.MeshPhysicalMaterial({
        color: '#ef4444',
        roughness: 0.25,
        metalness: 0.4,
        clearcoat: 0.8,
      });
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.8, 3.2), tailFinMat);
      fin.position.set(-piece.size.x * 0.38, topY + 1.8, 1.5);
      fin.rotation.x = -0.25;
      root.add(fin);

      const hStab = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.18, 1.8), tailFinMat);
      hStab.position.set(0, 0, 2.2);
      root.add(hStab);
    } else if (preset === 'airplane_cabin') {
      // Torn Passenger Fuselage with side airline windows, blue cheatline, and jet engine pods
      const cabinShellMat = new THREE.MeshPhysicalMaterial({
        color: '#f8fafc',
        roughness: 0.25,
        metalness: 0.35,
        clearcoat: 0.7,
      });
      const windowMat = new THREE.MeshStandardMaterial({
        color: '#0ea5e9',
        emissive: '#38bdf8',
        emissiveIntensity: 0.65,
      });
      const stripeMat = new THREE.MeshStandardMaterial({ color: '#2563eb' });

      for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 1.1, piece.size.z * 0.92),
          cabinShellMat
        );
        wall.position.set(side * (piece.size.x * 0.46), topY + 0.45, 0);
        root.add(wall);

        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.22, piece.size.z * 0.92),
          stripeMat
        );
        stripe.position.set(side * (piece.size.x * 0.46), topY + 0.35, 0);
        root.add(stripe);

        // Passenger oval windows along fuselage
        for (let wz = -piece.size.z * 0.38; wz <= piece.size.z * 0.38; wz += 1.8) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.24), windowMat);
          win.position.set(side * (piece.size.x * 0.46), topY + 0.68, wz);
          root.add(win);
        }
      }

      // Under-slung jet engine nacelle pod
      const nacelle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.75, 3.2, 16),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.3 })
      );
      nacelle.rotation.x = Math.PI * 0.5;
      nacelle.position.set(piece.size.x * 0.68, -0.2, 0);
      root.add(nacelle);
    } else if (preset === 'airplane_wing') {
      // Swept Aircraft Wing with red/green wingtip navigation strobe & flap ailerons
      const strobeMat = new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#ef4444',
        emissiveIntensity: 1.5,
      });
      const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 1.2), strobeMat);
      winglet.position.set(piece.size.x * 0.48, topY + 0.5, 0);
      winglet.rotation.z = -0.22;
      root.add(winglet);
    } else if (preset === 'airplane_cockpit') {
      // Aircraft Cockpit Nose Cone & Tinted Pilot Windshield
      const noseGeo = new THREE.ConeGeometry(piece.size.x * 0.48, 3.4, 16);
      noseGeo.rotateX(-Math.PI * 0.5);
      const noseMat = new THREE.MeshPhysicalMaterial({
        color: '#f8fafc',
        roughness: 0.2,
        metalness: 0.3,
        clearcoat: 0.9,
      });
      const noseMesh = new THREE.Mesh(noseGeo, noseMat);
      noseMesh.position.set(0, 0.1, -piece.size.z * 0.5 - 1.5);
      root.add(noseMesh);

      const windshieldMat = new THREE.MeshPhysicalMaterial({
        color: '#0f172a',
        emissive: '#0284c7',
        emissiveIntensity: 0.4,
        roughness: 0.05,
        metalness: 0.9,
        clearcoat: 1.0,
      });
      const windshield = new THREE.Mesh(
        new THREE.BoxGeometry(piece.size.x * 0.72, 0.65, 1.8),
        windshieldMat
      );
      windshield.position.set(0, topY + 0.28, -piece.size.z * 0.38);
      windshield.rotation.x = 0.35;
      root.add(windshield);
    } else if (preset === 'ship_hull') {
      // Broken Timber Ship Hull with wooden bulwark railings and broken mast
      const woodMat = new THREE.MeshStandardMaterial({
        color: '#78350f',
        roughness: 0.85,
        metalness: 0.1,
      });
      for (const side of [-1, 1]) {
        const gunwale = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.65, piece.size.z * 0.95),
          woodMat
        );
        gunwale.position.set(side * (piece.size.x * 0.47), topY + 0.3, 0);
        root.add(gunwale);
      }
      if (piece.size.z >= 10) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 5.2, 10), woodMat);
        mast.position.set(-piece.size.x * 0.35, topY + 2.4, -1.5);
        mast.rotation.z = 0.22;
        root.add(mast);
      }
    } else if (preset === 'train_coach') {
      // Derailed Express Train Carriage with side windows, yellow front stripe & roof AC pods
      const wallMat = new THREE.MeshStandardMaterial({
        color: piece.color,
        roughness: 0.35,
        metalness: 0.5,
      });
      const stripeMat = new THREE.MeshStandardMaterial({
        color: '#facc15',
        emissive: '#eab308',
        emissiveIntensity: 0.4,
      });
      for (const side of [-1, 1]) {
        const railEdge = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.48, piece.size.z),
          wallMat
        );
        railEdge.position.set(side * (piece.size.x * 0.46), topY + 0.22, 0);
        root.add(railEdge);

        const yellowStripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.14, piece.size.z),
          stripeMat
        );
        yellowStripe.position.set(side * (piece.size.x * 0.46), topY + 0.22, 0);
        root.add(yellowStripe);
      }
    } else if (preset === 'clockwork_gear') {
      // Giant Toothed Clockwork Cogwheel with 16 protruding 3D gear teeth
      const gearGroup = new THREE.Group();
      const toothMat = new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        roughness: 0.3,
        metalness: 0.8,
      });
      const radius = Math.min(piece.size.x, piece.size.z) * 0.5;
      const numTeeth = 16;
      for (let i = 0; i < numTeeth; i++) {
        const angle = (i / numTeeth) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.65, piece.size.y * 0.85, 0.75), toothMat);
        tooth.position.set(Math.cos(angle) * (radius + 0.2), 0, Math.sin(angle) * (radius + 0.2));
        tooth.rotation.y = -angle;
        gearGroup.add(tooth);
      }
      root.add(gearGroup);
      entry.gearRimGroup = gearGroup;
    } else if (preset === 'meteor_rock') {
      // Glowing volcanic magma crystals erupting from meteor boulders
      const magmaMat = new THREE.MeshStandardMaterial({
        color: '#f97316',
        emissive: '#ef4444',
        emissiveIntensity: 1.3,
        roughness: 0.2,
      });
      for (const side of [-1, 1]) {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), magmaMat);
        shard.scale.set(0.7, 2.1, 0.7);
        shard.position.set(side * (piece.size.x * 0.38), topY + 0.4, side * 0.8);
        shard.rotation.z = side * -0.35;
        root.add(shard);
      }
    } else if (preset === 'broken_highway') {
      // Concrete highway jersey barriers & twisted rebar on broken overpass
      const concreteMat = new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.85,
      });
      for (const side of [-1, 1]) {
        const barrier = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.55, piece.size.z * 0.9),
          concreteMat
        );
        barrier.position.set(side * (piece.size.x * 0.45), topY + 0.26, 0);
        root.add(barrier);
      }
    }
  }

  private buildCourse(pieces: LevelPiece[]): void {
    const cliffTex = createProceduralTexture('cliff_rock', '#334155');
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      map: cliffTex.map,
      bumpMap: cliffTex.bumpMap,
      bumpScale: 0.18,
      roughness: 0.88,
      metalness: 0.12,
    });

    const underCrystalMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.5,
    });

    for (const piece of pieces) {
      const root = new THREE.Group();
      root.position.set(piece.position.x, piece.position.y, piece.position.z);

      const entry: DynamicPieceEntry = { piece, root };

      if (
        piece.kind === 'start_island' ||
        piece.kind === 'finish_island' ||
        piece.kind === 'checkpoint_platform' ||
        piece.kind === 'static_platform' ||
        piece.kind === 'small_pad' ||
        piece.kind === 'narrow_bridge' ||
        piece.kind === 'moving_platform' ||
        piece.kind === 'disappearing_platform'
      ) {
        const texKind =
          piece.visualPreset === 'broken_highway'
            ? 'asphalt_road'
            : piece.visualPreset === 'ship_hull'
            ? 'wood_plank'
            : piece.visualPreset === 'meteor_rock'
            ? 'cliff_rock'
            : piece.kind === 'moving_platform' || piece.kind === 'narrow_bridge'
            ? 'tech_barge'
            : piece.kind === 'disappearing_platform' || piece.visualPreset === 'glass_pane'
            ? 'phase_hex'
            : 'stone_deck';

        const procTex = createProceduralTexture(texKind, piece.color);
        procTex.map.repeat.set(
          Math.max(1, Math.round(piece.size.x / 3)),
          Math.max(1, Math.round(piece.size.z / 3))
        );
        procTex.bumpMap.repeat.copy(procTex.map.repeat);

        const isGlass = piece.visualPreset === 'glass_pane';
        const geo =
          piece.visualPreset === 'clockwork_gear'
            ? new THREE.CylinderGeometry(
                piece.size.x * 0.5,
                piece.size.x * 0.5,
                piece.size.y,
                24
              )
            : new THREE.BoxGeometry(piece.size.x, piece.size.y, piece.size.z);

        const mat = new THREE.MeshPhysicalMaterial({
          color: piece.color,
          map: procTex.map,
          bumpMap: procTex.bumpMap,
          bumpScale: 0.06,
          roughness: isGlass || piece.kind === 'disappearing_platform' ? 0.1 : 0.42,
          metalness:
            piece.visualPreset === 'clockwork_gear' ||
            piece.visualPreset === 'airplane_cabin'
              ? 0.65
              : 0.2,
          clearcoat: isGlass || piece.kind === 'disappearing_platform' ? 0.95 : 0.3,
          transparent: isGlass || piece.kind === 'disappearing_platform',
          opacity: isGlass && piece.kind !== 'disappearing_platform' ? 0.78 : 1.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        if (piece.visualTilt) {
          mesh.rotation.set(
            piece.visualTilt.x * 0.25,
            piece.visualTilt.y * 0.25,
            piece.visualTilt.z * 0.25
          );
        }
        root.add(mesh);
        entry.mainMaterial = mat;

        // Attach zone-specific 3D set-piece models (airplane, ship, train, gears, meteors, etc.)
        this.attachZoneSetPieceDecorations(piece, root, entry);

        if (
          piece.kind === 'start_island' ||
          piece.kind === 'finish_island' ||
          piece.kind === 'checkpoint_platform'
        ) {
          const underRadius = Math.min(piece.size.x, piece.size.z) * 0.48;
          const underHeight = Math.max(2.0, underRadius * 1.25);
          const coneGeo = new THREE.ConeGeometry(underRadius, underHeight, 9);
          const coneMesh = new THREE.Mesh(coneGeo, rockMat);
          coneMesh.rotation.x = Math.PI;
          coneMesh.position.y = -piece.size.y * 0.5 - underHeight * 0.5;
          root.add(coneMesh);

          const shardGeo = new THREE.OctahedronGeometry(underRadius * 0.24, 0);
          const shardMesh = new THREE.Mesh(shardGeo, underCrystalMat);
          shardMesh.scale.set(0.8, 1.8, 0.8);
          shardMesh.position.y = -piece.size.y * 0.5 - underHeight - 0.2;
          root.add(shardMesh);
        }

        if (piece.kind === 'disappearing_platform') {
          const edges = new THREE.EdgesGeometry(geo);
          const lineMat = new THREE.LineBasicMaterial({
            color: '#fef08a',
            transparent: true,
            opacity: 0.7,
          });
          const wire = new THREE.LineSegments(edges, lineMat);
          root.add(wire);
          entry.wireframeMesh = wire;
        }

        if (piece.kind === 'start_island') {
          this.addArchway(root, piece.size.x * 0.65, 5.8, '#38bdf8');
        }

        if (piece.kind === 'checkpoint_platform') {
          const ringGeo = new THREE.TorusGeometry(2.5, 0.18, 16, 40);
          const ringMat = new THREE.MeshStandardMaterial({
            color: '#00f0ff',
            emissive: '#0284c7',
            emissiveIntensity: 1.05,
            roughness: 0.15,
            metalness: 0.6,
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.rotation.x = Math.PI * 0.5;
          ringMesh.position.y = piece.size.y * 0.5 + 0.12;
          root.add(ringMesh);

          const crystalGeo = new THREE.OctahedronGeometry(0.68, 0);
          const crystalMesh = new THREE.Mesh(crystalGeo, ringMat);
          crystalMesh.position.set(0, piece.size.y * 0.5 + 2.9, 0);
          root.add(crystalMesh);

          const cpNum = piece.checkpointIndex || 1;

          const bdFlag = this.buildBangladeshWavingFlag(
            root,
            piece.size.x * 0.28,
            piece.size.y * 0.5,
            -piece.size.z * 0.22
          );

          const signMat = this.buildDivisionSignboard(
            root,
            piece.size.x * 0.31,
            piece.size.y * 0.5,
            piece.size.z * 0.22,
            cpNum
          );

          entry.checkpointRing = ringMesh;
          entry.checkpointCrystal = crystalMesh;
          entry.checkpointRingMat = ringMat;
          entry.checkpointFlag = bdFlag;
          entry.divisionSignMat = signMat;
        }

        if (piece.kind === 'finish_island') {
          this.addArchway(root, 7.5, 6.8, '#fde047');
          const crownGeo = new THREE.OctahedronGeometry(1.45, 1);
          const crownMat = new THREE.MeshPhysicalMaterial({
            color: '#fde047',
            emissive: '#f59e0b',
            emissiveIntensity: 0.95,
            roughness: 0.12,
            metalness: 0.85,
            clearcoat: 1.0,
          });
          const crown = new THREE.Mesh(crownGeo, crownMat);
          crown.position.set(0, piece.size.y * 0.5 + 4.0, 0);
          root.add(crown);
          entry.finishCrown = crown;

          const leftFinFlag = this.buildBangladeshWavingFlag(
            root,
            -5.2,
            piece.size.y * 0.5,
            -2.0
          );
          const rightFinFlag = this.buildBangladeshWavingFlag(
            root,
            5.2,
            piece.size.y * 0.5,
            -2.0
          );
          entry.finishFlags = [leftFinFlag, rightFinFlag];
        }
      } else if (piece.kind === 'rotating_bar' && piece.rotating) {
        const rotorGroup = new THREE.Group();
        const style = piece.rotating.style || 'laser_beam';

        const hubGeo = new THREE.CylinderGeometry(0.68, 0.78, 1.25, 20);
        const hubMat = new THREE.MeshStandardMaterial({
          color: '#1e293b',
          roughness: 0.35,
          metalness: 0.8,
        });
        const hub = new THREE.Mesh(hubGeo, hubMat);
        hub.castShadow = true;
        rotorGroup.add(hub);

        const barGeo = new THREE.CylinderGeometry(
          piece.rotating.barRadius,
          piece.rotating.barRadius,
          piece.rotating.barLength,
          16
        );
        barGeo.rotateZ(Math.PI * 0.5);
        const barMat = new THREE.MeshStandardMaterial({
          color: piece.color,
          emissive: style === 'jet_propeller' ? '#f97316' : '#ef4444',
          emissiveIntensity: 1.15,
          roughness: 0.2,
          metalness: 0.5,
        });
        const barMesh = new THREE.Mesh(barGeo, barMat);
        barMesh.castShadow = true;
        rotorGroup.add(barMesh);

        if (style === 'jet_propeller') {
          // Add perpendicular jet turbine blade + afterburner cone
          const crossBlade = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.65, piece.rotating.barLength * 0.95),
            new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.85, roughness: 0.2 })
          );
          rotorGroup.add(crossBlade);
        } else if (style === 'laser_ring') {
          // Giant vertical orbital plasma ring spinning around the asteroid
          const ringMesh = new THREE.Mesh(
            new THREE.TorusGeometry(piece.rotating.barLength * 0.48, 0.16, 12, 32),
            barMat
          );
          rotorGroup.add(ringMesh);
        }

        root.add(rotorGroup);
        entry.rotorGroup = rotorGroup;
      } else if (piece.kind === 'swinging_pendulum' && piece.pendulum) {
        const cfg = piece.pendulum;
        const style = cfg.style || 'battle_disc';
        const frameMat = new THREE.MeshStandardMaterial({
          color: '#334155',
          roughness: 0.45,
          metalness: 0.75,
        });

        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.48, 0.58), frameMat);
        topBeam.position.set(0, cfg.pivotHeight, 0);
        root.add(topBeam);

        const armGroup = new THREE.Group();
        armGroup.position.set(0, cfg.pivotHeight, 0);

        const rodGeo = new THREE.CylinderGeometry(0.11, 0.11, cfg.armLength, 12);
        rodGeo.translate(0, -cfg.armLength * 0.5, 0);
        const rodMesh = new THREE.Mesh(rodGeo, frameMat);
        armGroup.add(rodMesh);

        if (style === 'ship_anchor') {
          // Giant curved 3D Iron Ship Anchor with flukes!
          const anchorGroup = new THREE.Group();
          anchorGroup.position.set(0, -cfg.armLength, 0);
          const ironMat = new THREE.MeshStandardMaterial({
            color: '#1e293b',
            roughness: 0.4,
            metalness: 0.85,
          });
          const flukeGlowMat = new THREE.MeshStandardMaterial({
            color: '#ef4444',
            emissive: '#dc2626',
            emissiveIntensity: 1.1,
          });
          const crownArc = new THREE.Mesh(
            new THREE.TorusGeometry(cfg.bobRadius * 0.95, 0.22, 12, 24, Math.PI),
            ironMat
          );
          crownArc.rotation.z = Math.PI;
          anchorGroup.add(crownArc);

          const leftFluke = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.85, 8), flukeGlowMat);
          leftFluke.position.set(-cfg.bobRadius * 0.95, 0.2, 0);
          anchorGroup.add(leftFluke);

          const rightFluke = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.85, 8), flukeGlowMat);
          rightFluke.position.set(cfg.bobRadius * 0.95, 0.2, 0);
          anchorGroup.add(rightFluke);

          armGroup.add(anchorGroup);
        } else if (style === 'wrecking_ball') {
          // Spiked metallic wrecking sphere
          const sphereMesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(cfg.bobRadius, 1),
            new THREE.MeshStandardMaterial({
              color: '#0f172a',
              emissive: '#e11d48',
              emissiveIntensity: 0.75,
              roughness: 0.25,
              metalness: 0.85,
            })
          );
          sphereMesh.position.set(0, -cfg.armLength, 0);
          armGroup.add(sphereMesh);
        } else {
          const bobGeo = new THREE.CylinderGeometry(cfg.bobRadius, cfg.bobRadius, 0.55, 24);
          bobGeo.rotateX(Math.PI * 0.5);
          const bobMat = new THREE.MeshStandardMaterial({
            color: '#1e293b',
            roughness: 0.35,
            metalness: 0.85,
          });
          const bobMesh = new THREE.Mesh(bobGeo, bobMat);
          bobMesh.position.set(0, -cfg.armLength, 0);
          bobMesh.castShadow = true;
          armGroup.add(bobMesh);

          const rimGeo = new THREE.TorusGeometry(cfg.bobRadius, 0.14, 12, 28);
          const rimMat = new THREE.MeshStandardMaterial({
            color: piece.color,
            emissive: '#e11d48',
            emissiveIntensity: 1.15,
            roughness: 0.2,
            metalness: 0.5,
          });
          const rimMesh = new THREE.Mesh(rimGeo, rimMat);
          rimMesh.position.set(0, -cfg.armLength, 0);
          armGroup.add(rimMesh);
        }

        root.add(armGroup);
        entry.pendulumArmGroup = armGroup;
      } else if (piece.kind === 'crushing_piston' && piece.piston) {
        // Heavy Hydraulic Slamming Crusher Piston
        const cfg = piece.piston;
        const gantryMat = new THREE.MeshStandardMaterial({
          color: '#1e293b',
          roughness: 0.4,
          metalness: 0.8,
        });
        const topHousing = new THREE.Mesh(
          new THREE.BoxGeometry(cfg.headSize.x + 0.6, 0.7, cfg.headSize.z + 0.6),
          gantryMat
        );
        topHousing.position.set(0, 0.8, 0);
        root.add(topHousing);

        const headGroup = new THREE.Group();
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, cfg.strokeDistance + 1.2, 14),
          new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.2 })
        );
        shaft.position.set(0, (cfg.strokeDistance + 1.2) * 0.5, 0);
        headGroup.add(shaft);

        const crusherMat = new THREE.MeshStandardMaterial({
          color: '#dc2626',
          emissive: '#ef4444',
          emissiveIntensity: 0.85,
          roughness: 0.3,
          metalness: 0.6,
        });
        const crusherBlock = new THREE.Mesh(
          new THREE.BoxGeometry(cfg.headSize.x, cfg.headSize.y, cfg.headSize.z),
          crusherMat
        );
        crusherBlock.castShadow = true;
        headGroup.add(crusherBlock);

        root.add(headGroup);
        entry.pistonHeadGroup = headGroup;
      }

      this.group.add(root);
      this.entries.push(entry);
    }
  }

  private addArchway(
    parent: THREE.Group,
    width: number,
    height: number,
    glowColor: string
  ): void {
    const pillarGeo = new THREE.CylinderGeometry(0.38, 0.48, height, 12);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.35,
      metalness: 0.45,
    });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-width * 0.5, height * 0.5, 0);
    leftPillar.castShadow = true;
    parent.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(width * 0.5, height * 0.5, 0);
    rightPillar.castShadow = true;
    parent.add(rightPillar);

    const crossbarGeo = new THREE.BoxGeometry(width + 1.4, 0.9, 1.0);
    const crossbarMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.5,
    });
    const crossbar = new THREE.Mesh(crossbarGeo, crossbarMat);
    crossbar.position.set(0, height, 0);
    parent.add(crossbar);
  }

  public setCurrentCheckpoint(checkpointIndex: number): void {
    for (let i = 1; i <= checkpointIndex; i++) {
      this.activatedCheckpoints.add(i);
    }
    for (const entry of this.entries) {
      const idx = entry.piece.checkpointIndex;
      if (
        entry.piece.kind === 'checkpoint_platform' &&
        typeof idx === 'number' &&
        entry.checkpointRingMat
      ) {
        const isActivated = this.activatedCheckpoints.has(idx);
        entry.checkpointRingMat.color.set(isActivated ? '#34d399' : '#00f0ff');
        entry.checkpointRingMat.emissive.set(isActivated ? '#10b981' : '#0284c7');
        entry.checkpointRingMat.emissiveIntensity = isActivated ? 1.4 : 1.05;

        if (entry.checkpointFlag) {
          entry.checkpointFlag.finialMat.color.set(
            isActivated ? '#34d399' : '#10b981'
          );
          entry.checkpointFlag.finialMat.emissive.set(
            isActivated ? '#10b981' : '#006a4e'
          );
        }

        if (entry.divisionSignMat) {
          const divInfo = getDivisionByCheckpoint(idx);
          if (divInfo) {
            const nextSignTex = createDivisionSignTexture(
              idx,
              divInfo.nameEn,
              divInfo.nameBn,
              isActivated
            );
            if (nextSignTex) {
              entry.divisionSignMat.map?.dispose();
              entry.divisionSignMat.map = nextSignTex;
              entry.divisionSignMat.needsUpdate = true;
            }
          }
        }
      }
    }
  }

  public resetCheckpoints(): void {
    this.activatedCheckpoints.clear();
    this.setCurrentCheckpoint(0);
  }

  private animateFlagCloth(flag: WavingFlagHandle, tSec: number, seedOffset: number): void {
    const posAttr = flag.clothGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const base = flag.basePositions;

    for (let i = 0; i < posAttr.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const u = Math.max(0, (bx - 0.06) / 2.4);
      const wave1 = Math.sin(u * 5.2 - tSec * 7.8 + seedOffset) * 0.24 * u;
      const wave2 = Math.cos(by * 2.5 + u * 3.0 - tSec * 5.4) * 0.07 * u;
      arr[i * 3 + 2] = wave1 + wave2;
    }
    posAttr.needsUpdate = true;
    flag.clothGeo.computeVertexNormals();
  }

  public update(raceElapsedMs: number): void {
    const tSec = raceElapsedMs / 1000;

    for (const entry of this.entries) {
      const { piece, root } = entry;

      if (piece.kind === 'moving_platform') {
        const sample = sampleMovingPlatform(piece, raceElapsedMs);
        root.position.set(sample.position.x, sample.position.y, sample.position.z);
      } else if (piece.kind === 'rotating_bar' && entry.rotorGroup) {
        const angle = sampleRotatingBarAngle(piece, raceElapsedMs);
        entry.rotorGroup.rotation.y = -angle;
      } else if (piece.kind === 'swinging_pendulum' && entry.pendulumArmGroup) {
        const sample = samplePendulum(piece, raceElapsedMs);
        entry.pendulumArmGroup.rotation.z = sample.angleRad;
      } else if (piece.kind === 'crushing_piston' && entry.pistonHeadGroup) {
        const sample = sampleCrushingPiston(piece, raceElapsedMs);
        entry.pistonHeadGroup.position.set(
          sample.headPosition.x - piece.position.x,
          sample.headPosition.y - piece.position.y,
          sample.headPosition.z - piece.position.z
        );
      } else if (piece.kind === 'disappearing_platform' && entry.mainMaterial) {
        const state = sampleDisappearingPlatform(piece, raceElapsedMs);
        entry.mainMaterial.opacity = state.opacity;
        if (state.phase === 'warning') {
          entry.mainMaterial.emissive.set('#ef4444');
          entry.mainMaterial.emissiveIntensity = 0.65;
        } else {
          entry.mainMaterial.emissive.set('#000000');
          entry.mainMaterial.emissiveIntensity = 0.0;
        }
      }

      if (entry.gearRimGroup) {
        entry.gearRimGroup.rotation.y = tSec * 0.65;
      }

      if (entry.bounceRingMesh) {
        const pulse = 1.0 + Math.sin(tSec * 6.0) * 0.12;
        entry.bounceRingMesh.scale.set(pulse, pulse, 1);
      }

      if (entry.checkpointCrystal) {
        entry.checkpointCrystal.rotation.y = tSec * 2.0;
        entry.checkpointCrystal.position.y =
          piece.size.y * 0.5 + 2.9 + Math.sin(tSec * 3.2 + (piece.checkpointIndex || 0)) * 0.28;
      }

      if (entry.checkpointFlag) {
        this.animateFlagCloth(
          entry.checkpointFlag,
          tSec,
          (piece.checkpointIndex || 1) * 1.3
        );
      }

      if (entry.finishFlags) {
        entry.finishFlags.forEach((f, idx) => this.animateFlagCloth(f, tSec, idx * 2.1));
      }

      if (entry.finishCrown) {
        entry.finishCrown.rotation.y = tSec * 2.4;
        entry.finishCrown.position.y =
          piece.size.y * 0.5 + 4.0 + Math.sin(tSec * 3.0) * 0.35;
      }
    }
  }
}

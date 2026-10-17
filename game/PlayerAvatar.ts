import * as THREE from 'three';
import { PlayerAnimationState, Vec3 } from '../shared/types';

function createNicknameSprite(nickname: string, colorHex: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 56;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle, high-transparency glass pill background
    ctx.fillStyle = 'rgba(10, 18, 36, 0.34)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2.0;
    const rx = 22;
    const ry = 10;
    const rw = 212;
    const rh = 36;
    const radius = 18;
    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + rw - radius, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
    ctx.lineTo(rx + rw, ry + rh - radius);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
    ctx.lineTo(rx + radius, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.72;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Small color dot
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(40, canvas.height / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Compact Gaming Font Nickname Text with subtle drop shadow for legibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 4;
    ctx.font = '800 18px "Orbitron", "Rajdhani", "Chakra Petch", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nickname.slice(0, 16), canvas.width / 2 + 5, canvas.height / 2 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  // Smaller, sleek nameplate scale positioned cleanly above the helmet
  sprite.scale.set(1.55, 0.34, 1);
  sprite.position.set(0, 1.24, 0);
  sprite.renderOrder = 999;
  return sprite;
}

export class PlayerAvatar {
  public id: string;
  public nickname: string;
  public color: string;
  public root: THREE.Group;

  // Articulated anatomical hierarchy
  private bodyGroup: THREE.Group;
  private pelvisGroup: THREE.Group;
  private spineGroup: THREE.Group;
  private neckGroup: THREE.Group;

  // 2-segment articulated arms (Shoulder -> Upper Arm -> Elbow -> Forearm/Hand)
  private leftShoulder: THREE.Group;
  private leftElbow: THREE.Group;
  private rightShoulder: THREE.Group;
  private rightElbow: THREE.Group;

  // 3-segment articulated legs (Hip -> Thigh -> Knee -> Shin -> Ankle/Shoe)
  private leftHip: THREE.Group;
  private leftKnee: THREE.Group;
  private leftAnkle: THREE.Group;
  private rightHip: THREE.Group;
  private rightKnee: THREE.Group;
  private rightAnkle: THREE.Group;

  // Thruster plumes & ground shadow
  private leftFlame: THREE.Mesh;
  private rightFlame: THREE.Mesh;
  private shadowDisc: THREE.Mesh;
  private labelSprite: THREE.Sprite;

  // Remote interpolation & biomechanical state
  public targetPosition: Vec3 = { x: 0, y: 1.6, z: -2 };
  public targetVelocity: Vec3 = { x: 0, y: 0, z: 0 };
  public targetRotationY = 0;
  public animState: PlayerAnimationState = 'idle';

  private prevAnimState: PlayerAnimationState = 'idle';
  private walkCycle = 0;
  private prevRotationY = 0;
  private turnLeanRoll = 0;
  private landingSquash = 0;

  constructor(id: string, nickname: string, color: string, initialPos: Vec3) {
    this.id = id;
    this.nickname = nickname;
    this.color = color;
    this.targetPosition = { ...initialPos };

    this.root = new THREE.Group();
    this.root.position.set(initialPos.x, initialPos.y, initialPos.z);

    this.bodyGroup = new THREE.Group();
    this.root.add(this.bodyGroup);

    const suitPrimaryMat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.28,
      metalness: 0.35,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
    });

    const suitArmorMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.42,
      metalness: 0.58,
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.5,
      metalness: 0.7,
    });

    const visorMat = new THREE.MeshPhysicalMaterial({
      color: '#0284c7',
      emissive: color,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.9,
      clearcoat: 1.0,
    });

    const glowAccentMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: color,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    // 1. Pelvis / Hip Root
    this.pelvisGroup = new THREE.Group();
    this.pelvisGroup.position.set(0, -0.1, 0);
    this.bodyGroup.add(this.pelvisGroup);

    const pelvisMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.19, 0.14, 8, 16),
      suitArmorMat
    );
    pelvisMesh.rotation.z = Math.PI * 0.5;
    pelvisMesh.castShadow = true;
    this.pelvisGroup.add(pelvisMesh);

    // 2. Spine & Sculpted Athletic Chest
    this.spineGroup = new THREE.Group();
    this.spineGroup.position.set(0, 0.1, 0);
    this.pelvisGroup.add(this.spineGroup);

    const lowerTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.18, 0.28, 16),
      suitArmorMat
    );
    lowerTorso.position.set(0, 0.14, 0);
    lowerTorso.castShadow = true;
    this.spineGroup.add(lowerTorso);

    const upperChest = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 0.22, 10, 18),
      suitPrimaryMat
    );
    upperChest.position.set(0, 0.36, 0);
    upperChest.scale.set(1.12, 1.0, 0.82);
    upperChest.castShadow = true;
    this.spineGroup.add(upperChest);

    const chestCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16),
      glowAccentMat
    );
    chestCore.rotation.x = Math.PI * 0.5;
    chestCore.position.set(0, 0.38, -0.19);
    this.spineGroup.add(chestCore);

    const jetpackBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.42, 0.16),
      suitArmorMat
    );
    jetpackBody.position.set(0, 0.34, 0.22);
    jetpackBody.castShadow = true;
    this.spineGroup.add(jetpackBody);

    const nozzleGeo = new THREE.CylinderGeometry(0.05, 0.075, 0.12, 12);
    const leftNozzle = new THREE.Mesh(nozzleGeo, jointMat);
    leftNozzle.position.set(-0.1, 0.1, 0.24);
    this.spineGroup.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, jointMat);
    rightNozzle.position.set(0.1, 0.1, 0.24);
    this.spineGroup.add(rightNozzle);

    const flameGeo = new THREE.ConeGeometry(0.065, 0.28, 10);
    flameGeo.translate(0, -0.14, 0);
    flameGeo.rotateX(Math.PI);
    const flameMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.85,
    });
    this.leftFlame = new THREE.Mesh(flameGeo, flameMat);
    this.leftFlame.position.set(-0.1, 0.04, 0.24);
    this.spineGroup.add(this.leftFlame);

    this.rightFlame = new THREE.Mesh(flameGeo, flameMat);
    this.rightFlame.position.set(0.1, 0.04, 0.24);
    this.spineGroup.add(this.rightFlame);

    // 3. Neck & Sculpted Aerodynamic Helmet Head
    this.neckGroup = new THREE.Group();
    this.neckGroup.position.set(0, 0.58, 0);
    this.spineGroup.add(this.neckGroup);

    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.1, 0.12, 12),
      jointMat
    );
    neckMesh.position.set(0, 0.04, 0);
    this.neckGroup.add(neckMesh);

    const helmetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 20, 20),
      suitPrimaryMat
    );
    helmetMesh.position.set(0, 0.22, 0);
    helmetMesh.scale.set(0.95, 1.04, 1.05);
    helmetMesh.castShadow = true;
    this.neckGroup.add(helmetMesh);

    const visorMesh = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.215,
        16,
        12,
        Math.PI * 1.15,
        Math.PI * 0.7,
        Math.PI * 0.28,
        Math.PI * 0.36
      ),
      visorMat
    );
    visorMesh.position.set(0, 0.23, -0.03);
    this.neckGroup.add(visorMesh);

    // 4. Articulated Left & Right Arms
    const buildArm = (side: -1 | 1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.31, 0.48, 0);
      this.spineGroup.add(shoulder);

      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 12),
        suitPrimaryMat
      );
      pauldron.scale.set(1.1, 0.85, 1.1);
      shoulder.add(pauldron);

      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.068, 0.18, 8, 12),
        suitArmorMat
      );
      upperArm.position.set(0, -0.14, 0);
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.26, 0);
      shoulder.add(elbow);

      const elbowSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 10, 10),
        jointMat
      );
      elbow.add(elbowSphere);

      const forearm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.06, 0.17, 8, 12),
        suitPrimaryMat
      );
      forearm.position.set(0, -0.13, 0);
      forearm.castShadow = true;
      elbow.add(forearm);

      const glove = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 10, 10),
        suitArmorMat
      );
      glove.position.set(0, -0.25, 0);
      glove.scale.set(0.85, 1.1, 1.15);
      elbow.add(glove);

      return { shoulder, elbow };
    };

    const leftArmRig = buildArm(-1);
    this.leftShoulder = leftArmRig.shoulder;
    this.leftElbow = leftArmRig.elbow;

    const rightArmRig = buildArm(1);
    this.rightShoulder = rightArmRig.shoulder;
    this.rightElbow = rightArmRig.elbow;

    // 5. Articulated Left & Right Legs
    const buildLeg = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.14, -0.05, 0);
      this.pelvisGroup.add(hip);

      const thigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.092, 0.21, 8, 14),
        suitPrimaryMat
      );
      thigh.position.set(0, -0.16, 0);
      thigh.castShadow = true;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.32, 0);
      hip.add(knee);

      const kneePad = new THREE.Mesh(
        new THREE.SphereGeometry(0.082, 10, 10),
        jointMat
      );
      kneePad.position.set(0, 0, -0.02);
      knee.add(kneePad);

      const shin = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.074, 0.22, 8, 14),
        suitArmorMat
      );
      shin.position.set(0, -0.16, 0);
      shin.castShadow = true;
      knee.add(shin);

      const ankle = new THREE.Group();
      ankle.position.set(0, -0.32, 0);
      knee.add(ankle);

      const shoeBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.1, 0.28),
        suitPrimaryMat
      );
      shoeBase.position.set(0, -0.04, -0.05);
      shoeBase.castShadow = true;
      ankle.add(shoeBase);

      const shoeSole = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.035, 0.3),
        glowAccentMat
      );
      shoeSole.position.set(0, -0.09, -0.05);
      ankle.add(shoeSole);

      return { hip, knee, ankle };
    };

    const leftLegRig = buildLeg(-1);
    this.leftHip = leftLegRig.hip;
    this.leftKnee = leftLegRig.knee;
    this.leftAnkle = leftLegRig.ankle;

    const rightLegRig = buildLeg(1);
    this.rightHip = rightLegRig.hip;
    this.rightKnee = rightLegRig.knee;
    this.rightAnkle = rightLegRig.ankle;

    // Soft Ground Contact Shadow & Color Aura Ring
    const shadowGeo = new THREE.CircleGeometry(0.45, 24);
    shadowGeo.rotateX(-Math.PI * 0.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    this.shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowDisc.position.set(0, -0.82, 0);
    this.root.add(this.shadowDisc);

    const ringGeo = new THREE.RingGeometry(0.38, 0.48, 28);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const groundRing = new THREE.Mesh(ringGeo, ringMat);
    groundRing.position.set(0, -0.81, 0);
    this.root.add(groundRing);

    // Compact, transparent floating nickname label
    this.labelSprite = createNicknameSprite(nickname, color);
    this.root.add(this.labelSprite);
  }

  public updateNicknameAndColor(nickname: string, color: string): void {
    if (this.nickname === nickname && this.color === color) return;
    this.nickname = nickname;
    this.color = color;
    this.root.remove(this.labelSprite);
    this.labelSprite.material.map?.dispose();
    this.labelSprite.material.dispose();
    this.labelSprite = createNicknameSprite(nickname, color);
    this.root.add(this.labelSprite);
  }

  public updateLocalTransform(
    dt: number,
    pos: Vec3,
    rotY: number,
    animState: PlayerAnimationState
  ): void {
    this.root.position.set(pos.x, pos.y, pos.z);

    let yawDelta = rotY - this.prevRotationY;
    while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
    while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
    this.prevRotationY = rotY;

    const targetRoll =
      animState === 'run' || animState === 'sprint'
        ? Math.max(-0.28, Math.min(0.28, (-yawDelta / Math.max(0.008, dt)) * 0.032))
        : 0;
    this.turnLeanRoll += (targetRoll - this.turnLeanRoll) * Math.min(1, dt * 10);

    this.bodyGroup.rotation.y = rotY;
    this.bodyGroup.rotation.z = this.turnLeanRoll;

    if (
      (this.prevAnimState === 'jump' || this.prevAnimState === 'fall') &&
      (animState === 'idle' || animState === 'run' || animState === 'sprint')
    ) {
      this.landingSquash = 1.0;
    }
    this.prevAnimState = animState;
    this.animState = animState;

    this.animateBiomechanicalSkeleton(dt);
  }

  public updateRemoteInterpolated(dt: number): void {
    const alpha = 1 - Math.exp(-15.0 * Math.min(0.1, dt));

    const predictedX = this.targetPosition.x + this.targetVelocity.x * dt * 0.35;
    const predictedY = this.targetPosition.y + this.targetVelocity.y * dt * 0.22;
    const predictedZ = this.targetPosition.z + this.targetVelocity.z * dt * 0.35;

    this.root.position.x += (predictedX - this.root.position.x) * alpha;
    this.root.position.y += (predictedY - this.root.position.y) * alpha;
    this.root.position.z += (predictedZ - this.root.position.z) * alpha;

    let rotDiff = this.targetRotationY - this.bodyGroup.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    this.bodyGroup.rotation.y += rotDiff * alpha;
    this.bodyGroup.rotation.z = Math.max(-0.25, Math.min(0.25, -rotDiff * 0.35));

    this.animateBiomechanicalSkeleton(dt);
  }

  private animateBiomechanicalSkeleton(dt: number): void {
    if (this.landingSquash > 0) {
      this.landingSquash = Math.max(0, this.landingSquash - dt * 4.5);
    }
    const squashOffset = this.landingSquash * 0.14;

    if (this.animState === 'dead') {
      this.bodyGroup.rotation.x = -Math.PI * 0.38;
      this.leftFlame.visible = false;
      this.rightFlame.visible = false;
      return;
    }
    this.bodyGroup.rotation.x = 0;

    if (this.animState === 'run' || this.animState === 'sprint') {
      const isSprint = this.animState === 'sprint';
      const cycleRate = isSprint ? 15.5 : 10.8;
      const strideAmp = isSprint ? 0.96 : 0.72;
      this.walkCycle += dt * cycleRate;

      const phaseL = this.walkCycle;
      const phaseR = this.walkCycle + Math.PI;

      const verticalBob = Math.abs(Math.sin(this.walkCycle)) * (isSprint ? 0.11 : 0.075);
      this.pelvisGroup.position.y = -0.1 + verticalBob - squashOffset;
      this.pelvisGroup.rotation.y = Math.sin(this.walkCycle) * 0.1;
      this.pelvisGroup.rotation.z = Math.cos(this.walkCycle) * 0.045;

      const targetLean = isSprint ? 0.32 : 0.17;
      this.spineGroup.rotation.x += (targetLean - this.spineGroup.rotation.x) * Math.min(1, dt * 12);
      this.spineGroup.rotation.y = -Math.sin(this.walkCycle) * 0.16;

      this.neckGroup.rotation.x = -this.spineGroup.rotation.x * 0.65;
      this.neckGroup.rotation.y = -this.spineGroup.rotation.y * 0.5;

      this.leftHip.rotation.x = Math.sin(phaseL) * strideAmp;
      this.rightHip.rotation.x = Math.sin(phaseR) * strideAmp;

      const kneeFlexL = Math.max(0.08, Math.sin(phaseL - 1.1) * (isSprint ? 1.48 : 1.15));
      const kneeFlexR = Math.max(0.08, Math.sin(phaseR - 1.1) * (isSprint ? 1.48 : 1.15));
      this.leftKnee.rotation.x = -kneeFlexL - squashOffset * 1.5;
      this.rightKnee.rotation.x = -kneeFlexR - squashOffset * 1.5;

      this.leftAnkle.rotation.x = Math.cos(phaseL) * 0.32;
      this.rightAnkle.rotation.x = Math.cos(phaseR) * 0.32;

      this.leftShoulder.rotation.x = Math.sin(phaseR) * (strideAmp * 0.85);
      this.rightShoulder.rotation.x = Math.sin(phaseL) * (strideAmp * 0.85);
      this.leftShoulder.rotation.z = 0.12;
      this.rightShoulder.rotation.z = -0.12;

      this.leftElbow.rotation.x = 0.65 + Math.max(0, Math.sin(phaseR)) * (isSprint ? 0.75 : 0.45);
      this.rightElbow.rotation.x = 0.65 + Math.max(0, Math.sin(phaseL)) * (isSprint ? 0.75 : 0.45);

      this.leftFlame.visible = isSprint;
      this.rightFlame.visible = isSprint;
      if (isSprint) {
        const flicker = 0.8 + Math.random() * 0.45;
        this.leftFlame.scale.set(1, flicker, 1);
        this.rightFlame.scale.set(1, flicker, 1);
      }
      this.shadowDisc.scale.setScalar(1.0);
    } else if (this.animState === 'jump' || this.animState === 'fall') {
      const isJumpUp = this.animState === 'jump';
      this.walkCycle += dt * 6.0;

      this.pelvisGroup.position.y = -0.06;
      this.pelvisGroup.rotation.set(0, 0, 0);
      this.spineGroup.rotation.x = isJumpUp ? -0.12 : 0.18;
      this.spineGroup.rotation.y = 0;
      this.neckGroup.rotation.x = isJumpUp ? -0.15 : 0.2;

      this.leftHip.rotation.x = isJumpUp ? 0.65 : 0.35;
      this.leftKnee.rotation.x = isJumpUp ? -1.35 : -0.85;
      this.leftAnkle.rotation.x = -0.25;

      this.rightHip.rotation.x = isJumpUp ? -0.35 : -0.15;
      this.rightKnee.rotation.x = isJumpUp ? -0.55 : -0.45;
      this.rightAnkle.rotation.x = 0.3;

      const airWave = Math.sin(this.walkCycle) * 0.15;
      this.leftShoulder.rotation.x = 0.85 + airWave;
      this.rightShoulder.rotation.x = 0.85 - airWave;
      this.leftShoulder.rotation.z = 0.42;
      this.rightShoulder.rotation.z = -0.42;
      this.leftElbow.rotation.x = 0.55;
      this.rightElbow.rotation.x = 0.55;

      this.leftFlame.visible = isJumpUp;
      this.rightFlame.visible = isJumpUp;
      if (isJumpUp) {
        const pulse = 1.1 + Math.sin(this.walkCycle * 3) * 0.3;
        this.leftFlame.scale.set(1.1, pulse, 1.1);
        this.rightFlame.scale.set(1.1, pulse, 1.1);
      }
      this.shadowDisc.scale.setScalar(0.55);
    } else {
      this.walkCycle += dt * 2.4;
      const breath = Math.sin(this.walkCycle);

      this.pelvisGroup.position.y = -0.1 + breath * 0.015 - squashOffset;
      this.pelvisGroup.rotation.set(0, 0, 0);
      this.spineGroup.rotation.x = 0.04 + breath * 0.02 + squashOffset * 0.6;
      this.spineGroup.rotation.y = 0;
      this.neckGroup.rotation.set(0, 0, 0);

      this.leftHip.rotation.x = squashOffset * 0.9;
      this.rightHip.rotation.x = -0.06 + squashOffset * 0.9;
      this.leftKnee.rotation.x = -squashOffset * 1.8;
      this.rightKnee.rotation.x = -0.08 - squashOffset * 1.8;
      this.leftAnkle.rotation.x = 0;
      this.rightAnkle.rotation.x = 0;

      this.leftShoulder.rotation.x = breath * 0.05;
      this.rightShoulder.rotation.x = -breath * 0.05;
      this.leftShoulder.rotation.z = 0.1;
      this.rightShoulder.rotation.z = -0.1;
      this.leftElbow.rotation.x = 0.28;
      this.rightElbow.rotation.x = 0.28;

      this.leftFlame.visible = false;
      this.rightFlame.visible = false;
      this.shadowDisc.scale.setScalar(1.0);
    }
  }

  public dispose(parent: THREE.Object3D): void {
    parent.remove(this.root);
    this.labelSprite.material.map?.dispose();
    this.labelSprite.material.dispose();
  }
}

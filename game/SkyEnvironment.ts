import * as THREE from 'three';

export interface SkyEnvironmentHandle {
  group: THREE.Group;
  update: (elapsedSeconds: number, playerZ: number) => void;
}

function createSkyGradientTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#040d24'); // Deep stratosphere zenith
  grad.addColorStop(0.32, '#0e2a66'); // High altitude royal blue
  grad.addColorStop(0.62, '#226bb0'); // Mid-sky cerulean
  grad.addColorStop(0.84, '#7dd3fc'); // Horizon azure mist
  grad.addColorStop(0.94, '#fef08a'); // Golden hour sunlit cloud band
  grad.addColorStop(1.0, '#0f172a'); // Deep abyss below
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an ultra-soft, multi-layered photorealistic cumulus cloud puff texture
 * with zero hard edges, warm sunlit white top highlights, and soft atmospheric undersides.
 */
function createRealisticCloudTexture(isRainCloud: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const puffs = isRainCloud
    ? [
        { x: 128, y: 138, r: 86, inner: 'rgba(148, 163, 184, 0.78)', mid: 'rgba(100, 116, 139, 0.45)', outer: 'rgba(71, 85, 105, 0.0)' },
        { x: 84, y: 128, r: 68, inner: 'rgba(203, 213, 225, 0.85)', mid: 'rgba(148, 163, 184, 0.45)', outer: 'rgba(100, 116, 139, 0.0)' },
        { x: 172, y: 130, r: 66, inner: 'rgba(203, 213, 225, 0.85)', mid: 'rgba(148, 163, 184, 0.45)', outer: 'rgba(100, 116, 139, 0.0)' },
        { x: 112, y: 98, r: 66, inner: 'rgba(241, 245, 249, 0.94)', mid: 'rgba(203, 213, 225, 0.52)', outer: 'rgba(148, 163, 184, 0.0)' },
        { x: 148, y: 102, r: 62, inner: 'rgba(248, 250, 252, 0.92)', mid: 'rgba(203, 213, 225, 0.5)', outer: 'rgba(148, 163, 184, 0.0)' },
      ]
    : [
        { x: 128, y: 138, r: 84, inner: 'rgba(224, 242, 254, 0.75)', mid: 'rgba(186, 230, 253, 0.42)', outer: 'rgba(186, 230, 253, 0.0)' },
        { x: 84, y: 126, r: 68, inner: 'rgba(255, 255, 255, 0.92)', mid: 'rgba(240, 249, 255, 0.52)', outer: 'rgba(224, 242, 254, 0.0)' },
        { x: 172, y: 128, r: 66, inner: 'rgba(255, 255, 255, 0.92)', mid: 'rgba(240, 249, 255, 0.52)', outer: 'rgba(224, 242, 254, 0.0)' },
        { x: 110, y: 96, r: 68, inner: 'rgba(255, 255, 255, 0.98)', mid: 'rgba(254, 252, 232, 0.6)', outer: 'rgba(255, 255, 255, 0.0)' },
        { x: 148, y: 98, r: 64, inner: 'rgba(255, 255, 255, 0.96)', mid: 'rgba(248, 250, 252, 0.58)', outer: 'rgba(255, 255, 255, 0.0)' },
      ];

  for (const p of puffs) {
    const grad = ctx.createRadialGradient(
      p.x,
      p.y - p.r * 0.15,
      p.r * 0.05,
      p.x,
      p.y,
      p.r
    );
    grad.addColorStop(0.0, p.inner);
    grad.addColorStop(0.55, p.mid);
    grad.addColorStop(1.0, p.outer);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface RainSystemEntry {
  lines: THREE.LineSegments;
  dropOffsets: Float32Array;
  dropSpeeds: Float32Array;
  fallHeight: number;
}

export function createSkyEnvironment(
  scene: THREE.Scene,
  isLowPowerMobile = false
): SkyEnvironmentHandle {
  const group = new THREE.Group();
  scene.background = new THREE.Color('#0e2a66');
  scene.fog = new THREE.FogExp2('#173d73', 0.0032);

  // Realistic Sky Gradient Dome
  const skyTex = createSkyGradientTexture();
  if (skyTex) {
    const domeGeo = new THREE.SphereGeometry(420, 32, 24);
    const domeMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const skyDome = new THREE.Mesh(domeGeo, domeMat);
    group.add(skyDome);
  }

  // Glowing Golden Sun Disc & Atmospheric Halo
  const sunGroup = new THREE.Group();
  sunGroup.position.set(70, 115, -520);
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(18, 24, 24),
    new THREE.MeshBasicMaterial({ color: '#fef9c3', fog: false })
  );
  sunGroup.add(sunCore);

  const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(34, 24, 24),
    new THREE.MeshBasicMaterial({
      color: '#fde047',
      transparent: true,
      opacity: 0.24,
      fog: false,
    })
  );
  sunGroup.add(sunHalo);
  group.add(sunGroup);

  // Physically balanced Hemisphere + Warm Sun Directional Lighting
  const hemiLight = new THREE.HemisphereLight('#e0f2fe', '#334155', 1.3);
  hemiLight.position.set(0, 95, 0);
  group.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#fffbeb', 1.85);
  sunLight.position.set(45, 90, 30);
  sunLight.castShadow = !isLowPowerMobile;
  if (!isLowPowerMobile) {
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 320;
    const d = 60;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
  }
  group.add(sunLight);

  const rimLight = new THREE.DirectionalLight('#38bdf8', 0.65);
  rimLight.position.set(-40, 35, -240);
  group.add(rimLight);

  // Scenic Volumetric Clouds + Rain Clouds kept well clear of the central road!
  const cloudClusters: { mesh: THREE.Group; baseX: number; speed: number }[] = [];
  const rainSystems: RainSystemEntry[] = [];

  const whiteCloudTex = createRealisticCloudTexture(false);
  const rainCloudTex = createRealisticCloudTexture(true);

  const whiteSpriteMat = whiteCloudTex
    ? new THREE.SpriteMaterial({
        map: whiteCloudTex,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      })
    : null;

  const rainSpriteMat = rainCloudTex
    ? new THREE.SpriteMaterial({
        map: rainCloudTex,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
      })
    : null;

  const softWhiteCoreMat = new THREE.MeshBasicMaterial({
    color: '#f8fafc',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });

  const softRainCoreMat = new THREE.MeshBasicMaterial({
    color: '#cbd5e1',
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });

  const rainLineMat = new THREE.LineBasicMaterial({
    color: '#bae6fd',
    transparent: true,
    opacity: 0.62,
  });

  const smoothSphereGeo = new THREE.SphereGeometry(1.0, 14, 12);
  // Reduced cloud count and positioned far to the left/right of the road so the path is 100% clear
  const totalClouds = isLowPowerMobile ? 26 : 44;

  for (let i = 0; i < totalClouds; i++) {
    const cluster = new THREE.Group();
    const isRainCloud = i % 3 === 1;
    const puffCount = 4 + (i % 4);

    for (let p = 0; p < puffCount; p++) {
      const scale = 2.4 + ((i * 7 + p * 3) % 5) * 0.85;
      const offsetX = (p - puffCount * 0.5) * 2.2;
      const offsetY = Math.sin(p * 1.3) * 0.7;
      const offsetZ = ((p * 3) % 2) * 1.4;

      if (whiteSpriteMat && rainSpriteMat) {
        const sprite = new THREE.Sprite(isRainCloud ? rainSpriteMat : whiteSpriteMat);
        sprite.scale.set(scale * 3.1, scale * 2.1, 1);
        sprite.position.set(offsetX, offsetY, offsetZ);
        cluster.add(sprite);
      }

      const coreMesh = new THREE.Mesh(
        smoothSphereGeo,
        isRainCloud ? softRainCoreMat : softWhiteCoreMat
      );
      coreMesh.scale.set(scale * 1.15, scale * 0.52, scale * 0.95);
      coreMesh.position.set(offsetX, offsetY, offsetZ);
      cluster.add(coreMesh);
    }

    if (isRainCloud) {
      const dropCount = isLowPowerMobile ? 32 : 58;
      const fallHeight = 18.0;
      const spreadX = puffCount * 1.9;
      const spreadZ = 5.0;

      const linePositions = new Float32Array(dropCount * 6);
      const dropOffsets = new Float32Array(dropCount * 3);
      const dropSpeeds = new Float32Array(dropCount);

      for (let d = 0; d < dropCount; d++) {
        const dx = (Math.random() - 0.5) * spreadX;
        const dy = -Math.random() * fallHeight;
        const dz = (Math.random() - 0.5) * spreadZ;
        dropOffsets[d * 3] = dx;
        dropOffsets[d * 3 + 1] = dy;
        dropOffsets[d * 3 + 2] = dz;
        dropSpeeds[d] = 18.0 + Math.random() * 10.0;

        linePositions[d * 6] = dx;
        linePositions[d * 6 + 1] = dy;
        linePositions[d * 6 + 2] = dz;
        linePositions[d * 6 + 3] = dx + 0.18;
        linePositions[d * 6 + 4] = dy - 1.35;
        linePositions[d * 6 + 5] = dz;
      }

      const rainGeo = new THREE.BufferGeometry();
      rainGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      const rainLines = new THREE.LineSegments(rainGeo, rainLineMat);
      rainLines.position.set(0, -1.0, 0);
      cluster.add(rainLines);

      rainSystems.push({
        lines: rainLines,
        dropOffsets,
        dropSpeeds,
        fallHeight,
      });
    }

    const progressRatio = i / totalClouds;
    const courseClimbY = progressRatio * 54.0;
    const side = i % 2 === 0 ? 1 : -1;
    // Keep all clouds at least 32..72 units away from x=0 so they never block the road!
    const xDist = 32 + ((i * 13) % 40);
    const baseX = side * xDist;
    const yOffset = isRainCloud ? 5.0 + ((i * 7) % 12) : -9.0 + ((i * 11) % 22);
    const yPos = courseClimbY + yOffset;
    const zPos = 10 - progressRatio * 600;

    cluster.position.set(baseX, yPos, zPos);
    group.add(cluster);
    cloudClusters.push({
      mesh: cluster,
      baseX,
      speed: 0.16 + (i % 5) * 0.05,
    });
  }

  // Floating Atmospheric Wind & Light Motes along the ascending course
  const particleCount = isLowPowerMobile ? 120 : 240;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const ratio = Math.random();
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = ratio * 54.0 - 4 + Math.random() * 20;
    positions[i * 3 + 2] = 15 - ratio * 590;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: '#e0f2fe',
    size: 0.25,
    transparent: true,
    opacity: 0.55,
  });
  const windMotes = new THREE.Points(particleGeo, particleMat);
  group.add(windMotes);

  // Distant Floating Sky Sanctuary Spires ascending alongside the course
  const spireGeo = new THREE.OctahedronGeometry(3.5, 0);
  const spireMat = new THREE.MeshPhysicalMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.35,
    roughness: 0.2,
    metalness: 0.7,
    clearcoat: 0.8,
  });

  const spires: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const spire = new THREE.Mesh(spireGeo, spireMat);
    const side = i % 2 === 0 ? 1 : -1;
    const climbY = (i / 16) * 54.0;
    spire.position.set(
      side * (42 + (i % 3) * 14),
      climbY + 6 + (i % 4) * 4,
      -i * 36 - 10
    );
    spire.scale.set(1, 2.5, 1);
    group.add(spire);
    spires.push(spire);
  }

  scene.add(group);

  return {
    group,
    update: (elapsedSeconds: number, playerZ: number) => {
      if (skyTex) {
        group.children[0].position.z = playerZ;
      }
      for (let i = 0; i < cloudClusters.length; i++) {
        const c = cloudClusters[i];
        c.mesh.position.x = c.baseX + Math.sin(elapsedSeconds * c.speed + i) * 2.2;
      }

      // Animate falling rain streaks beneath rain-bearing clouds
      for (let r = 0; r < rainSystems.length; r++) {
        const sys = rainSystems[r];
        const posAttr = sys.lines.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const count = sys.dropSpeeds.length;

        for (let d = 0; d < count; d++) {
          const baseX = sys.dropOffsets[d * 3];
          const initY = sys.dropOffsets[d * 3 + 1];
          const baseZ = sys.dropOffsets[d * 3 + 2];
          const speed = sys.dropSpeeds[d];

          const curY = -(((Math.abs(initY) + elapsedSeconds * speed) % sys.fallHeight));
          arr[d * 6] = baseX;
          arr[d * 6 + 1] = curY;
          arr[d * 6 + 2] = baseZ;

          arr[d * 6 + 3] = baseX + 0.16;
          arr[d * 6 + 4] = curY - 1.35;
          arr[d * 6 + 5] = baseZ;
        }
        posAttr.needsUpdate = true;
      }

      for (let i = 0; i < spires.length; i++) {
        const sp = spires[i];
        sp.rotation.y = elapsedSeconds * 0.45 + i;
      }
      windMotes.position.x = Math.sin(elapsedSeconds * 0.3) * 1.8;
      windMotes.position.y = Math.cos(elapsedSeconds * 0.4) * 0.6;
    },
  };
}

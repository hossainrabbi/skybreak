import { LevelPiece, Vec3 } from './types';
import { COURSE_FINISH_Z, COURSE_START_Z } from './constants';

export type DisappearingPhase = 'solid' | 'warning' | 'hidden';

export interface DisappearingState {
  phase: DisappearingPhase;
  isCollidable: boolean;
  opacity: number;
}

export interface MovingPlatformSample {
  position: Vec3;
  velocity: Vec3;
}

export interface PendulumSample {
  pivot: Vec3;
  bobPosition: Vec3;
  angleRad: number;
  bobRadius: number;
}

export interface PistonSample {
  headPosition: Vec3;
  headSize: Vec3;
  extensionRatio: number; // 0 = retracted, 1 = fully slammed
}

/**
 * Deterministic position and instantaneous velocity of a moving platform
 * at a given synchronized race time (in milliseconds).
 */
export function sampleMovingPlatform(piece: LevelPiece, elapsedMs: number): MovingPlatformSample {
  if (!piece.moving) {
    return {
      position: { ...piece.position },
      velocity: { x: 0, y: 0, z: 0 },
    };
  }
  const t = elapsedMs / 1000;
  const { axis, amplitude, speed, phaseOffset } = piece.moving;
  const angle = t * speed + phaseOffset;
  const offset = Math.sin(angle) * amplitude;
  const deriv = Math.cos(angle) * amplitude * speed;

  const position: Vec3 = { ...piece.position };
  const velocity: Vec3 = { x: 0, y: 0, z: 0 };
  position[axis] += offset;
  velocity[axis] = deriv;

  return { position, velocity };
}

/**
 * Deterministic rotation angle (in radians around Y axis) of a rotating hazard bar.
 */
export function sampleRotatingBarAngle(piece: LevelPiece, elapsedMs: number): number {
  if (!piece.rotating) return 0;
  const t = elapsedMs / 1000;
  return piece.rotating.initialAngle + t * piece.rotating.speedRadPerSec;
}

/**
 * Deterministic state of an overhead swinging pendulum at synchronized race time.
 */
export function samplePendulum(piece: LevelPiece, elapsedMs: number): PendulumSample {
  const cfg = piece.pendulum;
  const pivot: Vec3 = {
    x: piece.position.x,
    y: piece.position.y + (cfg ? cfg.pivotHeight : 7.0),
    z: piece.position.z,
  };
  if (!cfg) {
    return {
      pivot,
      bobPosition: { ...piece.position },
      angleRad: 0,
      bobRadius: 0.9,
    };
  }
  const t = elapsedMs / 1000;
  const angleRad = Math.sin(t * cfg.speed + cfg.phaseOffset) * cfg.maxAngleRad;
  const bobPosition: Vec3 = {
    x: pivot.x + Math.sin(angleRad) * cfg.armLength,
    y: pivot.y - Math.cos(angleRad) * cfg.armLength,
    z: pivot.z,
  };
  return {
    pivot,
    bobPosition,
    angleRad,
    bobRadius: cfg.bobRadius,
  };
}

/**
 * Deterministic phase of a disappearing platform at synchronized race time.
 */
export function sampleDisappearingPlatform(
  piece: LevelPiece,
  elapsedMs: number
): DisappearingState {
  if (!piece.disappearing) {
    return { phase: 'solid', isCollidable: true, opacity: 1.0 };
  }
  const { solidDurationMs, warningDurationMs, hiddenDurationMs, phaseOffsetMs } =
    piece.disappearing;
  const cycleMs = solidDurationMs + warningDurationMs + hiddenDurationMs;
  const mod = (((elapsedMs + phaseOffsetMs) % cycleMs) + cycleMs) % cycleMs;

  if (mod < solidDurationMs) {
    return { phase: 'solid', isCollidable: true, opacity: 1.0 };
  }
  if (mod < solidDurationMs + warningDurationMs) {
    const warnElapsed = mod - solidDurationMs;
    const pulse = 0.45 + 0.45 * Math.abs(Math.sin((warnElapsed / 120) * Math.PI));
    return { phase: 'warning', isCollidable: true, opacity: pulse };
  }
  return { phase: 'hidden', isCollidable: false, opacity: 0.12 };
}

/**
 * Deterministic state of a slamming hydraulic crushing piston:
 * - 0..20% of cycle: rapid slam stroke (0 -> 1)
 * - 20..40% of cycle: held slammed at full extension (1)
 * - 40..85% of cycle: smooth retraction (1 -> 0)
 * - 85..100% of cycle: cocked open waiting (0)
 */
export function sampleCrushingPiston(piece: LevelPiece, elapsedMs: number): PistonSample {
  const cfg = piece.piston;
  if (!cfg) {
    return {
      headPosition: { ...piece.position },
      headSize: { x: 2, y: 2, z: 2 },
      extensionRatio: 0,
    };
  }
  const cycle = Math.max(500, cfg.cycleMs);
  const mod = (((elapsedMs + cfg.phaseOffsetMs) % cycle) + cycle) % cycle;
  const frac = mod / cycle;

  let ratio = 0;
  if (frac < 0.18) {
    ratio = frac / 0.18;
  } else if (frac < 0.36) {
    ratio = 1.0;
  } else if (frac < 0.82) {
    ratio = 1.0 - (frac - 0.36) / 0.46;
  } else {
    ratio = 0;
  }

  const headPosition: Vec3 = { ...piece.position };
  if (cfg.axis === 'y') {
    headPosition.y = piece.position.y - ratio * cfg.strokeDistance;
  } else {
    headPosition.x = piece.position.x + ratio * cfg.strokeDistance;
  }

  return {
    headPosition,
    headSize: cfg.headSize,
    extensionRatio: ratio,
  };
}

/**
 * Compute normalized course progress percentage (0..100) from Z position.
 */
export function computeCourseProgressPercent(z: number): number {
  const totalDistance = Math.abs(COURSE_FINISH_Z - COURSE_START_Z);
  if (totalDistance <= 0.001) return 0;
  const traveled = COURSE_START_Z - z;
  const ratio = Math.max(0, Math.min(1, traveled / totalDistance));
  return Math.round(ratio * 100);
}

/**
 * Compute 3D Euclidean distance between two points.
 */
export function distance3D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compute shortest distance from a point P to a line segment AB in 3D.
 */
export function distancePointToSegment3D(p: Vec3, a: Vec3, b: Vec3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const apz = p.z - a.z;
  const abLenSq = abx * abx + aby * aby + abz * abz;
  if (abLenSq <= 1e-6) {
    return distance3D(p, a);
  }
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / abLenSq));
  const closest: Vec3 = {
    x: a.x + abx * t,
    y: a.y + aby * t,
    z: a.z + abz * t,
  };
  return distance3D(p, closest);
}

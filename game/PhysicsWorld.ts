import {
  LevelPiece,
  PlayerAnimationState,
  Vec3,
} from '../shared/types';
import {
  PHYSICS_CONSTANTS,
  TOTAL_CHECKPOINTS,
} from '../shared/constants';
import {
  LEVEL_PIECES,
  getCheckpointPiece,
  getSpawnPositionForCheckpoint,
} from '../shared/levelData';
import {
  computeCourseProgressPercent,
  distance3D,
  distancePointToSegment3D,
  sampleCrushingPiston,
  sampleDisappearingPlatform,
  sampleMovingPlatform,
  samplePendulum,
  sampleRotatingBarAngle,
} from '../shared/obstacleMath';

export interface PlayerInputState {
  forward: number; // -1..1 (positive = forward/up)
  right: number;   // -1..1 (positive = right)
  jumpPressed: boolean;
  sprint: boolean;
  cameraYaw: number;
}

export interface PhysicsCallbacks {
  onJump?: () => void;
  onLand?: () => void;
  onKnockback?: (position: Vec3) => void;
  onCheckpointReached?: (checkpointIndex: number, position: Vec3) => void;
  onPlayerDied?: (reason: 'fall' | 'hazard', position: Vec3) => void;
  onFinishReached?: (position: Vec3) => void;
}

export class PhysicsWorld {
  public position: Vec3;
  public velocity: Vec3 = { x: 0, y: 0, z: 0 };
  public rotationY = 0;
  public isGrounded = false;
  public animState: PlayerAnimationState = 'idle';
  public currentCheckpoint = 0;
  public slotIndex = 0;
  public progressPercent = 0;
  public isRespawning = false;
  public respawnRemainingMs = 0;
  public standingPieceId: string | null = null;

  private lastGroundedTimeMs = 0;
  private lastJumpPressedTimeMs = -9999;
  private wasJumpHeld = false;
  private hasTriggeredFinish = false;
  private knockbackStunMs = 0;
  private knockbackCooldownMs = 0;
  private pieces: LevelPiece[];

  constructor(slotIndex = 0, pieces: LevelPiece[] = LEVEL_PIECES) {
    this.slotIndex = slotIndex;
    this.pieces = pieces;
    this.position = { ...getSpawnPositionForCheckpoint(0, slotIndex) };
  }

  public resetForRace(slotIndex: number): void {
    this.slotIndex = slotIndex;
    this.currentCheckpoint = 0;
    this.progressPercent = 0;
    this.isRespawning = false;
    this.respawnRemainingMs = 0;
    this.hasTriggeredFinish = false;
    this.knockbackStunMs = 0;
    this.knockbackCooldownMs = 0;
    this.standingPieceId = null;
    this.position = { ...getSpawnPositionForCheckpoint(0, slotIndex) };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotationY = 0;
    this.animState = 'idle';
    this.isGrounded = true;
  }

  public forceRespawnAtCheckpoint(checkpointIndex: number): void {
    this.currentCheckpoint = checkpointIndex;
    this.position = { ...getSpawnPositionForCheckpoint(checkpointIndex, this.slotIndex) };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.isRespawning = false;
    this.respawnRemainingMs = 0;
    this.knockbackStunMs = 0;
    this.knockbackCooldownMs = 0;
    this.animState = 'idle';
    this.isGrounded = true;
  }

  public step(
    dtSeconds: number,
    raceElapsedMs: number,
    input: PlayerInputState,
    controlsEnabled: boolean,
    callbacks?: PhysicsCallbacks
  ): void {
    const clampedDt = Math.min(0.1, Math.max(0.001, dtSeconds));
    const dtMs = clampedDt * 1000;

    if (this.isRespawning) {
      this.respawnRemainingMs -= dtMs;
      this.animState = 'dead';
      this.velocity = { x: 0, y: 0, z: 0 };
      if (this.respawnRemainingMs <= 0) {
        this.forceRespawnAtCheckpoint(this.currentCheckpoint);
      }
      return;
    }

    if (this.knockbackStunMs > 0) {
      this.knockbackStunMs = Math.max(0, this.knockbackStunMs - dtMs);
    }
    if (this.knockbackCooldownMs > 0) {
      this.knockbackCooldownMs = Math.max(0, this.knockbackCooldownMs - dtMs);
    }

    if (controlsEnabled && input.jumpPressed && !this.wasJumpHeld) {
      this.lastJumpPressedTimeMs = raceElapsedMs;
    }
    this.wasJumpHeld = input.jumpPressed;

    const maxStep = 1 / 120;
    const steps = Math.max(1, Math.ceil(clampedDt / maxStep));
    const subDt = clampedDt / steps;

    for (let i = 0; i < steps; i++) {
      const subElapsedMs = raceElapsedMs - (steps - 1 - i) * subDt * 1000;
      this.stepSubFrame(subDt, subElapsedMs, input, controlsEnabled, callbacks);
      if (this.isRespawning) break;
    }

    this.progressPercent = computeCourseProgressPercent(this.position.z);
  }

  private stepSubFrame(
    dt: number,
    raceElapsedMs: number,
    input: PlayerInputState,
    controlsEnabled: boolean,
    callbacks?: PhysicsCallbacks
  ): void {
    const prevGrounded = this.isGrounded;

    let moveX = 0;
    let moveZ = 0;
    if (controlsEnabled) {
      const forwardX = -Math.sin(input.cameraYaw);
      const forwardZ = -Math.cos(input.cameraYaw);
      const rightX = Math.cos(input.cameraYaw);
      const rightZ = -Math.sin(input.cameraYaw);

      moveX = forwardX * input.forward + rightX * input.right;
      moveZ = forwardZ * input.forward + rightZ * input.right;
      const len = Math.hypot(moveX, moveZ);
      if (len > 1.0) {
        moveX /= len;
        moveZ /= len;
      }
    }

    const topSpeed =
      PHYSICS_CONSTANTS.MOVE_SPEED *
      (controlsEnabled && input.sprint ? PHYSICS_CONSTANTS.SPRINT_MULTIPLIER : 1.0);
    const targetVx = moveX * topSpeed;
    const targetVz = moveZ * topSpeed;

    // While knocked back by a hazard (knockbackStunMs > 0), preserve the knockback momentum
    const accelFactor =
      this.knockbackStunMs > 0
        ? Math.min(1, dt * 1.4)
        : this.isGrounded
        ? Math.min(1, dt * PHYSICS_CONSTANTS.GROUND_FRICTION)
        : Math.min(1, dt * PHYSICS_CONSTANTS.GROUND_FRICTION * PHYSICS_CONSTANTS.AIR_CONTROL);

    this.velocity.x += (targetVx - this.velocity.x) * accelFactor;
    this.velocity.z += (targetVz - this.velocity.z) * accelFactor;

    if (Math.hypot(moveX, moveZ) > 0.08 && this.knockbackStunMs <= 0) {
      const targetYaw = Math.atan2(-moveX, -moveZ);
      let diff = targetYaw - this.rotationY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.rotationY += diff * Math.min(1, dt * 14);
    }

    const canCoyoteJump =
      this.isGrounded ||
      raceElapsedMs - this.lastGroundedTimeMs <= PHYSICS_CONSTANTS.COYOTE_TIME_MS;
    const hasBufferedJump =
      raceElapsedMs - this.lastJumpPressedTimeMs <= PHYSICS_CONSTANTS.JUMP_BUFFER_MS;

    if (controlsEnabled && canCoyoteJump && hasBufferedJump && this.knockbackStunMs <= 0) {
      this.velocity.y = PHYSICS_CONSTANTS.JUMP_VELOCITY;
      this.isGrounded = false;
      this.lastGroundedTimeMs = -9999;
      this.lastJumpPressedTimeMs = -9999;
      this.standingPieceId = null;
      callbacks?.onJump?.();
    }

    // Apply gravity
    this.velocity.y += PHYSICS_CONSTANTS.GRAVITY * dt;

    // Carry player if standing on a moving platform
    if (this.isGrounded && this.standingPieceId) {
      const standingPiece = this.pieces.find((p) => p.id === this.standingPieceId);
      if (standingPiece && standingPiece.kind === 'moving_platform') {
        const sample = sampleMovingPlatform(standingPiece, raceElapsedMs);
        this.position.x += sample.velocity.x * dt;
        this.position.y += sample.velocity.y * dt;
        this.position.z += sample.velocity.z * dt;
      }
    }

    const prevFootY = this.position.y - PHYSICS_CONSTANTS.PLAYER_HEIGHT * 0.5;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Platform collision & landing resolution
    this.isGrounded = false;
    this.standingPieceId = null;

    const footY = this.position.y - PHYSICS_CONSTANTS.PLAYER_HEIGHT * 0.5;
    const radius = PHYSICS_CONSTANTS.PLAYER_RADIUS;

    for (const piece of this.pieces) {
      if (
        piece.kind === 'rotating_bar' ||
        piece.kind === 'swinging_pendulum' ||
        piece.kind === 'crushing_piston'
      ) {
        continue;
      }
      if (piece.kind === 'disappearing_platform') {
        const disp = sampleDisappearingPlatform(piece, raceElapsedMs);
        if (!disp.isCollidable) continue;
      }

      const center =
        piece.kind === 'moving_platform'
          ? sampleMovingPlatform(piece, raceElapsedMs).position
          : piece.position;

      const halfX = piece.size.x * 0.5 + radius * 0.72;
      const halfY = piece.size.y * 0.5;
      const halfZ = piece.size.z * 0.5 + radius * 0.72;

      const withinX = Math.abs(this.position.x - center.x) <= halfX;
      const withinZ = Math.abs(this.position.z - center.z) <= halfZ;

      if (withinX && withinZ) {
        const topY = center.y + halfY;
        const bottomY = center.y - halfY;

        if (
          this.velocity.y <= 1.5 &&
          prevFootY >= topY - 0.55 &&
          footY <= topY + 0.14
        ) {
          this.position.y = topY + PHYSICS_CONSTANTS.PLAYER_HEIGHT * 0.5;

          if (piece.bounceVelocity && piece.bounceVelocity > 0 && controlsEnabled) {
            this.velocity.y = piece.bounceVelocity;
            this.isGrounded = false;
            this.standingPieceId = null;
            callbacks?.onJump?.();
          } else {
            if (this.velocity.y < 0) {
              this.velocity.y = 0;
            }
            this.isGrounded = true;
            this.lastGroundedTimeMs = raceElapsedMs;
            this.standingPieceId = piece.id;

            if (!prevGrounded) {
              callbacks?.onLand?.();
            }
          }

          if (
            piece.kind === 'checkpoint_platform' &&
            typeof piece.checkpointIndex === 'number' &&
            piece.checkpointIndex === this.currentCheckpoint + 1
          ) {
            this.currentCheckpoint = piece.checkpointIndex;
            callbacks?.onCheckpointReached?.(this.currentCheckpoint, { ...this.position });
          }

          if (
            piece.kind === 'finish_island' &&
            this.currentCheckpoint >= TOTAL_CHECKPOINTS &&
            !this.hasTriggeredFinish
          ) {
            this.hasTriggeredFinish = true;
            callbacks?.onFinishReached?.({ ...this.position });
          }
        } else if (
          this.velocity.y > 0 &&
          this.position.y + PHYSICS_CONSTANTS.PLAYER_HEIGHT * 0.5 >= bottomY &&
          prevFootY < bottomY
        ) {
          this.velocity.y = 0;
        }
      }
    }

    // Proximity activation for checkpoints & finish
    for (const piece of this.pieces) {
      if (
        piece.kind === 'checkpoint_platform' &&
        typeof piece.checkpointIndex === 'number' &&
        piece.checkpointIndex === this.currentCheckpoint + 1
      ) {
        if (distance3D(this.position, piece.position) <= 4.8) {
          this.currentCheckpoint = piece.checkpointIndex;
          callbacks?.onCheckpointReached?.(this.currentCheckpoint, { ...this.position });
        }
      } else if (
        piece.kind === 'finish_island' &&
        this.currentCheckpoint >= TOTAL_CHECKPOINTS &&
        !this.hasTriggeredFinish
      ) {
        if (distance3D(this.position, piece.position) <= 6.5) {
          this.hasTriggeredFinish = true;
          callbacks?.onFinishReached?.({ ...this.position });
        }
      }
    }

    // Check moving hazards: knock the player back physically instead of instant kill!
    // If they stay on the platform, they survive; if knocked off, they fall and respawn at previous checkpoint.
    if (controlsEnabled && this.knockbackCooldownMs <= 0) {
      const impulse = this.computeHazardKnockbackImpulse(raceElapsedMs);
      if (impulse) {
        this.velocity.x = impulse.x;
        this.velocity.y = impulse.y;
        this.velocity.z = impulse.z;
        this.isGrounded = false;
        this.standingPieceId = null;
        this.knockbackStunMs = 380;
        this.knockbackCooldownMs = 460;
        callbacks?.onKnockback?.({ ...this.position });
      }
    }

    // Check fall death relative to current checkpoint altitude
    const cpFloorY = getCheckpointPiece(this.currentCheckpoint).position.y;
    const dynamicFallThreshold = Math.max(PHYSICS_CONSTANTS.FALL_DEATH_Y, cpFloorY - 14.5);
    if (this.position.y < dynamicFallThreshold) {
      this.triggerDeath('fall', callbacks);
      return;
    }

    // Update animation state
    if (!this.isGrounded) {
      this.animState = this.velocity.y > 0.2 ? 'jump' : 'fall';
    } else {
      const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (hSpeed > PHYSICS_CONSTANTS.MOVE_SPEED * 1.1) {
        this.animState = 'sprint';
      } else if (hSpeed > 0.6) {
        this.animState = 'run';
      } else {
        this.animState = 'idle';
      }
    }
  }

  /**
   * Checks if the player is colliding with any moving hazard (rotating bar, pendulum,
   * or crushing piston) and returns a 3D knockback velocity impulse to push them away.
   */
  private computeHazardKnockbackImpulse(raceElapsedMs: number): Vec3 | null {
    const playerCenter = { ...this.position };
    const playerHitRadius = PHYSICS_CONSTANTS.PLAYER_RADIUS * 0.92;

    for (const piece of this.pieces) {
      if (piece.kind === 'rotating_bar' && piece.rotating) {
        if (Math.abs(playerCenter.z - piece.position.z) > piece.rotating.barLength) {
          continue;
        }
        const angle = sampleRotatingBarAngle(piece, raceElapsedMs);
        const halfLen = piece.rotating.barLength * 0.5;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const segA: Vec3 = {
          x: piece.position.x - cosA * halfLen,
          y: piece.position.y,
          z: piece.position.z - sinA * halfLen,
        };
        const segB: Vec3 = {
          x: piece.position.x + cosA * halfLen,
          y: piece.position.y,
          z: piece.position.z + sinA * halfLen,
        };
        const dist = distancePointToSegment3D(playerCenter, segA, segB);
        if (dist <= playerHitRadius + piece.rotating.barRadius) {
          // Push player in the tangential sweep direction + away from rotor hub
          const rx = playerCenter.x - piece.position.x;
          const rz = playerCenter.z - piece.position.z;
          const spinSign = piece.rotating.speedRadPerSec >= 0 ? 1 : -1;
          let pushX = -rz * spinSign + rx * 0.65;
          let pushZ = rx * spinSign + rz * 0.65;
          const len = Math.hypot(pushX, pushZ);
          if (len > 0.001) {
            pushX /= len;
            pushZ /= len;
          } else {
            pushX = spinSign;
            pushZ = 0.4;
          }
          return {
            x: pushX * 16.5,
            y: 6.8,
            z: pushZ * 14.5,
          };
        }
      } else if (piece.kind === 'swinging_pendulum' && piece.pendulum) {
        if (Math.abs(playerCenter.z - piece.position.z) > 3.5) {
          continue;
        }
        const sample = samplePendulum(piece, raceElapsedMs);
        const bobDist = distance3D(playerCenter, sample.bobPosition);
        if (bobDist <= playerHitRadius + sample.bobRadius) {
          // Fling player laterally in the direction of the pendulum impact
          const dx = playerCenter.x - sample.bobPosition.x;
          const dz = playerCenter.z - sample.bobPosition.z;
          const sideSign = dx >= 0 ? 1 : -1;
          return {
            x: sideSign * 17.5,
            y: 7.2,
            z: (dz >= 0 ? 1 : -1) * 6.5,
          };
        }
      } else if (piece.kind === 'crushing_piston' && piece.piston) {
        if (Math.abs(playerCenter.z - piece.position.z) > 4.0) {
          continue;
        }
        const sample = sampleCrushingPiston(piece, raceElapsedMs);
        const hx = sample.headSize.x * 0.5 + playerHitRadius * 0.8;
        const hy = sample.headSize.y * 0.5 + PHYSICS_CONSTANTS.PLAYER_HEIGHT * 0.44;
        const hz = sample.headSize.z * 0.5 + playerHitRadius * 0.8;

        if (
          Math.abs(playerCenter.x - sample.headPosition.x) <= hx &&
          Math.abs(playerCenter.y - sample.headPosition.y) <= hy &&
          Math.abs(playerCenter.z - sample.headPosition.z) <= hz
        ) {
          const dx = playerCenter.x - sample.headPosition.x;
          const dz = playerCenter.z - sample.headPosition.z;
          const sideSign = Math.abs(dx) > 0.15 ? Math.sign(dx) : 1;
          return {
            x: sideSign * 15.8,
            y: 6.2,
            z: (dz >= 0 ? 1 : -1) * 9.5,
          };
        }
      }
    }
    return null;
  }

  private triggerDeath(reason: 'fall' | 'hazard', callbacks?: PhysicsCallbacks): void {
    if (this.isRespawning) return;
    this.isRespawning = true;
    this.respawnRemainingMs = PHYSICS_CONSTANTS.RESPAWN_DELAY_MS;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.animState = 'dead';
    callbacks?.onPlayerDied?.(reason, { ...this.position });
  }
}

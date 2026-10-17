import { Vec3 } from '../shared/types';

export class CameraRig {
  public yaw = 0; // 0 = looking along -Z
  public pitch = 0.38; // radians above horizon
  public distance = 8.4;
  public currentPosition: Vec3 = { x: 0, y: 5, z: 6 };
  public currentLookAt: Vec3 = { x: 0, y: 1.5, z: -4 };

  private initialized = false;

  public rotate(deltaYaw: number, deltaPitch: number): void {
    this.yaw -= deltaYaw;
    this.pitch = Math.max(0.14, Math.min(1.08, this.pitch + deltaPitch));
  }

  public resetBehindPlayer(playerPos: Vec3, playerYaw = 0): void {
    this.yaw = playerYaw;
    this.pitch = 0.38;
    const desired = this.computeDesiredPosition(playerPos);
    this.currentPosition = { ...desired };
    this.currentLookAt = {
      x: playerPos.x,
      y: playerPos.y + 0.85,
      z: playerPos.z - 2.2,
    };
    this.initialized = true;
  }

  private computeDesiredPosition(targetPos: Vec3): Vec3 {
    const horizontalDist = Math.cos(this.pitch) * this.distance;
    const verticalOffset = Math.sin(this.pitch) * this.distance + 1.2;
    return {
      x: targetPos.x + Math.sin(this.yaw) * horizontalDist,
      y: Math.max(-6.0, targetPos.y + verticalOffset),
      z: targetPos.z + Math.cos(this.yaw) * horizontalDist,
    };
  }

  public update(dtSeconds: number, playerPos: Vec3, isRespawning: boolean): {
    position: Vec3;
    lookAt: Vec3;
  } {
    if (!this.initialized) {
      this.resetBehindPlayer(playerPos, 0);
    }

    const safeTarget: Vec3 = {
      x: playerPos.x,
      y: isRespawning ? Math.max(-4.5, playerPos.y) : playerPos.y,
      z: playerPos.z,
    };

    const desiredPos = this.computeDesiredPosition(safeTarget);
    const desiredLook: Vec3 = {
      x: safeTarget.x - Math.sin(this.yaw) * 2.2,
      y: safeTarget.y + 0.85,
      z: safeTarget.z - Math.cos(this.yaw) * 2.2,
    };

    const posAlpha = 1 - Math.exp(-12.0 * Math.min(0.1, dtSeconds));
    const lookAlpha = 1 - Math.exp(-15.0 * Math.min(0.1, dtSeconds));

    this.currentPosition.x += (desiredPos.x - this.currentPosition.x) * posAlpha;
    this.currentPosition.y += (desiredPos.y - this.currentPosition.y) * posAlpha;
    this.currentPosition.z += (desiredPos.z - this.currentPosition.z) * posAlpha;

    this.currentLookAt.x += (desiredLook.x - this.currentLookAt.x) * lookAlpha;
    this.currentLookAt.y += (desiredLook.y - this.currentLookAt.y) * lookAlpha;
    this.currentLookAt.z += (desiredLook.z - this.currentLookAt.z) * lookAlpha;

    return {
      position: { ...this.currentPosition },
      lookAt: { ...this.currentLookAt },
    };
  }
}

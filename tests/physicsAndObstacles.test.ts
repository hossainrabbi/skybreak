import assert from 'assert';
import { LEVEL_PIECES, getCheckpointPiece, getFinishPiece } from '../shared/levelData';
import { TOTAL_CHECKPOINTS, TOTAL_OBSTACLE_SECTIONS } from '../shared/constants';
import {
  sampleCrushingPiston,
  sampleDisappearingPlatform,
  sampleMovingPlatform,
  samplePendulum,
  sampleRotatingBarAngle,
} from '../shared/obstacleMath';
import { PhysicsWorld } from '../game/PhysicsWorld';

export async function runPhysicsAndObstacleTests(): Promise<number> {
  let assertions = 0;

  // 1. Verify 21 distinct obstacle sections + 7 checkpoints + 8 unique themed zones + steady upward climb
  const sectionNumbers = new Set(
    LEVEL_PIECES.filter((p) => p.sectionIndex >= 1).map((p) => p.sectionIndex)
  );
  assert.strictEqual(sectionNumbers.size, TOTAL_OBSTACLE_SECTIONS);

  const checkpoints = LEVEL_PIECES.filter((p) => p.kind === 'checkpoint_platform');
  assert.strictEqual(checkpoints.length, TOTAL_CHECKPOINTS, 'Course must have 7 flag checkpoints');

  const presets = new Set(
    LEVEL_PIECES.filter((p) => p.visualPreset).map((p) => p.visualPreset)
  );
  assert.ok(presets.has('airplane_cabin'), 'Must include crashed airplane cabin');
  assert.ok(presets.has('airplane_cockpit'), 'Must include crashed airplane cockpit');
  assert.ok(presets.has('ship_hull'), 'Must include broken ship hull');
  assert.ok(presets.has('train_coach'), 'Must include derailed train coach');
  assert.ok(presets.has('clockwork_gear'), 'Must include giant clockwork gears');
  assert.ok(presets.has('glass_pane'), 'Must include shattered glass sky-walk');
  assert.ok(presets.has('meteor_rock'), 'Must include meteor asteroid belt');
  assert.ok(presets.has('broken_highway'), 'Must include broken highway overpass');

  let prevY = 0;
  for (const cp of checkpoints) {
    assert.ok(cp.position.y > prevY, `Checkpoint ${cp.checkpointIndex} must be higher than previous (${cp.position.y} > ${prevY})`);
    prevY = cp.position.y;
  }
  const finishIsland = getFinishPiece();
  assert.ok(finishIsland.position.y > prevY, 'Finish Island must be at the highest altitude of the course');
  assertions += 18;
  console.log(`    ✓ [1/5] Verified ${sectionNumbers.size} ascending sections, 8 unique zone themes, and vertical climb (y: 0 -> ${finishIsland.position.y})`);

  // 2. Verify deterministic synchronization of moving, rotating, pendulum, piston, and disappearing obstacles
  const mover = LEVEL_PIECES.find((p) => p.kind === 'moving_platform')!;
  const rotor = LEVEL_PIECES.find((p) => p.kind === 'rotating_bar')!;
  const pendulum = LEVEL_PIECES.find((p) => p.kind === 'swinging_pendulum')!;
  const disp = LEVEL_PIECES.find((p) => p.kind === 'disappearing_platform')!;
  const piston = LEVEL_PIECES.find((p) => p.kind === 'crushing_piston')!;

  const tSample = 14250;
  const m1 = sampleMovingPlatform(mover, tSample);
  const m2 = sampleMovingPlatform(mover, tSample);
  assert.deepStrictEqual(m1, m2, 'Moving platform state must be 100% deterministic across clients');

  const r1 = sampleRotatingBarAngle(rotor, tSample);
  const r2 = sampleRotatingBarAngle(rotor, tSample);
  assert.strictEqual(r1, r2, 'Rotating hazard bar angle must be deterministic');

  const p1 = samplePendulum(pendulum, tSample);
  const p2 = samplePendulum(pendulum, tSample);
  assert.deepStrictEqual(p1, p2, 'Swinging pendulum state must be deterministic');

  const pis1 = sampleCrushingPiston(piston, tSample);
  const pis2 = sampleCrushingPiston(piston, tSample);
  assert.deepStrictEqual(pis1, pis2, 'Crushing hydraulic piston state must be deterministic');

  const dSolid = sampleDisappearingPlatform(disp, 500);
  const dHidden = sampleDisappearingPlatform(disp, 4000);
  assert.strictEqual(dSolid.isCollidable, true, 'Disappearing platform should be solid during solid phase');
  assert.strictEqual(dHidden.isCollidable, false, 'Disappearing platform should be non-collidable during hidden phase');
  assertions += 6;
  console.log('    ✓ [2/5] Verified deterministic obstacle math for moving, rotating, pendulum, crushing piston, and disappearing platforms');

  // 3. Verify PhysicsWorld ground detection, jumping, and movement
  const world = new PhysicsWorld(0);
  world.step(
    0.05,
    100,
    { forward: 0, right: 0, jumpPressed: false, sprint: false, cameraYaw: 0 },
    true
  );
  assert.strictEqual(world.isGrounded, true, 'Player should stand grounded on Start Island');

  let jumped = false;
  world.step(
    0.016,
    120,
    { forward: 1, right: 0, jumpPressed: true, sprint: true, cameraYaw: 0 },
    true,
    {
      onJump: () => {
        jumped = true;
      },
    }
  );
  assert.strictEqual(jumped, true, 'Jump callback should trigger when pressing Space on ground');
  assert.ok(world.velocity.y > 5, 'Upward jump velocity must be applied');
  assert.ok(world.position.z < -2.0, 'Forward movement along -Z should advance player');
  assertions += 4;
  console.log('    ✓ [3/5] Verified 3D character physics ground detection, sprinting, and jumping');

  // 4. Verify Hazard Knockback without instant kill when on platform
  const kbWorld = new PhysicsWorld(0);
  kbWorld.currentCheckpoint = 1;
  // Place player right at the spinning jet propeller on the airplane cabin (z2-plane-propeller)
  const propPiece = LEVEL_PIECES.find((p) => p.id === 'z2-plane-propeller')!;
  kbWorld.position = { ...propPiece.position };
  let knockedBack = false;
  let diedOnImpact = false;

  kbWorld.step(
    0.016,
    1000,
    { forward: 0, right: 0, jumpPressed: false, sprint: false, cameraYaw: 0 },
    true,
    {
      onKnockback: () => {
        knockedBack = true;
      },
      onPlayerDied: () => {
        diedOnImpact = true;
      },
    }
  );
  assert.strictEqual(knockedBack, true, 'Colliding with moving hazard must trigger physical knockback');
  assert.strictEqual(diedOnImpact, false, 'Player must NOT be killed immediately on hazard contact');
  assert.strictEqual(kbWorld.isRespawning, false, 'Player should remain active unless knocked off the platform');
  assert.ok(Math.hypot(kbWorld.velocity.x, kbWorld.velocity.z) > 10, 'Strong horizontal knockback impulse must be applied');
  assertions += 4;
  console.log('    ✓ [4/5] Verified hazard knockback pushes player without instant kill while on platform');

  // 5. Verify fall detection (when knocked off platform), single death callback, and checkpoint respawn
  const cp1 = getCheckpointPiece(1);
  world.currentCheckpoint = 1;
  world.position = { x: 0, y: -15.0, z: -90.0 };

  let deathCount = 0;
  world.step(
    0.016,
    2000,
    { forward: 0, right: 0, jumpPressed: false, sprint: false, cameraYaw: 0 },
    true,
    {
      onPlayerDied: () => {
        deathCount += 1;
      },
    }
  );
  assert.strictEqual(deathCount, 1, 'Fall death must trigger exactly once');
  assert.strictEqual(world.isRespawning, true, 'Player should enter respawning state');

  for (let i = 0; i < 15; i++) {
    world.step(
      0.1,
      2100 + i * 100,
      { forward: 0, right: 0, jumpPressed: false, sprint: false, cameraYaw: 0 },
      true
    );
  }
  assert.strictEqual(world.isRespawning, false, 'Player should finish respawning within ~1.25s');
  assert.strictEqual(world.position.z, cp1.position.z, 'Player must respawn at Checkpoint 1 Z position');
  assertions += 4;
  console.log('    ✓ [5/5] Verified fall detection after falling off, single death counter increment, and 1.25s checkpoint respawn');

  return assertions;
}

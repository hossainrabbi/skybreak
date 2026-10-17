const { registerTsExtension } = require('./register-ts');

registerTsExtension();

async function runAllTests() {
  console.log('============================================================');
  console.log('  SKYBREAK Automated Quality & Multiplayer Test Suite');
  console.log('============================================================\n');

  const { runRoomManagerTests } = require('../tests/roomManager.test');
  const { runPhysicsAndObstacleTests } = require('../tests/physicsAndObstacles.test');
  const { runServerIntegrationTests } = require('../tests/serverIntegration.test');

  let passed = 0;
  let failed = 0;

  const suites = [
    { name: 'Room Manager & Authoritative Validation Tests', fn: runRoomManagerTests },
    { name: '3D Physics, Checkpoints & Obstacle Determinism Tests', fn: runPhysicsAndObstacleTests },
    { name: 'Live HTTP + Multi-Client Socket Server Integration Tests', fn: runServerIntegrationTests },
  ];

  for (const suite of suites) {
    console.log(`▶ Running Suite: ${suite.name}`);
    try {
      const count = await suite.fn();
      passed += count;
      console.log(`  ✅ Suite Passed (${count} assertions)\n`);
    } catch (err) {
      failed += 1;
      console.error(`  ❌ Suite Failed: ${suite.name}`);
      console.error(err);
    }
  }

  console.log('============================================================');
  console.log(`  TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();

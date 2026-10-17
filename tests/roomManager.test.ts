import assert from 'assert';
import { RoomManager } from '../server/roomManager';
import { getCheckpointPiece, getFinishPiece } from '../shared/levelData';
import { MAX_PLAYERS_PER_ROOM, TOTAL_CHECKPOINTS } from '../shared/constants';

export async function runRoomManagerTests(): Promise<number> {
  let assertions = 0;
  const manager = new RoomManager();

  // 1. Test Room Creation & Nickname Validation
  const emptyNickRes = manager.createRoom('socket-bad', ' ', 'token-bad');
  assert.strictEqual(emptyNickRes.ok, false, 'Empty nickname must be rejected');
  assert.strictEqual(emptyNickRes.errorCode, 'INVALID_NICKNAME');

  const createRes = manager.createRoom('socket-host', 'ArifHost', 'token-host');
  assert.strictEqual(createRes.ok, true, 'Room creation should succeed');
  assert.ok(createRes.data, 'Room snapshot should be returned');
  const roomCode = createRes.data!.roomCode;
  assert.strictEqual(roomCode.length, 6, 'Room code must be 6 characters');
  assert.strictEqual(createRes.data!.hostId, 'socket-host', 'Creator must be host');
  assert.strictEqual(createRes.data!.status, 'lobby', 'Initial room status must be lobby');
  assert.strictEqual(createRes.data!.players.length, 1, 'Room should have 1 player');
  assertions += 8;
  console.log('    ✓ [1/10] Backend room creation & host initialization verified');

  // 2. Test Unique Player Nickname Enforcement (Duplicate names rejected)
  const dupJoinSameCase = manager.joinRoom('socket-dup1', roomCode, 'ArifHost', 'token-dup1');
  assert.strictEqual(dupJoinSameCase.ok, false, 'Exact duplicate nickname must be rejected');
  assert.strictEqual(dupJoinSameCase.errorCode, 'DUPLICATE_NICKNAME');

  const dupJoinLowerCase = manager.joinRoom('socket-dup2', roomCode, 'arifhost', 'token-dup2');
  assert.strictEqual(dupJoinLowerCase.ok, false, 'Case-insensitive duplicate nickname must be rejected');
  assert.strictEqual(dupJoinLowerCase.errorCode, 'DUPLICATE_NICKNAME');

  const dupCreateOtherRoom = manager.createRoom('socket-dup3', 'ARIFHOST', 'token-dup3');
  assert.strictEqual(dupCreateOtherRoom.ok, false, 'Duplicate nickname across active rooms must be rejected');
  assert.strictEqual(dupCreateOtherRoom.errorCode, 'DUPLICATE_NICKNAME');
  assertions += 6;
  console.log('    ✓ [2/10] Case-insensitive unique player nickname enforcement verified');

  // 3. Test Room Joining (up to 4 players with unique names)
  const join2 = manager.joinRoom('socket-p2', roomCode.toLowerCase(), 'Nadia', 'token-p2');
  const join3 = manager.joinRoom('socket-p3', roomCode, 'Tanvir', 'token-p3');
  const join4 = manager.joinRoom('socket-p4', roomCode, 'Rafiq', 'token-p4');
  assert.strictEqual(join2.ok, true, 'Player 2 should join with lowercase room code');
  assert.strictEqual(join3.ok, true, 'Player 3 should join');
  assert.strictEqual(join4.ok, true, 'Player 4 should join');
  assert.strictEqual(join4.data!.players.length, MAX_PLAYERS_PER_ROOM, 'Room should have 4 players');

  const distinctColors = new Set(join4.data!.players.map((p) => p.color));
  assert.strictEqual(distinctColors.size, 4, 'All 4 players must have distinguishable colors');
  assertions += 5;
  console.log('    ✓ [3/10] Room joining & 4 distinguishable player colors verified');

  // 4. Test 4-Player Room Capacity Limit (5th player rejected)
  const join5 = manager.joinRoom('socket-p5', roomCode, 'FifthWheel', 'token-p5');
  assert.strictEqual(join5.ok, false, '5th player must be rejected from full room');
  assert.strictEqual(join5.errorCode, 'ROOM_FULL', 'Error code must be ROOM_FULL');
  assertions += 2;
  console.log('    ✓ [4/10] Four-player room limit enforcement verified (5th player rejected)');

  // 5. Test Invalid Room Codes
  const badShort = manager.joinRoom('socket-x', 'AB1', 'TesterUnique');
  assert.strictEqual(badShort.ok, false, 'Short room code must be rejected');
  assert.strictEqual(badShort.errorCode, 'INVALID_ROOM_CODE', 'Should return INVALID_ROOM_CODE');

  const notFound = manager.joinRoom('socket-x', 'ZZZZ99', 'TesterUnique');
  assert.strictEqual(notFound.ok, false, 'Non-existent room code must be rejected');
  assert.strictEqual(notFound.errorCode, 'ROOM_NOT_FOUND', 'Should return ROOM_NOT_FOUND');
  assertions += 4;
  console.log('    ✓ [5/10] Invalid and non-existent room code rejection verified');

  // 6. Test Ready Toggle & Race State Transitions
  const readyRes = manager.setPlayerReady('socket-p2', false);
  assert.strictEqual(readyRes.ok, true);
  assert.strictEqual(
    readyRes.data!.players.find((p) => p.id === 'socket-p2')!.isReady,
    false,
    'Player 2 should be marked Not Ready'
  );

  const nonHostStart = manager.prepareCountdown('socket-p2', false);
  assert.strictEqual(nonHostStart.ok, false, 'Non-host must not be allowed to start race');
  assert.strictEqual(nonHostStart.errorCode, 'NOT_HOST');

  const hostStart = manager.prepareCountdown('socket-host', false);
  assert.strictEqual(hostStart.ok, true, 'Host should start countdown');
  assert.strictEqual(hostStart.data!.status, 'countdown');

  const racingSnap = manager.startRacingNow(roomCode);
  assert.ok(racingSnap, 'Racing snapshot should exist');
  assert.strictEqual(racingSnap!.status, 'racing', 'Status should be racing');
  assert.ok(typeof racingSnap!.raceStartTime === 'number', 'raceStartTime must be set');
  assertions += 7;
  console.log('    ✓ [6/10] Ready indicators & race state transitions (lobby -> countdown -> racing) verified');

  // 7. Test Checkpoint Progression Validation (all 5 checkpoints)
  const cp2Piece = getCheckpointPiece(2);
  const skipCp = manager.reachCheckpoint('socket-host', {
    checkpointIndex: 2,
    position: cp2Piece.position,
  });
  assert.strictEqual(skipCp.ok, false, 'Skipping checkpoint 1 must be rejected');
  assert.strictEqual(skipCp.errorCode, 'INVALID_CHECKPOINT');

  const farCp = manager.reachCheckpoint('socket-host', {
    checkpointIndex: 1,
    position: { x: 0, y: 1, z: 0 },
  });
  assert.strictEqual(farCp.ok, false, 'Checkpoint claim from far away must be rejected');
  assert.strictEqual(farCp.errorCode, 'CHECKPOINT_TOO_FAR');

  for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
    const piece = getCheckpointPiece(cp);
    const cpRes = manager.reachCheckpoint('socket-host', {
      checkpointIndex: cp,
      position: { ...piece.position },
    });
    assert.strictEqual(cpRes.ok, true, `Checkpoint ${cp} activation should succeed`);
    assert.strictEqual(cpRes.data!.checkpointIndex, cp);
  }

  const p2State = manager.getRoomByCode(roomCode)!.players.get('socket-p2')!;
  assert.strictEqual(p2State.currentCheckpoint, 0, 'Other players must keep independent checkpoint progress');
  assertions += 12;
  console.log(`    ✓ [7/10] Sequential checkpoint validation (1..${TOTAL_CHECKPOINTS}) & independent player progress verified`);

  // 8. Test Death Counter & Respawn Behavior
  const death1 = manager.recordPlayerDeath('socket-host', {
    reason: 'hazard',
    position: { x: 0, y: 42, z: -435 },
  });
  assert.strictEqual(death1.ok, true, 'First death event should be recorded');
  assert.strictEqual(death1.data!.deaths, 1, 'Death counter must increment by exactly 1');
  assert.strictEqual(
    death1.data!.respawnPosition.z,
    getCheckpointPiece(TOTAL_CHECKPOINTS).position.z,
    `Player must respawn at most recently activated checkpoint (CP ${TOTAL_CHECKPOINTS})`
  );

  const duplicateDeath = manager.recordPlayerDeath('socket-host', {
    reason: 'hazard',
    position: { x: 0, y: 42, z: -435 },
  });
  assert.strictEqual(duplicateDeath.ok, false, 'Duplicate death within debounce must be ignored');
  assert.strictEqual(duplicateDeath.errorCode, 'DEATH_COOLDOWN');
  const hostAfterDeath = manager.getRoomByCode(roomCode)!.players.get('socket-host')!;
  assert.strictEqual(hostAfterDeath.deaths, 1, 'Death count must still be 1');
  assert.strictEqual(hostAfterDeath.currentCheckpoint, TOTAL_CHECKPOINTS, 'Checkpoint progress must be preserved after death');
  assertions += 7;
  console.log('    ✓ [8/10] Death counter single-increment, debounce, and checkpoint respawn verified');

  // 9. Test Winner Validation
  const finishPiece = getFinishPiece();

  const prematureFinish = manager.reachFinish('socket-p2', {
    position: { ...finishPiece.position },
  });
  assert.strictEqual(prematureFinish.ok, false, 'Player missing checkpoints cannot finish');
  assert.strictEqual(prematureFinish.errorCode, 'MISSING_CHECKPOINTS');

  const farFinish = manager.reachFinish('socket-host', {
    position: { x: 0, y: 0, z: -50 },
  });
  assert.strictEqual(farFinish.ok, false, 'Player far from finish island cannot finish');
  assert.strictEqual(farFinish.errorCode, 'FINISH_TOO_FAR');

  const validFinish = manager.reachFinish('socket-host', {
    position: { ...finishPiece.position },
  });
  assert.strictEqual(validFinish.ok, true, 'Legitimate finish must succeed');
  assert.strictEqual(validFinish.data!.isWinner, true, 'First finisher must be crowned winner');
  assert.strictEqual(validFinish.data!.snapshot.winnerId, 'socket-host');
  assert.strictEqual(validFinish.data!.snapshot.winnerNickname, 'ArifHost');
  assert.strictEqual(validFinish.data!.snapshot.status, 'finished');
  assertions += 9;
  console.log('    ✓ [9/10] Server-side winner validation & anti-cheat checks verified');

  // 10. Test Disconnect, Host Reassignment & Room Cleanup
  const hostLeft = manager.leaveCurrentRoom('socket-host');
  assert.strictEqual(hostLeft.roomDeleted, false, 'Room should remain open while 3 players remain');
  assert.notStrictEqual(hostLeft.snapshot!.hostId, 'socket-host', 'New host must be assigned');

  manager.leaveCurrentRoom('socket-p2');
  manager.leaveCurrentRoom('socket-p3');
  const lastLeft = manager.leaveCurrentRoom('socket-p4');
  assert.strictEqual(lastLeft.roomDeleted, true, 'Room must be cleaned up when last player disconnects');
  assert.strictEqual(manager.getActiveRoomCount(), 0, 'Active room count must be 0');
  assertions += 4;
  console.log('    ✓ [10/10] Player disconnection, host migration, and empty room cleanup verified');

  return assertions;
}

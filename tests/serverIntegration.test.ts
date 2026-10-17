import assert from 'assert';
import http from 'http';
import { getCheckpointPiece, getFinishPiece } from '../shared/levelData';
import { TOTAL_CHECKPOINTS } from '../shared/constants';

const { createSkybreakServer } = require('../server');
const WebSocket = require('/usr/share/nodejs/ws');

interface TestClient {
  id: string;
  emit: (event: string, payload: unknown, ack?: (res: any) => void) => void;
  on: (event: string, cb: (payload: any) => void) => void;
  close: () => void;
}

function connectTestClient(port: number): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/socket.io`);
    const listeners = new Map<string, ((payload: any) => void)[]>();
    const ackCallbacks = new Map<number, (res: any) => void>();
    let ackSeq = 1;
    let clientId = '';

    ws.on('error', reject);

    ws.on('message', (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'connect') {
        clientId = msg.id;
        resolve({
          get id() {
            return clientId;
          },
          emit: (event: string, payload: unknown, ack?: (res: any) => void) => {
            const packet: Record<string, unknown> = { type: 'event', event, payload };
            if (ack) {
              const id = ackSeq++;
              ackCallbacks.set(id, ack);
              packet.ackId = id;
            }
            ws.send(JSON.stringify(packet));
          },
          on: (event: string, cb: (payload: any) => void) => {
            if (!listeners.has(event)) listeners.set(event, []);
            listeners.get(event)!.push(cb);
          },
          close: () => ws.close(),
        });
      } else if (msg.type === 'ack' && typeof msg.ackId === 'number') {
        const cb = ackCallbacks.get(msg.ackId);
        if (cb) {
          ackCallbacks.delete(msg.ackId);
          cb(msg.data);
        }
      } else if (msg.type === 'event' && msg.event) {
        const list = listeners.get(msg.event) || [];
        for (const fn of list) {
          fn(msg.payload);
        }
      }
    });
  });
}

function httpGetJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

export async function runServerIntegrationTests(): Promise<number> {
  let assertions = 0;

  const serverHandle = await createSkybreakServer({
    port: 0,
    countdownStepMs: 25,
    allowStandaloneFallback: true,
    silent: true,
  });
  const port: number = serverHandle.port;

  try {
    // 1. Check HTTP /api/health endpoint
    const health = await httpGetJson(`http://127.0.0.1:${port}/api/health`);
    assert.strictEqual(health.status, 'ok', 'Health check endpoint must return ok');
    assert.strictEqual(health.game, 'SKYBREAK');
    assertions += 2;
    console.log(`    ✓ [1/7] Application server started on port ${port} & /api/health verified`);

    // 2. Connect 5 clients
    const c1 = await connectTestClient(port);
    const c2 = await connectTestClient(port);
    const c3 = await connectTestClient(port);
    const c4 = await connectTestClient(port);
    const c5 = await connectTestClient(port);

    const createAck: any = await new Promise((r) =>
      c1.emit('room:create', { nickname: 'PlayerOne', playerToken: 'tk1' }, r)
    );
    assert.strictEqual(createAck.ok, true);
    assert.strictEqual(
      createAck.data.players[0].isMicMuted,
      true,
      'Player microphone must be muted by default'
    );
    const roomCode = createAck.data.roomCode;

    // Verify duplicate nickname rejection over WebSocket
    const dupJoinAck: any = await new Promise((r) =>
      c2.emit('room:join', { roomCode, nickname: 'playerone', playerToken: 'tk2' }, r)
    );
    assert.strictEqual(dupJoinAck.ok, false, 'Duplicate nickname over socket must be rejected');
    assert.strictEqual(dupJoinAck.errorCode, 'DUPLICATE_NICKNAME');
    assertions += 4;
    console.log('    ✓ [2/7] Duplicate player nickname rejected & default-muted mic verified');

    // 3. Join with unique names & verify 5th client rejection
    const j2: any = await new Promise((r) =>
      c2.emit('room:join', { roomCode, nickname: 'PlayerTwo', playerToken: 'tk2' }, r)
    );
    const j3: any = await new Promise((r) =>
      c3.emit('room:join', { roomCode, nickname: 'PlayerThree', playerToken: 'tk3' }, r)
    );
    const j4: any = await new Promise((r) =>
      c4.emit('room:join', { roomCode, nickname: 'PlayerFour', playerToken: 'tk4' }, r)
    );
    const j5: any = await new Promise((r) =>
      c5.emit('room:join', { roomCode, nickname: 'PlayerFive', playerToken: 'tk5' }, r)
    );

    assert.strictEqual(j2.ok, true);
    assert.strictEqual(j3.ok, true);
    assert.strictEqual(j4.ok, true);
    assert.strictEqual(j5.ok, false, '5th network client must be rejected');
    assert.strictEqual(j5.errorCode, 'ROOM_FULL');
    assertions += 5;
    console.log('    ✓ [3/7] 4 network clients with unique names joined & 5th client rejected');

    // 4. Test Room Voice Chat Status & WebRTC Signaling Relay
    const voiceStatusPromise = new Promise<any>((resolve) => {
      c2.on('voice:player-status', resolve);
    });
    const voiceAck: any = await new Promise((r) =>
      c1.emit('voice:status', { isMicMuted: false }, r)
    );
    assert.strictEqual(voiceAck.ok, true);
    const voiceStatusEvent = await voiceStatusPromise;
    assert.strictEqual(voiceStatusEvent.playerId, c1.id);
    assert.strictEqual(voiceStatusEvent.isMicMuted, false);

    const signalReceivedPromise = new Promise<any>((resolve) => {
      c2.on('voice:signal', resolve);
    });
    const sigAck: any = await new Promise((r) =>
      c1.emit(
        'voice:signal',
        {
          targetId: c2.id,
          signalType: 'offer',
          sdp: { type: 'offer', sdp: 'v=0-mock-sdp' },
        },
        r
      )
    );
    assert.strictEqual(sigAck.ok, true);
    const sigEvent = await signalReceivedPromise;
    assert.strictEqual(sigEvent.fromId, c1.id);
    assert.strictEqual(sigEvent.signalType, 'offer');
    assertions += 6;
    console.log('    ✓ [4/7] Room voice chat mic toggle & WebRTC peer signaling relay verified');

    // 5. Synchronized Countdown (3, 2, 1, GO!) and race start broadcast
    const countdownLabels: string[] = [];
    c2.on('race:countdown', (payload) => {
      countdownLabels.push(payload.label);
    });

    const raceStartedPromise = new Promise<any>((resolve) => {
      c2.on('race:started', resolve);
    });

    const startAck: any = await new Promise((r) => c1.emit('race:start', {}, r));
    assert.strictEqual(startAck.ok, true);

    const startedSnap = await raceStartedPromise;
    assert.strictEqual(startedSnap.status, 'racing');
    assert.deepStrictEqual(
      countdownLabels,
      ['3', '2', '1', 'GO!'],
      'All clients must receive synchronized 3, 2, 1, GO! countdown'
    );
    assertions += 3;
    console.log('    ✓ [5/7] Synchronized 3, 2, 1, GO! countdown broadcast verified');

    // 6. Real-time movement sync between Client 1 and Client 2
    const moveReceivedPromise = new Promise<any>((resolve) => {
      c2.on('player:moved', resolve);
    });
    c1.emit('player:move', {
      position: { x: 1.2, y: 2.5, z: -25.0 },
      velocity: { x: 0, y: 0, z: -9.0 },
      rotationY: 0,
      animState: 'run',
    });
    const movedPayload = await moveReceivedPromise;
    assert.strictEqual(movedPayload.id, c1.id);
    assert.strictEqual(movedPayload.position.z, -25.0);
    assertions += 2;
    console.log('    ✓ [6/7] Real-time remote player movement broadcast verified');

    // 7. Full Checkpoint 1->7 progression & Race Finish winner broadcast
    for (let cp = 1; cp <= TOTAL_CHECKPOINTS; cp++) {
      const cpPiece = getCheckpointPiece(cp);
      const cpAck: any = await new Promise((r) =>
        c1.emit('player:checkpoint', { checkpointIndex: cp, position: cpPiece.position }, r)
      );
      assert.strictEqual(cpAck.ok, true);
    }

    const raceFinishedPromise = new Promise<any>((resolve) => {
      c2.on('race:finished', resolve);
    });

    const finishPiece = getFinishPiece();
    const finAck: any = await new Promise((r) =>
      c1.emit('player:finish', { position: finishPiece.position }, r)
    );
    assert.strictEqual(finAck.ok, true);
    assert.strictEqual(finAck.data.isWinner, true);

    const finishedSnap = await raceFinishedPromise;
    assert.strictEqual(finishedSnap.winnerNickname, 'PlayerOne');
    assert.strictEqual(finishedSnap.status, 'finished');
    assertions += 8;
    console.log('    ✓ [7/7] End-to-end multiplayer race completion & winner announcement verified');

    c1.close();
    c2.close();
    c3.close();
    c4.close();
    c5.close();
  } finally {
    serverHandle.io.close();
    serverHandle.httpServer.close();
  }

  return assertions;
}

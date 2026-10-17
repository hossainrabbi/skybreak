import {
  CheckpointReachedPayload,
  FinishReachedPayload,
  PlayerDiedPayload,
  PlayerMovePayload,
  VoiceSignalPayload,
} from '../shared/types';
import { RoomManager, globalRoomManager } from './roomManager';

export interface SocketLike {
  id: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, payload?: unknown) => void;
  to: (room: string) => { emit: (event: string, payload?: unknown) => void };
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeAllListeners?: (event?: string) => void;
}

export interface IoServerLike {
  to: (room: string) => { emit: (event: string, payload?: unknown) => void };
  on: (event: 'connection', handler: (socket: SocketLike) => void) => void;
}

export function attachSocketHandlers(
  io: IoServerLike,
  manager: RoomManager = globalRoomManager,
  countdownStepMs = 1000
): void {
  io.on('connection', (socket: SocketLike) => {
    // Ensure each socket can also be addressed by its own socket.id for WebRTC signaling
    socket.join(socket.id);

    const startRoomCountdown = (roomCode: string) => {
      const room = manager.getRoomByCode(roomCode);
      if (!room) return;

      if (room.countdownTimer) {
        clearInterval(room.countdownTimer);
        room.countdownTimer = null;
      }

      let currentCount = 3;
      room.countdownValue = currentCount;
      io.to(roomCode).emit('race:countdown', {
        roomCode,
        countdownValue: currentCount,
        label: String(currentCount),
        serverNow: Date.now(),
      });

      room.countdownTimer = setInterval(() => {
        currentCount -= 1;
        if (currentCount > 0) {
          room.countdownValue = currentCount;
          io.to(roomCode).emit('race:countdown', {
            roomCode,
            countdownValue: currentCount,
            label: String(currentCount),
            serverNow: Date.now(),
          });
        } else {
          if (room.countdownTimer) {
            clearInterval(room.countdownTimer);
            room.countdownTimer = null;
          }
          const startedSnapshot = manager.startRacingNow(roomCode);
          if (startedSnapshot) {
            io.to(roomCode).emit('race:countdown', {
              roomCode,
              countdownValue: 0,
              label: 'GO!',
              serverNow: startedSnapshot.serverNow,
            });
            io.to(roomCode).emit('race:started', startedSnapshot);
            io.to(roomCode).emit('room:state', startedSnapshot);
          }
        }
      }, countdownStepMs);
    };

    socket.on(
      'room:create',
      (
        payload: { nickname?: string; playerToken?: string },
        ack?: (res: unknown) => void
      ) => {
        const prevRoom = manager.getRoomBySocket(socket.id);
        if (prevRoom) {
          socket.leave(prevRoom.roomCode);
        }

        const result = manager.createRoom(socket.id, payload?.nickname, payload?.playerToken);
        if (result.ok && result.data) {
          socket.join(result.data.roomCode);
          socket.emit('room:state', result.data);
        }
        if (typeof ack === 'function') {
          ack(result);
        }
      }
    );

    socket.on(
      'room:join',
      (
        payload: { roomCode?: string; nickname?: string; playerToken?: string },
        ack?: (res: unknown) => void
      ) => {
        const result = manager.joinRoom(
          socket.id,
          payload?.roomCode,
          payload?.nickname,
          payload?.playerToken
        );
        if (result.ok && result.data) {
          socket.join(result.data.roomCode);
          io.to(result.data.roomCode).emit('room:state', result.data);
        }
        if (typeof ack === 'function') {
          ack(result);
        }
      }
    );

    socket.on(
      'room:ready',
      (payload: { isReady?: boolean }, ack?: (res: unknown) => void) => {
        const result = manager.setPlayerReady(socket.id, payload?.isReady);
        if (result.ok && result.data) {
          io.to(result.data.roomCode).emit('room:state', result.data);
        }
        if (typeof ack === 'function') {
          ack(result);
        }
      }
    );

    // Real-time Microphone Mute/Unmute Status Sync
    socket.on(
      'voice:status',
      (payload: { isMicMuted?: boolean }, ack?: (res: unknown) => void) => {
        const isMicMuted = payload?.isMicMuted !== false;
        const result = manager.setPlayerMicMuted(socket.id, isMicMuted);
        if (result.ok && result.data) {
          io.to(result.data.roomCode).emit('room:state', result.data);
          io.to(result.data.roomCode).emit('voice:player-status', {
            playerId: socket.id,
            isMicMuted,
          });
        }
        if (typeof ack === 'function') {
          ack(result);
        }
      }
    );

    // WebRTC Peer-to-Peer Voice Signaling Relay (isolated to same room)
    socket.on(
      'voice:signal',
      (payload: VoiceSignalPayload, ack?: (res: unknown) => void) => {
        const senderRoom = manager.getRoomBySocket(socket.id);
        const targetRoom = payload?.targetId
          ? manager.getRoomBySocket(payload.targetId)
          : undefined;

        if (
          !senderRoom ||
          !targetRoom ||
          senderRoom.roomCode !== targetRoom.roomCode
        ) {
          if (typeof ack === 'function') {
            ack({ ok: false, message: 'Target player is not in the same room.' });
          }
          return;
        }

        io.to(payload.targetId).emit('voice:signal', {
          fromId: socket.id,
          signalType: payload.signalType,
          sdp: payload.sdp,
          candidate: payload.candidate,
        });

        if (typeof ack === 'function') {
          ack({ ok: true });
        }
      }
    );

    socket.on('race:start', (_payload: unknown, ack?: (res: unknown) => void) => {
      const result = manager.prepareCountdown(socket.id, false);
      if (result.ok && result.data) {
        const roomCode = result.data.roomCode;
        io.to(roomCode).emit('room:state', result.data);
        startRoomCountdown(roomCode);
      }
      if (typeof ack === 'function') {
        ack(result);
      }
    });

    socket.on('race:play-again', (_payload: unknown, ack?: (res: unknown) => void) => {
      const result = manager.prepareCountdown(socket.id, true);
      if (result.ok && result.data) {
        const roomCode = result.data.roomCode;
        io.to(roomCode).emit('room:state', result.data);
        startRoomCountdown(roomCode);
      }
      if (typeof ack === 'function') {
        ack(result);
      }
    });

    socket.on('race:return-lobby', (_payload: unknown, ack?: (res: unknown) => void) => {
      const result = manager.returnToLobby(socket.id);
      if (result.ok && result.data) {
        io.to(result.data.roomCode).emit('room:state', result.data);
      }
      if (typeof ack === 'function') {
        ack(result);
      }
    });

    socket.on('player:move', (payload: PlayerMovePayload) => {
      const updated = manager.updatePlayerMove(socket.id, payload);
      if (!updated) return;
      socket.to(updated.roomCode).emit('player:moved', {
        id: updated.player.id,
        position: updated.player.position,
        velocity: updated.player.velocity,
        rotationY: updated.player.rotationY,
        animState: updated.player.animState,
        progressPercent: updated.player.progressPercent,
        currentCheckpoint: updated.player.currentCheckpoint,
        leaderboard: updated.leaderboard,
      });
    });

    socket.on(
      'player:checkpoint',
      (payload: CheckpointReachedPayload, ack?: (res: unknown) => void) => {
        const result = manager.reachCheckpoint(socket.id, payload);
        if (result.ok && result.data) {
          io.to(result.data.roomCode).emit('player:checkpoint-reached', {
            playerId: result.data.playerId,
            checkpointIndex: result.data.checkpointIndex,
            spawnPoint: result.data.spawnPoint,
            leaderboard: result.data.snapshot.leaderboard,
          });
          io.to(result.data.roomCode).emit('room:state', result.data.snapshot);
        }
        if (typeof ack === 'function') {
          ack(result);
        }
      }
    );

    socket.on(
      'player:died',
      (payload: PlayerDiedPayload, ack?: (res: unknown) => void) => {
        const result = manager.recordPlayerDeath(socket.id, payload);
        if (result.ok && result.data) {
          io.to(result.data.roomCode).emit('player:respawned', {
            playerId: result.data.playerId,
            deaths: result.data.deaths,
            respawnPosition: result.data.respawnPosition,
            reason: result.data.reason,
            leaderboard: result.data.snapshot.leaderboard,
          });
        }
        if (typeof ack === 'function') {
          ack(result);
        }
      }
    );

    socket.on(
      'player:finish',
      (payload: FinishReachedPayload, ack?: (res: unknown) => void) => {
        const result = manager.reachFinish(socket.id, payload);
        if (result.ok && result.data) {
          io.to(result.data.roomCode).emit('race:finished', result.data.snapshot);
          io.to(result.data.roomCode).emit('room:state', result.data.snapshot);
        }
        if (typeof ack === 'function') {
          ack(result);
        }
      }
    );

    socket.on('room:leave', (_payload: unknown, ack?: (res: unknown) => void) => {
      const left = manager.leaveCurrentRoom(socket.id);
      if (left.roomCode) {
        socket.leave(left.roomCode);
        if (!left.roomDeleted && left.snapshot) {
          io.to(left.roomCode).emit('room:state', left.snapshot);
        }
      }
      if (typeof ack === 'function') {
        ack({ ok: true });
      }
    });

    socket.on('time:sync', (_payload: unknown, ack?: (res: { serverNow: number }) => void) => {
      if (typeof ack === 'function') {
        ack({ serverNow: Date.now() });
      }
    });

    socket.on('disconnect', () => {
      const left = manager.leaveCurrentRoom(socket.id);
      if (left.roomCode && !left.roomDeleted && left.snapshot) {
        io.to(left.roomCode).emit('room:state', left.snapshot);
      }
    });
  });
}

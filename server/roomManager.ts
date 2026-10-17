import {
  CheckpointReachedPayload,
  FinishReachedPayload,
  LeaderboardEntry,
  PlayerDiedPayload,
  PlayerMovePayload,
  PlayerState,
  RoomStateSnapshot,
  RoomStatus,
  Vec3,
} from '../shared/types';
import {
  CHECKPOINT_VALIDATION_RADIUS,
  FINISH_VALIDATION_RADIUS,
  MAX_PLAYERS_PER_ROOM,
  PHYSICS_CONSTANTS,
  PLAYER_COLORS,
  ROOM_CODE_LENGTH,
  TOTAL_CHECKPOINTS,
} from '../shared/constants';
import {
  getCheckpointPiece,
  getFinishPiece,
  getSpawnPositionForCheckpoint,
} from '../shared/levelData';
import { computeCourseProgressPercent, distance3D } from '../shared/obstacleMath';

export interface InternalRoom {
  roomCode: string;
  status: RoomStatus;
  hostId: string;
  countdownValue: number | null;
  raceStartTime: number | null;
  winnerId: string | null;
  winnerNickname: string | null;
  players: Map<string, PlayerState>; // key: socket.id
  countdownTimer?: ReturnType<typeof setInterval> | null;
  createdAt: number;
}

export type RoomActionErrorCode =
  | 'INVALID_NICKNAME'
  | 'DUPLICATE_NICKNAME'
  | 'INVALID_ROOM_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'RACE_ALREADY_STARTED'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'INVALID_STATE'
  | 'INVALID_CHECKPOINT'
  | 'CHECKPOINT_TOO_FAR'
  | 'DEATH_COOLDOWN'
  | 'MISSING_CHECKPOINTS'
  | 'FINISH_TOO_FAR';

export interface RoomActionResult<T = RoomStateSnapshot> {
  ok: boolean;
  errorCode?: RoomActionErrorCode;
  message?: string;
  data?: T;
}

const SAFE_ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function isFiniteVec3(v: unknown): v is Vec3 {
  if (!v || typeof v !== 'object') return false;
  const candidate = v as Record<string, unknown>;
  return (
    typeof candidate.x === 'number' &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === 'number' &&
    Number.isFinite(candidate.y) &&
    typeof candidate.z === 'number' &&
    Number.isFinite(candidate.z)
  );
}

export function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18);
}

export function normalizeRoomCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

export class RoomManager {
  private rooms: Map<string, InternalRoom> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  public generateRoomCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        const idx = Math.floor(Math.random() * SAFE_ROOM_CHARS.length);
        code += SAFE_ROOM_CHARS[idx];
      }
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    return 'SKY' + Math.floor(100 + Math.random() * 899).toString();
  }

  private getAvailableSlotIndex(room: InternalRoom): number {
    const usedSlots = new Set<number>();
    for (const p of room.players.values()) {
      usedSlots.add(p.slotIndex);
    }
    for (let i = 0; i < MAX_PLAYERS_PER_ROOM; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return 0;
  }

  public isNicknameTaken(
    nickname: string,
    socketId: string,
    playerToken?: string,
    targetRoom?: InternalRoom
  ): boolean {
    const normalized = nickname.trim().toLowerCase();
    if (!normalized) return false;

    const checkRoom = (room: InternalRoom): boolean => {
      for (const existing of room.players.values()) {
        if (!existing.connected) continue;
        if (existing.id === socketId) continue;
        if (playerToken && existing.playerToken === playerToken) continue;
        if (existing.nickname.trim().toLowerCase() === normalized) {
          return true;
        }
      }
      return false;
    };

    if (targetRoom && checkRoom(targetRoom)) {
      return true;
    }

    for (const room of this.rooms.values()) {
      if (checkRoom(room)) {
        return true;
      }
    }
    return false;
  }

  public createRoom(
    socketId: string,
    rawNickname: unknown,
    playerToken?: string
  ): RoomActionResult {
    const nickname = sanitizeNickname(rawNickname);
    if (!nickname || nickname.length < 2) {
      return {
        ok: false,
        errorCode: 'INVALID_NICKNAME',
        message: 'Please enter a valid nickname (at least 2 characters).',
      };
    }

    const token = playerToken && typeof playerToken === 'string' ? playerToken : socketId;

    if (this.isNicknameTaken(nickname, socketId, token)) {
      return {
        ok: false,
        errorCode: 'DUPLICATE_NICKNAME',
        message: `The nickname "${nickname}" is already taken by another player. Please choose a unique name!`,
      };
    }

    this.leaveCurrentRoom(socketId);

    const roomCode = this.generateRoomCode();
    const spawnPos = getSpawnPositionForCheckpoint(0, 0);

    const hostPlayer: PlayerState = {
      id: socketId,
      playerToken: token,
      nickname,
      color: PLAYER_COLORS[0],
      slotIndex: 0,
      isHost: true,
      isReady: true,
      isMicMuted: true, // Microphone is muted by default!
      connected: true,
      position: { ...spawnPos },
      velocity: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      animState: 'idle',
      currentCheckpoint: 0,
      progressPercent: 0,
      deaths: 0,
      finished: false,
      finishTimeMs: null,
      lastDeathAt: 0,
      lastUpdateAt: Date.now(),
    };

    const room: InternalRoom = {
      roomCode,
      status: 'lobby',
      hostId: socketId,
      countdownValue: null,
      raceStartTime: null,
      winnerId: null,
      winnerNickname: null,
      players: new Map([[socketId, hostPlayer]]),
      countdownTimer: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socketId, roomCode);

    return {
      ok: true,
      data: this.toSnapshot(room),
    };
  }

  public joinRoom(
    socketId: string,
    rawRoomCode: unknown,
    rawNickname: unknown,
    playerToken?: string
  ): RoomActionResult {
    const roomCode = normalizeRoomCode(rawRoomCode);
    if (!roomCode || roomCode.length !== ROOM_CODE_LENGTH) {
      return {
        ok: false,
        errorCode: 'INVALID_ROOM_CODE',
        message: 'Please enter a valid 6-character room code.',
      };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return {
        ok: false,
        errorCode: 'ROOM_NOT_FOUND',
        message: `Room "${roomCode}" does not exist or has expired.`,
      };
    }

    const nickname = sanitizeNickname(rawNickname);
    if (!nickname || nickname.length < 2) {
      return {
        ok: false,
        errorCode: 'INVALID_NICKNAME',
        message: 'Please enter a valid nickname (at least 2 characters).',
      };
    }

    const token = playerToken && typeof playerToken === 'string' ? playerToken : socketId;

    if (this.isNicknameTaken(nickname, socketId, token, room)) {
      return {
        ok: false,
        errorCode: 'DUPLICATE_NICKNAME',
        message: `The nickname "${nickname}" is already in use! Please choose a different, unique nickname.`,
      };
    }

    for (const [oldSocketId, existingPlayer] of room.players.entries()) {
      if (existingPlayer.playerToken === token && oldSocketId !== socketId) {
        room.players.delete(oldSocketId);
        this.socketToRoom.delete(oldSocketId);

        existingPlayer.id = socketId;
        existingPlayer.nickname = nickname;
        existingPlayer.connected = true;
        existingPlayer.lastUpdateAt = Date.now();

        if (room.hostId === oldSocketId) {
          room.hostId = socketId;
          existingPlayer.isHost = true;
        }

        room.players.set(socketId, existingPlayer);
        this.socketToRoom.set(socketId, roomCode);

        return {
          ok: true,
          data: this.toSnapshot(room),
        };
      }
    }

    if (room.players.has(socketId)) {
      const existing = room.players.get(socketId)!;
      existing.nickname = nickname;
      existing.connected = true;
      return {
        ok: true,
        data: this.toSnapshot(room),
      };
    }

    const connectedCount = Array.from(room.players.values()).filter((p) => p.connected).length;
    if (room.players.size >= MAX_PLAYERS_PER_ROOM || connectedCount >= MAX_PLAYERS_PER_ROOM) {
      for (const [sid, p] of room.players.entries()) {
        if (!p.connected) {
          room.players.delete(sid);
          this.socketToRoom.delete(sid);
        }
      }
      if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
        return {
          ok: false,
          errorCode: 'ROOM_FULL',
          message: `Room "${roomCode}" is full (${MAX_PLAYERS_PER_ROOM}/${MAX_PLAYERS_PER_ROOM} players).`,
        };
      }
    }

    if (room.status !== 'lobby') {
      return {
        ok: false,
        errorCode: 'RACE_ALREADY_STARTED',
        message: 'Cannot join right now because a race is already in progress.',
      };
    }

    this.leaveCurrentRoom(socketId);

    const slotIndex = this.getAvailableSlotIndex(room);
    const spawnPos = getSpawnPositionForCheckpoint(0, slotIndex);

    const newPlayer: PlayerState = {
      id: socketId,
      playerToken: token,
      nickname,
      color: PLAYER_COLORS[slotIndex % PLAYER_COLORS.length],
      slotIndex,
      isHost: false,
      isReady: true,
      isMicMuted: true, // Microphone is muted by default!
      connected: true,
      position: { ...spawnPos },
      velocity: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      animState: 'idle',
      currentCheckpoint: 0,
      progressPercent: 0,
      deaths: 0,
      finished: false,
      finishTimeMs: null,
      lastDeathAt: 0,
      lastUpdateAt: Date.now(),
    };

    room.players.set(socketId, newPlayer);
    this.socketToRoom.set(socketId, roomCode);

    return {
      ok: true,
      data: this.toSnapshot(room),
    };
  }

  public setPlayerMicMuted(socketId: string, isMicMuted: boolean): RoomActionResult {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'You are not in a room.' };
    }
    const player = room.players.get(socketId);
    if (!player) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'Player not found in room.' };
    }
    player.isMicMuted = Boolean(isMicMuted);
    player.lastUpdateAt = Date.now();

    return {
      ok: true,
      data: this.toSnapshot(room),
    };
  }

  public setPlayerReady(socketId: string, isReady?: boolean): RoomActionResult {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'You are not in a room.' };
    }
    const player = room.players.get(socketId);
    if (!player) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'Player not found in room.' };
    }
    player.isReady = typeof isReady === 'boolean' ? isReady : !player.isReady;
    player.lastUpdateAt = Date.now();

    return {
      ok: true,
      data: this.toSnapshot(room),
    };
  }

  public prepareCountdown(socketId: string, allowAnyPlayer = false): RoomActionResult {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'You are not in a room.' };
    }
    if (!allowAnyPlayer && room.hostId !== socketId) {
      return {
        ok: false,
        errorCode: 'NOT_HOST',
        message: 'Only the room host can start the race.',
      };
    }
    if (room.status !== 'lobby' && room.status !== 'finished') {
      return {
        ok: false,
        errorCode: 'INVALID_STATE',
        message: 'Race is already counting down or in progress.',
      };
    }

    if (room.countdownTimer) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
    }

    room.status = 'countdown';
    room.countdownValue = 3;
    room.raceStartTime = null;
    room.winnerId = null;
    room.winnerNickname = null;

    for (const player of room.players.values()) {
      const startPos = getSpawnPositionForCheckpoint(0, player.slotIndex);
      player.position = { ...startPos };
      player.velocity = { x: 0, y: 0, z: 0 };
      player.rotationY = 0;
      player.animState = 'idle';
      player.currentCheckpoint = 0;
      player.progressPercent = 0;
      player.deaths = 0;
      player.finished = false;
      player.finishTimeMs = null;
      player.lastDeathAt = 0;
    }

    return {
      ok: true,
      data: this.toSnapshot(room),
    };
  }

  public startRacingNow(roomCode: string): RoomStateSnapshot | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    room.status = 'racing';
    room.countdownValue = 0;
    room.raceStartTime = Date.now();
    return this.toSnapshot(room);
  }

  public returnToLobby(socketId: string): RoomActionResult {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'You are not in a room.' };
    }
    if (room.countdownTimer) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
    }
    room.status = 'lobby';
    room.countdownValue = null;
    room.raceStartTime = null;
    room.winnerId = null;
    room.winnerNickname = null;

    for (const player of room.players.values()) {
      const startPos = getSpawnPositionForCheckpoint(0, player.slotIndex);
      player.position = { ...startPos };
      player.velocity = { x: 0, y: 0, z: 0 };
      player.rotationY = 0;
      player.animState = 'idle';
      player.currentCheckpoint = 0;
      player.progressPercent = 0;
      player.deaths = 0;
      player.finished = false;
      player.finishTimeMs = null;
      player.isReady = true;
    }

    return {
      ok: true,
      data: this.toSnapshot(room),
    };
  }

  public updatePlayerMove(
    socketId: string,
    payload: PlayerMovePayload
  ): { roomCode: string; player: PlayerState; leaderboard: LeaderboardEntry[] } | null {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;
    const player = room.players.get(socketId);
    if (!player) return null;

    if (!isFiniteVec3(payload?.position) || !isFiniteVec3(payload?.velocity)) {
      return null;
    }

    player.position = {
      x: Math.max(-100, Math.min(100, payload.position.x)),
      y: Math.max(-50, Math.min(100, payload.position.y)),
      z: Math.max(-650, Math.min(50, payload.position.z)),
    };
    player.velocity = {
      x: Math.max(-60, Math.min(60, payload.velocity.x)),
      y: Math.max(-60, Math.min(60, payload.velocity.y)),
      z: Math.max(-60, Math.min(60, payload.velocity.z)),
    };
    if (typeof payload.rotationY === 'number' && Number.isFinite(payload.rotationY)) {
      player.rotationY = payload.rotationY;
    }
    if (payload.animState) {
      player.animState = payload.animState;
    }
    player.lastUpdateAt = Date.now();

    if (room.status === 'racing' && !player.finished) {
      const rawProgress = computeCourseProgressPercent(player.position.z);
      player.progressPercent = Math.min(99, rawProgress);
    }

    return {
      roomCode: room.roomCode,
      player,
      leaderboard: this.computeLeaderboard(room),
    };
  }

  public reachCheckpoint(
    socketId: string,
    payload: CheckpointReachedPayload
  ): RoomActionResult<{
    roomCode: string;
    playerId: string;
    checkpointIndex: number;
    spawnPoint: Vec3;
    snapshot: RoomStateSnapshot;
  }> {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'Not in a room.' };
    }
    if (room.status !== 'racing') {
      return { ok: false, errorCode: 'INVALID_STATE', message: 'Race is not active.' };
    }
    const player = room.players.get(socketId);
    if (!player || player.finished) {
      return { ok: false, errorCode: 'INVALID_STATE', message: 'Player is not racing.' };
    }

    const targetIdx = payload?.checkpointIndex;
    if (
      typeof targetIdx !== 'number' ||
      targetIdx < 1 ||
      targetIdx > TOTAL_CHECKPOINTS ||
      targetIdx !== player.currentCheckpoint + 1
    ) {
      return {
        ok: false,
        errorCode: 'INVALID_CHECKPOINT',
        message: `Expected checkpoint ${player.currentCheckpoint + 1}, received ${targetIdx}.`,
      };
    }

    const cpPiece = getCheckpointPiece(targetIdx);
    const checkPos = isFiniteVec3(payload?.position) ? payload.position : player.position;
    const dist = distance3D(checkPos, cpPiece.position);
    if (dist > CHECKPOINT_VALIDATION_RADIUS) {
      return {
        ok: false,
        errorCode: 'CHECKPOINT_TOO_FAR',
        message: 'Player is too far from checkpoint beacon.',
      };
    }

    player.currentCheckpoint = targetIdx;
    player.position = { ...checkPos };
    player.progressPercent = Math.max(
      player.progressPercent,
      computeCourseProgressPercent(cpPiece.position.z)
    );

    const spawnPoint = getSpawnPositionForCheckpoint(targetIdx, player.slotIndex);

    return {
      ok: true,
      data: {
        roomCode: room.roomCode,
        playerId: player.id,
        checkpointIndex: targetIdx,
        spawnPoint,
        snapshot: this.toSnapshot(room),
      },
    };
  }

  public recordPlayerDeath(
    socketId: string,
    payload?: PlayerDiedPayload
  ): RoomActionResult<{
    roomCode: string;
    playerId: string;
    deaths: number;
    respawnPosition: Vec3;
    reason: 'fall' | 'hazard';
    snapshot: RoomStateSnapshot;
  }> {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'Not in a room.' };
    }
    if (room.status !== 'racing') {
      return { ok: false, errorCode: 'INVALID_STATE', message: 'Race is not active.' };
    }
    const player = room.players.get(socketId);
    if (!player || player.finished) {
      return { ok: false, errorCode: 'INVALID_STATE', message: 'Player is not active in race.' };
    }

    const now = Date.now();
    if (now - player.lastDeathAt < PHYSICS_CONSTANTS.DEATH_DEBOUNCE_MS) {
      return {
        ok: false,
        errorCode: 'DEATH_COOLDOWN',
        message: 'Death already counted for this hazard/fall.',
      };
    }

    player.lastDeathAt = now;
    player.deaths += 1;

    const respawnPosition = getSpawnPositionForCheckpoint(
      player.currentCheckpoint,
      player.slotIndex
    );
    player.position = { ...respawnPosition };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.animState = 'idle';

    return {
      ok: true,
      data: {
        roomCode: room.roomCode,
        playerId: player.id,
        deaths: player.deaths,
        respawnPosition,
        reason: payload?.reason === 'hazard' ? 'hazard' : 'fall',
        snapshot: this.toSnapshot(room),
      },
    };
  }

  public reachFinish(
    socketId: string,
    payload: FinishReachedPayload
  ): RoomActionResult<{
    roomCode: string;
    playerId: string;
    finishTimeMs: number;
    isWinner: boolean;
    snapshot: RoomStateSnapshot;
  }> {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'Not in a room.' };
    }
    if (room.status !== 'racing' && room.status !== 'finished') {
      return { ok: false, errorCode: 'INVALID_STATE', message: 'Race is not active.' };
    }
    const player = room.players.get(socketId);
    if (!player) {
      return { ok: false, errorCode: 'NOT_IN_ROOM', message: 'Player not found.' };
    }

    if (player.finished && player.finishTimeMs !== null) {
      return {
        ok: true,
        data: {
          roomCode: room.roomCode,
          playerId: player.id,
          finishTimeMs: player.finishTimeMs,
          isWinner: room.winnerId === player.id,
          snapshot: this.toSnapshot(room),
        },
      };
    }

    if (player.currentCheckpoint < TOTAL_CHECKPOINTS) {
      return {
        ok: false,
        errorCode: 'MISSING_CHECKPOINTS',
        message: `You must activate all ${TOTAL_CHECKPOINTS} checkpoints before finishing.`,
      };
    }

    const finishPiece = getFinishPiece();
    const checkPos = isFiniteVec3(payload?.position) ? payload.position : player.position;
    const dist = distance3D(checkPos, finishPiece.position);
    if (dist > FINISH_VALIDATION_RADIUS) {
      return {
        ok: false,
        errorCode: 'FINISH_TOO_FAR',
        message: 'Player is too far from the finish island.',
      };
    }

    const now = Date.now();
    const finishTimeMs = Math.max(1000, now - (room.raceStartTime || now - 1000));
    player.finished = true;
    player.finishTimeMs = finishTimeMs;
    player.progressPercent = 100;
    player.position = { ...checkPos };
    player.velocity = { x: 0, y: 0, z: 0 };

    let isWinner = false;
    if (!room.winnerId) {
      room.winnerId = player.id;
      room.winnerNickname = player.nickname;
      room.status = 'finished';
      isWinner = true;
    }

    return {
      ok: true,
      data: {
        roomCode: room.roomCode,
        playerId: player.id,
        finishTimeMs,
        isWinner,
        snapshot: this.toSnapshot(room),
      },
    };
  }

  public leaveCurrentRoom(socketId: string): {
    roomCode: string | null;
    roomDeleted: boolean;
    snapshot: RoomStateSnapshot | null;
  } {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) {
      return { roomCode: null, roomDeleted: false, snapshot: null };
    }
    this.socketToRoom.delete(socketId);

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { roomCode, roomDeleted: true, snapshot: null };
    }

    room.players.delete(socketId);

    if (room.players.size === 0) {
      if (room.countdownTimer) {
        clearInterval(room.countdownTimer);
        room.countdownTimer = null;
      }
      this.rooms.delete(roomCode);
      return { roomCode, roomDeleted: true, snapshot: null };
    }

    if (room.hostId === socketId) {
      const nextHost =
        Array.from(room.players.values()).find((p) => p.connected) ||
        Array.from(room.players.values())[0];
      if (nextHost) {
        room.hostId = nextHost.id;
        for (const p of room.players.values()) {
          p.isHost = p.id === nextHost.id;
        }
      }
    }

    return {
      roomCode,
      roomDeleted: false,
      snapshot: this.toSnapshot(room),
    };
  }

  public getRoomBySocket(socketId: string): InternalRoom | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  public getRoomByCode(roomCode: string): InternalRoom | undefined {
    return this.rooms.get(normalizeRoomCode(roomCode));
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }

  public getTotalPlayerCount(): number {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += room.players.size;
    }
    return total;
  }

  public computeLeaderboard(room: InternalRoom): LeaderboardEntry[] {
    const list = Array.from(room.players.values()).slice();
    list.sort((a, b) => {
      if (a.finished && b.finished) {
        return (a.finishTimeMs ?? Number.MAX_SAFE_INTEGER) - (b.finishTimeMs ?? Number.MAX_SAFE_INTEGER);
      }
      if (a.finished !== b.finished) {
        return a.finished ? -1 : 1;
      }
      if (b.currentCheckpoint !== a.currentCheckpoint) {
        return b.currentCheckpoint - a.currentCheckpoint;
      }
      if (b.progressPercent !== a.progressPercent) {
        return b.progressPercent - a.progressPercent;
      }
      return a.deaths - b.deaths;
    });

    return list.map((p, idx) => ({
      id: p.id,
      nickname: p.nickname,
      color: p.color,
      positionRank: idx + 1,
      currentCheckpoint: p.currentCheckpoint,
      progressPercent: p.progressPercent,
      deaths: p.deaths,
      finished: p.finished,
      finishTimeMs: p.finishTimeMs,
      isMicMuted: p.isMicMuted,
      connected: p.connected,
    }));
  }

  public toSnapshot(room: InternalRoom): RoomStateSnapshot {
    return {
      roomCode: room.roomCode,
      status: room.status,
      hostId: room.hostId,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      countdownValue: room.countdownValue,
      raceStartTime: room.raceStartTime,
      serverNow: Date.now(),
      winnerId: room.winnerId,
      winnerNickname: room.winnerNickname,
      players: Array.from(room.players.values()),
      leaderboard: this.computeLeaderboard(room),
    };
  }
}

export const globalRoomManager = new RoomManager();

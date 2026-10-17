export type RoomStatus = 'lobby' | 'countdown' | 'racing' | 'finished';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type PlayerAnimationState = 'idle' | 'run' | 'sprint' | 'jump' | 'fall' | 'dead';

export interface PlayerState {
  id: string;
  playerToken: string;
  nickname: string;
  color: string;
  slotIndex: number;
  isHost: boolean;
  isReady: boolean;
  isMicMuted: boolean;
  connected: boolean;
  position: Vec3;
  velocity: Vec3;
  rotationY: number;
  animState: PlayerAnimationState;
  currentCheckpoint: number;
  progressPercent: number;
  deaths: number;
  finished: boolean;
  finishTimeMs: number | null;
  lastDeathAt: number;
  lastUpdateAt: number;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  color: string;
  positionRank: number;
  currentCheckpoint: number;
  progressPercent: number;
  deaths: number;
  finished: boolean;
  finishTimeMs: number | null;
  isMicMuted: boolean;
  connected: boolean;
}

export interface RoomStateSnapshot {
  roomCode: string;
  status: RoomStatus;
  hostId: string;
  maxPlayers: number;
  countdownValue: number | null;
  raceStartTime: number | null;
  serverNow: number;
  winnerId: string | null;
  winnerNickname: string | null;
  players: PlayerState[];
  leaderboard: LeaderboardEntry[];
}

export type ObstacleKind =
  | 'static_platform'
  | 'narrow_bridge'
  | 'small_pad'
  | 'moving_platform'
  | 'rotating_bar'
  | 'swinging_pendulum'
  | 'disappearing_platform'
  | 'crushing_piston'
  | 'checkpoint_platform'
  | 'start_island'
  | 'finish_island';

export type VisualPreset =
  | 'ruins_stone'
  | 'airplane_tail'
  | 'airplane_cabin'
  | 'airplane_wing'
  | 'airplane_cockpit'
  | 'ship_hull'
  | 'train_coach'
  | 'clockwork_gear'
  | 'glass_pane'
  | 'meteor_rock'
  | 'broken_highway';

export interface MovingConfig {
  axis: 'x' | 'y' | 'z';
  amplitude: number;
  speed: number;
  phaseOffset: number;
}

export interface RotatingConfig {
  speedRadPerSec: number;
  initialAngle: number;
  barLength: number;
  barRadius: number;
  lethal: boolean;
  style?: 'laser_beam' | 'jet_propeller' | 'laser_ring';
}

export interface PendulumConfig {
  pivotHeight: number;
  armLength: number;
  maxAngleRad: number;
  speed: number;
  phaseOffset: number;
  bobRadius: number;
  lethal: boolean;
  style?: 'battle_disc' | 'ship_anchor' | 'wrecking_ball';
}

export interface DisappearingConfig {
  solidDurationMs: number;
  warningDurationMs: number;
  hiddenDurationMs: number;
  phaseOffsetMs: number;
}

export interface PistonConfig {
  axis: 'x' | 'y';
  strokeDistance: number;
  cycleMs: number;
  phaseOffsetMs: number;
  headSize: Vec3;
}

export interface LevelPiece {
  id: string;
  sectionIndex: number;
  sectionName: string;
  kind: ObstacleKind;
  visualPreset?: VisualPreset;
  visualTilt?: Vec3;
  bounceVelocity?: number;
  position: Vec3;
  size: Vec3; // width (x), height (y), depth (z)
  color: string;
  accentColor?: string;
  checkpointIndex?: number;
  spawnPoint?: Vec3;
  moving?: MovingConfig;
  rotating?: RotatingConfig;
  pendulum?: PendulumConfig;
  disappearing?: DisappearingConfig;
  piston?: PistonConfig;
}

export interface PlayerMovePayload {
  position: Vec3;
  velocity: Vec3;
  rotationY: number;
  animState: PlayerAnimationState;
}

export interface CheckpointReachedPayload {
  checkpointIndex: number;
  position: Vec3;
}

export interface PlayerDiedPayload {
  reason: 'fall' | 'hazard';
  position: Vec3;
}

export interface FinishReachedPayload {
  position: Vec3;
}

export interface VoiceSignalPayload {
  targetId: string;
  signalType: 'offer' | 'answer' | 'ice-candidate';
  sdp?: unknown;
  candidate?: unknown;
}

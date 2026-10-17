import { Vec3 } from './types';

export const GAME_TITLE = 'SKYBREAK';
export const MAX_PLAYERS_PER_ROOM = 4;
export const ROOM_CODE_LENGTH = 6;
export const TOTAL_CHECKPOINTS = 7;
export const TOTAL_OBSTACLE_SECTIONS = 21;

export interface DivisionCheckpointInfo {
  index: number;
  nameEn: string;
  nameBn: string;
  label: string;
}

export const CHECKPOINT_DIVISIONS: readonly DivisionCheckpointInfo[] = [
  { index: 1, nameEn: 'RAJSHAHI', nameBn: 'রাজশাহী', label: 'RAJSHAHI • রাজশাহী' },
  { index: 2, nameEn: 'KHULNA', nameBn: 'খুলনা', label: 'KHULNA • খুলনা' },
  { index: 3, nameEn: 'BARISHAL', nameBn: 'বরিশাল', label: 'BARISHAL • বরিশাল' },
  { index: 4, nameEn: 'CHATTAGRAM', nameBn: 'চট্টগ্রাম', label: 'CHATTAGRAM • চট্টগ্রাম' },
  { index: 5, nameEn: 'SYLHET', nameBn: 'সিলেট', label: 'SYLHET • সিলেট' },
  { index: 6, nameEn: 'RANGPUR', nameBn: 'রংপুর', label: 'RANGPUR • রংপুর' },
  { index: 7, nameEn: 'DHAKA', nameBn: 'ঢাকা', label: 'DHAKA • ঢাকা' },
];

export function getDivisionByCheckpoint(checkpointIndex: number): DivisionCheckpointInfo | null {
  return CHECKPOINT_DIVISIONS.find((d) => d.index === checkpointIndex) || null;
}

export const PLAYER_COLORS: readonly string[] = [
  '#00F0FF', // Sky Cyan
  '#FF3366', // Solar Crimson
  '#FFD100', // Cloud Gold
  '#A855F7', // Aether Violet
];

export const PLAYER_COLOR_NAMES: readonly string[] = [
  'Sky Cyan',
  'Solar Crimson',
  'Cloud Gold',
  'Aether Violet',
];

export const SPAWN_SLOTS_OFFSET: readonly Vec3[] = [
  { x: -3.6, y: 1.5, z: -2.0 },
  { x: -1.2, y: 1.5, z: -2.0 },
  { x: 1.2, y: 1.5, z: -2.0 },
  { x: 3.6, y: 1.5, z: -2.0 },
];

export const PHYSICS_CONSTANTS = {
  GRAVITY: -26.0,
  MOVE_SPEED: 9.0,
  SPRINT_MULTIPLIER: 1.38,
  JUMP_VELOCITY: 12.2,
  AIR_CONTROL: 0.84,
  GROUND_FRICTION: 12.0,
  PLAYER_RADIUS: 0.48,
  PLAYER_HEIGHT: 1.7,
  COYOTE_TIME_MS: 135,
  JUMP_BUFFER_MS: 135,
  FALL_DEATH_Y: -13.5,
  RESPAWN_DELAY_MS: 1250,
  DEATH_DEBOUNCE_MS: 900,
  NETWORK_SEND_INTERVAL_MS: 45, // ~22 updates/sec
};

export const COURSE_START_Z = -2.0;
export const COURSE_FINISH_Z = -580.0;
export const CHECKPOINT_VALIDATION_RADIUS = 9.0;
export const FINISH_VALIDATION_RADIUS = 11.0;

import { NextResponse } from 'next/server';
import { globalRoomManager } from '../../../server/roomManager';
import {
  GAME_TITLE,
  MAX_PLAYERS_PER_ROOM,
  TOTAL_CHECKPOINTS,
  TOTAL_OBSTACLE_SECTIONS,
} from '../../../shared/constants';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    game: GAME_TITLE,
    timestamp: Date.now(),
    uptimeSeconds: Math.round(process.uptime()),
    activeRooms: globalRoomManager.getActiveRoomCount(),
    connectedPlayers: globalRoomManager.getTotalPlayerCount(),
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    totalObstacleSections: TOTAL_OBSTACLE_SECTIONS,
    totalCheckpoints: TOTAL_CHECKPOINTS,
  });
}

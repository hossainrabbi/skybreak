import { NextRequest, NextResponse } from 'next/server';
import { globalRoomManager, normalizeRoomCode } from '../../../server/roomManager';
import { MAX_PLAYERS_PER_ROOM } from '../../../shared/constants';

export async function GET(req: NextRequest) {
  const code = normalizeRoomCode(req.nextUrl.searchParams.get('code') || '');
  if (!code) {
    return NextResponse.json({
      ok: true,
      activeRooms: globalRoomManager.getActiveRoomCount(),
      totalPlayers: globalRoomManager.getTotalPlayerCount(),
      maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    });
  }

  const room = globalRoomManager.getRoomByCode(code);
  if (!room) {
    return NextResponse.json(
      { ok: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    roomCode: room.roomCode,
    status: room.status,
    playerCount: room.players.size,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    isFull: room.players.size >= MAX_PLAYERS_PER_ROOM,
  });
}

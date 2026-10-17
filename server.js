const http = require('http');
const { parse } = require('url');
const { registerTsExtension } = require('./scripts/register-ts');

registerTsExtension();

const { globalRoomManager, normalizeRoomCode } = require('./server/roomManager');
const { attachSocketHandlers } = require('./server/socketHandlers');
const {
  GAME_TITLE,
  MAX_PLAYERS_PER_ROOM,
  TOTAL_CHECKPOINTS,
  TOTAL_OBSTACLE_SECTIONS,
} = require('./shared/constants');

const isProdFlag = process.argv.includes('--prod') || process.argv.includes('--production');
if (isProdFlag && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const dev = process.env.NODE_ENV !== 'production';
const bindHost = process.env.BIND_HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const STANDALONE_TEST_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>SKYBREAK Multiplayer Server</title></head>
<body>
  <h1 id="title">SKYBREAK</h1>
  <div id="conn-status">connecting</div>
  <input id="nickname" value="SkyRunner" />
  <button id="create-btn">Create Room</button>
  <input id="join-input" placeholder="ROOM CODE" />
  <button id="join-btn">Join Room</button>
  <button id="start-btn">Start Race</button>
  <div id="room-code"></div>
  <div id="room-status"></div>
  <div id="player-count">0</div>
  <div id="countdown-label"></div>
  <div id="winner-banner"></div>
  <script>
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/socket.io');
    let ackSeq = 1;
    const acks = {};
    function emit(event, payload, cb) {
      const msg = { type: 'event', event, payload };
      if (cb) { msg.ackId = ackSeq++; acks[msg.ackId] = cb; }
      ws.send(JSON.stringify(msg));
    }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'connect') {
        document.getElementById('conn-status').textContent = 'connected';
      } else if (msg.type === 'ack' && acks[msg.ackId]) {
        acks[msg.ackId](msg.data);
        delete acks[msg.ackId];
      } else if (msg.type === 'event') {
        if (msg.event === 'room:state' && msg.payload) {
          document.getElementById('room-code').textContent = msg.payload.roomCode;
          document.getElementById('room-status').textContent = msg.payload.status;
          document.getElementById('player-count').textContent = String(msg.payload.players.length);
          if (msg.payload.winnerNickname) {
            document.getElementById('winner-banner').textContent = msg.payload.winnerNickname;
          }
        } else if (msg.event === 'race:countdown' && msg.payload) {
          document.getElementById('countdown-label').textContent = msg.payload.label;
        }
      }
    };
    document.getElementById('create-btn').onclick = () => {
      emit('room:create', { nickname: document.getElementById('nickname').value }, () => {});
    };
    document.getElementById('join-btn').onclick = () => {
      emit('room:join', {
        roomCode: document.getElementById('join-input').value,
        nickname: document.getElementById('nickname').value
      }, () => {});
    };
    document.getElementById('start-btn').onclick = () => {
      emit('race:start', {}, () => {});
    };
    window.__skybreakEmit = emit;
  </script>
</body>
</html>`;

async function createSkybreakServer(options = {}) {
  const listenPort = options.port !== undefined ? options.port : port;
  const listenHost = options.host || bindHost;
  const countdownStepMs = options.countdownStepMs || 1000;

  let nextHandler = null;
  try {
    const next = require('next');
    const app = next({ dev, hostname: 'localhost', port: listenPort });
    await app.prepare();
    nextHandler = app.getRequestHandler();
  } catch (err) {
    if (!options.allowStandaloneFallback) {
      console.error('\n[SKYBREAK] Could not load Next.js. Did you run "npm install" first?');
      throw err;
    }
  }

  const httpServer = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);

    // Built-in JSON health & rooms endpoints work both with Next.js and standalone test mode
    if (parsedUrl.pathname === '/api/health' && !nextHandler) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          game: GAME_TITLE,
          timestamp: Date.now(),
          activeRooms: globalRoomManager.getActiveRoomCount(),
          connectedPlayers: globalRoomManager.getTotalPlayerCount(),
          maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
          totalObstacleSections: TOTAL_OBSTACLE_SECTIONS,
          totalCheckpoints: TOTAL_CHECKPOINTS,
        })
      );
      return;
    }

    if (parsedUrl.pathname === '/api/rooms' && !nextHandler) {
      const code = normalizeRoomCode((parsedUrl.query && parsedUrl.query.code) || '');
      if (!code) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            activeRooms: globalRoomManager.getActiveRoomCount(),
            totalPlayers: globalRoomManager.getTotalPlayerCount(),
            maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
          })
        );
        return;
      }
      const room = globalRoomManager.getRoomByCode(code);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, errorCode: 'ROOM_NOT_FOUND' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          roomCode: room.roomCode,
          status: room.status,
          playerCount: room.players.size,
          maxPlayers: MAX_PLAYERS_PER_ROOM,
          isFull: room.players.size >= MAX_PLAYERS_PER_ROOM,
        })
      );
      return;
    }

    if (nextHandler) {
      nextHandler(req, res, parsedUrl);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(STANDALONE_TEST_HTML);
    }
  });

  // Attach Socket.IO on the exact same HTTP server
  let io = null;
  try {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
      path: '/socket.io',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingInterval: 20000,
      pingTimeout: 20000,
    });
  } catch (err) {
    if (!options.allowStandaloneFallback) {
      console.error('\n[SKYBREAK] Could not load socket.io. Did you run "npm install" first?');
      throw err;
    }
    // Lightweight ws-backed Socket.IO-compatible server for offline sandbox verification
    const WebSocket = require('/usr/share/nodejs/ws');
    const wss = new WebSocket.Server({ server: httpServer, path: '/socket.io' });
    const roomsMap = new Map();
    const socketsMap = new Map();
    let connCounter = 0;

    const emitToRoom = (roomName, event, payload, excludeId = null) => {
      const members = roomsMap.get(roomName);
      if (!members) return;
      for (const sid of members) {
        if (excludeId && sid === excludeId) continue;
        const s = socketsMap.get(sid);
        if (s) s.emit(event, payload);
      }
    };

    const connectionHandlers = [];
    io = {
      on: (evt, handler) => {
        if (evt === 'connection') connectionHandlers.push(handler);
      },
      to: (roomName) => ({
        emit: (event, payload) => emitToRoom(roomName, event, payload, null),
      }),
      close: () => wss.close(),
    };

    wss.on('connection', (ws) => {
      const id = 'sock_' + ++connCounter + '_' + Math.random().toString(36).slice(2, 7);
      const listeners = new Map();
      const joinedRooms = new Set();

      const socketLike = {
        id,
        join: (roomName) => {
          joinedRooms.add(roomName);
          if (!roomsMap.has(roomName)) roomsMap.set(roomName, new Set());
          roomsMap.get(roomName).add(id);
        },
        leave: (roomName) => {
          joinedRooms.delete(roomName);
          const set = roomsMap.get(roomName);
          if (set) set.delete(id);
        },
        emit: (event, payload) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'event', event, payload }));
          }
        },
        to: (roomName) => ({
          emit: (event, payload) => emitToRoom(roomName, event, payload, id),
        }),
        on: (event, fn) => {
          if (!listeners.has(event)) listeners.set(event, []);
          listeners.get(event).push(fn);
        },
      };

      socketsMap.set(id, socketLike);
      ws.send(JSON.stringify({ type: 'connect', id }));

      for (const h of connectionHandlers) {
        h(socketLike);
      }

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'event' && msg.event) {
            const handlers = listeners.get(msg.event) || [];
            const ack =
              typeof msg.ackId === 'number'
                ? (resData) => {
                    if (ws.readyState === WebSocket.OPEN) {
                      ws.send(
                        JSON.stringify({
                          type: 'ack',
                          ackId: msg.ackId,
                          data: resData,
                        })
                      );
                    }
                  }
                : undefined;
            for (const fn of handlers) {
              fn(msg.payload, ack);
            }
          }
        } catch {
          // Ignore malformed packet
        }
      });

      ws.on('close', () => {
        for (const r of joinedRooms) {
          const set = roomsMap.get(r);
          if (set) set.delete(id);
        }
        socketsMap.delete(id);
        const discHandlers = listeners.get('disconnect') || [];
        for (const fn of discHandlers) {
          fn('client namespace disconnect');
        }
      });
    });
  }

  attachSocketHandlers(io, globalRoomManager, countdownStepMs);

  return new Promise((resolve, reject) => {
    httpServer.on('error', reject);
    httpServer.listen(listenPort, listenHost, () => {
      const addr = httpServer.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : listenPort;
      if (!options.silent) {
        console.log('============================================================');
        console.log(`  SKYBREAK 3D Multiplayer Server is READY!`);
        console.log(`  Mode:        ${dev ? 'Development' : 'Production'}`);
        console.log(`  Local URL:   http://localhost:${actualPort}`);
        console.log(`  Socket.IO:   ws://localhost:${actualPort}/socket.io`);
        console.log('============================================================');
      }
      resolve({ httpServer, io, port: actualPort, roomManager: globalRoomManager });
    });
  });
}

if (require.main === module) {
  createSkybreakServer().catch((err) => {
    console.error('[SKYBREAK] Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { createSkybreakServer };

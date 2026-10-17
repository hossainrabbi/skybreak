# SKYBREAK — 3D Online Multiplayer Floating Island Obstacle Race

**SKYBREAK** is a complete, browser-based 3D real-time multiplayer parkour racing game built with **Next.js (App Router)**, **React**, **TypeScript**, **Three.js**, **Custom Deterministic 3D Parkour Physics**, and **Socket.IO** running on a single persistent **Node.js HTTP Server**.

Up to **4 players** per room race simultaneously across **12 original floating-island obstacle sections** high above the clouds. The first player to activate all **3 glowing blue checkpoints** in order and reach the **Crown of the Clouds (Finish Island)** wins!

---

## Quick Links for Beginners

- **Want to run the game on your computer right now?** Read **[RUN-GAME.md](./RUN-GAME.md)** for step-by-step beginner instructions.
- **Want to host the game online for free to play with friends?** Read **[DEPLOY-FREE.md](./DEPLOY-FREE.md)** for verified free deployment instructions on Render.

---

## Implemented Features

### 1. Real-Time Online Multiplayer (Up to 4 Players per Room)
- **Main Menu**: Enter your nickname, create a new room, or join an existing room using a 6-character code.
- **Room Capacity & Validation**: Server enforces a strict **4-player limit** per room, rejects a 5th player with `ROOM_FULL`, and rejects invalid or expired room codes.
- **Interactive Lobby**: Displays all connected players (`1/4` to `4/4`), unique player colors (`Sky Cyan`, `Solar Crimson`, `Cloud Gold`, `Aether Violet`), **Copy Room Code** button, **Ready / Not Ready** toggles, and a **Start Race** button for the host.
- **Synchronized Countdown**: Server broadcasts an authoritative `3, 2, 1, GO!` countdown to all players in the room.
- **Real-Time 3D Avatars & Interpolation**: Remote players appear as articulated 3D sky-runner characters with floating nickname badges and smooth position/rotation interpolation.
- **Disconnect & Reconnect Handling**: Players keep a session token so brief connection drops reconnect to their slot; if the host disconnects, host privileges automatically transfer to the next connected player; empty rooms are cleaned up automatically.

### 2. Original 12-Section 3D Floating-Island Course
1. **Sunlit Sanctuary (Start Island)**: Wide starting island with 4 spawn slots and sky gateway arch.
2. **Section 1 — Cloud Stepping Stones**: Ascending small floating pads over the cloud abyss.
3. **Section 2 — Windwalk Narrow Bridge**: Narrow balance bridge swept by a lethal rotating laser bar.
4. **Section 3 — Drifting Sky Barges**: Counter-moving horizontal platforms carrying players across a chasm.
   - **Checkpoint 1 — Azure Beacon I**: Glowing blue crystal ring checkpoint.
5. **Section 4 — Blinking Quartz Pads**: Disappearing platforms cycling through Solid → Warning Pulse → Intangible phases.
6. **Section 5 — Twin Turbine Plaza**: Platform with dual counter-rotating laser hazard bars.
7. **Section 6 — Pendulum Gorge**: Narrow catwalk crossed by 3 giant swinging overhead pendulum hammers.
   - **Checkpoint 2 — Azure Beacon II**: Second glowing blue crystal ring checkpoint.
8. **Section 7 — Sky Lift Cascade**: Vertically oscillating elevator platforms requiring timed upward jumps.
9. **Section 8 — Cyclone Stepping Pads**: Stepping islands with high-speed sweeping rotor bars.
10. **Section 9 — Phantom Skyway**: Combined disappearing phase bridges and lateral moving barges.
   - **Checkpoint 3 — Azure Beacon III**: Third glowing blue crystal ring checkpoint.
11. **Section 10 — Hammer Gauntlet**: Split narrow balance beams with fast swinging pendulums.
12. **Section 11 — Sky Vortex Crossing**: Moving platform leading into a high-speed rotating turbine platform.
13. **Section 12 — Apex Ascension**: Fast-cycling disappearing phase pads leading to the summit.
14. **Crown of the Clouds (Finish Island)**: Golden victory portal and spinning crown crystal.

### 3. Physics, Checkpoints, Respawns & Server Validation
- **Sub-Stepped 3D Parkour Physics**: Ground detection, coyote time, jump buffering, moving-platform velocity carry, lethal hazard collision detection, and smooth damped 3rd-person follow camera.
- **Independent Checkpoints & Respawns**: Falling below the cloud deck or touching a lethal hazard increments the player's death counter **once**, shows visual feedback, resets velocity, and respawns the player at their most recently activated checkpoint within ~1.25 seconds without interrupting other players.
- **Server-Side Anti-Cheat Validation**: The server validates sequential checkpoint progression (`1 -> 2 -> 3`), verifies proximity to checkpoints and the finish line, and computes authoritative finish times on the server.

### 4. Desktop & Mobile Support
- **Desktop**: `WASD` or Arrow Keys to move, `Space` to jump, `Shift` to sprint, Mouse Drag or `Q`/`E` to rotate camera, `Esc` to pause.
- **Mobile**: On-screen virtual joystick, touch camera swipe zone, dedicated `JUMP` and `SPRINT` buttons, `touch-action: none` scroll prevention, and automatic pixel-ratio/cloud-count optimization for mobile GPUs.

---

## Architecture & In-Memory Storage Notes

### No Database Required (In-Memory State)
This version stores active rooms, player states, checkpoints, and race timers in **server memory** (`server/roomManager.ts`).
- **No PostgreSQL, Redis, API keys, or paid services are required.**
- **Important limitation**: Because state lives in server RAM, active rooms disappear whenever the Node.js server restarts or spins down on a free hosting tier.
- **Adding a Database Later**: `server/roomManager.ts` encapsulates all state transitions cleanly. To add persistent user accounts or all-time leaderboards in the future, you can connect PostgreSQL (e.g. via Prisma or Drizzle) inside `reachFinish()` in `server/roomManager.ts`.

### Scaling Beyond a Single Server Instance
By default, SKYBREAK runs as **one persistent Node.js server instance** so all Socket.IO clients share the same in-memory `RoomManager`.
If you ever scale horizontally to multiple server instances behind a load balancer, you would need:
1. **Sticky Sessions** on the load balancer (so Socket.IO HTTP long-polling handshakes route to the same node).
2. **`@socket.io/redis-adapter`** backed by a Redis/Key-Value store so room broadcasts (`io.to(roomCode).emit(...)`) propagate across all instances.
3. Moving room state from `Map<string, InternalRoom>` into Redis hashes.

---

## Project Structure

```text
skybreak/
├── app/
│   ├── api/
│   │   ├── health/route.ts       # Health & server metrics JSON endpoint
│   │   └── rooms/route.ts        # Room lookup JSON endpoint
│   ├── globals.css               # Responsive styles, HUD, mobile touch lock
│   ├── layout.tsx                # Root Next.js App Router layout
│   └── page.tsx                  # Main game entry page
├── components/
│   ├── SkybreakClient.tsx        # Client state & Socket.IO orchestrator
│   ├── MainMenu.tsx              # Nickname, Create Room, Join Room UI
│   ├── LobbyScreen.tsx           # 4-player lobby, Copy Code, Ready, Host Start
│   ├── CountdownOverlay.tsx      # Synchronized 3, 2, 1, GO! overlay
│   ├── RaceHud.tsx               # Live stats, progress bar, timer, leaderboard
│   ├── FinishModal.tsx           # Winner banner, final table, Play Again
│   ├── PauseModal.tsx            # Pause menu (Resume, Mute, Lobby, Leave)
│   └── MobileControls.tsx        # Virtual joystick, Jump/Sprint, camera touch
├── game/
│   ├── SkybreakCanvas.tsx        # Three.js WebGL loop & network sync
│   ├── PhysicsWorld.ts           # Deterministic 3D parkour physics & collisions
│   ├── ObstacleController.ts     # 3D island, checkpoint & hazard mesh builder
│   ├── PlayerAvatar.ts           # 3D articulated character & nickname sprite
│   ├── CameraRig.ts              # Smooth 3rd-person follow camera
│   └── SkyEnvironment.ts         # Clouds, lighting, and sky obelisks
├── lib/
│   ├── socketClient.ts           # Socket.IO client & clock synchronization
│   └── soundEffects.ts           # Web Audio API synthesized sound effects
├── server/
│   ├── roomManager.ts            # Authoritative 4-player room & race manager
│   └── socketHandlers.ts         # Socket.IO event listeners & countdown loop
├── shared/
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── constants.ts              # Physics, room, and validation constants
│   ├── levelData.ts              # 12-section floating island course definition
│   └── obstacleMath.ts           # Deterministic obstacle state functions
├── public/
│   ├── favicon.svg               # Browser icon
│   └── skybreak-logo.svg         # Game vector logo
├── tests/
│   ├── roomManager.test.ts       # Room, 4-player limit, checkpoint & winner tests
│   ├── physicsAndObstacles.test.ts # 3D physics & obstacle determinism tests
│   └── serverIntegration.test.ts # Live HTTP + multi-client WebSocket tests
├── scripts/
│   ├── register-ts.js            # Runtime TypeScript loader for server & tests
│   ├── typecheck.js              # TypeScript & import verification script
│   └── run-tests.js              # Automated test runner
├── server.js                     # Unified Node.js + Next.js + Socket.IO server
├── package.json                  # Project scripts and dependencies
├── package-lock.json             # Dependency lockfile
├── tsconfig.json                 # TypeScript configuration
├── next.config.ts                # Next.js configuration
├── .env.example                  # Optional environment variable template
├── .gitignore                    # Git ignore rules
├── Dockerfile                    # Container build definition
├── README.md                     # Project overview and architecture
├── RUN-GAME.md                   # Beginner step-by-step local running guide
└── DEPLOY-FREE.md                # Beginner step-by-step free hosting guide
```

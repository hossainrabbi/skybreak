'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  LeaderboardEntry,
  PlayerAnimationState,
  RoomStateSnapshot,
  Vec3,
} from '../shared/types';
import { PHYSICS_CONSTANTS } from '../shared/constants';
import { createSkyEnvironment } from './SkyEnvironment';
import { ObstacleController } from './ObstacleController';
import { PhysicsWorld } from './PhysicsWorld';
import { CameraRig } from './CameraRig';
import { PlayerAvatar } from './PlayerAvatar';
import { getSocket, getSynchronizedNow } from '../lib/socketClient';
import { soundFX } from '../lib/soundEffects';

export interface MobileControlBridge {
  moveX: number;
  moveY: number;
  jump: boolean;
  sprint: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

interface SkybreakCanvasProps {
  roomSnapshot: RoomStateSnapshot | null;
  localSocketId: string;
  isPaused: boolean;
  onTogglePause: () => void;
  mobileControlRef: React.MutableRefObject<MobileControlBridge>;
  onLocalHudUpdate: (hud: {
    checkpoint: number;
    progressPercent: number;
    deaths: number;
    isRespawning: boolean;
    deathReason: 'fall' | 'hazard' | null;
    checkpointBanner: number | null;
  }) => void;
  onLeaderboardUpdate: (leaderboard: LeaderboardEntry[]) => void;
}

export default function SkybreakCanvas({
  roomSnapshot,
  localSocketId,
  isPaused,
  onTogglePause,
  mobileControlRef,
  onLocalHudUpdate,
  onLeaderboardUpdate,
}: SkybreakCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<RoomStateSnapshot | null>(roomSnapshot);
  const pausedRef = useRef<boolean>(isPaused);
  const localIdRef = useRef<string>(localSocketId);

  roomRef.current = roomSnapshot;
  pausedRef.current = isPaused;
  localIdRef.current = localSocketId;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isLowPowerMobile =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || navigator.maxTouchPoints > 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      460
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: !isLowPowerMobile,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLowPowerMobile ? 1.5 : 2.0));
    renderer.shadowMap.enabled = !isLowPowerMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const skyEnv = createSkyEnvironment(scene, isLowPowerMobile);
    const obstacleController = new ObstacleController(scene);
    const physics = new PhysicsWorld(0);
    const cameraRig = new CameraRig();

    const avatars = new Map<string, PlayerAvatar>();
    let localDeaths = 0;
    let lastDeathReason: 'fall' | 'hazard' | null = null;
    let checkpointBanner: number | null = null;
    let bannerClearTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastNetworkSentAt = 0;
    let prevRoomStatus = roomRef.current?.status || 'lobby';

    // Keyboard state
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Escape') {
        onTogglePause();
        return;
      }
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }
      keys[e.code] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    // Mouse drag camera orbit
    let isDraggingMouse = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDraggingMouse = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingMouse) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      cameraRig.rotate(dx * 0.0055, dy * 0.0045);
    };
    const onMouseUp = () => {
      isDraggingMouse = false;
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Socket listeners for real-time remote player sync
    const socket = getSocket();

    const handleRemoteMoved = (payload: {
      id: string;
      position: Vec3;
      velocity: Vec3;
      rotationY: number;
      animState: PlayerAnimationState;
      leaderboard?: LeaderboardEntry[];
    }) => {
      if (payload.id === socket.id) return;
      const avatar = avatars.get(payload.id);
      if (avatar) {
        avatar.targetPosition = { ...payload.position };
        avatar.targetVelocity = { ...payload.velocity };
        avatar.targetRotationY = payload.rotationY;
        avatar.animState = payload.animState;
      }
      if (payload.leaderboard) {
        onLeaderboardUpdate(payload.leaderboard);
      }
    };

    const handlePlayerRespawned = (payload: {
      playerId: string;
      deaths: number;
      respawnPosition: Vec3;
      reason: 'fall' | 'hazard';
      leaderboard?: LeaderboardEntry[];
    }) => {
      if (payload.playerId === socket.id) {
        localDeaths = payload.deaths;
      } else {
        const avatar = avatars.get(payload.playerId);
        if (avatar) {
          avatar.targetPosition = { ...payload.respawnPosition };
          avatar.targetVelocity = { x: 0, y: 0, z: 0 };
        }
      }
      if (payload.leaderboard) {
        onLeaderboardUpdate(payload.leaderboard);
      }
    };

    socket.on('player:moved', handleRemoteMoved);
    socket.on('player:respawned', handlePlayerRespawned);

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let animFrameId = 0;
    let lastFrameTime = performance.now();

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const snapshot = roomRef.current;
      const myId = socket.id || localIdRef.current;

      // Sync avatars with room players
      if (snapshot) {
        if (avatars.has('preview-local')) {
          avatars.get('preview-local')!.dispose(scene);
          avatars.delete('preview-local');
        }
        const activeIds = new Set<string>();
        for (const p of snapshot.players) {
          activeIds.add(p.id);
          let avatar = avatars.get(p.id);
          if (!avatar) {
            avatar = new PlayerAvatar(p.id, p.nickname, p.color, p.position);
            avatars.set(p.id, avatar);
            scene.add(avatar.root);
          } else {
            avatar.updateNicknameAndColor(p.nickname, p.color);
          }

          if (p.id === myId) {
            if (
              (snapshot.status === 'countdown' && prevRoomStatus !== 'countdown') ||
              (snapshot.status === 'lobby' && prevRoomStatus !== 'lobby')
            ) {
              physics.resetForRace(p.slotIndex);
              obstacleController.resetCheckpoints();
              cameraRig.resetBehindPlayer(physics.position, 0);
              localDeaths = 0;
              lastDeathReason = null;
            }
            localDeaths = p.deaths;
          }
        }

        for (const [id, avatar] of avatars.entries()) {
          if (!activeIds.has(id)) {
            avatar.dispose(scene);
            avatars.delete(id);
          }
        }
        prevRoomStatus = snapshot.status;
      } else {
        if (!avatars.has('preview-local')) {
          const previewAvatar = new PlayerAvatar(
            'preview-local',
            'SkyRunner',
            '#00F0FF',
            physics.position
          );
          avatars.set('preview-local', previewAvatar);
          scene.add(previewAvatar.root);
        }
      }

      const raceElapsedMs =
        snapshot && snapshot.raceStartTime && snapshot.status === 'racing'
          ? Math.max(0, getSynchronizedNow() - snapshot.raceStartTime)
          : performance.now();

      if (keys['KeyQ']) cameraRig.rotate(dt * 1.8, 0);
      if (keys['KeyE']) cameraRig.rotate(-dt * 1.8, 0);
      if (
        mobileControlRef.current.lookDeltaX !== 0 ||
        mobileControlRef.current.lookDeltaY !== 0
      ) {
        cameraRig.rotate(
          mobileControlRef.current.lookDeltaX * 0.006,
          mobileControlRef.current.lookDeltaY * 0.005
        );
        mobileControlRef.current.lookDeltaX = 0;
        mobileControlRef.current.lookDeltaY = 0;
      }

      const controlsEnabled =
        Boolean(snapshot && snapshot.status === 'racing') && !pausedRef.current;

      const forwardKey =
        (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) -
        (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
      const rightKey =
        (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) -
        (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

      const forwardInput = Math.max(
        -1,
        Math.min(1, forwardKey + mobileControlRef.current.moveY)
      );
      const rightInput = Math.max(
        -1,
        Math.min(1, rightKey + mobileControlRef.current.moveX)
      );
      const jumpInput = Boolean(keys['Space'] || mobileControlRef.current.jump);
      const sprintInput = Boolean(
        keys['ShiftLeft'] || keys['ShiftRight'] || mobileControlRef.current.sprint
      );

      physics.step(
        dt,
        raceElapsedMs,
        {
          forward: forwardInput,
          right: rightInput,
          jumpPressed: jumpInput,
          sprint: sprintInput,
          cameraYaw: cameraRig.yaw,
        },
        controlsEnabled,
        {
          onJump: () => {
            soundFX.playJump();
          },
          onKnockback: () => {
            soundFX.playKnockback();
          },
          onCheckpointReached: (cpIdx, pos) => {
            soundFX.playCheckpoint();
            obstacleController.setCurrentCheckpoint(cpIdx);
            checkpointBanner = cpIdx;
            if (bannerClearTimeout) clearTimeout(bannerClearTimeout);
            bannerClearTimeout = setTimeout(() => {
              checkpointBanner = null;
            }, 2200);
            socket.emit('player:checkpoint', {
              checkpointIndex: cpIdx,
              position: pos,
            });
          },
          onPlayerDied: (reason, pos) => {
            soundFX.playDeath();
            lastDeathReason = reason;
            localDeaths += 1;
            socket.emit('player:died', { reason, position: pos });
          },
          onFinishReached: (pos) => {
            soundFX.playVictory();
            socket.emit('player:finish', { position: pos });
          },
        }
      );

      // Dynamic speed FOV boost when sprinting
      const targetFov = physics.animState === 'sprint' ? 72 : 65;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
        camera.updateProjectionMatrix();
      }

      obstacleController.update(raceElapsedMs);
      skyEnv.update(now / 1000, physics.position.z);

      const effectiveLocalId = snapshot ? myId : 'preview-local';
      for (const [id, avatar] of avatars.entries()) {
        if (id === effectiveLocalId) {
          avatar.updateLocalTransform(
            dt,
            physics.position,
            physics.rotationY,
            physics.animState
          );
        } else {
          avatar.updateRemoteInterpolated(dt);
        }
      }

      if (
        snapshot &&
        (snapshot.status === 'racing' || snapshot.status === 'lobby') &&
        now - lastNetworkSentAt >= PHYSICS_CONSTANTS.NETWORK_SEND_INTERVAL_MS
      ) {
        lastNetworkSentAt = now;
        socket.emit('player:move', {
          position: physics.position,
          velocity: physics.velocity,
          rotationY: physics.rotationY,
          animState: physics.animState,
        });
      }

      const camSample = cameraRig.update(dt, physics.position, physics.isRespawning);
      camera.position.set(
        camSample.position.x,
        camSample.position.y,
        camSample.position.z
      );
      camera.lookAt(camSample.lookAt.x, camSample.lookAt.y, camSample.lookAt.z);

      onLocalHudUpdate({
        checkpoint: physics.currentCheckpoint,
        progressPercent: physics.progressPercent,
        deaths: localDeaths,
        isRespawning: physics.isRespawning,
        deathReason: physics.isRespawning ? lastDeathReason : null,
        checkpointBanner,
      });

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      if (bannerClearTimeout) clearTimeout(bannerClearTimeout);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      domElem.removeEventListener('mousedown', onMouseDown);
      socket.off('player:moved', handleRemoteMoved);
      socket.off('player:respawned', handlePlayerRespawned);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="skybreak-canvas-container"
      aria-label="SKYBREAK 3D Obstacle Course Canvas"
    />
  );
}

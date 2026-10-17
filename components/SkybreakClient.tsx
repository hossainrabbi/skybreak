'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LeaderboardEntry, RoomStateSnapshot } from '../shared/types';
import {
  getOrCreatePlayerToken,
  getSocket,
  updateServerClockFromSnapshot,
} from '../lib/socketClient';
import { soundFX } from '../lib/soundEffects';
import { voiceChat } from '../lib/voiceChat';
import SkybreakCanvas, { MobileControlBridge } from '../game/SkybreakCanvas';
import MainMenu from './MainMenu';
import LobbyScreen from './LobbyScreen';
import CountdownOverlay from './CountdownOverlay';
import RaceHud from './RaceHud';
import FinishModal from './FinishModal';
import PauseModal from './PauseModal';
import MobileControls from './MobileControls';

const SAVED_NICKNAME_KEY = 'skybreak_saved_nickname';
const RECENT_NICKNAMES_KEY = 'skybreak_recent_nicknames';

function loadSavedNicknamesFromStorage(): { primary: string; recent: string[] } {
  if (typeof window === 'undefined') {
    return { primary: '', recent: [] };
  }
  const primary = (window.localStorage.getItem(SAVED_NICKNAME_KEY) || '').trim();
  let recent: string[] = [];
  try {
    const raw = window.localStorage.getItem(RECENT_NICKNAMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        recent = parsed.filter((item) => typeof item === 'string' && item.trim().length >= 2);
      }
    }
  } catch {
    recent = [];
  }
  if (primary && !recent.some((r) => r.toLowerCase() === primary.toLowerCase())) {
    recent.unshift(primary);
  }
  return { primary, recent: recent.slice(0, 4) };
}

function persistNicknameToStorage(name: string): string[] {
  if (typeof window === 'undefined') return [];
  const trimmed = name.trim();
  if (trimmed.length < 2) return loadSavedNicknamesFromStorage().recent;

  window.localStorage.setItem(SAVED_NICKNAME_KEY, trimmed);
  const { recent } = loadSavedNicknamesFromStorage();
  const deduped = [
    trimmed,
    ...recent.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, 4);

  try {
    window.localStorage.setItem(RECENT_NICKNAMES_KEY, JSON.stringify(deduped));
  } catch {
    // Ignore storage quota error
  }
  return deduped;
}

export default function SkybreakClient() {
  const [nickname, setNickname] = useState('');
  const [savedNicknames, setSavedNicknames] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [localSocketId, setLocalSocketId] = useState('');
  const [roomSnapshot, setRoomSnapshot] = useState<RoomStateSnapshot | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [manualTouchOverride, setManualTouchOverride] = useState<boolean | null>(null);

  // Voice Chat State (Mic is muted by default!)
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isRemoteVoiceMuted, setIsRemoteVoiceMuted] = useState(false);
  const [mutedPeerIds, setMutedPeerIds] = useState<Set<string>>(new Set());

  const [hudState, setHudState] = useState<{
    checkpoint: number;
    progressPercent: number;
    deaths: number;
    isRespawning: boolean;
    deathReason: 'fall' | 'hazard' | null;
    checkpointBanner: number | null;
  }>({
    checkpoint: 0,
    progressPercent: 0,
    deaths: 0,
    isRespawning: false,
    deathReason: null,
    checkpointBanner: null,
  });

  const mobileControlRef = useRef<MobileControlBridge>({
    moveX: 0,
    moveY: 0,
    jump: false,
    sprint: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  });

  useEffect(() => {
    const unsubVoice = voiceChat.subscribe(() => {
      setIsMicMuted(voiceChat.isMicMuted);
      setIsRemoteVoiceMuted(voiceChat.isRemoteVoiceMuted);
      setMutedPeerIds(new Set(voiceChat.mutedPeerIds));
    });
    return () => {
      unsubVoice();
    };
  }, []);

  // Load saved nickname from localStorage so next visit automatically suggests/fills the same name!
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { primary, recent } = loadSavedNicknamesFromStorage();
      setSavedNicknames(recent);
      if (primary) {
        setNickname(primary);
      } else {
        const randomTag = Math.floor(100 + Math.random() * 899);
        const generated = `Runner_${randomTag}`;
        setNickname(generated);
      }

      const checkTouchOrSmallScreen = () => {
        if (manualTouchOverride !== null) return;
        const isSmallOrTablet = window.innerWidth <= 1080;
        const hasTouch =
          navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
        setShowTouchControls(isSmallOrTablet || hasTouch);
      };

      checkTouchOrSmallScreen();
      window.addEventListener('resize', checkTouchOrSmallScreen);
      return () => window.removeEventListener('resize', checkTouchOrSmallScreen);
    }
  }, [manualTouchOverride]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      setLocalSocketId(socket.id || '');
      setErrorMessage(null);
    };

    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      setErrorMessage(
        `Connection to multiplayer server lost (${reason}). Attempting automatic reconnect...`
      );
    };

    const onConnectError = () => {
      setIsConnected(false);
    };

    const onRoomState = (snapshot: RoomStateSnapshot) => {
      updateServerClockFromSnapshot(snapshot.serverNow);
      setRoomSnapshot(snapshot);
      setLeaderboard(snapshot.leaderboard);
      if (socket.id) {
        voiceChat.syncRoomPeers(snapshot.players, socket.id);
      }
      if (snapshot.status !== 'countdown') {
        setCountdownLabel(null);
      }
    };

    const onCountdown = (payload: {
      roomCode: string;
      countdownValue: number;
      label: string;
      serverNow: number;
    }) => {
      updateServerClockFromSnapshot(payload.serverNow);
      setCountdownLabel(payload.label);
      soundFX.playCountdownBeep(payload.label === 'GO!');
      if (payload.label === 'GO!') {
        setTimeout(() => {
          setCountdownLabel(null);
        }, 850);
      }
    };

    const onRaceStarted = (snapshot: RoomStateSnapshot) => {
      updateServerClockFromSnapshot(snapshot.serverNow);
      setRoomSnapshot(snapshot);
      setLeaderboard(snapshot.leaderboard);
      setIsPaused(false);
    };

    const onRaceFinished = (snapshot: RoomStateSnapshot) => {
      updateServerClockFromSnapshot(snapshot.serverNow);
      setRoomSnapshot(snapshot);
      setLeaderboard(snapshot.leaderboard);
      setIsPaused(false);
    };

    if (socket.connected) {
      onConnect();
    } else {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room:state', onRoomState);
    socket.on('race:countdown', onCountdown);
    socket.on('race:started', onRaceStarted);
    socket.on('race:finished', onRaceFinished);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room:state', onRoomState);
      socket.off('race:countdown', onCountdown);
      socket.off('race:started', onRaceStarted);
      socket.off('race:finished', onRaceFinished);
    };
  }, []);

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    if (typeof window !== 'undefined' && val.trim().length >= 2) {
      window.localStorage.setItem(SAVED_NICKNAME_KEY, val.trim());
    }
  };

  const handleSelectSavedNickname = (saved: string) => {
    setNickname(saved);
    setErrorMessage(null);
    const updated = persistNicknameToStorage(saved);
    setSavedNicknames(updated);
  };

  const handleCreateRoom = () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setErrorMessage('Please enter a unique nickname of at least 2 characters.');
      return;
    }
    const updatedSaved = persistNicknameToStorage(trimmed);
    setSavedNicknames(updatedSaved);

    const socket = getSocket();
    setIsBusy(true);
    setErrorMessage(null);
    socket.emit(
      'room:create',
      {
        nickname: trimmed,
        playerToken: getOrCreatePlayerToken(),
      },
      (res: { ok: boolean; message?: string; data?: RoomStateSnapshot }) => {
        setIsBusy(false);
        if (!res?.ok) {
          setErrorMessage(res?.message || 'Could not create room.');
        } else if (res.data) {
          setRoomSnapshot(res.data);
          setLeaderboard(res.data.leaderboard);
          if (socket.id) {
            voiceChat.syncRoomPeers(res.data.players, socket.id);
          }
        }
      }
    );
  };

  const handleJoinRoom = (roomCode: string) => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setErrorMessage('Please enter a unique nickname of at least 2 characters.');
      return;
    }
    const updatedSaved = persistNicknameToStorage(trimmed);
    setSavedNicknames(updatedSaved);

    const socket = getSocket();
    setIsBusy(true);
    setErrorMessage(null);
    socket.emit(
      'room:join',
      {
        roomCode,
        nickname: trimmed,
        playerToken: getOrCreatePlayerToken(),
      },
      (res: { ok: boolean; message?: string; data?: RoomStateSnapshot }) => {
        setIsBusy(false);
        if (!res?.ok) {
          setErrorMessage(res?.message || 'Could not join room.');
        } else if (res.data) {
          setRoomSnapshot(res.data);
          setLeaderboard(res.data.leaderboard);
          if (socket.id) {
            voiceChat.syncRoomPeers(res.data.players, socket.id);
          }
        }
      }
    );
  };

  const handleToggleReady = () => {
    const socket = getSocket();
    socket.emit('room:ready', {});
  };

  const handleToggleMic = async () => {
    const res = await voiceChat.toggleMic();
    if (!res.ok && res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleToggleRemoteVoice = () => {
    voiceChat.toggleRemoteVoiceSound();
  };

  const handleTogglePeerMute = (peerId: string) => {
    voiceChat.togglePeerMute(peerId);
  };

  const handleToggleTouchControls = () => {
    setShowTouchControls((prev) => {
      const next = !prev;
      setManualTouchOverride(next);
      return next;
    });
  };

  const handleStartRace = () => {
    const socket = getSocket();
    setErrorMessage(null);
    socket.emit(
      'race:start',
      {},
      (res: { ok: boolean; message?: string }) => {
        if (!res?.ok && res?.message) {
          setErrorMessage(res.message);
        }
      }
    );
  };

  const handlePlayAgain = () => {
    const socket = getSocket();
    socket.emit('race:play-again', {});
  };

  const handleReturnToLobby = () => {
    const socket = getSocket();
    setIsPaused(false);
    socket.emit('race:return-lobby', {});
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    setIsPaused(false);
    voiceChat.disconnectAll();
    socket.emit('room:leave', {}, () => {
      setRoomSnapshot(null);
      setLeaderboard([]);
      setCountdownLabel(null);
    });
  };

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleToggleMute = () => {
    soundFX.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <main className="skybreak-viewport">
      <SkybreakCanvas
        roomSnapshot={roomSnapshot}
        localSocketId={localSocketId}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        mobileControlRef={mobileControlRef}
        onLocalHudUpdate={setHudState}
        onLeaderboardUpdate={setLeaderboard}
      />

      {!roomSnapshot && (
        <MainMenu
          nickname={nickname}
          savedNicknames={savedNicknames}
          onNicknameChange={handleNicknameChange}
          onSelectSavedNickname={handleSelectSavedNickname}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isConnected={isConnected}
          isBusy={isBusy}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
        />
      )}

      {roomSnapshot && roomSnapshot.status === 'lobby' && (
        <LobbyScreen
          room={roomSnapshot}
          localSocketId={localSocketId}
          isMicMuted={isMicMuted}
          isRemoteVoiceMuted={isRemoteVoiceMuted}
          mutedPeerIds={mutedPeerIds}
          onToggleMic={handleToggleMic}
          onToggleRemoteVoice={handleToggleRemoteVoice}
          onTogglePeerMute={handleTogglePeerMute}
          onToggleReady={handleToggleReady}
          onStartRace={handleStartRace}
          onLeaveRoom={handleLeaveRoom}
          errorMessage={errorMessage}
        />
      )}

      {(countdownLabel || (roomSnapshot && roomSnapshot.status === 'countdown')) && (
        <CountdownOverlay
          label={
            countdownLabel ||
            (roomSnapshot?.countdownValue ? String(roomSnapshot.countdownValue) : '3')
          }
        />
      )}

      {roomSnapshot &&
        (roomSnapshot.status === 'racing' || roomSnapshot.status === 'countdown') && (
          <>
            <RaceHud
              room={roomSnapshot}
              localSocketId={localSocketId}
              nickname={nickname}
              checkpoint={hudState.checkpoint}
              progressPercent={hudState.progressPercent}
              deaths={hudState.deaths}
              isRespawning={hudState.isRespawning}
              deathReason={hudState.deathReason}
              checkpointBanner={hudState.checkpointBanner}
              leaderboard={leaderboard}
              isConnected={isConnected}
              isMicMuted={isMicMuted}
              isRemoteVoiceMuted={isRemoteVoiceMuted}
              isMuted={isMuted}
              showTouchControls={showTouchControls}
              onToggleMic={handleToggleMic}
              onToggleRemoteVoice={handleToggleRemoteVoice}
              onToggleMute={handleToggleMute}
              onToggleTouchControls={handleToggleTouchControls}
              onTogglePause={handleTogglePause}
            />
            <MobileControls
              controlRef={mobileControlRef}
              active={
                roomSnapshot.status === 'racing' &&
                !isPaused &&
                showTouchControls
              }
            />
          </>
        )}

      {roomSnapshot && isPaused && roomSnapshot.status === 'racing' && (
        <PauseModal
          roomCode={roomSnapshot.roomCode}
          isMicMuted={isMicMuted}
          isRemoteVoiceMuted={isRemoteVoiceMuted}
          isMuted={isMuted}
          onResume={() => setIsPaused(false)}
          onToggleMic={handleToggleMic}
          onToggleRemoteVoice={handleToggleRemoteVoice}
          onToggleMute={handleToggleMute}
          onReturnToLobby={handleReturnToLobby}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {roomSnapshot && roomSnapshot.status === 'finished' && (
        <FinishModal
          room={roomSnapshot}
          localSocketId={localSocketId}
          onPlayAgain={handlePlayAgain}
          onReturnToLobby={handleReturnToLobby}
        />
      )}
    </main>
  );
}

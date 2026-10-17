'use client';

import React, { useState } from 'react';
import { RoomStateSnapshot } from '../shared/types';
import { MAX_PLAYERS_PER_ROOM } from '../shared/constants';

interface LobbyScreenProps {
  room: RoomStateSnapshot;
  localSocketId: string;
  isMicMuted: boolean;
  isRemoteVoiceMuted: boolean;
  mutedPeerIds: Set<string>;
  onToggleMic: () => void;
  onToggleRemoteVoice: () => void;
  onTogglePeerMute: (peerId: string) => void;
  onToggleReady: () => void;
  onStartRace: () => void;
  onLeaveRoom: () => void;
  errorMessage: string | null;
}

export default function LobbyScreen({
  room,
  localSocketId,
  isMicMuted,
  isRemoteVoiceMuted,
  mutedPeerIds,
  onToggleMic,
  onToggleRemoteVoice,
  onTogglePeerMute,
  onToggleReady,
  onStartRace,
  onLeaveRoom,
  errorMessage,
}: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);

  const localPlayer = room.players.find((p) => p.id === localSocketId);
  const isHost = room.hostId === localSocketId;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = room.roomCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="overlay-backdrop">
      <div className="glass-card lobby-card">
        <div className="lobby-top-bar">
          <div>
            <span className="sky-badge">SKY ISLAND LOBBY</span>
            <h2 className="lobby-title">Waiting for SkyRunners</h2>
          </div>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="btn btn-ghost btn-sm"
          >
            ← Leave Room
          </button>
        </div>

        <div className="room-code-banner">
          <div>
            <div className="room-code-caption">SHARE THIS ROOM CODE</div>
            <div className="room-code-value" data-testid="room-code-display">
              {room.roomCode}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="btn btn-accent"
            data-testid="copy-room-code-btn"
          >
            {copied ? '✅ Copied!' : '📋 Copy Room Code'}
          </button>
        </div>

        {/* Room Voice Chat Control Bar */}
        <div className="voice-control-banner">
          <div className="voice-banner-info">
            <span className="voice-banner-title">🎙️ ROOM VOICE CHAT</span>
            <span className="voice-banner-sub">
              Mic is muted by default. Unmute to talk, or mute others&apos; voice anytime.
            </span>
          </div>
          <div className="voice-banner-buttons">
            <button
              type="button"
              onClick={onToggleMic}
              className={`btn btn-sm ${
                isMicMuted ? 'btn-secondary' : 'btn-accent'
              }`}
              data-testid="lobby-mic-btn"
            >
              {isMicMuted ? '🔇 Mic: MUTED (Tap to Talk)' : '🎙️ Mic: LIVE'}
            </button>
            <button
              type="button"
              onClick={onToggleRemoteVoice}
              className={`btn btn-sm ${
                isRemoteVoiceMuted ? 'btn-danger-outline' : 'btn-ghost'
              }`}
              data-testid="lobby-deafen-btn"
            >
              {isRemoteVoiceMuted
                ? '🔇 Others’ Voice: OFF'
                : '🔊 Others’ Voice: ON'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="error-banner" role="alert">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        <div className="players-section">
          <div className="players-header">
            <span>
              Connected Players ({room.players.length} / {MAX_PLAYERS_PER_ROOM})
            </span>
            <span className="ready-hint">Up to 4 players can race &amp; talk together</span>
          </div>

          <div className="player-slots-grid">
            {Array.from({ length: MAX_PLAYERS_PER_ROOM }).map((_, idx) => {
              const player = room.players[idx];
              if (!player) {
                return (
                  <div key={`empty-${idx}`} className="player-slot empty-slot">
                    <div className="slot-avatar-placeholder">?</div>
                    <div className="slot-info">
                      <div className="slot-name">Open Player Slot #{idx + 1}</div>
                      <div className="slot-meta">Waiting for player to join...</div>
                    </div>
                  </div>
                );
              }

              const isMe = player.id === localSocketId;
              const isPeerMuted = mutedPeerIds.has(player.id) || isRemoteVoiceMuted;
              return (
                <div
                  key={player.id}
                  className={`player-slot ${isMe ? 'player-slot-self' : ''}`}
                >
                  <div
                    className="slot-color-avatar"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.nickname.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="slot-info" style={{ flex: 1 }}>
                    <div className="slot-name">
                      {player.nickname} {isMe && <span className="you-tag">(You)</span>}
                      {player.isHost && <span className="host-crown">👑 Host</span>}
                    </div>
                    <div className="slot-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span
                        className={`ready-badge ${
                          player.isReady ? 'badge-ready' : 'badge-not-ready'
                        }`}
                      >
                        {player.isReady ? '● Ready' : '○ Not Ready'}
                      </span>
                      <span
                        className={`mic-status-tag ${
                          player.isMicMuted ? 'mic-tag-muted' : 'mic-tag-live'
                        }`}
                      >
                        {player.isMicMuted ? '🔇 Muted' : '🎙️ Talking'}
                      </span>
                    </div>
                  </div>
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => onTogglePeerMute(player.id)}
                      className="btn btn-ghost btn-xs"
                      title={
                        isPeerMuted
                          ? `Unmute ${player.nickname}'s voice`
                          : `Mute ${player.nickname}'s voice`
                      }
                    >
                      {isPeerMuted ? '🔇' : '🔊'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lobby-footer-actions">
          <button
            type="button"
            onClick={onToggleReady}
            className={`btn ${
              localPlayer?.isReady ? 'btn-secondary' : 'btn-accent'
            }`}
            data-testid="toggle-ready-btn"
          >
            {localPlayer?.isReady ? '✓ Marked Ready (Toggle)' : 'Mark as Ready'}
          </button>

          {isHost ? (
            <button
              type="button"
              onClick={onStartRace}
              className="btn btn-primary btn-lg"
              data-testid="start-race-btn"
            >
              🏁 Start Race Now
            </button>
          ) : (
            <div className="waiting-host-pill">
              ⏳ Waiting for Host to start the race...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

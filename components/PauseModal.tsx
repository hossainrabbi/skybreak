'use client';

import React from 'react';

interface PauseModalProps {
  roomCode: string;
  isMicMuted: boolean;
  isRemoteVoiceMuted: boolean;
  isMuted: boolean;
  onResume: () => void;
  onToggleMic: () => void;
  onToggleRemoteVoice: () => void;
  onToggleMute: () => void;
  onReturnToLobby: () => void;
  onLeaveRoom: () => void;
}

export default function PauseModal({
  roomCode,
  isMicMuted,
  isRemoteVoiceMuted,
  isMuted,
  onResume,
  onToggleMic,
  onToggleRemoteVoice,
  onToggleMute,
  onReturnToLobby,
  onLeaveRoom,
}: PauseModalProps) {
  return (
    <div className="overlay-backdrop">
      <div className="glass-card pause-card">
        <span className="sky-badge">ROOM {roomCode}</span>
        <h2 className="pause-title">Game Paused</h2>
        <p className="pause-note">
          Multiplayer race continues in real time while your controls are paused.
        </p>

        <div className="pause-buttons-stack">
          <button
            type="button"
            onClick={onResume}
            className="btn btn-primary btn-full"
            data-testid="resume-btn"
          >
            ▶ Resume Race (Esc)
          </button>

          <button
            type="button"
            onClick={onToggleMic}
            className={`btn btn-full ${isMicMuted ? 'btn-secondary' : 'btn-accent'}`}
          >
            {isMicMuted
              ? '🔇 Microphone: MUTED (Tap to Unmute)'
              : '🎙️ Microphone: LIVE (Tap to Mute)'}
          </button>

          <button
            type="button"
            onClick={onToggleRemoteVoice}
            className="btn btn-secondary btn-full"
          >
            {isRemoteVoiceMuted
              ? '🔇 Others’ Voice Sound: OFF (Tap to Hear)'
              : '🗣️ Others’ Voice Sound: ON (Tap to Mute Others)'}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="btn btn-secondary btn-full"
          >
            {isMuted ? '🔇 Unmute Game SFX' : '🔊 Mute Game SFX'}
          </button>

          <button
            type="button"
            onClick={onReturnToLobby}
            className="btn btn-accent btn-full"
          >
            🏠 Return Room to Lobby
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="btn btn-ghost btn-full"
          >
            🚪 Leave Match to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

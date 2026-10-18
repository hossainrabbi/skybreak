'use client';

import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, RoomStateSnapshot } from '../shared/types';
import { TOTAL_CHECKPOINTS, getDivisionByCheckpoint } from '../shared/constants';
import { getSynchronizedNow } from '../lib/socketClient';

interface RaceHudProps {
  room: RoomStateSnapshot;
  localSocketId: string;
  nickname: string;
  checkpoint: number;
  progressPercent: number;
  deaths: number;
  isRespawning: boolean;
  deathReason: 'fall' | 'hazard' | null;
  checkpointBanner: number | null;
  leaderboard: LeaderboardEntry[];
  isConnected: boolean;
  isMicMuted: boolean;
  isRemoteVoiceMuted: boolean;
  isMuted: boolean;
  showTouchControls: boolean;
  onToggleMic: () => void;
  onToggleRemoteVoice: () => void;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onTogglePause: () => void;
}

export function formatRaceTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0'
  )}`;
}

export default function RaceHud({
  room,
  localSocketId,
  nickname,
  checkpoint,
  progressPercent,
  deaths,
  isRespawning,
  deathReason,
  checkpointBanner,
  leaderboard,
  isConnected,
  isMicMuted,
  isRemoteVoiceMuted,
  isMuted,
  showTouchControls,
  onToggleMic,
  onToggleRemoteVoice,
  onToggleMute,
  onToggleTouchControls,
  onTogglePause,
}: RaceHudProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (room.status !== 'racing' || !room.raceStartTime) {
      return;
    }
    const updateTimer = () => {
      setElapsedMs(Math.max(0, getSynchronizedNow() - (room.raceStartTime || 0)));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [room.status, room.raceStartTime]);

  const localPlayer = room.players.find((p) => p.id === localSocketId);
  const connectedCount = room.players.filter((p) => p.connected).length;
  const displayLeaderboard =
    leaderboard.length > 0 ? leaderboard : room.leaderboard;

  const currentDiv = getDivisionByCheckpoint(checkpoint);
  const bannerDiv =
    checkpointBanner !== null ? getDivisionByCheckpoint(checkpointBanner) : null;

  return (
    <div className="race-hud-layer">
      {/* Compact Top Bar: Progress Pill, Race Timer Pill & Settings Toggle Button */}
      <div className="hud-top-row">
        {/* Left: Compact Player Progress Pill */}
        <div className="hud-panel hud-player-stats">
          <div className="hud-player-header">
            <span
              className="hud-color-dot"
              style={{ backgroundColor: localPlayer?.color || '#00F0FF' }}
            />
            <span className="hud-nickname">{localPlayer?.nickname || nickname}</span>
            <span className="hud-room-tag">#{room.roomCode}</span>
          </div>

          <div className="hud-metrics-inline">
            <span className="hud-inline-stat">
              <span className="metric-label">CP</span>{' '}
              <strong className="metric-value">
                {checkpoint}/{TOTAL_CHECKPOINTS}
              </strong>
              {currentDiv ? (
                <span className="hud-div-tag"> • {currentDiv.nameEn}</span>
              ) : null}
            </span>
            <span className="hud-stat-sep">•</span>
            <span className="hud-inline-stat">
              <span className="metric-label">💀</span>{' '}
              <strong className="metric-value metric-danger">{deaths}</strong>
            </span>
            <span className="hud-stat-sep">•</span>
            <span className="hud-inline-stat">
              <strong className="metric-value metric-accent">{progressPercent}%</strong>
            </span>
          </div>

          <div className="hud-progress-track">
            <div
              className="hud-progress-fill"
              style={{ width: `${Math.max(2, Math.min(100, progressPercent))}%` }}
            />
          </div>
        </div>

        {/* Center/Right: Compact Timer + Settings Toggle Group */}
        <div className="hud-top-right-group">
          <div className="hud-panel hud-timer-panel">
            <div className="timer-top-line">
              <span
                className={`status-dot ${isConnected ? 'dot-online' : 'dot-offline'}`}
              />
              <span className="timer-caption">TIMER</span>
              <span className="hud-player-count-mini">
                {connectedCount}/{room.maxPlayers}
              </span>
            </div>
            <div className="timer-digits">{formatRaceTime(elapsedMs)}</div>
          </div>

          {/* Settings Toggle Button (Opens/Closes Live Standings & Quick Controls) */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`hud-panel hud-settings-toggle-btn ${
              isSettingsOpen ? 'hud-settings-toggle-active' : ''
            }`}
            aria-expanded={isSettingsOpen}
            aria-label="Toggle Live Standings and Settings"
            data-testid="hud-settings-btn"
          >
            <span className="settings-gear-icon">⚙️</span>
            <span className="settings-btn-label">
              {isSettingsOpen ? 'Close' : 'Settings'}
            </span>
          </button>
        </div>
      </div>

      {/* Collapsible Live Standings & Quick Controls Popover (Under Settings) */}
      {isSettingsOpen && (
        <div className="hud-panel hud-Leaderboard-panel" role="dialog" aria-label="Live Standings and Settings">
          <div className="leaderboard-header-row">
            <div className="leaderboard-title">🏆 LIVE STANDINGS & SETTINGS</div>
            <button
              type="button"
              className="leaderboard-close-btn"
              onClick={() => setIsSettingsOpen(false)}
              aria-label="Close Settings Panel"
            >
              ✕
            </button>
          </div>

          <div className="leaderboard-list">
            {displayLeaderboard.map((entry) => {
              const isMe = entry.id === localSocketId;
              const entryDiv = getDivisionByCheckpoint(entry.currentCheckpoint);
              return (
                <div
                  key={entry.id}
                  className={`leaderboard-row ${isMe ? 'leaderboard-row-me' : ''}`}
                >
                  <span className="lb-rank">#{entry.positionRank}</span>
                  <span
                    className="lb-color"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="lb-name">
                    {entry.nickname} {!entry.isMicMuted && '🎙️'}
                  </span>
                  <span className="lb-cp">
                    {entryDiv ? entryDiv.nameEn : `CP ${entry.currentCheckpoint}`}
                  </span>
                  <span className="lb-pct">
                    {entry.finished ? '🏁 FIN' : `${entry.progressPercent}%`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="hud-Quick-buttons">
            <button
              type="button"
              onClick={onToggleTouchControls}
              className={`btn btn-xs ${
                showTouchControls ? 'btn-primary' : 'btn-ghost'
              }`}
              title="Show/Hide Phone & Tablet Control Bar"
            >
              {showTouchControls ? '📱 Controls: ON' : '📱 Controls: OFF'}
            </button>
            <button
              type="button"
              onClick={onToggleMic}
              className={`btn btn-xs ${
                isMicMuted ? 'btn-ghost' : 'btn-accent'
              }`}
              title="Toggle Your Microphone (Muted by Default)"
              data-testid="hud-mic-btn"
            >
              {isMicMuted ? '🔇 Mic Off' : '🎙️ Mic On'}
            </button>
            <button
              type="button"
              onClick={onToggleRemoteVoice}
              className={`btn btn-xs ${
                isRemoteVoiceMuted ? 'btn-danger-outline' : 'btn-ghost'
              }`}
              title="Mute/Unmute Other Players' Voice Sound Only"
              data-testid="hud-deafen-btn"
            >
              {isRemoteVoiceMuted ? '🔇 Voice Off' : '🗣️ Voice On'}
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="btn btn-ghost btn-xs"
              title="Mute/Unmute Game Sound Effects"
            >
              {isMuted ? '🔇 SFX' : '🔊 SFX'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(false);
                onTogglePause();
              }}
              className="btn btn-secondary btn-xs"
              data-testid="pause-btn"
            >
              ⏸ Pause
            </button>
          </div>
        </div>
      )}

      {/* Checkpoint Activation Banner */}
      {checkpointBanner !== null && (
        <div className="hud-banner checkpoint-toast">
          🇧🇩 CHECKPOINT {checkpointBanner}/{TOTAL_CHECKPOINTS} —{' '}
          {bannerDiv ? `${bannerDiv.nameEn} (${bannerDiv.nameBn})` : ''} ACTIVATED!
        </div>
      )}

      {/* Respawn Feedback Banner */}
      {isRespawning && (
        <div className="hud-banner respawn-toast" role="status">
          <div className="respawn-title">
            {deathReason === 'hazard'
              ? '💥 STRUCK BY SKY HAZARD!'
              : '☁️ FELL BELOW THE CLOUD DECK!'}
          </div>
          <div className="respawn-sub">
            Respawning at{' '}
            {currentDiv
              ? `${currentDiv.nameEn} (${currentDiv.nameBn}) Checkpoint`
              : 'Sunlit Sanctuary (Start)'}
            ...
          </div>
        </div>
      )}
    </div>
  );
}

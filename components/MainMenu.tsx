'use client';

import React, { useState } from 'react';

interface MainMenuProps {
  nickname: string;
  savedNicknames: string[];
  onNicknameChange: (val: string) => void;
  onSelectSavedNickname: (val: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  isConnected: boolean;
  isBusy: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export default function MainMenu({
  nickname,
  savedNicknames,
  onNicknameChange,
  onSelectSavedNickname,
  onCreateRoom,
  onJoinRoom,
  isConnected,
  isBusy,
  errorMessage,
  onClearError,
}: MainMenuProps) {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const trimmedName = nickname.trim();
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 18;

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid) return;
    onJoinRoom(joinCodeInput.trim().toUpperCase());
  };

  return (
    <div className="overlay-backdrop">
      <div className="glass-card main-menu-card">
        <div className="brand-header">
          <div className="sky-badge">3D ONLINE MULTIPLAYER PARKOUR RACE</div>
          <h1 className="game-title">SKYBREAK</h1>
          <p className="game-subtitle">
            Race up to 4 players across 8 thrilling floating-island zones, 7 Bangladesh
            Division checkpoints, and real-time voice chat on PC, Phone &amp; Tablet!
          </p>
        </div>

        <div className="connection-pill-row">
          <span
            className={`status-dot ${isConnected ? 'dot-online' : 'dot-offline'}`}
          />
          <span className="status-text">
            {isConnected
              ? 'Multiplayer Server Connected'
              : 'Connecting to Multiplayer Server...'}
          </span>
        </div>

        {errorMessage && (
          <div className="error-banner" role="alert">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={onClearError}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="nickname-input" className="field-label">
            UNIQUE PLAYER NICKNAME (SAVED AUTOMATICALLY)
          </label>
          <input
            id="nickname-input"
            type="text"
            list="saved-nicknames-list"
            maxLength={18}
            value={nickname}
            onChange={(e) => {
              onNicknameChange(e.target.value);
              if (errorMessage) onClearError();
            }}
            placeholder="Enter your unique nickname (e.g. Arif_99)"
            className="text-input"
            autoComplete="on"
          />
          <datalist id="saved-nicknames-list">
            {savedNicknames.map((saved) => (
              <option key={saved} value={saved} />
            ))}
          </datalist>

          {savedNicknames.length > 0 && (
            <div className="saved-names-row">
              <span className="saved-names-label">💾 Saved Names:</span>
              {savedNicknames.map((saved) => {
                const isSelected = saved.toLowerCase() === trimmedName.toLowerCase();
                return (
                  <button
                    key={saved}
                    type="button"
                    onClick={() => onSelectSavedNickname(saved)}
                    className={`saved-name-chip ${
                      isSelected ? 'saved-name-chip-active' : ''
                    }`}
                  >
                    {isSelected ? `✓ ${saved}` : saved}
                  </button>
                );
              })}
            </div>
          )}

          {!isNameValid && (
            <span
              style={{
                display: 'block',
                marginTop: '6px',
                fontSize: '12px',
                color: '#fbbf24',
              }}
            >
              Please enter a unique nickname of at least 2 characters.
            </span>
          )}
        </div>

        <div className="menu-actions-grid">
          <div className="action-box">
            <h2 className="action-box-title">Host a New Match</h2>
            <p className="action-box-desc">
              Create a private 4-player room and share the 6-digit code with friends.
            </p>
            <button
              type="button"
              onClick={onCreateRoom}
              disabled={!isConnected || isBusy || !isNameValid}
              className="btn btn-primary btn-full"
              data-testid="create-room-btn"
            >
              {isBusy ? 'Creating Room...' : '✨ Create Room'}
            </button>
          </div>

          <form className="action-box" onSubmit={handleJoinSubmit}>
            <h2 className="action-box-title">Join with Room Code</h2>
            <div className="join-input-row">
              <input
                type="text"
                maxLength={6}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="CODE (e.g. SKY7B2)"
                className="text-input code-input"
                aria-label="Room Code"
                data-testid="join-code-input"
              />
              <button
                type="submit"
                disabled={
                  !isConnected ||
                  isBusy ||
                  !isNameValid ||
                  joinCodeInput.trim().length === 0
                }
                className="btn btn-accent"
                data-testid="join-room-btn"
              >
                🚀 Join Room
              </button>
            </div>
          </form>
        </div>

        <div className="controls-guide-box">
          <div className="controls-col">
            <strong>💻 Desktop Controls</strong>
            <span>Move: WASD or Arrow Keys</span>
            <span>Jump: Spacebar • Sprint: Shift</span>
            <span>Camera: Mouse Drag or Q / E • Pause: Esc</span>
          </div>
          <div className="controls-col">
            <strong>📱 Phone &amp; Tablet Controls</strong>
            <span>Move: Left Joystick or D-Pad (▲ ▼ ◀ ▶)</span>
            <span>Jump &amp; Sprint: Right Touch Action Bar</span>
            <span>Camera: Swipe Screen or Cam ⟲ / ⟳ Buttons</span>
          </div>
        </div>
      </div>
    </div>
  );
}

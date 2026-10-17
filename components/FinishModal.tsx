'use client';

import React from 'react';
import { RoomStateSnapshot } from '../shared/types';
import { TOTAL_CHECKPOINTS, TOTAL_OBSTACLE_SECTIONS } from '../shared/constants';
import { formatRaceTime } from './RaceHud';

interface FinishModalProps {
  room: RoomStateSnapshot;
  localSocketId: string;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export default function FinishModal({
  room,
  localSocketId,
  onPlayAgain,
  onReturnToLobby,
}: FinishModalProps) {
  return (
    <div className="overlay-backdrop">
      <div className="glass-card finish-card">
        <div className="finish-trophy-header">
          <div className="trophy-icon">🏆</div>
          <span className="sky-badge">RACE COMPLETE</span>
          <h2 className="winner-headline" data-testid="winner-announcement">
            {room.winnerNickname || 'SkyRunner'} Wins the Race!
          </h2>
          <p className="winner-subtext">
            First to conquer all {TOTAL_OBSTACLE_SECTIONS} ascending Sky Island sections and {TOTAL_CHECKPOINTS} Checkpoint Flags!
          </p>
        </div>

        <div className="standings-table-wrapper">
          <table className="standings-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Player</th>
                <th>Checkpoint</th>
                <th>Finish Time</th>
                <th>Deaths</th>
              </tr>
            </thead>
            <tbody>
              {room.leaderboard.map((entry) => {
                const isMe = entry.id === localSocketId;
                const isWinner = entry.id === room.winnerId;
                return (
                  <tr
                    key={entry.id}
                    className={`${isMe ? 'row-me' : ''} ${
                      isWinner ? 'row-winner' : ''
                    }`}
                  >
                    <td className="cell-rank">
                      {entry.positionRank === 1 ? '🥇 #1' : `#${entry.positionRank}`}
                    </td>
                    <td className="cell-player">
                      <span
                        className="table-color-dot"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>
                        {entry.nickname} {isMe && <strong>(You)</strong>}
                      </span>
                    </td>
                    <td>
                      {entry.currentCheckpoint} / {TOTAL_CHECKPOINTS}
                    </td>
                    <td>
                      {entry.finished && entry.finishTimeMs !== null
                        ? formatRaceTime(entry.finishTimeMs)
                        : `In Course (${entry.progressPercent}%)`}
                    </td>
                    <td>{entry.deaths}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="finish-actions-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="btn btn-primary btn-lg"
            data-testid="play-again-btn"
          >
            🔄 Play Again
          </button>
          <button
            type="button"
            onClick={onReturnToLobby}
            className="btn btn-secondary btn-lg"
            data-testid="return-lobby-btn"
          >
            🏠 Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

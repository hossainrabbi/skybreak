'use client';

import React from 'react';

interface CountdownOverlayProps {
  label: string | null;
}

export default function CountdownOverlay({ label }: CountdownOverlayProps) {
  if (!label) return null;
  const isGo = label === 'GO!';

  return (
    <div className="countdown-overlay" aria-live="assertive">
      <div className={`countdown-number ${isGo ? 'countdown-go' : ''}`}>
        {label}
      </div>
      <div className="countdown-subtext">
        {isGo ? 'SPRINT TO THE FINISH ISLAND!' : 'GET READY AT THE STARTING LINE...'}
      </div>
    </div>
  );
}

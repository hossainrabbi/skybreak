'use client';

import React, { useRef, useState } from 'react';
import { MobileControlBridge } from '../game/SkybreakCanvas';

interface MobileControlsProps {
  controlRef: React.MutableRefObject<MobileControlBridge>;
  active: boolean;
}

export default function MobileControls({
  controlRef,
  active,
}: MobileControlsProps) {
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isJumping, setIsJumping] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [sprintLocked, setSprintLocked] = useState(false);

  const joyCenterRef = useRef<{ x: number; y: number } | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);
  const lookPointerRef = useRef<{ id: number; x: number; y: number } | null>(null);

  if (!active) return null;

  const maxRadius = 40;

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    if (!joyCenterRef.current) return;
    const dx = clientX - joyCenterRef.current.x;
    const dy = clientY - joyCenterRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxRadius, dist);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clampedDist;
    const oy = Math.sin(angle) * clampedDist;

    setKnobOffset({ x: ox, y: oy });
    controlRef.current.moveX = ox / maxRadius;
    controlRef.current.moveY = -oy / maxRadius;
  };

  // Pointer-based Virtual Thumb Joystick (handles all 360-degree movement)
  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    joyPointerIdRef.current = e.pointerId;
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleJoyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleJoyPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    joyPointerIdRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    controlRef.current.moveX = 0;
    controlRef.current.moveY = 0;
  };

  // Camera swipe zone
  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    lookPointerRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handleLookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lookPointerRef.current || lookPointerRef.current.id !== e.pointerId) return;
    e.preventDefault();
    controlRef.current.lookDeltaX += e.clientX - lookPointerRef.current.x;
    controlRef.current.lookDeltaY += e.clientY - lookPointerRef.current.y;
    lookPointerRef.current.x = e.clientX;
    lookPointerRef.current.y = e.clientY;
  };

  const handleLookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lookPointerRef.current || lookPointerRef.current.id !== e.pointerId) return;
    e.preventDefault();
    lookPointerRef.current = null;
  };

  const toggleSprintLock = () => {
    const next = !sprintLocked;
    setSprintLocked(next);
    setIsSprinting(next);
    controlRef.current.sprint = next;
  };

  return (
    <div
      className="mobile-controls-layer"
      aria-label="Phone and Tablet Game Control Bar"
      data-testid="mobile-control-bar"
    >
      {/* Upper Touch Camera Swipe Area */}
      <div
        className="mobile-camera-drag-zone"
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={handleLookPointerUp}
        onPointerCancel={handleLookPointerUp}
      >
        <span className="camera-drag-hint">↔ SWIPE TO ROTATE CAMERA</span>
      </div>

      {/* Bottom Docked Phone & Tablet Control Bar */}
      <div className="mobile-control-dock">
        {/* Left Pod: Virtual Joystick only (D-Pad arrows hidden per user request) */}
        <div className="mobile-left-pod">
          <div
            className="mobile-joystick-zone"
            onPointerDown={handleJoyPointerDown}
            onPointerMove={handleJoyPointerMove}
            onPointerUp={handleJoyPointerUp}
            onPointerCancel={handleJoyPointerUp}
          >
            <div className="joystick-base">
              <div
                className="joystick-knob"
                style={{
                  transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
                }}
              />
            </div>
            <span className="mobile-zone-hint">JOYSTICK</span>
          </div>
        </div>

        {/* Center Pod: Camera Orbit & Auto-Sprint Bar (Tablet/Wide screens) */}
        <div className="mobile-center-bar">
          <button
            type="button"
            className="ctrl-bar-btn"
            onPointerDown={(e) => {
              e.preventDefault();
              controlRef.current.lookDeltaX -= 28;
            }}
          >
            ⟲ Cam L
          </button>
          <button
            type="button"
            className={`ctrl-bar-btn ${sprintLocked ? 'ctrl-bar-btn-active' : ''}`}
            onClick={toggleSprintLock}
          >
            {sprintLocked ? '⚡ Auto-Sprint: ON' : '⚡ Auto-Sprint'}
          </button>
          <button
            type="button"
            className="ctrl-bar-btn"
            onPointerDown={(e) => {
              e.preventDefault();
              controlRef.current.lookDeltaX += 28;
            }}
          >
            Cam R ⟳
          </button>
        </div>

        {/* Right Pod: Sprint & Jump Buttons (brought inward for small screens) */}
        <div className="mobile-action-buttons">
          <button
            type="button"
            className={`mobile-btn mobile-sprint-btn ${
              isSprinting || sprintLocked ? 'mobile-btn-active' : ''
            }`}
            onPointerDown={(e) => {
              e.preventDefault();
              setIsSprinting(true);
              controlRef.current.sprint = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              if (!sprintLocked) {
                setIsSprinting(false);
                controlRef.current.sprint = false;
              }
            }}
            onPointerCancel={() => {
              if (!sprintLocked) {
                setIsSprinting(false);
                controlRef.current.sprint = false;
              }
            }}
            data-testid="mobile-sprint-btn"
          >
            ⚡ SPRINT
          </button>

          <button
            type="button"
            className={`mobile-btn mobile-jump-btn ${
              isJumping ? 'mobile-btn-active' : ''
            }`}
            onPointerDown={(e) => {
              e.preventDefault();
              setIsJumping(true);
              controlRef.current.jump = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              setIsJumping(false);
              controlRef.current.jump = false;
            }}
            onPointerCancel={() => {
              setIsJumping(false);
              controlRef.current.jump = false;
            }}
            data-testid="mobile-jump-btn"
          >
            ⬆️ JUMP
          </button>
        </div>
      </div>
    </div>
  );
}

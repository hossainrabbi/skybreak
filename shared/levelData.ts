import { LevelPiece, Vec3 } from './types';
import { TOTAL_CHECKPOINTS } from './constants';

/**
 * SKYBREAK — 8 Completely Distinct, Non-Repetitive Sky Zones across 7 Bangladesh Division Checkpoints!
 *
 * - Zone 1 (Start -> CP 1 RAJSHAHI): Shattered Ancient Stone Ruins & Collapsed Viaduct
 * - Zone 2 (CP 1 -> CP 2 KHULNA): Crashed Cargo Airplane Wreckage (Tail, Torn Cabin, Spinning Jet Propeller & Broken Wings)
 * - Zone 3 (CP 2 -> CP 3 BARISHAL): Sunken Sky-Shipwreck Hulls & Swinging Iron Ship Anchors
 * - Zone 4 (CP 3 -> CP 4 CHATTAGRAM): Derailed Sky-Train Coaches & Slamming Hydraulic Pistons
 * - Zone 5 (CP 4 -> CP 5 SYLHET): Giant Rotating Clockwork Gears & Sky-Geyser High Bounce Pads
 * - Zone 6 (CP 5 -> CP 6 RANGPUR): Shattered Glass Sky-Labyrinth & Rapid Phase Trap Panes
 * - Zone 7 (CP 6 -> CP 7 DHAKA): Volcanic Meteor Asteroid Belt & Spinning Orbital Laser Rings
 * - Zone 8 (CP 7 -> FINISH): Broken Suspended Highway Overpass, Dual Slammer Pistons & Final Apex Sprint
 */
export const LEVEL_PIECES: LevelPiece[] = [
  // =========================================================================
  // START ISLAND (z: 4 to -10, y: 0.0)
  // =========================================================================
  {
    id: 'start-island',
    sectionIndex: 0,
    sectionName: 'Sunlit Sanctuary (Start)',
    kind: 'start_island',
    position: { x: 0, y: 0, z: -3 },
    size: { x: 14, y: 2.2, z: 14 },
    color: '#38bdf8',
    accentColor: '#f8fafc',
    checkpointIndex: 0,
    spawnPoint: { x: 0, y: 1.6, z: -2.0 },
  },

  // =========================================================================
  // ZONE 1 (Sections 1–3): SHATTERED ANCIENT RUINS & COLLAPSED STONE BRIDGE
  // =========================================================================
  {
    id: 'z1-ruin-1',
    sectionIndex: 1,
    sectionName: '1. Collapsed Stone Viaduct',
    kind: 'small_pad',
    visualPreset: 'ruins_stone',
    visualTilt: { x: 0.05, y: 0.08, z: -0.06 },
    position: { x: 0, y: 0.8, z: -15.0 },
    size: { x: 4.2, y: 1.2, z: 5.5 },
    color: '#94a3b8',
  },
  {
    id: 'z1-ruin-2',
    sectionIndex: 1,
    sectionName: '1. Collapsed Stone Viaduct',
    kind: 'small_pad',
    visualPreset: 'ruins_stone',
    visualTilt: { x: -0.04, y: -0.1, z: 0.08 },
    position: { x: -2.2, y: 1.8, z: -24.0 },
    size: { x: 3.4, y: 1.2, z: 5.0 },
    color: '#64748b',
  },
  {
    id: 'z1-ruin-3',
    sectionIndex: 2,
    sectionName: '2. Cracked Pillar Span',
    kind: 'narrow_bridge',
    visualPreset: 'ruins_stone',
    position: { x: 0.8, y: 3.0, z: -38.5 },
    size: { x: 2.3, y: 1.1, z: 16.0 },
    color: '#94a3b8',
  },
  {
    id: 'z1-ruin-4',
    sectionIndex: 3,
    sectionName: '3. Sinking Temple Slabs',
    kind: 'disappearing_platform',
    visualPreset: 'ruins_stone',
    position: { x: -1.6, y: 4.2, z: -53.0 },
    size: { x: 3.5, y: 1.0, z: 4.5 },
    color: '#cbd5e1',
    disappearing: {
      solidDurationMs: 2600,
      warningDurationMs: 850,
      hiddenDurationMs: 1250,
      phaseOffsetMs: 0,
    },
  },
  {
    id: 'z1-ruin-5',
    sectionIndex: 3,
    sectionName: '3. Sinking Temple Slabs',
    kind: 'disappearing_platform',
    visualPreset: 'ruins_stone',
    position: { x: 1.6, y: 5.2, z: -63.5 },
    size: { x: 3.5, y: 1.0, z: 4.5 },
    color: '#cbd5e1',
    disappearing: {
      solidDurationMs: 2600,
      warningDurationMs: 850,
      hiddenDurationMs: 1250,
      phaseOffsetMs: 1300,
    },
  },
  {
    id: 'z1-ruin-6',
    sectionIndex: 3,
    sectionName: '3. Sinking Temple Slabs',
    kind: 'small_pad',
    visualPreset: 'ruins_stone',
    position: { x: 0, y: 5.8, z: -74.0 },
    size: { x: 3.8, y: 1.1, z: 4.2 },
    color: '#94a3b8',
  },

  // =========================================================================
  // CHECKPOINT 1: RAJSHAHI DIVISION (রাজশাহী) (z: -84, y: 6.2)
  // =========================================================================
  {
    id: 'checkpoint-1',
    sectionIndex: 3,
    sectionName: 'Checkpoint 1 — RAJSHAHI (রাজশাহী)',
    kind: 'checkpoint_platform',
    position: { x: 0, y: 6.2, z: -84.0 },
    size: { x: 9.5, y: 1.6, z: 9.5 },
    color: '#006a4e',
    accentColor: '#f42a41',
    checkpointIndex: 1,
    spawnPoint: { x: 0, y: 7.6, z: -84.0 },
  },

  // =========================================================================
  // ZONE 2 (Sections 4–6): CRASHED CARGO AIRPLANE WRECKAGE (ভাঙা প্লেন)
  // =========================================================================
  {
    id: 'z2-plane-tail',
    sectionIndex: 4,
    sectionName: '4. Severed Airplane Tail Section',
    kind: 'static_platform',
    visualPreset: 'airplane_tail',
    visualTilt: { x: 0.06, y: 0.12, z: -0.08 },
    position: { x: -1.2, y: 7.5, z: -97.5 },
    size: { x: 3.4, y: 1.4, z: 9.5 },
    color: '#f8fafc',
    accentColor: '#ef4444',
  },
  {
    id: 'z2-plane-wing-left',
    sectionIndex: 4,
    sectionName: '4. Severed Airplane Tail Section',
    kind: 'moving_platform',
    visualPreset: 'airplane_wing',
    visualTilt: { x: 0, y: -0.18, z: 0.06 },
    position: { x: 1.8, y: 8.8, z: -109.5 },
    size: { x: 4.8, y: 0.7, z: 3.6 },
    color: '#e2e8f0',
    accentColor: '#0284c7',
    moving: {
      axis: 'y',
      amplitude: 1.2,
      speed: 1.8,
      phaseOffset: 0,
    },
  },
  {
    id: 'z2-plane-cabin',
    sectionIndex: 5,
    sectionName: '5. Torn Passenger Fuselage & Jet Turbine',
    kind: 'static_platform',
    visualPreset: 'airplane_cabin',
    position: { x: 0, y: 10.4, z: -125.5 },
    size: { x: 4.0, y: 1.8, z: 16.5 },
    color: '#f1f5f9',
    accentColor: '#2563eb',
  },
  {
    id: 'z2-plane-propeller',
    sectionIndex: 5,
    sectionName: '5. Torn Passenger Fuselage & Jet Turbine',
    kind: 'rotating_bar',
    position: { x: 0, y: 12.1, z: -125.5 },
    size: { x: 1.3, y: 1.3, z: 1.3 },
    color: '#f97316',
    rotating: {
      speedRadPerSec: 2.35,
      initialAngle: 0.3,
      barLength: 7.4,
      barRadius: 0.32,
      lethal: true,
      style: 'jet_propeller',
    },
  },
  {
    id: 'z2-plane-wing-right',
    sectionIndex: 6,
    sectionName: '6. Burning Wing & Cockpit Nose',
    kind: 'narrow_bridge',
    visualPreset: 'airplane_wing',
    visualTilt: { x: 0.05, y: 0.14, z: -0.05 },
    position: { x: -1.5, y: 11.8, z: -141.5 },
    size: { x: 2.2, y: 0.75, z: 9.5 },
    color: '#cbd5e1',
  },
  {
    id: 'z2-plane-cockpit',
    sectionIndex: 6,
    sectionName: '6. Burning Wing & Cockpit Nose',
    kind: 'static_platform',
    visualPreset: 'airplane_cockpit',
    visualTilt: { x: -0.08, y: -0.06, z: 0.04 },
    position: { x: 0.8, y: 13.0, z: -154.0 },
    size: { x: 3.8, y: 1.6, z: 8.5 },
    color: '#f8fafc',
    accentColor: '#0ea5e9',
  },

  // =========================================================================
  // CHECKPOINT 2: KHULNA DIVISION (খুলনা) (z: -166, y: 14.0)
  // =========================================================================
  {
    id: 'checkpoint-2',
    sectionIndex: 6,
    sectionName: 'Checkpoint 2 — KHULNA (খুলনা)',
    kind: 'checkpoint_platform',
    position: { x: 0, y: 14.0, z: -166.0 },
    size: { x: 9.5, y: 1.6, z: 9.5 },
    color: '#006a4e',
    accentColor: '#f42a41',
    checkpointIndex: 2,
    spawnPoint: { x: 0, y: 15.4, z: -166.0 },
  },

  // =========================================================================
  // ZONE 3 (Sections 7–9): SUNKEN SKY-SHIPWRECK & SWINGING IRON ANCHORS (ভাঙা জাহাজ)
  // =========================================================================
  {
    id: 'z3-ship-stern',
    sectionIndex: 7,
    sectionName: '7. Split Timber Ship Stern',
    kind: 'static_platform',
    visualPreset: 'ship_hull',
    visualTilt: { x: 0.05, y: -0.06, z: 0.07 },
    position: { x: 0, y: 15.6, z: -181.0 },
    size: { x: 4.5, y: 1.6, z: 12.5 },
    color: '#92400e',
    accentColor: '#fbbf24',
  },
  {
    id: 'z3-anchor-1',
    sectionIndex: 7,
    sectionName: '7. Split Timber Ship Stern',
    kind: 'swinging_pendulum',
    position: { x: 0, y: 15.6, z: -181.0 },
    size: { x: 1, y: 1, z: 1 },
    color: '#dc2626',
    pendulum: {
      pivotHeight: 7.2,
      armLength: 5.4,
      maxAngleRad: 0.98,
      speed: 2.25,
      phaseOffset: 0,
      bobRadius: 1.0,
      lethal: true,
      style: 'ship_anchor',
    },
  },
  {
    id: 'z3-ship-plank',
    sectionIndex: 8,
    sectionName: '8. Rotted Gangplank & Drifting Lifeboat',
    kind: 'narrow_bridge',
    visualPreset: 'ship_hull',
    position: { x: 0, y: 17.8, z: -196.5 },
    size: { x: 1.65, y: 0.8, z: 11.0 },
    color: '#b45309',
  },
  {
    id: 'z3-lifeboat',
    sectionIndex: 8,
    sectionName: '8. Rotted Gangplank & Drifting Lifeboat',
    kind: 'moving_platform',
    visualPreset: 'ship_hull',
    position: { x: 0, y: 19.4, z: -209.0 },
    size: { x: 3.4, y: 1.1, z: 5.2 },
    color: '#78350f',
    moving: {
      axis: 'x',
      amplitude: 4.5,
      speed: 2.1,
      phaseOffset: 0.8,
    },
  },
  {
    id: 'z3-ship-bow',
    sectionIndex: 9,
    sectionName: '9. Broken Ship Bow & Twin Anchors',
    kind: 'static_platform',
    visualPreset: 'ship_hull',
    visualTilt: { x: 0.08, y: 0.04, z: -0.05 },
    position: { x: 0, y: 21.4, z: -224.5 },
    size: { x: 4.2, y: 1.6, z: 14.0 },
    color: '#92400e',
  },
  {
    id: 'z3-anchor-2',
    sectionIndex: 9,
    sectionName: '9. Broken Ship Bow & Twin Anchors',
    kind: 'swinging_pendulum',
    position: { x: 0, y: 21.4, z: -221.0 },
    size: { x: 1, y: 1, z: 1 },
    color: '#dc2626',
    pendulum: {
      pivotHeight: 7.2,
      armLength: 5.4,
      maxAngleRad: 1.0,
      speed: 2.45,
      phaseOffset: 0.4,
      bobRadius: 1.0,
      lethal: true,
      style: 'ship_anchor',
    },
  },
  {
    id: 'z3-anchor-3',
    sectionIndex: 9,
    sectionName: '9. Broken Ship Bow & Twin Anchors',
    kind: 'swinging_pendulum',
    position: { x: 0, y: 21.4, z: -228.0 },
    size: { x: 1, y: 1, z: 1 },
    color: '#dc2626',
    pendulum: {
      pivotHeight: 7.2,
      armLength: 5.4,
      maxAngleRad: 1.0,
      speed: 2.45,
      phaseOffset: 2.5,
      bobRadius: 1.0,
      lethal: true,
      style: 'ship_anchor',
    },
  },

  // =========================================================================
  // CHECKPOINT 3: BARISHAL DIVISION (বরিশাল) (z: -240, y: 22.8)
  // =========================================================================
  {
    id: 'checkpoint-3',
    sectionIndex: 9,
    sectionName: 'Checkpoint 3 — BARISHAL (বরিশাল)',
    kind: 'checkpoint_platform',
    position: { x: 0, y: 22.8, z: -240.0 },
    size: { x: 9.5, y: 1.6, z: 9.5 },
    color: '#006a4e',
    accentColor: '#f42a41',
    checkpointIndex: 3,
    spawnPoint: { x: 0, y: 24.2, z: -240.0 },
  },

  // =========================================================================
  // ZONE 4 (Sections 10–12): DERAILED SKY-TRAIN & CRUSHING HYDRAULIC PISTONS (ভাঙা ট্রেন ও ক্রাশার)
  // =========================================================================
  {
    id: 'z4-train-1',
    sectionIndex: 10,
    sectionName: '10. Derailed Express Coach I',
    kind: 'static_platform',
    visualPreset: 'train_coach',
    visualTilt: { x: 0.04, y: -0.08, z: 0.06 },
    position: { x: -0.8, y: 24.5, z: -256.5 },
    size: { x: 3.4, y: 1.8, z: 15.0 },
    color: '#16a34a',
    accentColor: '#facc15',
  },
  {
    id: 'z4-piston-1',
    sectionIndex: 10,
    sectionName: '10. Derailed Express Coach I',
    kind: 'crushing_piston',
    position: { x: -0.8, y: 29.5, z: -256.5 },
    size: { x: 3.2, y: 1.4, z: 3.2 },
    color: '#ef4444',
    piston: {
      axis: 'y',
      strokeDistance: 3.4,
      cycleMs: 2100,
      phaseOffsetMs: 0,
      headSize: { x: 3.1, y: 1.3, z: 3.1 },
    },
  },
  {
    id: 'z4-rail-tie',
    sectionIndex: 11,
    sectionName: '11. Twisted Steel Rail Bridge',
    kind: 'narrow_bridge',
    visualPreset: 'train_coach',
    position: { x: 0.6, y: 26.8, z: -273.5 },
    size: { x: 1.75, y: 0.85, z: 11.5 },
    color: '#475569',
  },
  {
    id: 'z4-train-2',
    sectionIndex: 12,
    sectionName: '12. Hanging Locomotive & Twin Crushers',
    kind: 'static_platform',
    visualPreset: 'train_coach',
    visualTilt: { x: 0.06, y: 0.06, z: -0.05 },
    position: { x: 0, y: 29.4, z: -293.5 },
    size: { x: 3.5, y: 1.8, z: 18.0 },
    color: '#dc2626',
    accentColor: '#fde047',
  },
  {
    id: 'z4-piston-2',
    sectionIndex: 12,
    sectionName: '12. Hanging Locomotive & Twin Crushers',
    kind: 'crushing_piston',
    position: { x: 0, y: 34.4, z: -289.0 },
    size: { x: 3.2, y: 1.4, z: 3.0 },
    color: '#ef4444',
    piston: {
      axis: 'y',
      strokeDistance: 3.4,
      cycleMs: 1850,
      phaseOffsetMs: 0,
      headSize: { x: 3.1, y: 1.3, z: 2.9 },
    },
  },
  {
    id: 'z4-piston-3',
    sectionIndex: 12,
    sectionName: '12. Hanging Locomotive & Twin Crushers',
    kind: 'crushing_piston',
    position: { x: 0, y: 34.4, z: -298.0 },
    size: { x: 3.2, y: 1.4, z: 3.0 },
    color: '#ef4444',
    piston: {
      axis: 'y',
      strokeDistance: 3.4,
      cycleMs: 1850,
      phaseOffsetMs: 925,
      headSize: { x: 3.1, y: 1.3, z: 2.9 },
    },
  },
  {
    id: 'z4-pad-exit',
    sectionIndex: 12,
    sectionName: '12. Hanging Locomotive & Twin Crushers',
    kind: 'small_pad',
    position: { x: 0, y: 30.8, z: -306.8 },
    size: { x: 3.5, y: 1.0, z: 3.5 },
    color: '#38bdf8',
  },

  // =========================================================================
  // CHECKPOINT 4: CHATTAGRAM DIVISION (চট্টগ্রাম) (z: -316, y: 31.8)
  // =========================================================================
  {
    id: 'checkpoint-4',
    sectionIndex: 12,
    sectionName: 'Checkpoint 4 — CHATTAGRAM (চট্টগ্রাম)',
    kind: 'checkpoint_platform',
    position: { x: 0, y: 31.8, z: -316.0 },
    size: { x: 9.5, y: 1.6, z: 9.5 },
    color: '#006a4e',
    accentColor: '#f42a41',
    checkpointIndex: 4,
    spawnPoint: { x: 0, y: 33.2, z: -316.0 },
  },

  // =========================================================================
  // ZONE 5 (Sections 13–15): GIANT CLOCKWORK GEARS & SKY-GEYSER BOUNCE PADS
  // =========================================================================
  {
    id: 'z5-gear-1',
    sectionIndex: 13,
    sectionName: '13. Giant Brass Clockwork Cogs',
    kind: 'static_platform',
    visualPreset: 'clockwork_gear',
    position: { x: -1.8, y: 32.8, z: -329.5 },
    size: { x: 6.2, y: 0.9, z: 6.2 },
    color: '#d97706',
  },
  {
    id: 'z5-gear-rotor-1',
    sectionIndex: 13,
    sectionName: '13. Giant Brass Clockwork Cogs',
    kind: 'rotating_bar',
    position: { x: -1.8, y: 33.9, z: -329.5 },
    size: { x: 1.1, y: 1.1, z: 1.1 },
    color: '#ef4444',
    rotating: {
      speedRadPerSec: 2.9,
      initialAngle: 0,
      barLength: 5.8,
      barRadius: 0.28,
      lethal: true,
    },
  },
  {
    id: 'z5-bounce-pad-1',
    sectionIndex: 14,
    sectionName: '14. Sky-Geyser Launch Pad',
    kind: 'small_pad',
    bounceVelocity: 17.5,
    position: { x: 2.0, y: 33.6, z: -341.0 },
    size: { x: 3.8, y: 1.0, z: 3.8 },
    color: '#10b981',
    accentColor: '#fde047',
  },
  {
    id: 'z5-gear-2',
    sectionIndex: 14,
    sectionName: '14. Sky-Geyser Launch Pad',
    kind: 'static_platform',
    visualPreset: 'clockwork_gear',
    position: { x: 0, y: 36.8, z: -356.5 },
    size: { x: 6.4, y: 0.9, z: 6.4 },
    color: '#f59e0b',
  },
  {
    id: 'z5-gear-rotor-2',
    sectionIndex: 14,
    sectionName: '14. Sky-Geyser Launch Pad',
    kind: 'rotating_bar',
    position: { x: 0, y: 37.9, z: -356.5 },
    size: { x: 1.1, y: 1.1, z: 1.1 },
    color: '#ef4444',
    rotating: {
      speedRadPerSec: -3.25,
      initialAngle: 1.2,
      barLength: 6.0,
      barRadius: 0.28,
      lethal: true,
    },
  },
  {
    id: 'z5-bounce-pad-2',
    sectionIndex: 15,
    sectionName: '15. Double Geyser Vault',
    kind: 'small_pad',
    bounceVelocity: 17.2,
    position: { x: -1.8, y: 36.5, z: -369.0 },
    size: { x: 3.6, y: 1.0, z: 3.6 },
    color: '#10b981',
    accentColor: '#fde047',
  },
  {
    id: 'z5-gear-3',
    sectionIndex: 15,
    sectionName: '15. Double Geyser Vault',
    kind: 'static_platform',
    visualPreset: 'clockwork_gear',
    position: { x: 0, y: 38.0, z: -385.5 },
    size: { x: 5.8, y: 0.9, z: 5.8 },
    color: '#d97706',
  },

  // =========================================================================
  // CHECKPOINT 5: SYLHET DIVISION (সিলেট) (z: -399, y: 38.4)
  // =========================================================================
  {
    id: 'checkpoint-5',
    sectionIndex: 15,
    sectionName: 'Checkpoint 5 — SYLHET (সিলেট)',
    kind: 'checkpoint_platform',
    position: { x: 0, y: 38.4, z: -399.0 },
    size: { x: 9.5, y: 1.6, z: 9.5 },
    color: '#006a4e',
    accentColor: '#f42a41',
    checkpointIndex: 5,
    spawnPoint: { x: 0, y: 39.8, z: -399.0 },
  },

  // =========================================================================
  // ZONE 6 (Sections 16–18): SHATTERED GLASS SKY-LABYRINTH (ভাঙা কাঁচের সেতু)
  // =========================================================================
  {
    id: 'z6-glass-left-1',
    sectionIndex: 16,
    sectionName: '16. Shattered Glass Sky-Walk',
    kind: 'disappearing_platform',
    visualPreset: 'glass_pane',
    position: { x: -2.1, y: 39.6, z: -410.5 },
    size: { x: 2.8, y: 0.5, z: 5.5 },
    color: '#38bdf8',
    disappearing: {
      solidDurationMs: 1650,
      warningDurationMs: 650,
      hiddenDurationMs: 1150,
      phaseOffsetMs: 0,
    },
  },
  {
    id: 'z6-glass-right-1',
    sectionIndex: 16,
    sectionName: '16. Shattered Glass Sky-Walk',
    kind: 'static_platform',
    visualPreset: 'glass_pane',
    position: { x: 2.1, y: 39.6, z: -410.5 },
    size: { x: 2.8, y: 0.5, z: 5.5 },
    color: '#7dd3fc',
  },
  {
    id: 'z6-glass-left-2',
    sectionIndex: 16,
    sectionName: '16. Shattered Glass Sky-Walk',
    kind: 'static_platform',
    visualPreset: 'glass_pane',
    position: { x: -2.1, y: 40.8, z: -420.0 },
    size: { x: 2.8, y: 0.5, z: 5.5 },
    color: '#7dd3fc',
  },
  {
    id: 'z6-glass-right-2',
    sectionIndex: 16,
    sectionName: '16. Shattered Glass Sky-Walk',
    kind: 'disappearing_platform',
    visualPreset: 'glass_pane',
    position: { x: 2.1, y: 40.8, z: -420.0 },
    size: { x: 2.8, y: 0.5, z: 5.5 },
    color: '#38bdf8',
    disappearing: {
      solidDurationMs: 1650,
      warningDurationMs: 650,
      hiddenDurationMs: 1150,
      phaseOffsetMs: 900,
    },
  },
  {
    id: 'z6-glass-mover',
    sectionIndex: 17,
    sectionName: '17. Sliding Crystal Chasm',
    kind: 'moving_platform',
    visualPreset: 'glass_pane',
    position: { x: 0, y: 42.2, z: -431.5 },
    size: { x: 3.2, y: 0.6, z: 4.5 },
    color: '#0ea5e9',
    moving: {
      axis: 'x',
      amplitude: 4.6,
      speed: 2.6,
      phaseOffset: 0,
    },
  },
  {
    id: 'z6-glass-narrow',
    sectionIndex: 18,
    sectionName: '18. Razor Glass Spine & Wrecking Ball',
    kind: 'narrow_bridge',
    visualPreset: 'glass_pane',
    position: { x: 0, y: 44.0, z: -449.5 },
    size: { x: 1.75, y: 0.65, z: 20.0 },
    color: '#38bdf8',
  },
  {
    id: 'z6-wrecking-1',
    sectionIndex: 18,
    sectionName: '18. Razor Glass Spine & Wrecking Ball',
    kind: 'swinging_pendulum',
    position: { x: 0, y: 44.0, z: -445.0 },
    size: { x: 1, y: 1, z: 1 },
    color: '#f43f5e',
    pendulum: {
      pivotHeight: 6.8,
      armLength: 5.1,
      maxAngleRad: 1.08,
      speed: 3.05,
      phaseOffset: 0.3,
      bobRadius: 1.0,
      lethal: true,
      style: 'wrecking_ball',
    },
  },
  {
    id: 'z6-wrecking-2',
    sectionIndex: 18,
    sectionName: '18. Razor Glass Spine & Wrecking Ball',
    kind: 'swinging_pendulum',
    position: { x: 0, y: 44.0, z: -454.0 },
    size: { x: 1, y: 1, z: 1 },
    color: '#f43f5e',
    pendulum: {
      pivotHeight: 6.8,
      armLength: 5.1,
      maxAngleRad: 1.08,
      speed: 3.05,
      phaseOffset: 2.4,
      bobRadius: 1.0,
      lethal: true,
      style: 'wrecking_ball',
    },
  },

  // =========================================================================
  // CHECKPOINT 6: RANGPUR DIVISION (রংপুর) (z: -470, y: 45.4)
  // =========================================================================
  {
    id: 'checkpoint-6',
    sectionIndex: 18,
    sectionName: 'Checkpoint 6 — RANGPUR (রংপুর)',
    kind: 'checkpoint_platform',
    position: { x: 0, y: 45.4, z: -470.0 },
    size: { x: 9.5, y: 1.6, z: 9.5 },
    color: '#006a4e',
    accentColor: '#f42a41',
    checkpointIndex: 6,
    spawnPoint: { x: 0, y: 46.8, z: -470.0 },
  },

  // =========================================================================
  // ZONE 7 (Sections 19–20): VOLCANIC METEOR ASTEROID BELT & LASER RINGS
  // =========================================================================
  {
    id: 'z7-meteor-1',
    sectionIndex: 19,
    sectionName: '19. Drifting Lava Meteoroids',
    kind: 'moving_platform',
    visualPreset: 'meteor_rock',
    position: { x: -1.6, y: 46.8, z: -481.5 },
    size: { x: 3.8, y: 1.4, z: 3.8 },
    color: '#7f1d1d',
    accentColor: '#f97316',
    moving: {
      axis: 'y',
      amplitude: 1.8,
      speed: 2.5,
      phaseOffset: 0,
    },
  },
  {
    id: 'z7-meteor-2',
    sectionIndex: 19,
    sectionName: '19. Drifting Lava Meteoroids',
    kind: 'static_platform',
    visualPreset: 'meteor_rock',
    position: { x: 0, y: 48.6, z: -492.5 },
    size: { x: 5.2, y: 1.4, z: 5.2 },
    color: '#991b1b',
  },
  {
    id: 'z7-laser-ring-1',
    sectionIndex: 19,
    sectionName: '19. Drifting Lava Meteoroids',
    kind: 'rotating_bar',
    position: { x: 0, y: 49.8, z: -492.5 },
    size: { x: 1.1, y: 1.1, z: 1.1 },
    color: '#fde047',
    rotating: {
      speedRadPerSec: 3.55,
      initialAngle: 0.2,
      barLength: 5.1,
      barRadius: 0.28,
      lethal: true,
      style: 'laser_ring',
    },
  },
  {
    id: 'z7-meteor-3',
    sectionIndex: 20,
    sectionName: '20. Supernova Asteroid Cluster',
    kind: 'static_platform',
    visualPreset: 'meteor_rock',
    position: { x: 0, y: 50.2, z: -505.5 },
    size: { x: 5.2, y: 1.4, z: 5.2 },
    color: '#7f1d1d',
  },
  {
    id: 'z7-laser-ring-2',
    sectionIndex: 20,
    sectionName: '20. Supernova Asteroid Cluster',
    kind: 'rotating_bar',
    position: { x: 0, y: 51.4, z: -505.5 },
    size: { x: 1.1, y: 1.1, z: 1.1 },
    color: '#fde047',
    rotating: {
      speedRadPerSec: -3.75,
      initialAngle: 1.7,
      barLength: 5.1,
      barRadius: 0.28,
      lethal: true,
      style: 'laser_ring',
    },
  },

  // =========================================================================
  // CHECKPOINT 7: DHAKA DIVISION (ঢাকা) (z: -520, y: 51.4)
  // =========================================================================
  {
    id: 'checkpoint-7',
    sectionIndex: 20,
    sectionName: 'Checkpoint 7 — DHAKA (ঢাকা)',
    kind: 'checkpoint_platform',
    position: { x: 0, y: 51.4, z: -520.0 },
    size: { x: 9.5, y: 1.6, z: 9.5 },
    color: '#006a4e',
    accentColor: '#f42a41',
    checkpointIndex: 7,
    spawnPoint: { x: 0, y: 52.8, z: -520.0 },
  },

  // =========================================================================
  // ZONE 8 (Section 21): BROKEN HIGHWAY OVERPASS & FINAL CYBER-CITADEL SPRINT
  // =========================================================================
  {
    id: 'z8-bounce-launch',
    sectionIndex: 21,
    sectionName: '21. Collapsed Flyover & Final Citadel',
    kind: 'small_pad',
    bounceVelocity: 16.5,
    position: { x: 0, y: 52.0, z: -531.0 },
    size: { x: 3.6, y: 1.0, z: 3.6 },
    color: '#10b981',
    accentColor: '#fde047',
  },
  {
    id: 'z8-highway-1',
    sectionIndex: 21,
    sectionName: '21. Collapsed Flyover & Final Citadel',
    kind: 'static_platform',
    visualPreset: 'broken_highway',
    visualTilt: { x: 0.04, y: -0.04, z: 0.05 },
    position: { x: 0, y: 53.4, z: -549.5 },
    size: { x: 3.6, y: 1.1, z: 18.0 },
    color: '#334155',
    accentColor: '#facc15',
  },
  {
    id: 'z8-piston-final',
    sectionIndex: 21,
    sectionName: '21. Collapsed Flyover & Final Citadel',
    kind: 'crushing_piston',
    position: { x: 0, y: 58.2, z: -545.5 },
    size: { x: 3.4, y: 1.4, z: 3.0 },
    color: '#ef4444',
    piston: {
      axis: 'y',
      strokeDistance: 3.4,
      cycleMs: 1650,
      phaseOffsetMs: 200,
      headSize: { x: 3.3, y: 1.3, z: 2.9 },
    },
  },
  {
    id: 'z8-pendulum-final',
    sectionIndex: 21,
    sectionName: '21. Collapsed Flyover & Final Citadel',
    kind: 'swinging_pendulum',
    position: { x: 0, y: 53.4, z: -554.0 },
    size: { x: 1, y: 1, z: 1 },
    color: '#f43f5e',
    pendulum: {
      pivotHeight: 6.8,
      armLength: 5.1,
      maxAngleRad: 1.1,
      speed: 3.3,
      phaseOffset: 1.4,
      bobRadius: 1.0,
      lethal: true,
      style: 'wrecking_ball',
    },
  },
  {
    id: 'z8-pad-final',
    sectionIndex: 21,
    sectionName: '21. Apex of Bengal Sprint',
    kind: 'disappearing_platform',
    visualPreset: 'broken_highway',
    position: { x: 0, y: 53.8, z: -566.5 },
    size: { x: 3.2, y: 0.9, z: 4.2 },
    color: '#eab308',
    disappearing: {
      solidDurationMs: 1750,
      warningDurationMs: 650,
      hiddenDurationMs: 950,
      phaseOffsetMs: 0,
    },
  },

  // =========================================================================
  // FINISH ISLAND: Crown of the Clouds (z: -580, y: 54.0)
  // =========================================================================
  {
    id: 'finish-island',
    sectionIndex: 21,
    sectionName: 'Crown of the Clouds (Finish)',
    kind: 'finish_island',
    position: { x: 0, y: 54.0, z: -580.0 },
    size: { x: 15.0, y: 2.2, z: 13.0 },
    color: '#006a4e',
    accentColor: '#fde047',
  },
];

export function getCheckpointPiece(checkpointIndex: number): LevelPiece {
  const found = LEVEL_PIECES.find(
    (p) =>
      (p.kind === 'checkpoint_platform' || p.kind === 'start_island') &&
      p.checkpointIndex === checkpointIndex
  );
  return found || LEVEL_PIECES[0];
}

export function getFinishPiece(): LevelPiece {
  const found = LEVEL_PIECES.find((p) => p.kind === 'finish_island');
  if (!found) {
    throw new Error('Finish island missing from LEVEL_PIECES');
  }
  return found;
}

export function getSpawnPositionForCheckpoint(checkpointIndex: number, slotIndex: number): Vec3 {
  const clampedCheckpoint = Math.max(0, Math.min(TOTAL_CHECKPOINTS, checkpointIndex));
  const piece = getCheckpointPiece(clampedCheckpoint);
  const base = piece.spawnPoint || {
    x: piece.position.x,
    y: piece.position.y + piece.size.y / 2 + 1.2,
    z: piece.position.z,
  };
  const slotOffsets = [-2.7, -0.9, 0.9, 2.7];
  const xOffset = slotOffsets[slotIndex % slotOffsets.length] ?? 0;
  return {
    x: base.x + xOffset,
    y: base.y,
    z: base.z,
  };
}

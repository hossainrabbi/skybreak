'use client';

import { PlayerState, VoiceSignalPayload } from '../shared/types';
import { getSocket } from './socketClient';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class VoiceChatManager {
  public isMicMuted = true; // Muted by default!
  public isRemoteVoiceMuted = false; // Turn off others' voice sound when true
  public mutedPeerIds: Set<string> = new Set();

  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private initializedListeners = false;
  private localSocketId = '';
  private onStateChangeCallbacks: Set<() => void> = new Set();

  public subscribe(cb: () => void): () => void {
    this.onStateChangeCallbacks.add(cb);
    return () => {
      this.onStateChangeCallbacks.delete(cb);
    };
  }

  private notify(): void {
    for (const cb of this.onStateChangeCallbacks) {
      cb();
    }
  }

  public initSocketListeners(): void {
    if (this.initializedListeners || typeof window === 'undefined') return;
    this.initializedListeners = true;

    const socket = getSocket();
    socket.on(
      'voice:signal',
      async (payload: {
        fromId: string;
        signalType: 'offer' | 'answer' | 'ice-candidate';
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      }) => {
        if (!payload || !payload.fromId) return;
        const peerId = payload.fromId;
        const pc = this.getOrCreatePeerConnection(peerId, false);

        try {
          if (payload.signalType === 'offer' && payload.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            if (this.localStream) {
              this.attachLocalTracksToPeer(pc);
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            const sig: VoiceSignalPayload = {
              targetId: peerId,
              signalType: 'answer',
              sdp: pc.localDescription,
            };
            socket.emit('voice:signal', sig);
          } else if (payload.signalType === 'answer' && payload.sdp) {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            }
          } else if (payload.signalType === 'ice-candidate' && payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        } catch {
          // Ignore transient WebRTC negotiation races
        }
      }
    );
  }

  private attachLocalTracksToPeer(pc: RTCPeerConnection): void {
    if (!this.localStream) return;
    const senders = pc.getSenders();
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.isMicMuted;
      const alreadySent = senders.some((s) => s.track === track);
      if (!alreadySent) {
        pc.addTrack(track, this.localStream);
      }
    }
  }

  private getOrCreatePeerConnection(
    peerId: string,
    isInitiator: boolean
  ): RTCPeerConnection {
    let pc = this.peers.get(peerId);
    if (pc) return pc;

    pc = new RTCPeerConnection(RTC_CONFIG);
    this.peers.set(peerId, pc);

    if (this.localStream) {
      this.attachLocalTracksToPeer(pc);
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = getSocket();
        const sig: VoiceSignalPayload = {
          targetId: peerId,
          signalType: 'ice-candidate',
          candidate: e.candidate.toJSON(),
        };
        socket.emit('voice:signal', sig);
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams && e.streams[0];
      if (!stream || typeof document === 'undefined') return;
      let audio = this.audioElements.get(peerId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        this.audioElements.set(peerId, audio);
      }
      audio.srcObject = stream;
      this.applyAudioMuteState(peerId, audio);
      audio.play().catch(() => {});
    };

    if (isInitiator) {
      this.negotiateOffer(peerId, pc);
    }

    return pc;
  }

  private async negotiateOffer(peerId: string, pc: RTCPeerConnection): Promise<void> {
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      const socket = getSocket();
      const sig: VoiceSignalPayload = {
        targetId: peerId,
        signalType: 'offer',
        sdp: pc.localDescription,
      };
      socket.emit('voice:signal', sig);
    } catch {
      // Ignore offer error
    }
  }

  private applyAudioMuteState(peerId: string, audio: HTMLAudioElement): void {
    const shouldMute = this.isRemoteVoiceMuted || this.mutedPeerIds.has(peerId);
    audio.muted = shouldMute;
    audio.volume = shouldMute ? 0 : 1.0;
  }

  private updateAllAudioElements(): void {
    for (const [peerId, audio] of this.audioElements.entries()) {
      this.applyAudioMuteState(peerId, audio);
    }
  }

  /**
   * Synchronizes WebRTC peer connections with the current players in the room.
   */
  public syncRoomPeers(players: PlayerState[], localSocketId: string): void {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) return;
    this.initSocketListeners();
    this.localSocketId = localSocketId;

    const activePeerIds = new Set<string>();
    for (const p of players) {
      if (p.id === localSocketId || !p.connected) continue;
      activePeerIds.add(p.id);
      if (!this.peers.has(p.id)) {
        const shouldInitiate = localSocketId < p.id;
        this.getOrCreatePeerConnection(p.id, shouldInitiate);
      }
    }

    // Clean up peers who left the room
    for (const [peerId, pc] of this.peers.entries()) {
      if (!activePeerIds.has(peerId)) {
        pc.close();
        this.peers.delete(peerId);
        const audio = this.audioElements.get(peerId);
        if (audio) {
          audio.pause();
          audio.srcObject = null;
          this.audioElements.delete(peerId);
        }
      }
    }
  }

  /**
   * Toggles the local player's microphone (muted by default).
   * Requests microphone permission only when the player chooses to unmute.
   */
  public async toggleMic(): Promise<{ ok: boolean; isMicMuted: boolean; error?: string }> {
    if (this.isMicMuted) {
      // Unmuting: acquire microphone if not yet acquired
      if (!this.localStream) {
        if (
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          return {
            ok: false,
            isMicMuted: true,
            error: 'Microphone is not supported or requires HTTPS / localhost.',
          };
        }
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
        } catch {
          return {
            ok: false,
            isMicMuted: true,
            error: 'Microphone permission was denied. Please allow microphone access in your browser.',
          };
        }
      }

      this.isMicMuted = false;
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = true;
      }

      // Attach audio tracks to all connected peers and renegotiate
      for (const [peerId, pc] of this.peers.entries()) {
        this.attachLocalTracksToPeer(pc);
        this.negotiateOffer(peerId, pc);
      }
    } else {
      // Muting local microphone
      this.isMicMuted = true;
      if (this.localStream) {
        for (const track of this.localStream.getAudioTracks()) {
          track.enabled = false;
        }
      }
    }

    const socket = getSocket();
    socket.emit('voice:status', { isMicMuted: this.isMicMuted });
    this.notify();
    return { ok: true, isMicMuted: this.isMicMuted };
  }

  /**
   * Toggles hearing other players' voices (Speaker Mute / Deafen for voice chat only)
   * without affecting game sound effects!
   */
  public toggleRemoteVoiceSound(): boolean {
    this.isRemoteVoiceMuted = !this.isRemoteVoiceMuted;
    this.updateAllAudioElements();
    this.notify();
    return this.isRemoteVoiceMuted;
  }

  /**
   * Toggles muting a specific player's voice in the room.
   */
  public togglePeerMute(peerId: string): boolean {
    if (this.mutedPeerIds.has(peerId)) {
      this.mutedPeerIds.delete(peerId);
    } else {
      this.mutedPeerIds.add(peerId);
    }
    this.updateAllAudioElements();
    this.notify();
    return this.mutedPeerIds.has(peerId);
  }

  public disconnectAll(): void {
    for (const pc of this.peers.values()) {
      pc.close();
    }
    this.peers.clear();
    for (const audio of this.audioElements.values()) {
      audio.pause();
      audio.srcObject = null;
    }
    this.audioElements.clear();
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
    this.isMicMuted = true;
    this.notify();
  }
}

export const voiceChat = new VoiceChatManager();

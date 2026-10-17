'use client';

import { io, Socket } from 'socket.io-client';

let sharedSocket: Socket | null = null;
let currentServerUrl = '';
let serverTimeOffsetMs = 0;

export function getOrCreatePlayerToken(): string {
  if (typeof window === 'undefined') return 'server-token';
  const key = 'skybreak_player_token_v1';
  let token = window.sessionStorage.getItem(key);
  if (!token) {
    token =
      'plr_' +
      Math.random().toString(36).slice(2, 10) +
      '_' +
      Date.now().toString(36);
    window.sessionStorage.setItem(key, token);
  }
  return token;
}

export function getSavedServerUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('skybreak_server_url') || '';
}

export function setCustomServerUrl(url: string): Socket {
  const cleaned = url.trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    if (cleaned) {
      window.localStorage.setItem('skybreak_server_url', cleaned);
    } else {
      window.localStorage.removeItem('skybreak_server_url');
    }
  }
  if (sharedSocket && currentServerUrl !== cleaned) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  currentServerUrl = cleaned;
  return getSocket();
}

export function getSocket(): Socket {
  if (!sharedSocket) {
    const targetUrl = currentServerUrl || getSavedServerUrl();
    currentServerUrl = targetUrl;

    sharedSocket = targetUrl
      ? io(targetUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 15,
          reconnectionDelay: 800,
          reconnectionDelayMax: 5000,
        })
      : io({
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 15,
          reconnectionDelay: 800,
          reconnectionDelayMax: 5000,
        });

    sharedSocket.on('connect', () => {
      syncServerClock();
    });
  }
  return sharedSocket;
}

export function syncServerClock(): void {
  if (!sharedSocket || !sharedSocket.connected) return;
  const t0 = Date.now();
  sharedSocket.emit('time:sync', {}, (res?: { serverNow?: number }) => {
    if (res && typeof res.serverNow === 'number') {
      const rtt = Date.now() - t0;
      const estimatedServerNow = res.serverNow + rtt * 0.5;
      serverTimeOffsetMs = estimatedServerNow - Date.now();
    }
  });
}

export function updateServerClockFromSnapshot(serverNow: number): void {
  if (typeof serverNow === 'number' && Number.isFinite(serverNow)) {
    serverTimeOffsetMs = serverNow - Date.now();
  }
}

export function getSynchronizedNow(): number {
  return Date.now() + serverTimeOffsetMs;
}

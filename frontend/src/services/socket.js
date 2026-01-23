// Socket.IO client service for DCPVAS
// Provides a reusable socket instance and helper subscription utilities.
// - Connects to backend Socket.IO server
// - Exposes subscribe/unsubscribe helpers for analysis events

import { io } from 'socket.io-client';

// Prefer env override; default to local dev server
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

// Single shared socket instance
const socket = io(SOCKET_URL, {
  // Allow cross-origin during development; production can tighten this
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

// Subscribe to analysis events and return an unsubscribe function.
// handlers: { onProgress?: (payload) => void, onComplete?: (payload) => void }
export function subscribeAnalysis(handlers = {}) {
  const { onProgress, onComplete } = handlers;

  if (typeof onProgress === 'function') {
    socket.on('analysis:progress', onProgress);
  }
  if (typeof onComplete === 'function') {
    socket.on('analysis:complete', onComplete);
  }

  // Return cleanup function
  return () => {
    if (typeof onProgress === 'function') {
      socket.off('analysis:progress', onProgress);
    }
    if (typeof onComplete === 'function') {
      socket.off('analysis:complete', onComplete);
    }
  };
}

export function getSocket() {
  return socket;
}

// Subscribe to build lifecycle events: build:new and build:success
// handlers: { onNew?: (payload) => void, onSuccess?: (payload) => void }
export function subscribeBuilds(handlers = {}) {
  const { onNew, onSuccess } = handlers;
  if (typeof onNew === 'function') {
    socket.on('build:new', onNew);
  }
  if (typeof onSuccess === 'function') {
    socket.on('build:success', onSuccess);
  }
  return () => {
    if (typeof onNew === 'function') socket.off('build:new', onNew);
    if (typeof onSuccess === 'function') socket.off('build:success', onSuccess);
  };
}

export default {
  getSocket,
  subscribeAnalysis,
  subscribeBuilds,
};

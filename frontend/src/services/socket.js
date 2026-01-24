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
  const { onStarted, onProgress, onCompleted, onSkipped } = handlers;

  if (typeof onStarted === 'function') socket.on('analysis:started', onStarted);
  if (typeof onProgress === 'function') socket.on('analysis:progress', onProgress);
  if (typeof onCompleted === 'function') {
    socket.on('analysis:completed', onCompleted);
    // Backward compatibility with legacy event name
    socket.on('analysis:complete', onCompleted);
  }
  if (typeof onSkipped === 'function') socket.on('analysis:skipped', onSkipped);

  // Return cleanup function
  return () => {
    if (typeof onStarted === 'function') socket.off('analysis:started', onStarted);
    if (typeof onProgress === 'function') socket.off('analysis:progress', onProgress);
    if (typeof onCompleted === 'function') {
      socket.off('analysis:completed', onCompleted);
      socket.off('analysis:complete', onCompleted);
    }
    if (typeof onSkipped === 'function') socket.off('analysis:skipped', onSkipped);
  };
}

export function getSocket() {
  return socket;
}

// Request backend to start streaming logs for a build
// No explicit request required; server pushes `build:log_update` live
export function requestLogStream(buildNumber) {}

// Subscribe to live log stream events for a specific build
// handlers: { onAppend?: (chunk) => void, onComplete?: (payload) => void }
export function subscribeLogs(buildNumber, handlers = {}) {
  const n = Number(buildNumber);
  const { onAppend, onComplete, onFinal } = handlers;
  const appendHandler = (payload) => {
    if (payload?.buildNumber !== n) return;
    if (typeof onAppend === 'function') onAppend(payload.newLogsChunk || '');
  };
  const completeHandler = (payload) => {
    if (payload?.buildNumber !== n) return;
    if (typeof onComplete === 'function') onComplete(payload);
  };
  const finalHandler = (payload) => {
    if (payload?.buildNumber !== n) return;
    if (typeof onFinal === 'function') onFinal(payload);
  };
  socket.on('build:log_update', appendHandler);
  socket.on('build:completed', completeHandler);
  socket.on('logs:complete', finalHandler);
  // Return unsubscribe function
  return () => {
    socket.off('build:log_update', appendHandler);
    socket.off('build:completed', completeHandler);
    socket.off('logs:complete', finalHandler);
  };
}

// Subscribe to build lifecycle events: build:new and build:success
// handlers: { onNew?: (payload) => void, onSuccess?: (payload) => void }
export function subscribeBuilds(handlers = {}) {
  const { onNew, onStarted, onLogUpdate, onCompleted } = handlers;
  if (typeof onNew === 'function') socket.on('build:new', onNew);
  if (typeof onStarted === 'function') socket.on('build:started', onStarted);
  if (typeof onLogUpdate === 'function') socket.on('build:log_update', onLogUpdate);
  if (typeof onCompleted === 'function') socket.on('build:completed', onCompleted);
  return () => {
    if (typeof onNew === 'function') socket.off('build:new', onNew);
    if (typeof onStarted === 'function') socket.off('build:started', onStarted);
    if (typeof onLogUpdate === 'function') socket.off('build:log_update', onLogUpdate);
    if (typeof onCompleted === 'function') socket.off('build:completed', onCompleted);
  };
}

export default {
  getSocket,
  subscribeAnalysis,
  subscribeBuilds,
  requestLogStream,
  subscribeLogs,
};

// Connection/reconnect subscription for resyncing state
export function subscribeConnection(handlers = {}) {
  const { onConnect, onReconnect, onDisconnect } = handlers;
  if (typeof onConnect === 'function') socket.on('connect', onConnect);
  if (typeof onReconnect === 'function') socket.on('reconnect', onReconnect);
  if (typeof onDisconnect === 'function') socket.on('disconnect', onDisconnect);
  return () => {
    if (typeof onConnect === 'function') socket.off('connect', onConnect);
    if (typeof onReconnect === 'function') socket.off('reconnect', onReconnect);
    if (typeof onDisconnect === 'function') socket.off('disconnect', onDisconnect);
  };
}

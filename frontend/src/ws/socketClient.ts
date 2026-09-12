// ============================================================
// RESQ — Socket.IO Real-Time Gateway Client
// ============================================================

import { io, Socket } from 'socket.io-client';

const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;
let currentScenarioId: string | null = null;

// Persistent event listener registry
const listeners = new Map<string, Set<(...args: any[]) => void>>();

const attachAllListeners = (s: Socket) => {
  listeners.forEach((callbacks, event) => {
    // Attach single multiplexer for each event
    s.off(event);
    s.on(event, (...args: any[]) => {
      callbacks.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`Error in socket listener for ${event}:`, e);
        }
      });
    });
  });
};

export const getSocket = (): Socket | null => socket;

export const connectSocket = (
  scenarioId: string,
  callbacks?: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (err: any) => void;
  }
): Socket => {
  if (socket && currentScenarioId === scenarioId && (socket.connected || socket.active)) {
    return socket;
  }

  if (socket) {
    try {
      socket.disconnect();
    } catch (_) {}
  }

  currentScenarioId = scenarioId;

  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    query: { scenario_id: scenarioId },
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    callbacks?.onConnect?.();
  });

  socket.on('disconnect', () => {
    callbacks?.onDisconnect?.();
  });

  socket.on('connect_error', (err) => {
    callbacks?.onError?.(err);
  });

  attachAllListeners(socket);

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    try {
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.close();
      }
    } catch (_) {}
    socket = null;
    currentScenarioId = null;
  }
};

export const socketClient = {
  connect: connectSocket,
  disconnect: disconnectSocket,
  getSocket,
  on: (event: string, callback: (...args: any[]) => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    const set = listeners.get(event)!;
    set.add(callback);

    if (socket) {
      attachAllListeners(socket);
    }

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        listeners.delete(event);
        socket?.off(event);
      }
    };
  },
};

export default socketClient;

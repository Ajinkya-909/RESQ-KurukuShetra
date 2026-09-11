// ============================================================
// RESQ — Socket.IO Real-Time Gateway Client
// ============================================================

import { io, Socket } from 'socket.io-client';

const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;
let currentScenarioId: string | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = (
  scenarioId: string,
  callbacks?: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (err: any) => void;
  }
): Socket => {
  if (socket && currentScenarioId === scenarioId && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  currentScenarioId = scenarioId;

  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    query: { scenario_id: scenarioId },
    reconnection: true,
    reconnectionAttempts: 10,
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

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentScenarioId = null;
  }
};

export const socketClient = {
  connect: connectSocket,
  disconnect: disconnectSocket,
  getSocket,
  on: (event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
      return () => {
        socket?.off(event, callback);
      };
    }
    return () => {};
  },
};

export default socketClient;

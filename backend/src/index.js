/**
 * index.js — Server entry point
 *
 * Responsibilities:
 *  1. Import the Express app
 *  2. Create an HTTP server from it (needed for Socket.IO)
 *  3. Initialize Socket.IO and attach it to the HTTP server
 *  4. Initialize DB connection (pg.Pool connects on first query call)
 *  5. Start listening on PORT
 *  6. Handle graceful shutdown
 */

require('dotenv').config();
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');

const app = require('./app');
const socketManager = require('./ws/socketManager');

// Connect to database via Prisma
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 3001;

// ── HTTP Server ──────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

socketManager.init(io);

// ── Start Listening ──────────────────────────────────────────
server.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database via Prisma ORM');
  } catch (err) {
    console.error('⚠️  Prisma database connection warning:', err.message);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     RESQ — Disaster Relief Gateway           ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  REST:      http://localhost:${PORT}/api         ║`);
  console.log(`║  WebSocket: ws://localhost:${PORT}               ║`);
  console.log(`║  Health:    http://localhost:${PORT}/health       ║`);
  console.log(`║  Mode:      ${(process.env.NODE_ENV || 'development').padEnd(32)} ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});

// ── Graceful Shutdown ────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('✅ HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('✅ Prisma client disconnected.');
    } catch (err) {
      console.error('Error disconnecting Prisma:', err.message);
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error('❌ Forceful shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  shutdown('uncaughtException');
});

module.exports = server;

/**
 * prisma.js — Singleton PrismaClient instance
 *
 * Re-uses the same client across hot reloads in development.
 * In production, a single global instance is created on startup.
 */

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Prevent multiple instances during nodemon hot-reload
  if (!global._prisma) {
    global._prisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  prisma = global._prisma;
}

module.exports = prisma;

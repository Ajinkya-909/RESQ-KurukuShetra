/**
 * db.js — re-exports the Prisma singleton.
 * Kept for backward compatibility with scripts that import from here.
 */
const prisma = require('./prisma');
module.exports = prisma;

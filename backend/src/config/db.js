/**
 * db.js — re-exports the Prisma singleton.
 * Kept for backward compatibility with scripts that import from here.
 */
import prisma from './prisma.js';

export { prisma };
export default prisma;

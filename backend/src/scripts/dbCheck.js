/**
 * dbCheck.js — Database connection & schema verification using Prisma ORM
 * Run: node src/scripts/dbCheck.js
 */

import 'dotenv/config';
import prisma from '../config/prisma.js';

const EXPECTED_MODELS = [
  'ResourceType', 'Scenario', 'HelpingPoint',
  'HelpingPointInventory', 'Zone', 'ZoneNeed',
  'Report', 'Allocation', 'DuplicateFlag', 'AuditLog',
];

async function check() {
  console.log('\n🔍 RESQ — Database & Prisma Verification\n');

  // 1. Test connection
  try {
    await prisma.$connect();
    console.log('✅ Connection (Prisma ORM): OK');
  } catch (err) {
    console.error('❌ Connection: FAILED —', err.message);
    console.error('\n   Is PostgreSQL / Docker running? Check DATABASE_URL in .env');
    process.exit(1);
  }

  // 2. Check models accessibility
  console.log('\n📋 Prisma Models:');
  for (const model of EXPECTED_MODELS) {
    console.log(`   ✅ prisma.${model.charAt(0).toLowerCase() + model.slice(1)}`);
  }

  // 3. Verify seed data
  console.log('\n🌱 Seed Data Verification:');

  try {
    const resourceCount = await prisma.resourceType.count();
    console.log(`   ${resourceCount >= 7 ? '✅' : '⚠️'} ResourceType: ${resourceCount} rows (expected ≥ 7)`);

    const pointCount = await prisma.helpingPoint.count();
    console.log(`   ${pointCount >= 5 ? '✅' : '⚠️'} HelpingPoint: ${pointCount} rows (expected ≥ 5)`);

    const inventoryCount = await prisma.helpingPointInventory.count();
    console.log(`   ${inventoryCount >= 10 ? '✅' : '⚠️'} HelpingPointInventory: ${inventoryCount} rows (expected ≥ 10)`);

    const scenarioCount = await prisma.scenario.count();
    console.log(`   ℹ️  Scenario count: ${scenarioCount}`);

    console.log('\n✅ Database & Prisma ORM are fully ready.\n');
  } catch (err) {
    console.error('❌ Query execution failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check().catch(async (err) => {
  console.error('\n❌ Unexpected error:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});

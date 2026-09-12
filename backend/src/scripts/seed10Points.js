/**
 * seed10Points.js — Seed 10 Grid-Wide Helping Points across Pune region
 * Run: node src/scripts/seed10Points.js
 */

import 'dotenv/config';
import prisma from '../config/prisma.js';

const initialDepots = [
  {
    name: 'NDRF Base Camp Alpha',
    type: 'govt',
    lat: 18.5350,
    lng: 73.8420,
    reliability_score: 0.95,
    arrangement_capability: 0.85,
    inventory: [
      { resource_id: 1, total_stock: 15000, available_stock: 15000, max_capacity: 20000, replenish_rate: 500 },
      { resource_id: 2, total_stock: 2000, available_stock: 2000, max_capacity: 3000, replenish_rate: 200 },
      { resource_id: 3, total_stock: 500, available_stock: 500, max_capacity: 800, replenish_rate: 30 },
      { resource_id: 4, total_stock: 12, available_stock: 12, max_capacity: 15, replenish_rate: 1 },
      { resource_id: 5, total_stock: 4, available_stock: 4, max_capacity: 6, replenish_rate: 0 },
      { resource_id: 7, total_stock: 6, available_stock: 6, max_capacity: 8, replenish_rate: 0 },
    ],
  },
  {
    name: 'Red Cross Central Relief Depot',
    type: 'ngo',
    lat: 18.5110,
    lng: 73.8710,
    reliability_score: 0.90,
    arrangement_capability: 0.60,
    inventory: [
      { resource_id: 1, total_stock: 8000, available_stock: 8000, max_capacity: 12000, replenish_rate: 300 },
      { resource_id: 2, total_stock: 5000, available_stock: 5000, max_capacity: 8000, replenish_rate: 400 },
      { resource_id: 3, total_stock: 200, available_stock: 200, max_capacity: 400, replenish_rate: 15 },
      { resource_id: 6, total_stock: 300, available_stock: 300, max_capacity: 500, replenish_rate: 10 },
    ],
  },
  {
    name: 'Municipal General Emergency Hospital',
    type: 'hospital',
    lat: 18.5280,
    lng: 73.8650,
    reliability_score: 0.92,
    arrangement_capability: 0.40,
    inventory: [
      { resource_id: 1, total_stock: 3000, available_stock: 3000, max_capacity: 5000, replenish_rate: 100 },
      { resource_id: 2, total_stock: 1000, available_stock: 1000, max_capacity: 2000, replenish_rate: 50 },
      { resource_id: 3, total_stock: 800, available_stock: 800, max_capacity: 1200, replenish_rate: 50 },
      { resource_id: 5, total_stock: 6, available_stock: 6, max_capacity: 10, replenish_rate: 0 },
    ],
  },
  {
    name: 'Army Logistics Forward Operating Base',
    type: 'military',
    lat: 18.5450,
    lng: 73.8300,
    reliability_score: 0.98,
    arrangement_capability: 0.90,
    inventory: [
      { resource_id: 1, total_stock: 20000, available_stock: 20000, max_capacity: 30000, replenish_rate: 1000 },
      { resource_id: 2, total_stock: 8000, available_stock: 8000, max_capacity: 12000, replenish_rate: 600 },
      { resource_id: 3, total_stock: 300, available_stock: 300, max_capacity: 500, replenish_rate: 20 },
      { resource_id: 4, total_stock: 8, available_stock: 8, max_capacity: 12, replenish_rate: 0 },
      { resource_id: 5, total_stock: 3, available_stock: 3, max_capacity: 5, replenish_rate: 0 },
      { resource_id: 7, total_stock: 4, available_stock: 4, max_capacity: 6, replenish_rate: 0 },
    ],
  },
  {
    name: 'Swargate Community Volunteer Center',
    type: 'private',
    lat: 18.5050,
    lng: 73.8550,
    reliability_score: 0.75,
    arrangement_capability: 0.30,
    inventory: [
      { resource_id: 1, total_stock: 3000, available_stock: 3000, max_capacity: 5000, replenish_rate: 100 },
      { resource_id: 2, total_stock: 2000, available_stock: 2000, max_capacity: 3000, replenish_rate: 150 },
      { resource_id: 6, total_stock: 100, available_stock: 100, max_capacity: 200, replenish_rate: 5 },
    ],
  },
  {
    name: 'NDRF Tactical Battalion 5',
    type: 'govt',
    lat: 18.5600,
    lng: 73.8100,
    reliability_score: 0.96,
    arrangement_capability: 0.88,
    inventory: [
      { resource_id: 1, total_stock: 12000, available_stock: 12000, max_capacity: 15000, replenish_rate: 400 },
      { resource_id: 2, total_stock: 3000, available_stock: 3000, max_capacity: 5000, replenish_rate: 250 },
      { resource_id: 3, total_stock: 400, available_stock: 400, max_capacity: 600, replenish_rate: 25 },
      { resource_id: 4, total_stock: 10, available_stock: 10, max_capacity: 12, replenish_rate: 1 },
      { resource_id: 7, total_stock: 5, available_stock: 5, max_capacity: 8, replenish_rate: 0 },
    ],
  },
  {
    name: 'Sassoon Trauma & Medical Staging',
    type: 'hospital',
    lat: 18.5250,
    lng: 73.8750,
    reliability_score: 0.94,
    arrangement_capability: 0.50,
    inventory: [
      { resource_id: 1, total_stock: 5000, available_stock: 5000, max_capacity: 8000, replenish_rate: 150 },
      { resource_id: 2, total_stock: 1500, available_stock: 1500, max_capacity: 3000, replenish_rate: 100 },
      { resource_id: 3, total_stock: 1200, available_stock: 1200, max_capacity: 1500, replenish_rate: 60 },
      { resource_id: 5, total_stock: 8, available_stock: 8, max_capacity: 12, replenish_rate: 0 },
    ],
  },
  {
    name: 'Air Force Relief Airfield Logistics',
    type: 'military',
    lat: 18.5800,
    lng: 73.9200,
    reliability_score: 0.99,
    arrangement_capability: 0.95,
    inventory: [
      { resource_id: 1, total_stock: 25000, available_stock: 25000, max_capacity: 35000, replenish_rate: 1200 },
      { resource_id: 2, total_stock: 10000, available_stock: 10000, max_capacity: 15000, replenish_rate: 800 },
      { resource_id: 3, total_stock: 600, available_stock: 600, max_capacity: 1000, replenish_rate: 40 },
      { resource_id: 6, total_stock: 500, available_stock: 500, max_capacity: 800, replenish_rate: 20 },
      { resource_id: 7, total_stock: 8, available_stock: 8, max_capacity: 10, replenish_rate: 0 },
    ],
  },
  {
    name: 'Seva Bharathi Disaster Relief Hub',
    type: 'ngo',
    lat: 18.4900,
    lng: 73.8300,
    reliability_score: 0.88,
    arrangement_capability: 0.55,
    inventory: [
      { resource_id: 1, total_stock: 6000, available_stock: 6000, max_capacity: 10000, replenish_rate: 200 },
      { resource_id: 2, total_stock: 4000, available_stock: 4000, max_capacity: 6000, replenish_rate: 300 },
      { resource_id: 3, total_stock: 150, available_stock: 150, max_capacity: 300, replenish_rate: 10 },
      { resource_id: 6, total_stock: 200, available_stock: 200, max_capacity: 400, replenish_rate: 10 },
    ],
  },
  {
    name: 'Civil Defence Rapid Command Outpost',
    type: 'private',
    lat: 18.5150,
    lng: 73.9100,
    reliability_score: 0.82,
    arrangement_capability: 0.45,
    inventory: [
      { resource_id: 1, total_stock: 7500, available_stock: 7500, max_capacity: 10000, replenish_rate: 250 },
      { resource_id: 2, total_stock: 3500, available_stock: 3500, max_capacity: 5000, replenish_rate: 200 },
      { resource_id: 3, total_stock: 250, available_stock: 250, max_capacity: 400, replenish_rate: 15 },
      { resource_id: 5, total_stock: 4, available_stock: 4, max_capacity: 6, replenish_rate: 0 },
    ],
  },
];

async function seed() {
  console.log('\n🌱 RESQ — Seeding 10 Grid-Wide Helping Points...\n');
  await prisma.$connect();

  await prisma.allocation.deleteMany({});
  await prisma.helpingPointInventory.deleteMany({});
  await prisma.helpingPoint.deleteMany({});

  const defaultResourceTypes = [
    { resource_id: 1, name: 'water', unit: 'liters' },
    { resource_id: 2, name: 'food', unit: 'packets' },
    { resource_id: 3, name: 'medical', unit: 'kits' },
    { resource_id: 4, name: 'rescue_team', unit: 'teams' },
    { resource_id: 5, name: 'ambulance', unit: 'vehicles' },
    { resource_id: 6, name: 'shelter', unit: 'tents' },
    { resource_id: 7, name: 'rescue_boat', unit: 'boats' },
  ];

  for (const rt of defaultResourceTypes) {
    await prisma.resourceType.upsert({
      where: { resource_id: rt.resource_id },
      update: { name: rt.name, unit: rt.unit },
      create: rt,
    });
  }

  for (const p of initialDepots) {
    const pt = await prisma.helpingPoint.create({
      data: {
        name: p.name,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        reliability_score: p.reliability_score,
        arrangement_capability: p.arrangement_capability,
        inventory: {
          create: p.inventory,
        },
      },
    });
    console.log(`   ✅ Seeded Depot #${pt.point_id}: ${pt.name} (${pt.type})`);
  }

  console.log('\n✅ 10 Grid-Wide Helping Points fully seeded in PostgreSQL DB.\n');
  await prisma.$disconnect();
}

seed().catch(async (e) => {
  console.error('❌ Seeding failed:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});

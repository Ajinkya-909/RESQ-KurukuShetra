import {
  Zone,
  ResourceItem,
  AllocationPlanItem,
  LiveUpdate,
  AuditEvent,
  KpiData,
  ConflictData,
  ReallocationProposal
} from '../types';

export const initialKpis: KpiData = {
  activeIncidents: 27,
  criticalZones: 3,
  peopleAffected: 1420,
  resourcesDeployedPercent: 73,
  resourcesDeployedFraction: '52 / 71 Units'
};

export const initialZones: Zone[] = [
  {
    id: 'zone-a',
    code: 'Zone A',
    name: 'Riverside',
    severity: 'CRITICAL',
    priority: 92,
    peopleAffected: 438,
    mainNeed: 'Medical / Evacuation',
    summary: 'Severe riverbank overflow resulting in localized flooding up to 1.8m. Critical evacuation needed for nursing care center and school shelter.',
    waterLevel: '+1.8m above flood crest',
    accessStatus: 'North Bridge impassable; R12 alternate open',
    evacuatedCount: 284,
    shelterCapacityUsed: 88,
    breakdown: [
      { label: 'Medical Urgency', percentage: 25 },
      { label: 'Population Density', percentage: 20 },
      { label: 'Access Degradation', percentage: 18 },
      { label: 'Infrastructure Risk', percentage: 15 },
      { label: 'Vulnerability Index', percentage: 12 },
      { label: 'Confidence Score', percentage: 8 },
      { label: 'Others', percentage: 2 }
    ],
    mapCoords: { x: 34, y: 38 },
    lat: 29.9740,
    lng: -90.0920
  },
  {
    id: 'zone-b',
    code: 'Zone B',
    name: 'Lakeview',
    severity: 'HIGH',
    priority: 78,
    peopleAffected: 320,
    mainNeed: 'Medical Support',
    summary: 'Flash surge near secondary lake perimeter. Power sub-station inundated; emergency generator dispatch requested.',
    waterLevel: '+1.1m elevated',
    accessStatus: 'Road R17 blocked due to fallen utility pole',
    evacuatedCount: 190,
    shelterCapacityUsed: 74,
    breakdown: [
      { label: 'Medical Urgency', percentage: 22 },
      { label: 'Population Density', percentage: 18 },
      { label: 'Access Degradation', percentage: 16 },
      { label: 'Water & Food Needs', percentage: 14 },
      { label: 'Infrastructure Risk', percentage: 12 },
      { label: 'Vulnerability Index', percentage: 10 },
      { label: 'Confidence Score', percentage: 8 }
    ],
    mapCoords: { x: 62, y: 32 },
    lat: 29.9880,
    lng: -90.0620
  },
  {
    id: 'zone-c',
    code: 'Zone C',
    name: 'Greenfield',
    severity: 'ELEVATED',
    priority: 64,
    peopleAffected: 590,
    mainNeed: 'Food & Water',
    summary: 'Municipal water filtration station offline due to silt sediment. Potable drinking water distribution required for 590 citizens.',
    waterLevel: '+0.6m localized ponding',
    accessStatus: 'Highways open; minor speed restrictions',
    evacuatedCount: 95,
    shelterCapacityUsed: 52,
    breakdown: [
      { label: 'Water & Food Needs', percentage: 28 },
      { label: 'Population Density', percentage: 20 },
      { label: 'Infrastructure Risk', percentage: 14 },
      { label: 'Medical Urgency', percentage: 12 },
      { label: 'Vulnerability Index', percentage: 12 },
      { label: 'Access Degradation', percentage: 10 },
      { label: 'Confidence Score', percentage: 4 }
    ],
    mapCoords: { x: 26, y: 68 },
    lat: 29.9480,
    lng: -90.0510
  },
  {
    id: 'zone-d',
    code: 'Zone D',
    name: 'Mapleton',
    severity: 'MONITOR',
    priority: 38,
    peopleAffected: 180,
    mainNeed: 'Shelter Support',
    summary: 'Lowland drainage channels operating near nominal surge capacity. Routine telemetry monitoring active.',
    waterLevel: '+0.2m steady',
    accessStatus: 'All primary and secondary arterials clear',
    evacuatedCount: 30,
    shelterCapacityUsed: 35,
    breakdown: [
      { label: 'Shelter Capacity Need', percentage: 26 },
      { label: 'Population Density', percentage: 18 },
      { label: 'Infrastructure Risk', percentage: 14 },
      { label: 'Access Degradation', percentage: 12 },
      { label: 'Vulnerability Index', percentage: 12 },
      { label: 'Water & Food Needs', percentage: 10 },
      { label: 'Confidence Score', percentage: 8 }
    ],
    mapCoords: { x: 74, y: 72 },
    lat: 29.9390,
    lng: -90.0980
  },
  {
    id: 'zone-e',
    code: 'Zone E',
    name: 'Highland Ridge',
    severity: 'MONITOR',
    priority: 24,
    peopleAffected: 95,
    mainNeed: 'Reception Staging',
    summary: 'Elevated topography operating as strategic assembly area and overflow evacuation hub. Safe from flood surge.',
    waterLevel: '0.0m normal',
    accessStatus: 'Full access via Highway 10',
    evacuatedCount: 310,
    shelterCapacityUsed: 42,
    breakdown: [
      { label: 'Shelter Capacity Need', percentage: 32 },
      { label: 'Access Degradation', percentage: 18 },
      { label: 'Water & Food Needs', percentage: 16 },
      { label: 'Population Density', percentage: 14 },
      { label: 'Vulnerability Index', percentage: 10 },
      { label: 'Infrastructure Risk', percentage: 6 },
      { label: 'Confidence Score', percentage: 4 }
    ],
    mapCoords: { x: 50, y: 15 },
    lat: 30.0050,
    lng: -90.0780
  }
];

export const initialResources: ResourceItem[] = [
  {
    id: 'res-ambulances',
    type: 'Ambulance',
    displayName: 'Ambulances',
    currentInUse: 18,
    total: 24,
    percentage: 75,
    availableLabel: '6 Available',
    deployedLabel: '18 Deployed',
    subLocation: 'Regional EMS Fleet',
    breakdown: {
      total: 24,
      available: 6,
      reserved: 2,
      committed: 12,
      inTransit: 4
    },
    units: [
      { id: 'u-a1', name: 'Ambulance A7', agency: 'Metro Health EMS', currentLocation: 'St. Jude Base', destination: 'Zone A (Riverside)', mission: 'ICU Patient Evacuation', eta: '14 min', status: 'In Transit', lastUpdated: '11:42' },
      { id: 'u-a2', name: 'Ambulance A3', agency: 'County Paramedics', currentLocation: 'Central Staging', destination: 'Zone B (Lakeview)', mission: 'Triage Trauma Standby', eta: '8 min', status: 'Committed', lastUpdated: '11:40' },
      { id: 'u-a3', name: 'Ambulance A9', agency: 'Red Cross Transport', currentLocation: 'Depot 1', destination: 'Depot 1', mission: 'Reserve Readiness', eta: '0 min', status: 'Available', lastUpdated: '11:35' },
      { id: 'u-a4', name: 'Ambulance A12', agency: 'Metro Health EMS', currentLocation: 'Zone A Hospital', destination: 'Shelter Hub 2', mission: 'Ambulatory Transfer', eta: '22 min', status: 'In Transit', lastUpdated: '11:30' }
    ]
  },
  {
    id: 'res-boats',
    type: 'Rescue Boat',
    displayName: 'Rescue Boats',
    currentInUse: 7,
    total: 10,
    percentage: 70,
    availableLabel: '3 Available',
    deployedLabel: '7 Deployed',
    subLocation: 'Maritime Swiftwater',
    breakdown: {
      total: 10,
      available: 4,
      reserved: 1,
      committed: 3,
      inTransit: 2
    },
    units: [
      { id: 'u-b1', name: 'Rescue Boat B2', agency: 'Coast Guard Auxiliary', currentLocation: 'Marina Slip 4', destination: 'Zone B (Lakeview)', mission: 'Submerged Vehicle Search', eta: '18 min', status: 'In Transit', lastUpdated: '11:41' },
      { id: 'u-b2', name: 'Zodiac Z-4', agency: 'Fire Dept SAR', currentLocation: 'North Pier', destination: 'Zone A (Riverside)', mission: 'Residential Evacuation', eta: '6 min', status: 'Committed', lastUpdated: '11:38' },
      { id: 'u-b3', name: 'Rescue Boat B5', agency: 'Fire Dept SAR', currentLocation: 'Staging Dock C', destination: 'Staging Dock C', mission: 'Standby for Dispatch', eta: '0 min', status: 'Available', lastUpdated: '11:29' }
    ]
  },
  {
    id: 'res-med-teams',
    type: 'Medical Team',
    displayName: 'Medical Teams',
    currentInUse: 12,
    total: 20,
    percentage: 60,
    availableLabel: '8 Available',
    deployedLabel: '12 Deployed',
    subLocation: 'Field Surge Units',
    breakdown: {
      total: 20,
      available: 8,
      reserved: 3,
      committed: 6,
      inTransit: 3
    },
    units: [
      { id: 'u-m1', name: 'Medical Team M1', agency: 'Disaster Medical Assistance', currentLocation: 'Central Depot', destination: 'Zone B (Lakeview)', mission: 'Advanced Triage Clinic', eta: '22 min', status: 'In Transit', lastUpdated: '11:39' },
      { id: 'u-m2', name: 'Medical Team M2', agency: 'Doctors Without Borders', currentLocation: 'Base Camp Delta', destination: 'Zone C (Greenfield)', mission: 'Pediatric & Dehydration Care', eta: '15 min', status: 'Committed', lastUpdated: '11:32' },
      { id: 'u-m3', name: 'Medical Team M4', agency: 'Reserve Corps', currentLocation: 'General Hospital', destination: 'General Hospital', mission: 'Ready for Rapid Insertion', eta: '0 min', status: 'Available', lastUpdated: '11:20' }
    ]
  },
  {
    id: 'res-shelters',
    type: 'Shelter',
    displayName: 'Shelter Capacity',
    currentInUse: 2450,
    total: 5000,
    percentage: 49,
    availableLabel: '2,550 Available',
    deployedLabel: '2,450 Occupied',
    unitLabel: 'cots',
    subLocation: '12 Active Shelters',
    breakdown: {
      total: 5000,
      available: 2550,
      reserved: 500,
      committed: 1950,
      inTransit: 0
    },
    units: [
      { id: 'u-s1', name: 'High School Gymnasium', agency: 'Dept of Social Services', currentLocation: 'Zone A Perimeter', destination: 'Zone A Perimeter', mission: 'Open Housing (420/500)', eta: 'Active', status: 'Committed', lastUpdated: '11:42' },
      { id: 'u-s2', name: 'Civic Arena Hall B', agency: 'Red Cross', currentLocation: 'Central District', destination: 'Central District', mission: 'Mass Care (1,200/2,000)', eta: 'Active', status: 'Committed', lastUpdated: '11:35' },
      { id: 'u-s3', name: 'Westside Community Ctr', agency: 'Salvation Army', currentLocation: 'Zone C North', destination: 'Zone C North', mission: 'Family Shelter (350/600)', eta: 'Active', status: 'Committed', lastUpdated: '11:30' }
    ]
  },
  {
    id: 'res-water',
    type: 'Water Supply',
    displayName: 'Water Supply',
    currentInUse: 72400,
    total: 100000,
    percentage: 72,
    availableLabel: '72,400 L Available',
    deployedLabel: '8 Tankers Deployed',
    unitLabel: 'Liters',
    subLocation: 'Potable Water Reserve',
    breakdown: {
      total: 100000,
      available: 72400,
      reserved: 12000,
      committed: 10000,
      inTransit: 5600
    },
    units: [
      { id: 'u-w1', name: 'Water Tanker W1 (10k L)', agency: 'Public Works Utility', currentLocation: 'Depot 3', destination: 'Zone C (Greenfield)', mission: 'Bulk Drinking Water Distribution', eta: '28 min', status: 'In Transit', lastUpdated: '11:40' },
      { id: 'u-w2', name: 'Purification Unit Mobile 1', agency: 'Army Corps Reserve', currentLocation: 'Depot 1', destination: 'Depot 1', mission: 'Operational Standby', eta: '0 min', status: 'Available', lastUpdated: '11:25' }
    ]
  },
  {
    id: 'res-food',
    type: 'Food Supply',
    displayName: 'Food Supplies',
    currentInUse: 56800,
    total: 80000,
    percentage: 68,
    availableLabel: '56,800 Available',
    deployedLabel: '5 Trucks Deployed',
    unitLabel: 'Kits',
    subLocation: 'Emergency Food Banks',
    breakdown: {
      total: 80000,
      available: 56800,
      reserved: 8000,
      committed: 11200,
      inTransit: 4000
    },
    units: [
      { id: 'u-f1', name: 'Food Convoy F3 (1,200 kits)', agency: 'World Central Kitchen', currentLocation: 'Depot 3', destination: 'Zone C (Greenfield)', mission: 'Hot Meals & Dry Rations', eta: '30 min', status: 'In Transit', lastUpdated: '11:39' },
      { id: 'u-f2', name: 'Direct Aid Trailer 2', agency: 'Regional Food Bank', currentLocation: 'Depot 2', destination: 'Depot 2', mission: 'Staging Pallets', eta: '0 min', status: 'Available', lastUpdated: '11:31' }
    ]
  }
];

export const initialAllocations: AllocationPlanItem[] = [
  {
    id: 'alloc-1',
    resource: 'Ambulance A7',
    resourceType: 'Ambulance',
    from: 'Depot 1',
    to: 'Zone A (Riverside)',
    purpose: 'Medical Evacuation',
    eta: '14 min',
    status: 'En Route',
    priority: 'Critical'
  },
  {
    id: 'alloc-2',
    resource: 'Rescue Boat B2',
    resourceType: 'Rescue Boat',
    from: 'Depot 2',
    to: 'Zone B (Lakeview)',
    purpose: 'Rescue Operation',
    eta: '18 min',
    status: 'Dispatched',
    priority: 'High'
  },
  {
    id: 'alloc-3',
    resource: 'Medical Team M1',
    resourceType: 'Medical Team',
    from: 'Central Depot',
    to: 'Zone B (Lakeview)',
    purpose: 'Medical Support',
    eta: '22 min',
    status: 'En Route',
    priority: 'High'
  },
  {
    id: 'alloc-4',
    resource: 'Food Truck F3',
    resourceType: 'Food Supply',
    from: 'Depot 3',
    to: 'Zone C (Greenfield)',
    purpose: 'Food & Water Supply',
    eta: '30 min',
    status: 'Scheduled',
    priority: 'Elevated'
  },
  {
    id: 'alloc-5',
    resource: 'Water Tanker W1',
    resourceType: 'Water Supply',
    from: 'Depot 3',
    to: 'Zone C (Greenfield)',
    purpose: 'Water Supply',
    eta: '28 min',
    status: 'En Route',
    priority: 'Elevated'
  }
];

export const initialLiveUpdates: LiveUpdate[] = [
  {
    id: 'upd-1',
    time: '11:42',
    title: 'Road R17 blocked',
    subtitle: 'near Zone B',
    badgeType: 'High',
    zone: 'Zone B'
  },
  {
    id: 'upd-2',
    time: '11:41',
    title: '137 new verified reports',
    subtitle: 'Riverside (Zone A)',
    badgeType: 'Critical',
    zone: 'Zone A'
  },
  {
    id: 'upd-3',
    time: '11:40',
    title: 'Ambulance A7 reassigned',
    subtitle: 'Zone C → Zone A',
    badgeType: 'Info',
    zone: 'Zone A'
  },
  {
    id: 'upd-4',
    time: '11:38',
    title: 'Medical Team M3 dispatched',
    subtitle: 'From Central Depot',
    badgeType: 'Info'
  },
  {
    id: 'upd-5',
    time: '11:35',
    title: 'Water shortage reported',
    subtitle: 'Greenfield (Zone C)',
    badgeType: 'High',
    zone: 'Zone C'
  },
  {
    id: 'upd-6',
    time: '11:32',
    title: 'Reallocation completed',
    subtitle: '2 resources moved',
    badgeType: 'Success'
  }
];

export const initialAuditLogs: AuditEvent[] = [
  {
    id: 'aud-1042',
    decisionNumber: 'DECISION #1042',
    timestamp: '11:42:20',
    title: 'Dynamic Resource Reallocation Plan v3 Approved',
    description: 'Deterministic solver prioritized Zone A Riverside due to 137 verified flood emergency reports. Reassigned Ambulance A7 from Greenfield to Riverside.',
    actor: 'Dispatcher Sarah Jenkins (EOC Lead)',
    type: 'Approval',
    zoneId: 'Zone A',
    hash: 'sha256:8f4c2e9b01da42'
  },
  {
    id: 'aud-1041',
    decisionNumber: 'DECISION #1041',
    timestamp: '11:40:15',
    title: 'Priority Recalculation Triggered',
    description: 'Incoming distress report from Riverside elevated Priority Score from 81 to 92. Safety constraints verified.',
    actor: 'RESQ Triage Engine (Automated)',
    type: 'Incident',
    zoneId: 'Zone A'
  },
  {
    id: 'aud-1040',
    decisionNumber: 'DECISION #1040',
    timestamp: '11:38:00',
    title: 'Medical Team M3 Dispatched',
    description: 'Deployed from Central Depot to staging ground with ETA of 18 minutes.',
    actor: 'Regional Health Director Dr. Martinez',
    type: 'Allocation'
  },
  {
    id: 'aud-1039',
    decisionNumber: 'DECISION #1039',
    timestamp: '11:35:10',
    title: 'Multi-Agency Mission Overlap Intercepted',
    description: 'Detected duplicate food supply dispatch between NGO Hope Aid and Red Cross for Zone C. Diverted 250 kits to Zone D to avoid 350 kit oversupply.',
    actor: 'Conflict Interceptor Module',
    type: 'Conflict',
    zoneId: 'Zone C'
  }
];

export const defaultConflictData: ConflictData = {
  agencyA: {
    name: 'Agency A (Red Cross Logistics)',
    amount: 450,
    supply: 'Food Kits',
    destination: 'Zone C (Greenfield)'
  },
  agencyB: {
    name: 'Agency B (Hope Relief NGO)',
    amount: 400,
    supply: 'Food Kits',
    destination: 'Zone C (Greenfield)'
  },
  zoneDemand: 500,
  committedTotal: 850,
  potentialExcess: 350,
  confidence: 87,
  suggestedRedirects: [
    { amount: 250, zone: 'Zone D', zoneName: 'Mapleton Sector' },
    { amount: 100, zone: 'Zone E', zoneName: 'Highland Shelter' }
  ]
};

export const defaultReallocationProposal: ReallocationProposal = {
  planVersionOld: 'Plan v3',
  planVersionNew: 'Plan v4',
  allocationsChanged: 3,
  resourcesMoved: 2,
  criticalCoverageOld: 79,
  criticalCoverageNew: 94,
  before: [
    { resource: 'Medical Team M2', destination: 'Zone B (Lakeview)' },
    { resource: 'Rescue Boat B2', destination: 'Zone C (Greenfield)' }
  ],
  after: [
    { resource: 'Medical Team M2', destination: 'Zone D (Mapleton Flooding)' },
    { resource: 'Rescue Boat B2', destination: 'Zone D (Mapleton Flooding)' }
  ],
  rationale: {
    priorityChange: 'Zone D priority increased from 38 → 92 due to sudden school shelter breach.',
    evidence: [
      '30 people trapped in flooded gymnasium',
      '8 injured requiring urgent clinical stabilization',
      'Road access rapidly deteriorating from southern approach'
    ],
    protection: 'Protected coverage guarantee: Zone B & C maintained above minimum 70% emergency baseline.'
  }
};

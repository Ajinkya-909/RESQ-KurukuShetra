import React, { createContext, useContext, useState } from 'react';
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
import {
  initialKpis,
  initialZones,
  initialResources,
  initialAllocations,
  initialLiveUpdates,
  initialAuditLogs,
  defaultConflictData,
  defaultReallocationProposal
} from '../data/mockData';

interface AppContextType {
  // Navigation & Filters
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  selectedZoneFilter: string;
  setSelectedZoneFilter: (filter: string) => void;
  activeResourceFilter: 'all' | 'available' | 'deployed' | 'maintenance';
  setActiveResourceFilter: (filter: 'all' | 'available' | 'deployed' | 'maintenance') => void;

  // State Data
  kpiData: KpiData;
  zones: Zone[];
  resources: ResourceItem[];
  allocations: AllocationPlanItem[];
  liveUpdates: LiveUpdate[];
  auditLogs: AuditEvent[];
  conflictData: ConflictData;
  reallocationProposal: ReallocationProposal;
  planVersion: string;

  // Simulation flags
  emergencySimulated: boolean;
  reallocationApproved: boolean;
  conflictResolved: boolean;

  // Modals & Drawers
  isReallocationModalOpen: boolean;
  openReallocationModal: () => void;
  closeReallocationModal: () => void;

  isConflictModalOpen: boolean;
  openConflictModal: () => void;
  closeConflictModal: () => void;

  isNewEmergencyModalOpen: boolean;
  openNewEmergencyModal: () => void;
  closeNewEmergencyModal: () => void;

  isResourceDrawerOpen: boolean;
  selectedResource: ResourceItem | null;
  openResourceDrawer: (resource: ResourceItem) => void;
  closeResourceDrawer: () => void;

  isZoneModalOpen: boolean;
  selectedZone: Zone | null;
  openZoneDetail: (zoneOrCode: Zone | string) => void;
  closeZoneDetail: () => void;

  isAuditModalOpen: boolean;
  openAuditModal: () => void;
  closeAuditModal: () => void;

  // Simulation Actions
  executeEmergencySimulation: () => void;
  approveReallocation: () => void;
  approveConflictRedirect: () => void;
  resetSimulation: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeNavTab, setActiveNavTab] = useState<string>('Dashboard');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('All Zones');
  const [activeResourceFilter, setActiveResourceFilter] = useState<'all' | 'available' | 'deployed' | 'maintenance'>('all');

  const [kpiData, setKpiData] = useState<KpiData>(initialKpis);
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [resources, setResources] = useState<ResourceItem[]>(initialResources);
  const [allocations, setAllocations] = useState<AllocationPlanItem[]>(initialAllocations);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>(initialLiveUpdates);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(initialAuditLogs);
  const [conflictData, setConflictData] = useState<ConflictData>(defaultConflictData);
  const [reallocationProposal, setReallocationProposal] = useState<ReallocationProposal>(defaultReallocationProposal);
  const [planVersion, setPlanVersion] = useState<string>('Plan v3');

  const [emergencySimulated, setEmergencySimulated] = useState(false);
  const [reallocationApproved, setReallocationApproved] = useState(false);
  const [conflictResolved, setConflictResolved] = useState(false);

  // Modal Open States
  const [isReallocationModalOpen, setIsReallocationModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isNewEmergencyModalOpen, setIsNewEmergencyModalOpen] = useState(false);
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const openReallocationModal = () => setIsReallocationModalOpen(true);
  const closeReallocationModal = () => setIsReallocationModalOpen(false);

  const openConflictModal = () => setIsConflictModalOpen(true);
  const closeConflictModal = () => setIsConflictModalOpen(false);

  const openNewEmergencyModal = () => setIsNewEmergencyModalOpen(true);
  const closeNewEmergencyModal = () => setIsNewEmergencyModalOpen(false);

  const openResourceDrawer = (resource: ResourceItem) => {
    setSelectedResource(resource);
    setIsResourceDrawerOpen(true);
  };
  const closeResourceDrawer = () => {
    setIsResourceDrawerOpen(false);
    setSelectedResource(null);
  };

  const openZoneDetail = (zoneOrCode: Zone | string) => {
    if (typeof zoneOrCode === 'string') {
      const found = zones.find(z => z.code.toLowerCase() === zoneOrCode.toLowerCase() || z.name.toLowerCase() === zoneOrCode.toLowerCase());
      if (found) {
        setSelectedZone(found);
        setIsZoneModalOpen(true);
      }
    } else {
      setSelectedZone(zoneOrCode);
      setIsZoneModalOpen(true);
    }
  };
  const closeZoneDetail = () => {
    setIsZoneModalOpen(false);
    setSelectedZone(null);
  };

  const openAuditModal = () => setIsAuditModalOpen(true);
  const closeAuditModal = () => setIsAuditModalOpen(false);

  // Simulation 1: Inject New Emergency in Zone D
  const executeEmergencySimulation = () => {
    setEmergencySimulated(true);

    // Update Zone D
    setZones(prev =>
      prev.map(z => {
        if (z.code === 'Zone D') {
          return {
            ...z,
            severity: 'CRITICAL',
            priority: 92,
            peopleAffected: 210,
            mainNeed: 'Swiftwater Rescue / Medical',
            summary: 'School shelter flooded. 30 citizens trapped in gymnasium, 8 injured, access cut off.',
            waterLevel: '+2.4m rapid surge',
            accessStatus: 'Southern approach flooded; boat access mandatory',
            breakdown: [
              { label: 'Medical Urgency', percentage: 28 },
              { label: 'Access Degradation', percentage: 24 },
              { label: 'Population Density', percentage: 18 },
              { label: 'Infrastructure Risk', percentage: 14 },
              { label: 'Vulnerability Index', percentage: 10 },
              { label: 'Confidence Score', percentage: 6 }
            ]
          };
        }
        return z;
      })
    );

    // Update KPIs
    setKpiData(prev => ({
      ...prev,
      activeIncidents: 28,
      criticalZones: 4,
      peopleAffected: 1630
    }));

    // Add Live Update
    const newUpdate: LiveUpdate = {
      id: `upd-${Date.now()}`,
      time: '11:43',
      title: 'School shelter in Mapleton flooded',
      subtitle: '30 trapped, 8 injured (Zone D)',
      badgeType: 'Critical',
      zone: 'Zone D'
    };
    setLiveUpdates(prev => [newUpdate, ...prev]);

    // Add Audit Log
    const newAudit: AuditEvent = {
      id: `aud-${Date.now()}`,
      decisionNumber: 'DECISION #1043',
      timestamp: '11:43:02',
      title: 'Emergency Surge Ingestion & Priority Recalculation',
      description: 'Incoming field report for Mapleton school shelter flooding. Zone D priority recomputed: 38 → 92. Immediate reallocation recommended.',
      actor: 'RESQ Triage Engine (Automated)',
      type: 'Incident',
      zoneId: 'Zone D',
      hash: 'sha256:4a79c1d02e88b5'
    };
    setAuditLogs(prev => [newAudit, ...prev]);
  };

  // Simulation 2: Approve Reallocation Plan v4
  const approveReallocation = () => {
    setReallocationApproved(true);
    setPlanVersion('Plan v4');

    // Update allocations
    setAllocations([
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
        id: 'alloc-re-1',
        resource: 'Medical Team M2',
        resourceType: 'Medical Team',
        from: 'Central Depot',
        to: 'Zone D (Mapleton Flooding)',
        purpose: 'Emergency Field Trauma Care',
        eta: '12 min',
        status: 'Dispatched',
        priority: 'Critical'
      },
      {
        id: 'alloc-re-2',
        resource: 'Rescue Boat B2',
        resourceType: 'Rescue Boat',
        from: 'Marina Slip 4',
        to: 'Zone D (Mapleton Flooding)',
        purpose: 'Swiftwater Gymnasium Evacuation',
        eta: '15 min',
        status: 'Dispatched',
        priority: 'Critical'
      },
      {
        id: 'alloc-2',
        resource: 'Food Truck F3',
        resourceType: 'Food Supply',
        from: 'Depot 3',
        to: 'Zone C (Greenfield)',
        purpose: 'Food & Water Supply',
        eta: '25 min',
        status: 'En Route',
        priority: 'Elevated'
      },
      {
        id: 'alloc-3',
        resource: 'Water Tanker W1',
        resourceType: 'Water Supply',
        from: 'Depot 3',
        to: 'Zone C (Greenfield)',
        purpose: 'Water Supply',
        eta: '28 min',
        status: 'En Route',
        priority: 'Elevated'
      }
    ]);

    // Live update
    const newUpdate: LiveUpdate = {
      id: `upd-${Date.now()}`,
      time: '11:44',
      title: 'Reallocation Plan v4 Approved & Live',
      subtitle: '2 resources moved to Mapleton (Zone D)',
      badgeType: 'Success',
      zone: 'Zone D'
    };
    setLiveUpdates(prev => [newUpdate, ...prev]);

    // Audit log
    const newAudit: AuditEvent = {
      id: `aud-${Date.now()}`,
      decisionNumber: 'DECISION #1044',
      timestamp: '11:44:18',
      title: 'Human Approval: Plan v4 Deployed',
      description: 'Human Incident Commander authorized dynamic reallocation. Medical Team M2 and Rescue Boat B2 reassigned to Zone D. Critical coverage jumped to 94%.',
      actor: 'Dispatcher Sarah Jenkins (EOC Lead)',
      type: 'Approval',
      zoneId: 'Zone D',
      hash: 'sha256:91b2df7e80a312'
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    closeReallocationModal();
  };

  // Simulation 3: Mission Conflict Resolution
  const approveConflictRedirect = () => {
    setConflictResolved(true);

    // Update resources: Food Supplies redirected
    setResources(prev =>
      prev.map(r => {
        if (r.type === 'Food Supply') {
          return {
            ...r,
            breakdown: {
              ...r.breakdown,
              committed: 500, // Reduced from 850
              inTransit: r.breakdown.inTransit + 350
            }
          };
        }
        return r;
      })
    );

    // Live update
    const newUpdate: LiveUpdate = {
      id: `upd-${Date.now()}`,
      time: '11:45',
      title: 'Mission Overlap Resolved: Convoys Redirected',
      subtitle: '250 kits to Zone D, 100 to Zone E',
      badgeType: 'Info'
    };
    setLiveUpdates(prev => [newUpdate, ...prev]);

    // Audit log
    const newAudit: AuditEvent = {
      id: `aud-${Date.now()}`,
      decisionNumber: 'DECISION #1045',
      timestamp: '11:45:30',
      title: 'Cross-Agency Deduplication & Redirect Executed',
      description: 'Approved redirect of 350 redundant food kits from Greenfield (Zone C) to Mapleton (Zone D: 250) and Highland (Zone E: 100). Prevented local inventory bottleneck.',
      actor: 'Logistics Liaison Mark Vance',
      type: 'Conflict',
      zoneId: 'Zone C',
      hash: 'sha256:3c19e58b92ef84'
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    closeConflictModal();
  };

  const resetSimulation = () => {
    setKpiData(initialKpis);
    setZones(initialZones);
    setResources(initialResources);
    setAllocations(initialAllocations);
    setLiveUpdates(initialLiveUpdates);
    setAuditLogs(initialAuditLogs);
    setPlanVersion('Plan v3');
    setEmergencySimulated(false);
    setReallocationApproved(false);
    setConflictResolved(false);
  };

  return (
    <AppContext.Provider
      value={{
        activeNavTab,
        setActiveNavTab,
        selectedZoneFilter,
        setSelectedZoneFilter,
        activeResourceFilter,
        setActiveResourceFilter,
        kpiData,
        zones,
        resources,
        allocations,
        liveUpdates,
        auditLogs,
        conflictData,
        reallocationProposal,
        planVersion,
        emergencySimulated,
        reallocationApproved,
        conflictResolved,
        isReallocationModalOpen,
        openReallocationModal,
        closeReallocationModal,
        isConflictModalOpen,
        openConflictModal,
        closeConflictModal,
        isNewEmergencyModalOpen,
        openNewEmergencyModal,
        closeNewEmergencyModal,
        isResourceDrawerOpen,
        selectedResource,
        openResourceDrawer,
        closeResourceDrawer,
        isZoneModalOpen,
        selectedZone,
        openZoneDetail,
        closeZoneDetail,
        isAuditModalOpen,
        openAuditModal,
        closeAuditModal,
        executeEmergencySimulation,
        approveReallocation,
        approveConflictRedirect,
        resetSimulation
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

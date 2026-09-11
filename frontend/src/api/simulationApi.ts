import api from './client';

export const simulationApi = {
  start: (scenarioId: string, zones?: any[]) =>
    api.post<{ scenario_id: string; status: string; zones_created: number; message: string }>(
      `/scenarios/${scenarioId}/simulation/start`,
      { zones }
    ),
  tick: (scenarioId: string, advanceHours: number = 1) =>
    api.post<{ scenario_id: string; sim_time: string; events: string[]; new_allocations: number }>(
      `/scenarios/${scenarioId}/simulation/tick`,
      { advance_hours: advanceHours }
    ),
  pause: (scenarioId: string) =>
    api.post<{ scenario_id: string; status: string }>(`/scenarios/${scenarioId}/simulation/pause`),
  resume: (scenarioId: string) =>
    api.post<{ scenario_id: string; status: string }>(`/scenarios/${scenarioId}/simulation/resume`),
};

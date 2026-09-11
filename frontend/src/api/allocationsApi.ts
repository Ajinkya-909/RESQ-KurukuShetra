import api from './client';
import { Allocation } from '../types';

export const allocationsApi = {
  list: (scenarioId: string, query?: { status?: string; zone_id?: number; point_id?: number }) =>
    api.get<Allocation[]>(`/scenarios/${scenarioId}/allocations`, query),
  approve: (scenarioId: string, allocationIds: number[]) =>
    api.post<{ approved: number[]; status: string }>(`/scenarios/${scenarioId}/allocations/approve`, {
      allocation_ids: allocationIds,
    }),
  reject: (scenarioId: string, allocationIds: number[], reason?: string) =>
    api.post<{ rejected: number[]; status: string }>(`/scenarios/${scenarioId}/allocations/reject`, {
      allocation_ids: allocationIds,
      reason,
    }),
  dispatch: (scenarioId: string, allocationIds: number[]) =>
    api.post<{ dispatched: number[]; status: string }>(`/scenarios/${scenarioId}/allocations/dispatch`, {
      allocation_ids: allocationIds,
    }),
  deliver: (scenarioId: string, allocationIds: number[]) =>
    api.post<{ delivered: number[]; status: string }>(`/scenarios/${scenarioId}/allocations/deliver`, {
      allocation_ids: allocationIds,
    }),
};

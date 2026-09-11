import api from './client';
import { HelpingPoint, ResourceType } from '../types';

export const helpingPointsApi = {
  list: () => api.get<HelpingPoint[]>('/helping-points'),
  getResourceTypes: () => api.get<ResourceType[]>('/helping-points/resources/types'),
  getById: (id: number) => api.get<HelpingPoint>(`/helping-points/${id}`),
  create: (data: {
    name: string;
    type: 'ngo' | 'govt' | 'private' | 'hospital' | 'military';
    lat: number;
    lng: number;
    reliability_score?: number;
    arrangement_capability?: number;
    inventory?: Array<{
      resource_id: number;
      total_stock: number;
      max_capacity?: number;
      replenish_rate?: number;
    }>;
  }) => api.post<HelpingPoint>('/helping-points', data),
  update: (
    id: number,
    data: Partial<{
      name: string;
      status: string;
      reliability_score: number;
      arrangement_capability: number;
    }>
  ) => api.patch<HelpingPoint>(`/helping-points/${id}`, data),
  updateInventory: (
    id: number,
    updates: Array<{
      resource_id: number;
      total_stock?: number;
      available_stock?: number;
      reserved_stock?: number;
      in_transit?: number;
      max_capacity?: number;
      replenish_rate?: number;
    }>
  ) => api.patch<any>(`/helping-points/${id}/inventory`, { updates }),
};

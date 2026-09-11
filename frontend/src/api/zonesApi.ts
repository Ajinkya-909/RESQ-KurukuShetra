import api from './client';
import { Zone } from '../types';

export const zonesApi = {
  list: (scenarioId: string) => api.get<Zone[]>(`/scenarios/${scenarioId}/zones`),
  getById: (scenarioId: string, zoneId: number) => api.get<Zone>(`/scenarios/${scenarioId}/zones/${zoneId}`),
  create: (
    scenarioId: string,
    data: {
      name: string;
      center_lat: number;
      center_lng: number;
      radius_m: number;
      disaster_type?: string;
      severity_level?: 'low' | 'moderate' | 'high' | 'critical';
      severity_score?: number;
      population_estimate?: number;
    }
  ) => api.post<Zone>(`/scenarios/${scenarioId}/zones`, data),
  update: (
    scenarioId: string,
    zoneId: number,
    data: Partial<{
      name: string;
      severity_level: 'low' | 'moderate' | 'high' | 'critical';
      severity_score: number;
      status: string;
      population_estimate: number;
    }>
  ) => api.patch<Zone>(`/scenarios/${scenarioId}/zones/${zoneId}`, data),
  delete: (scenarioId: string, zoneId: number) =>
    api.delete<{ message: string }>(`/scenarios/${scenarioId}/zones/${zoneId}`),
};

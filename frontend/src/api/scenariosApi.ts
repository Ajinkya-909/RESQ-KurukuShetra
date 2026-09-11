import api from './client';
import { Scenario } from '../types';

export const scenariosApi = {
  list: () => api.get<Scenario[]>('/scenarios'),
  getById: (id: string) => api.get<Scenario>(`/scenarios/${id}`),
  create: (data: { name: string; description?: string; disaster_type?: string }) =>
    api.post<Scenario>('/scenarios', data),
  update: (id: string, data: Partial<Scenario>) => api.patch<Scenario>(`/scenarios/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/scenarios/${id}`),
};

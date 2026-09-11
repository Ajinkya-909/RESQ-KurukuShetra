import api from './client';
import { Report } from '../types';

export const reportsApi = {
  list: (scenarioId: string, query?: { status?: string; zone_id?: number }) =>
    api.get<Report[]>(`/scenarios/${scenarioId}/reports`, query),
  getById: (scenarioId: string, reportId: number) =>
    api.get<Report>(`/scenarios/${scenarioId}/reports/${reportId}`),
  submit: (
    scenarioId: string,
    data: {
      lat: number;
      lng: number;
      raw_text: string;
      source?: string;
    }
  ) => api.post<Report & { processing_status: string }>(`/scenarios/${scenarioId}/reports`, data),
};

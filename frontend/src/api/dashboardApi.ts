import api from './client';
import { DashboardData } from '../types';

export const dashboardApi = {
  getDashboard: (scenarioId: string) => api.get<DashboardData>(`/scenarios/${scenarioId}/dashboard`),
};

import api from './client';
import { AuditLogResponse } from '../types';

export const auditLogApi = {
  list: (scenarioId: string, query?: { limit?: number; offset?: number }) =>
    api.get<AuditLogResponse>(`/scenarios/${scenarioId}/audit-log`, query),
};

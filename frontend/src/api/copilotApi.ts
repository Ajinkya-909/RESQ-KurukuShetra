import client from './client';
import { CopilotState, CopilotIncident, GeminiAiBrief } from '../types';

export const copilotApi = {
  getCopilotState: async (scenarioId: string): Promise<CopilotState> => {
    const { data } = await client.get<CopilotState>(`/scenarios/${scenarioId}/copilot`);
    return data;
  },

  analyzeIncident: async (scenarioId: string, incident: CopilotIncident): Promise<GeminiAiBrief> => {
    const { data } = await client.post<GeminiAiBrief>(`/scenarios/${scenarioId}/copilot/analyze`, { incident });
    return data;
  },
};

export default copilotApi;

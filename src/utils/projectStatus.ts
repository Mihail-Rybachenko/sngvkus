import api from '@/services/api';
import type { ProjectStatus } from '@/types';

export async function fetchProjectStatus(projectId: string): Promise<ProjectStatus | null> {
  try {
    const { data } = await api.get<{ status?: ProjectStatus }>(`/projects/${projectId}`);
    return (data?.status as ProjectStatus) || null;
  } catch {
    try {
      const { data } = await api.get<Array<{ id: string | number; status?: ProjectStatus }>>('/projects');
      const found = (data || []).find((p) => String(p.id) === String(projectId));
      return (found?.status as ProjectStatus) || null;
    } catch {
      return null;
    }
  }
}

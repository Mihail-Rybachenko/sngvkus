import type { Project } from '@/types';
import { demoProjects } from '@/utils/demoData';

/** Сохранённые в localStorage проекты + демо-шаблоны без дублей по id. */
export function getMergedDemoProjects(): Project[] {
  let saved: Project[] = [];
  try {
    const raw = localStorage.getItem('projects');
    if (raw) saved = JSON.parse(raw) as Project[];
  } catch {
    saved = [];
  }
  if (!Array.isArray(saved)) saved = [];
  const merged = [...saved];
  for (const d of demoProjects) {
    if (!merged.some((p) => String(p.id) === String(d.id))) merged.push(d);
  }
  return merged;
}

export function findMergedDemoProject(projectId: string | null | undefined): Project | undefined {
  if (!projectId) return undefined;
  return getMergedDemoProjects().find((p) => String(p.id) === String(projectId));
}

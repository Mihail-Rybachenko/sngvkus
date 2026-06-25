import { httpError } from './errors.js';

export async function getProjectForAccess(pool, projectId) {
  const [[p]] = await pool.query(
    'SELECT id, status, student_id, expert_id, coordinator_id FROM projects WHERE id = :projectId',
    { projectId }
  );
  return p || null;
}

export function assertProjectAccess({ auth, project, write = false }) {
  if (!project) throw httpError(404, 'Project not found');
  const role = auth?.role;
  const userId = Number(auth?.userId);
  if (!Number.isFinite(userId)) throw httpError(401, 'Unauthorized');

  const canRead =
    role === 'coordinator' ||
    (role === 'student' && project.student_id === userId) ||
    role === 'expert';
  if (!canRead) throw httpError(403, 'Forbidden');

  if (write) {
    const canWrite =
      role === 'coordinator' ||
      (role === 'student' && project.student_id === userId) ||
      role === 'expert';
    if (!canWrite) throw httpError(403, 'Forbidden');
  }
}


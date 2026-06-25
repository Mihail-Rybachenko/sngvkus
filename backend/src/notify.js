import { httpError } from './errors.js';

/**
 * Create notification rows for one or many users.
 * @param {import('mysql2/promise').Pool} pool
 * @param {{userIds:number[], projectId:number, type:string, message:string}} input
 */
export async function createNotifications(pool, { userIds, projectId, type, message }) {
  const ids = (userIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x));
  if (!ids.length) return;
  if (!projectId || !Number.isFinite(Number(projectId))) throw httpError(500, 'Invalid projectId for notification');
  if (!type || !message) return;

  for (const userId of ids) {
    await pool.query(
      'INSERT INTO notifications (user_id, project_id, type, message) VALUES (:user_id,:project_id,:type,:message)',
      { user_id: userId, project_id: projectId, type, message }
    );
  }
}

export async function getProjectStakeholders(pool, projectId) {
  const [[row]] = await pool.query(
    'SELECT student_id, expert_id, coordinator_id FROM projects WHERE id=:projectId',
    { projectId }
  );
  if (!row) return { studentId: null, expertId: null, coordinatorId: null };
  return {
    studentId: row.student_id ?? null,
    expertId: row.expert_id ?? null,
    coordinatorId: row.coordinator_id ?? null,
  };
}

/** Все пользователи с ролью expert (диетологи) — для уведомлений о новых проектах и т.п. */
export async function getAllExpertUserIds(pool) {
  const [rows] = await pool.query('SELECT id FROM users WHERE role = :role', { role: 'expert' });
  return rows.map((r) => r.id).filter((id) => Number.isFinite(Number(id)));
}


import mysql from 'mysql2/promise';

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function createPool() {
  return mysql.createPool({
    host: requiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_NAME'),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
    namedPlaceholders: true,
    charset: 'utf8mb4',
  });
}

export async function pingDb(pool) {
  await pool.query('SELECT 1');
}


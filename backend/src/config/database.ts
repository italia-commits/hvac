import { Pool, PoolConfig } from 'pg';
import { env } from './env';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const config: PoolConfig = {
      connectionString: env.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    if (env.databaseSsl) {
      config.ssl = { rejectUnauthorized: false };
    }

    if (env.nodeEnv === 'production') {
      config.max = 50;
    }

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err.message);
    });

    // Log pool creation
    console.log(`Database pool created (max: ${config.max} connections)`);
  }

  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount };
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  callback: (queryFn: typeof query) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const txQuery = async <U = Record<string, unknown>>(
      text: string,
      params?: unknown[]
    ) => {
      const result = await client.query(text, params);
      return { rows: result.rows as U[], rowCount: result.rowCount };
    };
    const result = await callback(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connected successfully at:', result.rows[0]?.now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', (error as Error).message);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('Database pool closed');
  }
}
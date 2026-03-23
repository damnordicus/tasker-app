import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getDb() {
	if (!_db) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		_db = drizzle(postgres(env.DATABASE_URL), { schema });
	}
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
	get(_, prop) {
		return getDb()[prop as keyof ReturnType<typeof getDb>];
	}
});

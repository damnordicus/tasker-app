import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { task } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { importTasksFromEmail } from '$lib/server/email';

export const load: PageServerLoad = async () => {
	const tasks = await db.select().from(task).orderBy(desc(task.createdAt));
	return { tasks };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const description = String(data.get('description') ?? '').trim() || null;
		const priority = parseInt(String(data.get('priority') ?? '1'));

		if (!title) return fail(400, { createError: 'Title is required' });

		await db.insert(task).values({ title, description, priority });
		return { created: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(String(data.get('id')));
		const title = String(data.get('title') ?? '').trim();
		const description = String(data.get('description') ?? '').trim() || null;
		const priority = parseInt(String(data.get('priority') ?? '1'));

		if (!title) return fail(400, { updateError: 'Title is required' });

		await db.update(task).set({ title, description, priority }).where(eq(task.id, id));
		return { updated: true };
	},

	toggle: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(String(data.get('id')));
		const completed = data.get('completed') === 'true';

		await db.update(task).set({ completed: !completed }).where(eq(task.id, id));
		return { toggled: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = parseInt(String(data.get('id')));

		await db.delete(task).where(eq(task.id, id));
		return { deleted: true };
	},

	importEmail: async () => {
		const result = await importTasksFromEmail();
		if (result.error) {
			return fail(500, { importError: result.error });
		}
		return { importResult: { imported: result.imported, skipped: result.skipped } };
	}
};

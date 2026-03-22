import { pgTable, serial, integer, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	description: text('description'),
	completed: boolean('completed').notNull().default(false),
	priority: integer('priority').notNull().default(1),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	source: text('source').notNull().default('manual'),
	emailMessageId: text('email_message_id').unique()
});

import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import { db } from '$lib/server/db/index';
import { task } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export async function importTasksFromEmail(): Promise<{
	imported: number;
	skipped: number;
	error?: string;
}> {
	const {
		IMAP_HOST,
		IMAP_PORT,
		IMAP_USER,
		IMAP_PASS,
		IMAP_PROCESSED_FOLDER,
		IMAP_TARGET_ADDRESS
	} = env;

	if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) {
		return {
			imported: 0,
			skipped: 0,
			error: 'IMAP not configured. Set IMAP_HOST, IMAP_USER, and IMAP_PASS in your .env file.'
		};
	}

	const port = parseInt(IMAP_PORT ?? '993');
	const processedFolder = IMAP_PROCESSED_FOLDER ?? 'Processed';
	const targetAddress = IMAP_TARGET_ADDRESS ?? 'phoenix+additiveTasks@travisspark.com';

	const client = new ImapFlow({
		host: IMAP_HOST,
		port,
		secure: port === 993,
		auth: { user: IMAP_USER, pass: IMAP_PASS },
		logger: false
	});

	let imported = 0;
	let skipped = 0;
	const uidsToMove: number[] = [];

	try {
		await client.connect();

		// Ensure processed folder exists (no-op if already present)
		await client.mailboxCreate(processedFolder);

		const lock = await client.getMailboxLock('INBOX');
		try {
			const searchResult = await client.search({ to: targetAddress }, { uid: true });
			console.log(searchResult)
			const uids = Array.isArray(searchResult) ? searchResult : [];

			if (uids.length > 0) {
				for await (const msg of client.fetch(
					uids,
					{ envelope: true, source: true },
					{ uid: true }
				)) {
					const messageId = msg.envelope?.messageId ?? null;

					if (messageId) {
						const existing = await db
							.select({ id: task.id })
							.from(task)
							.where(eq(task.emailMessageId, messageId))
							.limit(1);

						if (existing.length > 0) {
							uidsToMove.push(msg.uid);
							skipped++;
							continue;
						}
					}

					if (!msg.source) continue;
					const parsed = (await simpleParser(msg.source)) as ParsedMail;
					const title = (parsed.subject ?? 'Email Task').slice(0, 500).trim();
					const body = (parsed.text ?? '').trim() || null;

					await db.insert(task).values({
						title,
						description: body,
						source: 'email',
						emailMessageId: messageId
					});

					uidsToMove.push(msg.uid);
					imported++;
				}
			}

			if (uidsToMove.length > 0) {
				await client.messageMove(uidsToMove, processedFolder, { uid: true });
			}
		} finally {
			lock.release();
		}

		await client.logout();
		return { imported, skipped };
	} catch (err) {
		try {
			await client.logout();
		} catch {
			// ignore logout errors
		}
		return { imported, skipped, error: String(err) };
	}
}

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Task = (typeof data.tasks)[number];
	type Filter = 'all' | 'active' | 'done';

	let filter = $state<Filter>('active');
	let editingId = $state<number | null>(null);
	let showAdd = $state(false);
	let importing = $state(false);
	let importMessage = $state('');

	let editTitle = $state('');
	let editDesc = $state('');
	let editPriority = $state('1');

	const PAGE_SIZE = 10;
	let page = $state(0);

	let filtered = $derived(
		filter === 'all'
			? data.tasks
			: filter === 'active'
				? data.tasks.filter((t: Task) => !t.completed)
				: data.tasks.filter((t: Task) => t.completed)
	);

	let totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	let paginated = $derived(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));

	let counts = $derived({
		all: data.tasks.length,
		active: data.tasks.filter((t: Task) => !t.completed).length,
		done: data.tasks.filter((t: Task) => t.completed).length
	});

	// Reset to first page when filter or task list changes
	$effect(() => {
		filter;
		data.tasks;
		page = 0;
	});

	function startEdit(t: Task) {
		editingId = t.id;
		editTitle = t.title;
		editDesc = t.description ?? '';
		editPriority = String(t.priority);
	}

	$effect(() => {
		if (importMessage) {
			const timer = setTimeout(() => {
				importMessage = '';
			}, 6000);
			return () => clearTimeout(timer);
		}
	});

	$effect(() => {
		if (form?.importResult) {
			const { imported, skipped } = form.importResult as { imported: number; skipped: number };
			importMessage =
				imported > 0
					? `Imported ${imported} task${imported !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} already imported` : ''}.`
					: `No new tasks${skipped > 0 ? ` (${skipped} already imported)` : ''}.`;
		}
		if (form?.importError) {
			importMessage = `Error: ${form.importError}`;
		}
		if (form?.created) showAdd = false;
		if (form?.updated) editingId = null;
	});

	const PRIORITY_LABEL: Record<string, string> = { '1': 'Low', '2': 'Med', '3': 'High' };
	const PRIORITY_COLOR: Record<string, string> = {
		'1': 'bg-zinc-900/30 text-zinc-400 border border-zinc-600/60',
		'2': 'bg-amber-900/30 text-amber-500 border border-amber-600/40',
		'3': 'bg-red-900/30 text-red-600 border border-red-600/40'
	};

	// Konami code easter egg
	const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight'];
	let konamiProgress = $state(0);
	let konamiActive = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		// Don't fire when typing in inputs
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
		if (e.key === KONAMI[konamiProgress]) {
			konamiProgress++;
			if (konamiProgress === KONAMI.length) {
				konamiProgress = 0;
				konamiActive = true;
			}
		} else {
			konamiProgress = e.key === KONAMI[0] ? 1 : 0;
		}
	}
</script>

<svelte:head>
	<title>Phoenix Spark - Additive Tasker</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if konamiActive}
	<!-- Konami Easter Egg Overlay -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
		onclick={() => { konamiActive = false; }}
	>
		<div class="relative mx-4 max-w-sm rounded-2xl border border-orange-500/40 bg-zinc-900 p-8 text-center shadow-2xl shadow-orange-500/10">
			<div class="mb-4 text-5xl"><img src="https://cataas.com/cat"/></div>
			<h2 class="mb-1 text-2xl font-bold text-orange-500">Konami Code!</h2>
			<p class="mb-1 text-sm text-zinc-400">↑ ↑ ↓ ↓ ← → ← →</p>
			<p class="mt-4 text-base font-medium text-white">+30 Tasks Granted</p>
			<p class="mt-1 text-xs text-zinc-500">...just kidding. Good luck out there.</p>
			<button
				onclick={() => { konamiActive = false; }}
				class="mt-6 rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
			>
				Back to work
			</button>
		</div>
	</div>
{/if}

<div class="min-h-screen pb-1 bg-zinc-700">
	<!-- Sticky header + tabs -->
	<div class="sticky top-0 z-20">
	<!-- Header -->
	<header class="bg-zinc-900 px-4 py-4 shadow-lg">
		<div class="mx-auto flex max-w-lg items-center justify-between">
			<h1 class="text-xl font-bold tracking-tight text-white">Additive Tasker</h1>
			<div class="flex items-center gap-2">
				<form
					method="post"
					action="?/importEmail"
					use:enhance={() => {
						importing = true;
						return async ({ update }) => {
							await update();
							importing = false;
						};
					}}
				>
					<button
						type="submit"
						disabled={importing}
						class="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
					>
						{#if importing}
							<span
								class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
							></span>
						{:else}
							<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
						{/if}
						Import Email
					</button>
				</form>

				<button
					onclick={() => {
						showAdd = !showAdd;
					}}
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white transition-colors hover:bg-orange-600"
					aria-label="Add task"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2.5"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</button>
			</div>
		</div>
	</header>

	<!-- Filter Tabs (sticky under header) -->
	<div class="bg-zinc-700/5 px-4 pb-3 pt-3 shadow-sm backdrop-blur-sm">
		<div class="mx-auto max-w-lg">
			<div class="flex gap-1 rounded-xl border border-zinc-600 bg-zinc-900/80 p-1">
				<button
					onclick={() => { filter = 'all'; }}
					class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors {filter === 'all' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}"
				>All <span class="ml-1 text-xs opacity-60">({counts.all})</span></button>
				<button
					onclick={() => { filter = 'active'; }}
					class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors {filter === 'active' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}"
				>Active <span class="ml-1 text-xs opacity-60">({counts.active})</span></button>
				<button
					onclick={() => { filter = 'done'; }}
					class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors {filter === 'done' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}"
				>Done <span class="ml-1 text-xs opacity-60">({counts.done})</span></button>
			</div>
		</div>
	</div>
	</div><!-- end sticky wrapper -->

	<div class="mx-auto max-w-lg px-4">
		<!-- Import message -->
		{#if importMessage}
			<div
				class="mt-3 rounded-lg border px-4 py-2.5 text-sm {importMessage.startsWith('Error')
					? 'border-red-200 bg-red-50 text-red-700'
					: 'border-orange-200 bg-orange-50 text-orange-800'}"
			>
				{importMessage}
			</div>
		{/if}

		<!-- Add Task Form -->
		{#if showAdd}
			<div class="mt-3 rounded-xl border border-zinc-600 bg-zinc-800 p-4 shadow-sm">
				<h2 class="mb-3 text-sm font-semibold text-white">New Task</h2>
				<form method="post" action="?/create" use:enhance>
					<input
						name="title"
						type="text"
						placeholder="Task title"
						required
						autofocus
						class="mb-2 w-full rounded-lg bg-zinc-700 border-zinc-600 text-sm text-white focus:border-orange-500 focus:ring-orange-500"
					/>
					<textarea
						name="description"
						placeholder="Description (optional)"
						rows="2"
						class="mb-2 w-full resize-none rounded-lg bg-zinc-700 border-zinc-600 text-sm text-white focus:border-orange-500 focus:ring-orange-500"
					></textarea>
					<div class="flex items-center gap-2">
						<select
							name="priority"
							class="rounded-lg border-zinc-600 bg-zinc-700 text-sm text-white focus:border-orange-500 focus:ring-orange-500"
						>
							<option value="1">Low priority</option>
							<option value="2">Medium priority</option>
							<option value="3">High priority</option>
						</select>
						<div class="ml-auto flex gap-2">
							<button
								type="button"
								onclick={() => {
									showAdd = false;
								}}
								class="rounded-lg px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
							>
								Add Task
							</button>
						</div>
					</div>
					{#if form?.createError}
						<p class="mt-2 text-xs text-red-600">{form.createError}</p>
					{/if}
				</form>
			</div>
		{/if}

		<!-- Task List -->
		<ul class="mt-3 space-y-2">
			{#each paginated as t (t.id)}
				<li class="overflow-hidden rounded-xl border border-zinc-600 bg-zinc-800 shadow-sm">
					{#if editingId === t.id}
						<!-- Edit Form -->
						<form
							method="post"
							action="?/update"
							class="p-4"
							use:enhance={() =>
								async ({ update }) => {
									await update();
								}}
						>
							<input type="hidden" name="id" value={t.id} />
							<input
								name="title"
								type="text"
								bind:value={editTitle}
								required
								class="mb-2 w-full rounded-lg border-zinc-200 text-sm focus:border-orange-500 focus:ring-orange-500"
							/>
							<textarea
								name="description"
								bind:value={editDesc}
								placeholder="Description (optional)"
								rows="2"
								class="mb-2 w-full resize-none rounded-lg border-zinc-200 text-sm focus:border-orange-500 focus:ring-orange-500"
							></textarea>
							<div class="flex items-center gap-2">
								<select
									name="priority"
									bind:value={editPriority}
									class="rounded-lg border-zinc-200 text-sm focus:border-orange-500 focus:ring-orange-500"
								>
									<option value="1">Low</option>
									<option value="2">Medium</option>
									<option value="3">High</option>
								</select>
								<div class="ml-auto flex gap-2">
									<button
										type="button"
										onclick={() => {
											editingId = null;
										}}
										class="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100"
									>
										Cancel
									</button>
									<button
										type="submit"
										class="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
									>
										Save
									</button>
								</div>
							</div>
						</form>
					{:else}
						<!-- Task View -->
						<div class="flex items-start gap-3 p-3.5">
							<!-- Toggle Complete -->
							<form method="post" action="?/toggle" use:enhance>
								<input type="hidden" name="id" value={t.id} />
								<input type="hidden" name="completed" value={String(t.completed)} />
								<button
									type="submit"
									class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors {t.completed
										? 'border-orange-500 bg-orange-500 text-white'
										: 'border-zinc-600 hover:border-orange-400'}"
									aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}
								>
									{#if t.completed}
										<svg
											class="h-3.5 w-3.5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="3"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									{/if}
								</button>
							</form>

							<!-- Content -->
							<div class="min-w-0 flex-1">
								<p
									class="text-sm font-medium [overflow-wrap:break-word] {t.completed
										? 'text-zinc-400 line-through'
										: 'text-white'}"
								>
									{t.title}
								</p>
								{#if t.description}
									<p class="mt-0.5 text-xs text-white/50 [overflow-wrap:break-word]">{t.description}</p>
								{/if}
								<div class="mt-1.5 flex items-center gap-1.5">
									<span
										class="rounded px-1.5 py-0.5 text-xs {PRIORITY_COLOR[
											String(t.priority)
										] ?? PRIORITY_COLOR['1']}"
									>
										{PRIORITY_LABEL[String(t.priority)] ?? 'Low'}
									</span>
									{#if t.source === 'email'}
										<span class="rounded bg-sky-900 px-1.5 py-0.5 text-xs text-sky-500 border border-sky-500/40">
											Email
										</span>
									{/if}
								</div>
							</div>

							<!-- Actions -->
							<div class="flex shrink-0 items-center gap-1">
								<button
									onclick={() => startEdit(t)}
									class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-orange-50 hover:text-orange-500"
									aria-label="Edit task"
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									</svg>
								</button>
								<form method="post" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={t.id} />
									<button
										type="submit"
										class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
										aria-label="Delete task"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</form>
							</div>
						</div>
					{/if}
				</li>
			{:else}
				<li class="py-12 text-center text-sm text-zinc-400">
					{#if filter === 'active'}
						No active tasks — add one or import from email!
					{:else if filter === 'done'}
						No completed tasks yet.
					{:else}
						No tasks yet. Hit + to add one!
					{/if}
				</li>
			{/each}
		</ul>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="mb-8 mt-3 flex items-center justify-between rounded-xl border border-zinc-600 bg-zinc-900 px-3 py-2">
				<button
					onclick={() => { page = Math.max(0, page - 1); }}
					disabled={page === 0}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
					aria-label="Previous page"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>

				<div class="flex items-center gap-1.5">
					{#each Array.from({ length: totalPages }, (_, i) => i) as i}
						<button
							onclick={() => { page = i; }}
							class="h-7 min-w-7 rounded-md px-1.5 text-xs font-medium transition-colors {page === i ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'}"
						>{i + 1}</button>
					{/each}
				</div>

				<button
					onclick={() => { page = Math.min(totalPages - 1, page + 1); }}
					disabled={page === totalPages - 1}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
					aria-label="Next page"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>
		{:else}
			<div class="mb-8"></div>
		{/if}
	</div>
</div>

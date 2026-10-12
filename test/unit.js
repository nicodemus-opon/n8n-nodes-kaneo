// Mocked unit tests: no API key or server required. Exercises URL building,
// parameter mapping, and validation by stubbing ctx.helpers.
// Run: node ./test/unit.js
const assert = require('assert');
const path = require('path');

const NODE = path.join(__dirname, '..', 'dist', 'nodes', 'Kaneo', 'Kaneo.node.js');
const GF = path.join(__dirname, '..', 'dist', 'nodes', 'Kaneo', 'GenericFunctions.js');
const SM = path.join(__dirname, '..', 'dist', 'nodes', 'Kaneo', 'SearchMethods.js');

function loadNode() {
	delete require.cache[require.resolve(NODE)];
	return require(NODE).Kaneo;
}

function mockRun(NodeClass, { params, calls, httpImpl, items }) {
	const node = new NodeClass();
	const ctx = {
		getInputData: () => items || [{ json: {} }],
		getNodeParameter: (name, _idx, fallback) => (name in params ? params[name] : fallback),
		getCredentials: async () => ({ apiKey: 'test-key', baseUrl: 'https://cloud.kaneo.app' }),
		getNode: () => ({ name: 'unit-test' }),
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (_cred, options) => {
				calls.push({ method: options.method, url: options.url, qs: options.qs, body: options.body, headers: options.headers });
				if (httpImpl) return httpImpl(options, calls.length);
				return { ok: true };
			},
			httpRequest: async (options) => {
				calls.push({ method: options.method, url: options.url });
				if (httpImpl) return httpImpl(options, calls.length);
				return { isCloud: true };
			},
		},
	};
	return node.execute.call(ctx);
}

(async () => {
	const gf = require(GF);

	// --- GenericFunctions ---
	assert.strictEqual(gf.normalizeBaseUrl('https://cloud.kaneo.app///'), 'https://cloud.kaneo.app');
	assert.strictEqual(gf.normalizeBaseUrl('https://kaneo.example.com/api'), 'https://kaneo.example.com');
	assert.strictEqual(gf.normalizeBaseUrl('https://kaneo.example.com/api/'), 'https://kaneo.example.com');
	assert.strictEqual(
		gf.buildApiUrl('https://kaneo.example.com/api/', '/project'),
		'https://kaneo.example.com/api/project',
	);
	assert.strictEqual(
		gf.buildApiUrl('https://cloud.kaneo.app/', '/project'),
		'https://cloud.kaneo.app/api/project',
	);
	assert.strictEqual(
		gf.buildApiUrl('http://localhost:3000', 'task/assigned'),
		'http://localhost:3000/api/task/assigned',
	);
	assert.deepStrictEqual(gf.splitIds('a, b,,c '), ['a', 'b', 'c']);
	assert.deepStrictEqual(gf.toItems([{ a: 1 }, { b: 2 }]).length, 2);
	assert.deepStrictEqual(gf.toItems('').length, 1);
	console.log('PASS GenericFunctions helpers');

	try {
		gf.parseJsonParam('{nope', 'Tasks (JSON)', { name: 't' });
		throw new Error('expected throw');
	} catch (e) {
		assert.ok(/valid JSON/.test(e.message), 'invalid JSON error message');
	}
	console.log('PASS parseJsonParam validation');

	const NodeClass = loadNode();

	// --- Project list: workspaceId + includeArchived mapping ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'project', operation: 'list', workspaceId: 'w1', includeArchived: true },
			calls,
			httpImpl: () => [{ id: 'p1' }],
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/project');
		assert.deepStrictEqual(calls[0].qs, { workspaceId: 'w1', includeArchived: 'true' });
		assert.ok(/^Bearer /.test(calls[0].headers.Authorization), 'bearer auth header');
		console.log('PASS project list mapping');
	}

	// --- Project create body ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'project', operation: 'create', name: 'N', createWorkspaceId: 'w1', icon: '🚀', slug: 'KAN' },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { name: 'N', workspaceId: 'w1', icon: '🚀', slug: 'KAN' });
		console.log('PASS project create mapping');
	}

	// --- Project reorder sends qs + body ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'project', operation: 'reorder', workspaceId: 'w1', projectsOrder: JSON.stringify([{ id: 'p1', position: 0 }]) },
			calls,
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/project/reorder');
		assert.deepStrictEqual(calls[0].qs, { workspaceId: 'w1' });
		assert.deepStrictEqual(calls[0].body, { projects: [{ id: 'p1', position: 0 }] });
		console.log('PASS project reorder mapping');
	}

	// --- Task list (board) filters ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'task', operation: 'list', projectId: 'p1', listFilters: { status: 'todo', limit: 25, sortBy: 'dueDate', sortOrder: 'asc' } },
			calls,
			httpImpl: () => ({ data: {}, pagination: {} }),
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/task/tasks/p1');
		assert.deepStrictEqual(calls[0].qs, { status: 'todo', limit: 25, sortBy: 'dueDate', sortOrder: 'asc' });
		console.log('PASS task list mapping');
	}

	// --- Task create: description '' preserved (required), empty optionals dropped ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'task', operation: 'create', projectId: 'p1', title: 'T', status: 'todo', priority: 'high', description: '', createFields: {} },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { title: 'T', description: '', priority: 'high', status: 'todo' });
		console.log('PASS task create mapping');
	}

	// --- Task getByTicket scope mapping ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'task', operation: 'getByTicket', ticketId: 'KAN-12', ticketScope: { workspaceId: 'w1' } },
			calls,
		});
		assert.ok(calls[0].url.endsWith('/task/by-ticket-id/KAN-12'));
		assert.deepStrictEqual(calls[0].qs, { workspaceId: 'w1' });
		console.log('PASS task getByTicket mapping');
	}

	// --- setAssignee empty -> null (unassign) ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'task', operation: 'setAssignee', taskId: 't1', newAssigneeId: '' },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { userId: null });
		console.log('PASS task setAssignee null mapping');
	}

	// --- setDueDate: spec types dueDate as string (not nullable), so empty omits it ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'task', operation: 'setDueDate', taskId: 't1', newDueDate: '' },
			calls,
		});
		assert.strictEqual(calls[0].body, undefined, 'empty due date sends no body (clear via bulk update)');
		console.log('PASS task setDueDate omit mapping');
	}
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'task', operation: 'setDueDate', taskId: 't1', newDueDate: '2026-02-01T00:00:00Z' },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { dueDate: '2026-02-01T00:00:00Z' });
		console.log('PASS task setDueDate value mapping');
	}

	// --- Task bulk: empty ids rejected before HTTP ---
	{
		const calls = [];
		try {
			await mockRun(NodeClass, {
				params: { resource: 'task', operation: 'bulkUpdate', bulkTaskIds: '', bulkOperation: 'delete', bulkValue: '' },
				calls,
			});
			throw new Error('expected throw');
		} catch (e) {
			assert.ok(/at least one task ID/.test(e.message));
			assert.strictEqual(calls.length, 0);
		}
		console.log('PASS task bulk guard');
	}

	// --- Task import: empty array rejected ---
	{
		const calls = [];
		try {
			await mockRun(NodeClass, {
				params: { resource: 'task', operation: 'import', projectId: 'p1', importTasks: '[]' },
				calls,
			});
			throw new Error('expected throw');
		} catch (e) {
			assert.ok(/non-empty array/.test(e.message));
			assert.strictEqual(calls.length, 0);
		}
		console.log('PASS task import guard');
	}

	// --- Column update with no fields rejected ---
	{
		const calls = [];
		try {
			await mockRun(NodeClass, {
				params: { resource: 'column', operation: 'update', columnId: 'c1', updateFields: {} },
				calls,
			});
			throw new Error('expected throw');
		} catch (e) {
			assert.ok(/at least one field/.test(e.message));
			assert.strictEqual(calls.length, 0);
		}
		console.log('PASS column update guard');
	}

	// --- Label update requires both name and color per spec ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'label', operation: 'update', labelId: 'l1', updateName: 'Bug', updateColor: '#ff0000' },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { name: 'Bug', color: '#ff0000' });
		console.log('PASS label update mapping');
	}

	// --- Label attach ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'label', operation: 'attach', labelId: 'l1', taskId: 't1' },
			calls,
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/label/l1/task');
		assert.deepStrictEqual(calls[0].body, { taskId: 't1' });
		console.log('PASS label attach mapping');
	}

	// --- Comment create ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'comment', operation: 'create', taskId: 't1', content: 'hello' },
			calls,
		});
		assert.ok(calls[0].url.endsWith('/comment/t1'));
		assert.deepStrictEqual(calls[0].body, { content: 'hello' });
		console.log('PASS comment create mapping');
	}

	// --- Activity task feed always sends limit ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'activity', operation: 'getTask', taskId: 't1', limit: 50 },
			calls,
		});
		assert.deepStrictEqual(calls[0].qs, { limit: 50 });
		console.log('PASS activity limit mapping');
	}

	// --- Activity createEvent: empty message -> null (meaning is in eventData) ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'activity', operation: 'createEvent', taskId: 't1', eventType: 'status_changed', message: '', eventData: '{}' },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { taskId: 't1', message: null, type: 'status_changed', eventData: {} });
		console.log('PASS activity createEvent mapping');
	}

	// --- Time entry create drops empty endTime ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'timeEntry', operation: 'create', taskId: 't1', startTime: '2026-01-31T09:00:00Z', timeFields: { description: 'work' } },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { taskId: 't1', startTime: '2026-01-31T09:00:00Z', description: 'work' });
		console.log('PASS time entry mapping');
	}

	// --- Search global mapping ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'search', operation: 'global', query: 'kan', workspaceId: 'w1', searchFilters: { type: 'tasks', limit: 10 } },
			calls,
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/search');
		assert.deepStrictEqual(calls[0].qs, { q: 'kan', type: 'tasks', workspaceId: 'w1', limit: 10 });
		console.log('PASS search mapping');
	}

	// --- Assigned countOnly ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'search', operation: 'assigned', workspaceId: 'w1', countOnly: true },
			calls,
		});
		assert.deepStrictEqual(calls[0].qs, { workspaceId: 'w1', countOnly: 'true' });
		console.log('PASS assigned countOnly mapping');
	}

	// --- Custom field setValue ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'customField', operation: 'setValue', taskId: 't1', fieldId: 'f1', value: 'v' },
			calls,
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/custom-field/value');
		assert.deepStrictEqual(calls[0].body, { taskId: 't1', fieldId: 'f1', value: 'v' });
		console.log('PASS custom field mapping');
	}

	// --- Task relation create ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'taskRelation', operation: 'create', sourceTaskId: 't1', targetTaskId: 't2', relationType: 'blocks' },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { sourceTaskId: 't1', targetTaskId: 't2', relationType: 'blocks' });
		console.log('PASS task relation mapping');
	}

	// --- User getCurrent ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'user', operation: 'getCurrent' },
			calls,
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/user/me');
		console.log('PASS user mapping');
	}

	// --- Notification create without a related entity sends no resource type ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'notification', operation: 'create', type: 'info', createFields: { title: 'Hi' } },
			calls,
		});
		assert.deepStrictEqual(calls[0].body, { type: 'info', title: 'Hi' });
		console.log('PASS notification create mapping');
	}

	// --- Notification markAllRead with workspace filter ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'notification', operation: 'markAllRead', workspaceId: 'w1' },
			calls,
		});
		assert.ok(calls[0].url.endsWith('/notification/read-all'));
		assert.deepStrictEqual(calls[0].qs, { workspaceId: 'w1' });
		console.log('PASS notification mapping');
	}

	// --- Project getPublicBoard uses the public route with board filters ---
	{
		const calls = [];
		const publicCalls = [];
		const node = new (loadNode())();
		const ctx = {
			getInputData: () => [{ json: {} }],
			getNodeParameter: (name, _idx, fallback) => ({
				resource: 'project', operation: 'getPublic', projectId: 'p1', boardFilters: { status: 'todo', limit: 50 },
			}[name] ?? fallback),
			getCredentials: async () => ({ apiKey: 'test-key', baseUrl: 'https://cloud.kaneo.app' }),
			getNode: () => ({ name: 'unit-test' }),
			continueOnFail: () => false,
			helpers: {
				httpRequestWithAuthentication: async () => { throw new Error('public route must not use auth'); },
				httpRequest: async (options) => {
					publicCalls.push({ method: options.method, url: options.url, qs: options.qs });
					return { id: 'p1' };
				},
			},
		};
		await node.execute.call(ctx);
		assert.strictEqual(publicCalls[0].url, 'https://cloud.kaneo.app/api/public-project/p1');
		assert.deepStrictEqual(publicCalls[0].qs, { status: 'todo', limit: 50 });
		console.log('PASS project getPublic mapping');
	}

	// --- System config uses public httpRequest (no auth) ---
	{
		const calls = [];
		const [rows] = await mockRun(NodeClass, {
			params: { resource: 'system', operation: 'getConfig' },
			calls,
			httpImpl: () => ({ isCloud: true }),
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/config');
		assert.strictEqual(rows[0].json.isCloud, true);
		console.log('PASS system public URL');
	}

	// --- extractId: resource-locator objects and plain strings ---
	{
		const sm = require(SM);
		assert.strictEqual(sm.extractId('w1'), 'w1');
		assert.strictEqual(sm.extractId({ mode: 'list', value: 'w1' }), 'w1');
		assert.strictEqual(sm.extractId({ mode: 'id', value: 'p9' }), 'p9');
		assert.strictEqual(sm.extractId(undefined), '');
		assert.strictEqual(sm.extractId({ mode: 'list', value: '' }), '');
		console.log('PASS extractId unwrapping');
	}

	// --- Project list accepts a resource-locator workspace ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'project', operation: 'list', workspaceId: { mode: 'list', value: 'w1' }, includeArchived: false },
			calls,
			httpImpl: () => [{ id: 'p1' }],
		});
		assert.deepStrictEqual(calls[0].qs, { workspaceId: 'w1' });
		console.log('PASS project list RLC mapping');
	}

	// --- Task list accepts a resource-locator project ---
	{
		const calls = [];
		await mockRun(NodeClass, {
			params: { resource: 'task', operation: 'list', projectId: { mode: 'list', value: 'p1' }, listFilters: {} },
			calls,
			httpImpl: () => [],
		});
		assert.strictEqual(calls[0].url, 'https://cloud.kaneo.app/api/task/tasks/p1');
		console.log('PASS task list RLC mapping');
	}

	// --- listSearch: workspaces map + filter ---
	{
		const node = new (loadNode())();
		const fakeThis = {
			getCredentials: async () => ({ apiKey: 'k', baseUrl: 'https://cloud.kaneo.app' }),
			getCurrentNodeParameter: () => { throw new Error('no param'); },
			helpers: {
				httpRequest: async (options) => {
					assert.strictEqual(options.url, 'https://cloud.kaneo.app/api/workspace');
					return [{ id: 'w1', name: 'Acme', slug: 'acme' }, { id: 'w2', name: 'Beta', slug: 'beta' }];
				},
			},
		};
		const all = await node.methods.listSearch.searchWorkspaces.call(fakeThis, '');
		assert.strictEqual(all.results.length, 2);
		assert.deepStrictEqual(all.results[0], { name: 'Acme', value: 'w1', description: 'acme' });
		const filtered = await node.methods.listSearch.searchWorkspaces.call(fakeThis, 'beta');
		assert.strictEqual(filtered.results.length, 1);
		assert.strictEqual(filtered.results[0].value, 'w2');
		console.log('PASS listSearch workspaces');
	}

	// --- listSearch: projects scoped to the selected workspace ---
	{
		const node = new (loadNode())();
		const seen = [];
		const fakeThis = {
			getCredentials: async () => ({ apiKey: 'k', baseUrl: 'https://cloud.kaneo.app' }),
			getCurrentNodeParameter: (name) => {
				if (name === 'workspaceId') return { mode: 'list', value: 'w1' };
				throw new Error('no param ' + name);
			},
			helpers: {
				httpRequest: async (options) => {
					seen.push(options.url);
					return [{ id: 'p1', name: 'Website', slug: 'WEB' }];
				},
			},
		};
		const res = await node.methods.listSearch.searchProjects.call(fakeThis, '');
		assert.strictEqual(seen.length, 1);
		assert.strictEqual(res.results[0].value, 'p1');
		console.log('PASS listSearch projects scoped');
	}

	// --- listSearch: failures fall back to empty results (By ID still works) ---
	{
		const node = new (loadNode())();
		const fakeThis = {
			getCredentials: async () => { throw new Error('no creds'); },
			getCurrentNodeParameter: () => '',
			helpers: { httpRequest: async () => { throw new Error('down'); } },
		};
		const res = await node.methods.listSearch.searchWorkspaces.call(fakeThis, '');
		assert.deepStrictEqual(res, { results: [] });
		console.log('PASS listSearch failure fallback');
	}

	console.log('\nAll unit tests passed.');
})().catch((e) => {
	console.error('FAIL:', e);
	process.exit(1);
});

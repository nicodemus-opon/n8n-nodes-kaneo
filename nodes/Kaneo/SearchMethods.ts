import type {
	IDataObject,
	IDisplayOptions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeProperties,
} from 'n8n-workflow';

import { buildApiUrl } from './GenericFunctions';

/**
 * Unwrap a node parameter that may be a plain string (typed input, existing
 * workflows, unit tests) or a resource-locator object `{ mode, value }`.
 * Always returns the raw ID string (or '' when unset).
 */
export function extractId(value: unknown): string {
	if (value === undefined || value === null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'object') {
		const inner = (value as { value?: unknown }).value;
		if (inner === undefined || inner === null) return '';
		return typeof inner === 'string' ? inner : String(inner);
	}
	return String(value);
}

/** Read the current value of another parameter from a list-search context. */
function currentId(context: ILoadOptionsFunctions, name: string): string {
	try {
		return extractId(context.getCurrentNodeParameter(name));
	} catch {
		return '';
	}
}

type WorkspaceShape = { id?: unknown; name?: unknown; slug?: unknown };
type ProjectShape = { id?: unknown; name?: unknown; slug?: unknown };

function asArray(value: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
	if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		for (const key of ['workspaces', 'projects', 'data', 'items', 'results']) {
			if (Array.isArray(obj[key])) return obj[key] as Array<Record<string, unknown>>;
		}
	}
	return [];
}

function matches(haystack: string, filter?: string): boolean {
	if (!filter) return true;
	return haystack.toLowerCase().includes(filter.toLowerCase());
}

async function authedGet(
	context: ILoadOptionsFunctions,
	path: string,
	qs?: IDataObject,
): Promise<unknown> {
	const credentials = (await context.getCredentials('kaneoApi')) as unknown as {
		apiKey?: string;
		baseUrl?: string;
	};
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: buildApiUrl(credentials?.baseUrl || 'https://cloud.kaneo.app', path),
		headers: credentials?.apiKey ? { Authorization: `Bearer ${credentials.apiKey}` } : {},
		qs,
		json: true,
	};
	return context.helpers.httpRequest(options);
}

/** Search workspaces for the "From List" resource-locator mode. */
export async function searchWorkspaces(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const response = await authedGet(this, '/workspace');
		const results: INodeListSearchItems[] = [];
		for (const w of asArray(response) as WorkspaceShape[]) {
			const value = String(w.id ?? '');
			if (!value) continue;
			const name = String(w.name ?? w.slug ?? value);
			if (!matches(`${name} ${String(w.slug ?? '')} ${value}`, filter)) continue;
			results.push({ name, value, description: w.slug ? String(w.slug) : undefined });
			if (results.length >= 100) break;
		}
		return { results };
	} catch {
		// Pickers must fail silently so users can always fall back to "By ID".
		return { results: [] };
	}
}

/** Search projects, scoped to the selected workspace when one is available. */
export async function searchProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const scopedWorkspace = currentId(this, 'workspaceId');
		const workspaces: Array<{ id: string; name: string }> = scopedWorkspace
			? [{ id: scopedWorkspace, name: '' }]
			: asArray(await authedGet(this, '/workspace'))
					.map((w: WorkspaceShape) => ({ id: String(w.id ?? ''), name: String(w.name ?? '') }))
					.filter((w) => w.id)
					.slice(0, 20);

		const perWorkspace = await Promise.all(
			workspaces.map(async (ws): Promise<INodeListSearchItems[]> => {
				try {
					const projects = asArray(await authedGet(this, '/project', { workspaceId: ws.id }));
					const items: INodeListSearchItems[] = [];
					for (const p of projects as ProjectShape[]) {
						const value = String(p.id ?? '');
						if (!value) continue;
						const name = String(p.name ?? p.slug ?? value);
						if (!matches(`${name} ${String(p.slug ?? '')} ${value}`, filter)) continue;
						items.push({
							name,
							value,
							description: ws.name || (p.slug ? String(p.slug) : undefined),
						});
					}
					return items;
				} catch {
					return [];
				}
			}),
		);

		const results = perWorkspace.flat().slice(0, 100);
		return { results };
	} catch {
		return { results: [] };
	}
}

type LocatorKind = 'workspace' | 'project';

const LOCATOR_COPY: Record<
	LocatorKind,
	{ placeholder: string; byIdPlaceholder: string; byIdHint: string }
> = {
	workspace: {
		placeholder: 'Select a workspace…',
		byIdPlaceholder: 'e.g. cm3f8a1b20001abc…',
		byIdHint: 'Enter the workspace ID (find it via Workspace > List)',
	},
	project: {
		placeholder: 'Select a project…',
		byIdPlaceholder: 'e.g. cm3f8a1b20002abc…',
		byIdHint: 'Enter the project ID (find it via Project > List)',
	},
};

/**
 * Build a resource-locator parameter with "From List" (searchable dropdown
 * backed by methods.listSearch) and "By ID" (free text, backwards compatible)
 * modes. Keeps the same parameter `name` so displayOptions and existing
 * workflows keep working; execute() unwraps the value with extractId().
 */
export function idLocator(
	kind: LocatorKind,
	args: {
		displayName: string;
		name: string;
		required: boolean;
		displayOptions: IDisplayOptions;
		description?: string;
		defaultMode?: 'list' | 'id';
	},
): INodeProperties {
	const copy = LOCATOR_COPY[kind];
	const searchListMethod = kind === 'workspace' ? 'searchWorkspaces' : 'searchProjects';
	return {
		displayName: args.displayName,
		name: args.name,
		type: 'resourceLocator',
		required: args.required,
		default: { mode: args.defaultMode ?? 'list', value: '' },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: copy.placeholder,
				typeOptions: { searchListMethod, searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: copy.byIdPlaceholder,
				hint: copy.byIdHint,
			},
		],
		displayOptions: args.displayOptions,
		...(args.description ? { description: args.description } : {}),
	};
}

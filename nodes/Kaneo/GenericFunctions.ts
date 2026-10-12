import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export type KaneoCredentials = {
	apiKey: string;
	baseUrl: string;
};

export function normalizeBaseUrl(baseUrl: string): string {
	// Tolerate origins pasted with a trailing /api path or slashes, so both
	// cloud (https://cloud.kaneo.app) and self-hosted origins work as-is.
	return (baseUrl || 'https://cloud.kaneo.app')
		.replace(/\/+$/, '')
		.replace(/\/api$/i, '');
}

/** Build a full API URL: {baseUrl}/api{path} (spec servers: https://cloud.kaneo.app/api). */
export function buildApiUrl(baseUrl: string, path: string): string {
	const base = normalizeBaseUrl(baseUrl);
	const suffix = path.startsWith('/') ? path : `/${path}`;
	return `${base}/api${suffix}`;
}

export async function getCredentials(context: IExecuteFunctions): Promise<KaneoCredentials> {
	const credentials = (await context.getCredentials('kaneoApi')) as unknown as
		| KaneoCredentials
		| undefined;
	if (!credentials?.apiKey) {
		throw new NodeApiError(context.getNode(), {
			message: 'Missing Kaneo API key. Add one to the Kaneo API credential.',
		});
	}
	return {
		apiKey: credentials.apiKey,
		baseUrl: credentials.baseUrl || 'https://cloud.kaneo.app',
	};
}

export async function kaneoApiRequest(
	context: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	options: {
		body?: IDataObject;
		qs?: IDataObject;
		headers?: Record<string, string>;
		returnFullResponse?: boolean;
		encoding?: IHttpRequestOptions['encoding'];
		json?: boolean;
	} = {},
): Promise<JsonObject | string | number | undefined> {
	const credentials = await getCredentials(context);
	const requestOptions: IHttpRequestOptions = {
		method,
		url: buildApiUrl(credentials.baseUrl, path),
		// Auth is injected by the kaneoApi credential (generic Bearer auth).
		// Do not set Authorization here: httpRequestWithAuthentication would send
		// it twice and some gateways treat duplicate auth headers as forbidden.
		headers: { ...(options.headers ?? {}) },
		qs: options.qs,
		returnFullResponse: options.returnFullResponse ?? false,
	};

	if (options.encoding !== undefined) {
		requestOptions.encoding = options.encoding;
	}

	// Only attach a body when one was provided (GET/DELETE must not send one).
	if (options.body !== undefined) {
		requestOptions.body = options.body;
	}
	requestOptions.json = options.json ?? true;

	try {
		return (await context.helpers.httpRequestWithAuthentication.call(
			context,
			'kaneoApi',
			requestOptions,
		)) as JsonObject | string | number | undefined;
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as JsonObject, {
			message: mapApiErrorMessage(error),
		});
	}
}

/** Public (unauthenticated) request for /config, /instance/status, and public boards. */
export async function kaneoPublicRequest(
	context: IExecuteFunctions,
	path: string,
	options: { qs?: IDataObject } = {},
): Promise<JsonObject | string | number | undefined> {
	const credentials = (await context
		.getCredentials('kaneoApi')
		.catch(() => undefined)) as unknown as KaneoCredentials | undefined;
	const baseUrl = credentials?.baseUrl || 'https://cloud.kaneo.app';
	try {
		return (await context.helpers.httpRequest({
			method: 'GET',
			url: buildApiUrl(baseUrl, path),
			qs: options.qs,
			json: true,
		})) as JsonObject | string | number | undefined;
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as JsonObject, {
			message: mapApiErrorMessage(error),
		});
	}
}

type ApiErrorShape = {
	code?: string;
	message?: string;
	issues?: Array<{ path?: string; message?: string }>;
	missingPermissions?: string[];
};

export function mapApiErrorMessage(error: unknown): string | undefined {
	// n8n surfaces HTTP failures in several shapes depending on version:
	// axios-style { response: { data } }, n8n { response: { body } },
	// { errorBody }, or a JSON string in { description }. Check them all so
	// API codes like FORBIDDEN are never swallowed into a generic message.
	const err = (error ?? {}) as Record<string, unknown>;
	const candidates: unknown[] = [
		(err.response as Record<string, unknown> | undefined)?.data,
		(err.response as Record<string, unknown> | undefined)?.body,
		err.errorBody,
		err.description,
	];
	let responseData: ApiErrorShape | undefined;
	let rawSnippet: string | undefined;
	for (const candidate of candidates) {
		if (typeof candidate === 'string') {
			try {
				const parsed = JSON.parse(candidate) as ApiErrorShape;
				if (parsed && (parsed.code || parsed.message)) {
					responseData = parsed;
					break;
				}
			} catch {
				// Non-JSON body (e.g. Cloudflare HTML challenge). Keep a snippet
				// so the caller can tell a proxy block from a Kaneo JSON error.
				const snippet = candidate.replace(/\s+/g, ' ').trim().slice(0, 160);
				if (snippet && !rawSnippet) rawSnippet = snippet;
				continue;
			}
		} else if (candidate && typeof candidate === 'object') {
			const shaped = candidate as ApiErrorShape;
			if (shaped.code || shaped.message || shaped.issues || shaped.missingPermissions) {
				responseData = shaped;
				break;
			}
		}
	}
	const statusCode =
		(err.statusCode as number | undefined) ??
		((err.response as Record<string, unknown> | undefined)?.statusCode as number | undefined) ??
		(err.httpCode as number | undefined);
	if (!responseData) {
		if (statusCode === 403) {
			const extra = rawSnippet ? ` Server said: "${rawSnippet}".` : '';
			const proxyHint = rawSnippet && /cloudflare|attention required|captcha|challenge/i.test(rawSnippet)
				? ' This looks like a Cloudflare/proxy block page, not a Kaneo error: allowlist your n8n IP/UA.'
				: '';
			return (
				`FORBIDDEN (HTTP 403). If this is Project > Get Public Board, the project must be public (Is Public).` +
				` Otherwise the API key lacks permission for this workspace/project, or a proxy blocked the request.` +
				` Verify Base URL, key, and project/workspace IDs.${extra}${proxyHint}`
			);
		}
		return undefined;
	}
	const parts: string[] = [];
	const code = responseData.code;
	if (code) parts.push(code);
	if (responseData.message) parts.push(responseData.message);

	const hints: Record<string, string> = {
		VALIDATION_ERROR: 'Check the field paths in issues and retry with valid input.',
		MISSING_PERMISSION: 'The API key lacks a required permission (see missingPermissions).',
		API_KEY_SCOPE: 'The API key scope does not allow this route (see missingPermissions).',
		NOT_FOUND: 'The resource does not exist or is outside this API key’s workspace access.',
		UNAUTHORIZED: 'Missing or invalid API key.',
		FORBIDDEN:
			'Access denied. For Project > Get Public Board the project must be public (Is Public); otherwise the API key lacks permission for this workspace/project.',
		BAD_REQUEST: 'The request was rejected. A required ID or field may be missing or malformed.',
	};

	const detail: string[] = [];
	if (responseData.code && hints[responseData.code]) detail.push(hints[responseData.code]);
	if (responseData.missingPermissions?.length) {
		detail.push(`Missing: ${responseData.missingPermissions.join(', ')}`);
	}
	if (responseData.issues?.length) {
		const first = responseData.issues
			.slice(0, 3)
			.map((i) => `${i.path ?? '?'}: ${i.message ?? '?'}`)
			.join('; ');
		detail.push(`Issues: ${first}`);
	}

	let text = parts.join(': ');
	if (detail.length) text += `. ${detail.join(' ')}`;
	return text || undefined;
}

/** Wrap a value into n8n output items; arrays become one item per entry. */
export function toItems(value: unknown, pairedItem?: { item: number }): INodeExecutionData[] {
	if (Array.isArray(value)) {
		return value.map((entry) => ({
			json: (entry ?? {}) as IDataObject,
			...(pairedItem ? { pairedItem } : {}),
		}));
	}
	if (value === undefined || value === null || value === '') {
		return [{ json: { success: true }, ...(pairedItem ? { pairedItem } : {}) }];
	}
	return [{ json: value as IDataObject, ...(pairedItem ? { pairedItem } : {}) }];
}

/** Parse a JSON-typed node parameter that may be a string or an object. */
export function parseJsonParam(value: unknown, fieldName: string, node: INode): unknown {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'string') {
		try {
			return JSON.parse(value) as unknown;
		} catch {
			throw new NodeOperationError(node, `Field "${fieldName}" must contain valid JSON.`);
		}
	}
	return value;
}

/** Split a comma-separated string into an array of trimmed IDs. */
export function splitIds(value: unknown): string[] {
	return String(value ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);
}

/** Drop undefined/null/'' keys so untouched fields are never sent as overwrites. */
export function pickDefined(body: Record<string, unknown>): IDataObject {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(body)) {
		if (value !== undefined && value !== null && value !== '') out[key] = value;
	}
	return out as IDataObject;
}

export const PRIORITIES = ['no-priority', 'low', 'medium', 'high', 'urgent'] as const;

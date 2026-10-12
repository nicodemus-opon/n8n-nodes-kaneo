import type { INodeProperties } from 'n8n-workflow';

import { idLocator } from './SearchMethods';

export const workspaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['workspace'] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get a workspace', description: 'Get a workspace by ID' },
			{ name: 'Get Capabilities', value: 'getCapabilities', action: 'Get my capabilities', description: 'Caller permissions in a workspace' },
			{ name: 'Get Members', value: 'getMembers', action: 'Get workspace members', description: 'Members with roles, optionally for one project' },
			{ name: 'Get My Project Access', value: 'getMyAccess', action: 'Get my project access', description: 'Projects the caller can access' },
			{ name: 'List', value: 'list', action: 'List workspaces', description: 'Workspaces the caller can read, sorted by name' },
		],
		default: 'list',
	},
];

export const workspaceFields: INodeProperties[] = [
	idLocator('workspace', {
		displayName: 'Workspace',
		name: 'workspaceId',
		required: true,
		displayOptions: { show: { resource: ['workspace'], operation: ['get', 'getMembers', 'getCapabilities', 'getMyAccess'] } },
	}),
	{
		displayName: 'Project ID Filter',
		name: 'projectFilter',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['workspace'], operation: ['getMembers'] } },
		description: 'Only members who can access this project (e.g. for an assignee picker)',
	},
];

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['user'] } },
		options: [
			{ name: 'Get Current', value: 'getCurrent', action: 'Get the current user', description: 'The authenticated user' },
		],
		default: 'getCurrent',
	},
];

export const userFields: INodeProperties[] = [];

export const searchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['search'] } },
		options: [
			{ name: 'Assigned to Me', value: 'assigned', action: 'List my assigned tasks', description: 'Open tasks assigned to the caller' },
			{ name: 'Global Search', value: 'global', action: 'Global search', description: 'Tasks, projects, comments, activities in a workspace' },
			{ name: 'Search Descriptions', value: 'descriptions', action: 'Search large descriptions', description: 'Full-text search over descriptions omitted from lists' },
		],
		default: 'global',
	},
];

export const searchFields: INodeProperties[] = [
	idLocator('workspace', {
		displayName: 'Workspace',
		name: 'workspaceId',
		required: true,
		displayOptions: { show: { resource: ['search'], operation: ['global', 'assigned'] } },
	}),
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['search'], operation: ['global', 'descriptions'] } },
	},
	idLocator('project', {
		displayName: 'Project',
		name: 'projectId',
		required: true,
		displayOptions: { show: { resource: ['search'], operation: ['descriptions'] } },
		description: 'Project whose large descriptions to search',
	}),
	{
		displayName: 'Search Filters',
		name: 'searchFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['search'], operation: ['global'] } },
		options: [
			{ displayName: 'Limit', name: 'limit', type: 'number',
																																										description: 'Max number of results to return', typeOptions: { minValue: 1, maxValue: 100 }, default: 50 },
			{ displayName: 'Project ID', name: 'projectId', type: 'string', default: '' },
			{ displayName: 'Type', name: 'type', type: 'options', default: 'all', options: [{ name: 'Activities', value: 'activities' }, { name: 'All', value: 'all' }, { name: 'Comments', value: 'comments' }, { name: 'Projects', value: 'projects' }, { name: 'Tasks', value: 'tasks' }, { name: 'Workspaces', value: 'workspaces' }] },
			{ displayName: 'User Email', name: 'userEmail', type: 'string', placeholder: 'name@email.com', default: '' },
		],
	},
	{
		displayName: 'Count Only',
		name: 'countOnly',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['search'], operation: ['assigned'] } },
		description: 'Whether to return just the total without task rows',
	},
	{
		displayName: 'After Cursor',
		name: 'after',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['search'], operation: ['descriptions'] } },
		description: 'Pagination cursor from a previous response',
	},
];

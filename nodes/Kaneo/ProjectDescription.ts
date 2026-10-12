import type { INodeProperties } from 'n8n-workflow';

import { idLocator } from './SearchMethods';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['project'] } },
		options: [
			{ name: 'Archive', value: 'archive', action: 'Archive a project', description: 'Hide a project without deleting it' },
			{ name: 'Create', value: 'create', action: 'Create a project', description: 'Create a project in a workspace' },
			{ name: 'Delete', value: 'delete', action: 'Delete a project', description: 'Permanently delete a project' },
			{ name: 'Get', value: 'get', action: 'Get a project', description: 'Get a single project by ID' },
			{ name: 'Get Public Board', value: 'getPublic', action: 'Get a public project board', description: 'Read a public project board without signing in scope' },
			{ name: 'List', value: 'list', action: 'List projects', description: 'List a workspace’s projects in sidebar order' },
			{ name: 'Move', value: 'move', action: 'Move a project', description: 'Move a project and its tasks to another workspace' },
			{ name: 'Reorder', value: 'reorder', action: 'Reorder projects', description: 'Set the sidebar order of workspace projects' },
			{ name: 'Unarchive', value: 'unarchive', action: 'Unarchive a project', description: 'Return an archived project to the list' },
			{ name: 'Update', value: 'update', action: 'Update a project', description: 'Replace a project’s name, icon, slug, description, visibility' },
		],
		default: 'list',
	},
];

export const projectFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['project'], operation: ['get', 'update', 'delete', 'archive', 'unarchive', 'move', 'getPublic'] },
		},
	},
	// list
	idLocator('workspace', {
		displayName: 'Workspace',
		name: 'workspaceId',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['list', 'reorder'] } },
		description: 'Workspace that owns the projects',
	}),
	{
		displayName: 'Include Archived',
		name: 'includeArchived',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['project'], operation: ['list'] } },
		description: 'Whether to include archived projects',
	},
	// create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['create'] } },
	},
	{
		displayName: 'Workspace ID',
		name: 'createWorkspaceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['create'] } },
		description: 'Workspace to create the project in',
	},
	{
		displayName: 'Icon',
		name: 'icon',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['create'] } },
		description: 'Icon identifier, e.g. an emoji or icon name',
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['create'] } },
		description: 'Short prefix used in task identifiers, e.g. KAN in KAN-12',
	},
	// update (PUT requires all of name, icon, slug, description, isPublic)
	{
		displayName: 'Name',
		name: 'updateName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['update'] } },
	},
	{
		displayName: 'Icon',
		name: 'updateIcon',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['update'] } },
	},
	{
		displayName: 'Slug',
		name: 'updateSlug',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['update'] } },
	},
	{
		displayName: 'Description',
		name: 'updateDescription',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['update'] } },
		description: 'Project description (empty string clears it)',
	},
	{
		displayName: 'Is Public',
		name: 'updateIsPublic',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['project'], operation: ['update'] } },
		description: 'Whether the board is readable without signing in',
	},
	// move
	{
		displayName: 'Destination Workspace ID',
		name: 'destinationWorkspaceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['move'] } },
		description: 'Workspace to move the project to. Remove cross-project task relations first.',
	},
	// reorder
	{
		displayName: 'Projects (JSON)',
		name: 'projectsOrder',
		type: 'json',
		required: true,
		default: '[\n  { "id": "project-id-1", "position": 0 },\n  { "id": "project-id-2", "position": 1 }\n]',
		displayOptions: { show: { resource: ['project'], operation: ['reorder'] } },
		description: 'Array of { ID, position }. Positions express relative order only.',
	},
	// getPublic (same board filters as Task > List)
	{
		displayName:
			'Public endpoint: only the Base URL from your Kaneo credential is used, no API key is sent. The project must be public (Is Public).',
		name: 'publicNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['project'], operation: ['getPublic'] } },
	},
	{
		displayName: 'Board Filters',
		name: 'boardFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['project'], operation: ['getPublic'] } },
		options: [
			{ displayName: 'Assignee ID', name: 'assigneeId', type: 'string', default: '' },
			{ displayName: 'Due After', name: 'dueAfter', type: 'dateTime', default: '' },
			{ displayName: 'Due Before', name: 'dueBefore', type: 'dateTime', default: '' },
			{ displayName: 'Limit', name: 'limit', type: 'number', typeOptions: { minValue: 1, maxValue: 100 }, default: 50, description: 'Max number of results to return' },
			{ displayName: 'Page', name: 'page', type: 'number', typeOptions: { minValue: 1 }, default: 1 },
			{ displayName: 'Priority', name: 'priority', type: 'string', default: '', description: 'Filter to one priority, e.g. high' },
			{ displayName: 'Related Page', name: 'relatedPage', type: 'number', typeOptions: { minValue: 1 }, default: 1 },
			{ displayName: 'Sort By', name: 'sortBy', type: 'string', default: '', description: 'One of createdAt, priority, dueDate, position, title, number' },
			{ displayName: 'Sort Order', name: 'sortOrder', type: 'string', default: '', description: 'Asc or desc' },
			{ displayName: 'Status (Column Slug)', name: 'status', type: 'string', default: '' },
		],
	},
];

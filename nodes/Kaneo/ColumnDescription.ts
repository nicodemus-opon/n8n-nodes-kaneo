import type { INodeProperties } from 'n8n-workflow';

import { idLocator } from './SearchMethods';

export const columnOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['column'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a column', description: 'Add a column to the end of a board' },
			{ name: 'Delete', value: 'delete', action: 'Delete a column', description: 'Delete a column by ID' },
			{ name: 'List', value: 'list', action: 'List columns', description: 'Get board columns ordered by position' },
			{ name: 'Reorder', value: 'reorder', action: 'Reorder columns', description: 'Set new positions for every column' },
			{ name: 'Update', value: 'update', action: 'Update a column', description: 'Rename or restyle a column' },
		],
		default: 'list',
	},
];

export const columnFields: INodeProperties[] = [
	idLocator('project', {
		displayName: 'Project',
		name: 'projectId',
		required: true,
		displayOptions: { show: { resource: ['column'], operation: ['list', 'create', 'reorder'] } },
	}),
	{
		displayName: 'Column ID',
		name: 'columnId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['column'], operation: ['update', 'delete'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['column'], operation: ['create'] } },
		description: 'The column slug is derived from the name',
	},
	{
		displayName: 'Additional Fields',
		name: 'createFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['column'], operation: ['create'] } },
		options: [
			{ displayName: 'Color', name: 'color', type: 'color', default: '' },
			{ displayName: 'Icon', name: 'icon', type: 'string', default: '' },
			{ displayName: 'Is Final', name: 'isFinal', type: 'boolean', default: false, description: 'Whether this is a done state (stops overdue reminders)' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['column'], operation: ['update'] } },
		options: [
			{ displayName: 'Color', name: 'color', type: 'color', default: '' },
			{ displayName: 'Icon', name: 'icon', type: 'string', default: '' },
			{ displayName: 'Is Final', name: 'isFinal', type: 'boolean', default: false },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Columns (JSON)',
		name: 'columnsOrder',
		type: 'json',
		required: true,
		default: '[\n  { "id": "column-id-1", "position": 0 },\n  { "id": "column-id-2", "position": 1 }\n]',
		displayOptions: { show: { resource: ['column'], operation: ['reorder'] } },
		description: 'Every column with its new position; foreign columns are rejected',
	},
];

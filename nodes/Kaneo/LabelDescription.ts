import type { INodeProperties } from 'n8n-workflow';

import { idLocator } from './SearchMethods';

export const labelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['label'] } },
		options: [
			{ name: 'Attach to Task', value: 'attach', action: 'Attach a label to a task', description: 'Attach an existing label to a task' },
			{ name: 'Create', value: 'create', action: 'Create a label', description: 'Create a label in a workspace' },
			{ name: 'Delete', value: 'delete', action: 'Delete a label', description: 'Delete by ID; repeat on 202 until 200 for large cascades' },
			{ name: 'Detach From Task', value: 'detach', action: 'Detach a label from a task', description: "Detach a label from its current task (verified against the label's task first)" },
			{ name: 'Get', value: 'get', action: 'Get a label', description: 'Get a label by ID' },
			{ name: 'List Task Labels', value: 'listTask', action: 'List task labels', description: 'Labels attached to one task' },
			{ name: 'List Workspace Labels', value: 'listWorkspace', action: 'List workspace labels', description: 'All labels in a workspace' },
			{ name: 'Update', value: 'update', action: 'Update a label', description: 'Rename or recolor a label' },
		],
		default: 'listWorkspace',
	},
];

export const labelFields: INodeProperties[] = [
	{
		displayName: 'Label ID',
		name: 'labelId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['label'], operation: ['get', 'update', 'delete', 'attach', 'detach'] } },
	},
	idLocator('workspace', {
		displayName: 'Workspace',
		name: 'workspaceId',
		required: true,
		displayOptions: { show: { resource: ['label'], operation: ['listWorkspace', 'create'] } },
	}),
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['label'], operation: ['listTask', 'attach', 'detach'] } },
		description:
			'Task to list labels for, or to attach the label to. For detach it must match the label\u2019s current task (the API detaches from the current task and returns 400 otherwise).',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['label'], operation: ['create'] } },
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['label'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'createFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['label'], operation: ['create'] } },
		options: [{ displayName: 'Task ID (Attach Immediately)', name: 'taskId', type: 'string', default: '' }],
	},
	{
		displayName: 'Name',
		name: 'updateName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['label'], operation: ['update'] } },
		description: 'The API requires both name and color on every update',
	},
	{
		displayName: 'Color',
		name: 'updateColor',
		type: 'color',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['label'], operation: ['update'] } },
		description: 'The API requires both name and color on every update',
	},
];

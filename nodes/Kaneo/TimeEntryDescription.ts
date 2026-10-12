import type { INodeProperties } from 'n8n-workflow';

export const timeEntryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['timeEntry'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a time entry', description: 'Omit end time to start a running timer' },
			{ name: 'Get', value: 'get', action: 'Get a time entry', description: 'Get a single time entry by ID' },
			{ name: 'List by Task', value: 'listByTask', action: 'List task time entries', description: 'Every entry logged against a task' },
			{ name: 'Update', value: 'update', action: 'Update a time entry', description: 'Setting end time closes a running entry' },
		],
		default: 'listByTask',
	},
];

export const timeEntryFields: INodeProperties[] = [
	{
		displayName: 'Time Entry ID',
		name: 'timeEntryId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['timeEntry'], operation: ['get', 'update'] } },
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['timeEntry'], operation: ['listByTask', 'create'] } },
	},
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['timeEntry'], operation: ['create', 'update'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'timeFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['timeEntry'], operation: ['create', 'update'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', typeOptions: { rows: 3 }, default: '' },
			{ displayName: 'End Time', name: 'endTime', type: 'dateTime', default: '', description: 'Omit to keep the timer running' },
		],
	},
];

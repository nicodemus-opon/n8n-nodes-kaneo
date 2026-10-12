import type { INodeProperties } from 'n8n-workflow';

import { idLocator } from './SearchMethods';

export const commentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['comment'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a comment', description: 'Add a comment to a task' },
			{ name: 'Delete', value: 'delete', action: 'Delete a comment', description: 'Only the author may delete' },
			{ name: 'List', value: 'list', action: 'List comments', description: 'Every comment on a task, oldest first' },
			{ name: 'Update', value: 'update', action: 'Update a comment', description: 'Only the author may edit' },
		],
		default: 'list',
	},
];

export const commentFields: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['comment'], operation: ['list', 'create'] } },
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['comment'], operation: ['update', 'delete'] } },
		description: 'Activity ID of the comment',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['comment'], operation: ['create', 'update'] } },
		description: '1 to 10000 characters. @mentions notify mentioned users.',
	},
];

export const activityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['activity'] } },
		options: [
			{ name: 'Create Event', value: 'createEvent', action: 'Create an activity event', description: 'Record a typed event on a task feed' },
			{ name: 'Create Legacy Comment', value: 'createComment', action: 'Create a legacy comment', description: 'Legacy /activity/comment route' },
			{ name: 'Delete Legacy Comment', value: 'deleteComment', action: 'Delete a legacy comment', description: 'Legacy /activity/comment route' },
			{ name: 'Get Task Feed', value: 'getTask', action: 'Get task activity', description: 'Comments plus system events, newest first' },
			{ name: 'Get Workspace Feed', value: 'getWorkspace', action: 'Get workspace activity', description: '20 most recent events from the last 30 days' },
			{ name: 'Update Legacy Comment', value: 'updateComment', action: 'Update a legacy comment', description: 'Legacy /activity/comment route' },
		],
		default: 'getTask',
	},
];

export const activityFields: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['activity'], operation: ['getTask', 'createEvent', 'createComment'] } },
	},
	idLocator('workspace', {
		displayName: 'Workspace',
		name: 'workspaceId',
		required: true,
		displayOptions: { show: { resource: ['activity'], operation: ['getWorkspace'] } },
	}),
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		displayOptions: { show: { resource: ['activity'], operation: ['getTask'] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'status_changed',
		displayOptions: { show: { resource: ['activity'], operation: ['createEvent'] } },
		description: 'Event kind, e.g. status_changed, assignee_changed',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		displayOptions: { show: { resource: ['activity'], operation: ['createEvent'] } },
		description: 'Free-text body; empty means the meaning is in event data',
	},
	{
		displayName: 'Event Data (JSON)',
		name: 'eventData',
		type: 'json',
		default: '{}',
		displayOptions: { show: { resource: ['activity'], operation: ['createEvent'] } },
		description: 'Type-specific payload stored alongside the event',
	},
	{
		displayName: 'Comment',
		name: 'legacyComment',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['activity'], operation: ['createComment', 'updateComment'] } },
	},
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['activity'], operation: ['updateComment', 'deleteComment'] } },
	},
];

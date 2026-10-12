import type { INodeProperties } from 'n8n-workflow';

import { idLocator } from './SearchMethods';

export const notificationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['notification'] } },
		options: [
			{ name: 'Clear All', value: 'clearAll', action: 'Clear notifications', description: 'Delete all notifications (optionally one workspace)' },
			{ name: 'Create', value: 'create', action: 'Create a notification', description: 'Create a notification for the current user' },
			{ name: 'List', value: 'list', action: 'List notifications', description: 'Up to 50 notifications, read and unread' },
			{ name: 'Mark All Read', value: 'markAllRead', action: 'Mark all notifications read', description: 'Mark every notification read' },
			{ name: 'Mark Read', value: 'markRead', action: 'Mark a notification read', description: 'Mark one notification read' },
		],
		default: 'list',
	},
];

export const notificationFields: INodeProperties[] = [
	{
		displayName: 'Notification ID',
		name: 'notificationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['notification'], operation: ['markRead'] } },
	},
	idLocator('workspace', {
		displayName: 'Workspace',
		name: 'workspaceId',
		required: false,
		displayOptions: { show: { resource: ['notification'], operation: ['list', 'markAllRead', 'clearAll'] } },
		description: 'Limit to resources in this workspace; empty means all workspaces',
		defaultMode: 'id',
	}),
	{
		displayName: 'Type',
		name: 'type',
		type: 'string',
		required: true,
		default: 'info',
		displayOptions: { show: { resource: ['notification'], operation: ['create'] } },
		description: 'One of: info, task_created, task_status_changed, task_assignee_changed, time_entry_created, due_date_reminder, task_overdue, task_mention, task_comment, workspace_created',
	},
	{
		displayName: 'Additional Fields',
		name: 'createFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['notification'], operation: ['create'] } },
		options: [
			{ displayName: 'Event Data (JSON)', name: 'eventData', type: 'json', default: '{}', description: 'Type-specific payload' },
			{ displayName: 'Message', name: 'message', type: 'string', typeOptions: { rows: 3 }, default: '', description: 'Stored as the notification content' },
			{ displayName: 'Related Entity ID', name: 'relatedEntityId', type: 'string', default: '', description: 'Stored as resourceId (task or workspace)' },
			{ displayName: 'Related Entity Type', name: 'relatedEntityType', type: 'options', default: 'task', options: [{ name: 'Task', value: 'task' }, { name: 'Workspace', value: 'workspace' }] },
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
		],
	},
];

export const systemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['system'] } },
		options: [
			{ name: 'Get Config', value: 'getConfig', action: 'Get instance config', description: 'Public sign-in and feature settings (no auth)' },
			{ name: 'Get Instance Status', value: 'getStatus', action: 'Get instance status', description: 'Public setup status (no auth)' },
		],
		default: 'getConfig',
	},
];

export const systemFields: INodeProperties[] = [
	{
		displayName:
			'Public endpoint: only the Base URL from your Kaneo credential is used, no API key is sent.',
		name: 'publicNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['system'] } },
	},
];

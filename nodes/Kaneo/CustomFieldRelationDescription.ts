import type { INodeProperties } from 'n8n-workflow';

import { idLocator } from './SearchMethods';

export const customFieldOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['customField'] } },
		options: [
			{ name: 'Create Definition', value: 'create', action: 'Create a custom field', description: 'Define a text/number/date/dropdown/boolean/multiselect field' },
			{ name: 'Delete Definition', value: 'delete', action: 'Delete a custom field', description: 'Delete a field definition by ID' },
			{ name: 'Get Project Values', value: 'getProjectValues', action: 'Get project values', description: 'All custom field values in a project' },
			{ name: 'Get Task Values', value: 'getTaskValues', action: 'Get task values', description: 'Custom field values for one task' },
			{ name: 'List Definitions', value: 'list', action: 'List field definitions', description: 'All custom field definitions for a project' },
			{ name: 'Reorder', value: 'reorder', action: 'Reorder custom fields', description: 'Set the order of project custom fields' },
			{ name: 'Set Value', value: 'setValue', action: 'Set a custom field value', description: 'Create or update a value for a task' },
		],
		default: 'list',
	},
];

export const customFieldFields: INodeProperties[] = [
	idLocator('project', {
		displayName: 'Project',
		name: 'projectId',
		required: true,
		displayOptions: { show: { resource: ['customField'], operation: ['create', 'list', 'getProjectValues', 'reorder'] } },
	}),
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['customField'], operation: ['getTaskValues', 'setValue'] } },
	},
	{
		displayName: 'Field ID',
		name: 'fieldId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['customField'], operation: ['delete', 'setValue'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['customField'], operation: ['create'] } },
	},
	{
		displayName: 'Type',
		name: 'fieldType',
		type: 'options',
		required: true,
		default: 'text',
		displayOptions: { show: { resource: ['customField'], operation: ['create'] } },
		options: [
			{ name: 'Boolean', value: 'boolean' },
			{ name: 'Date', value: 'date' },
			{ name: 'Dropdown', value: 'dropdown' },
			{ name: 'Multiselect', value: 'multiselect' },
			{ name: 'Number', value: 'number' },
			{ name: 'Text', value: 'text' },
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'createFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['customField'], operation: ['create'] } },
		options: [
			{ displayName: 'Default Value', name: 'defaultValue', type: 'string', default: '' },
			{ displayName: 'Options (Comma-Separated)', name: 'options', type: 'string', default: '', description: 'Choices for dropdown/multiselect' },
			{ displayName: 'Required', name: 'required', type: 'boolean', default: false },
		],
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['customField'], operation: ['setValue'] } },
	},
	{
		displayName: 'Fields Order (JSON)',
		name: 'fieldsOrder',
		type: 'json',
		required: true,
		default: '[\n  { "id": "field-id", "position": 0 }\n]',
		displayOptions: { show: { resource: ['customField'], operation: ['reorder'] } },
		description: 'Array of { ID, position }',
	},
];

export const taskRelationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['taskRelation'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a task relation', description: 'Link two tasks (subtask/blocks/related)' },
			{ name: 'Delete', value: 'delete', action: 'Delete a task relation', description: 'Delete a relation by ID' },
			{ name: 'List', value: 'list', action: 'List task relations', description: 'Relations where the task is source or target' },
		],
		default: 'list',
	},
];

export const taskRelationFields: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['taskRelation'], operation: ['list'] } },
	},
	{
		displayName: 'Relation ID',
		name: 'relationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['taskRelation'], operation: ['delete'] } },
	},
	{
		displayName: 'Source Task ID',
		name: 'sourceTaskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['taskRelation'], operation: ['create'] } },
	},
	{
		displayName: 'Target Task ID',
		name: 'targetTaskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['taskRelation'], operation: ['create'] } },
	},
	{
		displayName: 'Relation Type',
		name: 'relationType',
		type: 'options',
		required: true,
		default: 'related',
		displayOptions: { show: { resource: ['taskRelation'], operation: ['create'] } },
		options: [
			{ name: 'Subtask', value: 'subtask' },
			{ name: 'Blocks', value: 'blocks' },
			{ name: 'Related', value: 'related' },
		],
	},
];

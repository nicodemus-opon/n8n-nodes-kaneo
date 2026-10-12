import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { columnFields, columnOperations } from './ColumnDescription';
import { activityFields, activityOperations, commentFields, commentOperations } from './CommentActivityDescription';
import { customFieldFields, customFieldOperations, taskRelationFields, taskRelationOperations } from './CustomFieldRelationDescription';
import {
	kaneoApiRequest,
	kaneoPublicRequest,
	parseJsonParam,
	pickDefined,
	splitIds,
	toItems,
} from './GenericFunctions';
import { labelFields, labelOperations } from './LabelDescription';
import { projectFields, projectOperations } from './ProjectDescription';
import { extractId, searchProjects, searchWorkspaces } from './SearchMethods';
import { notificationFields, notificationOperations, systemFields, systemOperations } from './SystemNotificationDescription';
import { taskFields, taskOperations } from './TaskDescription';
import { timeEntryFields, timeEntryOperations } from './TimeEntryDescription';
import {
	searchFields,
	searchOperations,
	userFields,
	userOperations,
	workspaceFields,
	workspaceOperations,
} from './WorkspaceSearchDescription';

function push(
	returnData: INodeExecutionData[],
	response: unknown,
	itemIndex: number,
): void {
	for (const item of toItems(response, { item: itemIndex })) returnData.push(item);
}

async function executeProject(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	// workspaceId/projectId are resource locators: unwrap { mode, value } or plain strings.
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'list': {
			const includeArchived = get('includeArchived', false) as boolean;
			const workspaceId = id('workspaceId') as string;
			if (!workspaceId) {
				throw new NodeOperationError(
					context.getNode(),
					'Select a Workspace to list its projects (Workspace > List shows available IDs). The Kaneo API rejects /project without a workspaceId.',
				);
			}
			const qs: IDataObject = { workspaceId };
			if (includeArchived) qs.includeArchived = 'true';
			push(returnData, await kaneoApiRequest(context, 'GET', '/project', { qs }), itemIndex);
			break;
		}
		case 'get':
			push(returnData, await kaneoApiRequest(context, 'GET', `/project/${get('projectId')}`), itemIndex);
			break;
		case 'create':
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/project', {
					body: {
						name: get('name'),
						workspaceId: get('createWorkspaceId'),
						icon: get('icon'),
						slug: get('slug'),
					} as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'update': {
			// PUT /project/{id} requires every field; empty description string clears it.
			const description = get('updateDescription', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/project/${get('projectId')}`, {
					body: {
						name: get('updateName'),
						icon: get('updateIcon'),
						slug: get('updateSlug'),
						description,
						isPublic: get('updateIsPublic', false),
					} as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'delete':
			push(returnData, await kaneoApiRequest(context, 'DELETE', `/project/${get('projectId')}`), itemIndex);
			break;
		case 'archive':
			push(returnData, await kaneoApiRequest(context, 'PUT', `/project/${get('projectId')}/archive`), itemIndex);
			break;
		case 'unarchive':
			push(returnData, await kaneoApiRequest(context, 'PUT', `/project/${get('projectId')}/unarchive`), itemIndex);
			break;
		case 'move':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/project/${get('projectId')}/move`, {
					body: { workspaceId: get('destinationWorkspaceId') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'reorder': {
			const projects = parseJsonParam(get('projectsOrder'), 'Projects (JSON)', context.getNode()) as unknown;
			if (!Array.isArray(projects) || projects.length === 0) {
				throw new NodeOperationError(context.getNode(), 'Projects (JSON) must be a non-empty array of { id, position }.');
			}
			const reorderWorkspaceId = id('workspaceId') as string;
			if (!reorderWorkspaceId) {
				throw new NodeOperationError(context.getNode(), 'Select a Workspace to reorder its projects.');
			}
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', '/project/reorder', {
					qs: { workspaceId: reorderWorkspaceId } as IDataObject,
					body: { projects } as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'getPublic': {
			const filters = (get('boardFilters', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoPublicRequest(context, `/public-project/${get('projectId')}`, {
					qs: pickDefined({
						status: filters.status,
						priority: filters.priority,
						assigneeId: filters.assigneeId,
						page: filters.page,
						relatedPage: filters.relatedPage,
						limit: filters.limit,
						sortBy: filters.sortBy,
						sortOrder: filters.sortOrder,
						dueBefore: filters.dueBefore,
						dueAfter: filters.dueAfter,
					}),
				}),
				itemIndex,
			);
			break;
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Project operation: ${operation}`);
	}
}

async function executeTask(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'list': {
			const filters = (get('listFilters', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', `/task/tasks/${id('projectId')}`, {
					qs: pickDefined({
						status: filters.status,
						priority: filters.priority,
						assigneeId: filters.assigneeId,
						page: filters.page,
						relatedPage: filters.relatedPage,
						limit: filters.limit,
						sortBy: filters.sortBy,
						sortOrder: filters.sortOrder,
						dueBefore: filters.dueBefore,
						dueAfter: filters.dueAfter,
					}),
				}),
				itemIndex,
			);
			break;
		}
		case 'get': {
			const view = get('view', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', `/task/${get('taskId')}`, {
					qs: view ? ({ view } as IDataObject) : undefined,
				}),
				itemIndex,
			);
			break;
		}
		case 'getByTicket': {
			const scope = (get('ticketScope', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', `/task/by-ticket-id/${encodeURIComponent(get('ticketId') as string)}`, {
					qs: pickDefined({
						workspaceId: scope.workspaceId,
						workspaceSlug: scope.workspaceSlug,
						projectId: scope.projectId,
					}),
				}),
				itemIndex,
			);
			break;
		}
		case 'create': {
			const fields = (get('createFields', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', `/task/${id('projectId')}`, {
					// description is required by the spec: always send it, even when empty.
					body: {
						...pickDefined({
							title: get('title'),
							priority: get('priority'),
							status: get('status'),
							userId: fields.userId,
							startDate: fields.startDate,
							dueDate: fields.dueDate,
							draftAssetIds: parseJsonParam(fields.draftAssetIds, 'Draft Asset IDs (JSON)', context.getNode()),
							customFields: parseJsonParam(fields.customFields, 'Custom Fields (JSON)', context.getNode()),
						}),
						description: get('description', '') as string,
					} as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'update': {
			const fields = (get('updateFields', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/task/${get('taskId')}`, {
					body: pickDefined({
						title: get('updateTitle'),
						priority: get('updatePriority'),
						status: get('updateStatus'),
						projectId: get('updateProjectId'),
						position: get('updatePosition'),
						description: fields.description,
						startDate: fields.startDate,
						dueDate: fields.dueDate,
						userId: fields.userId,
					}),
				}),
				itemIndex,
			);
			break;
		}
		case 'delete':
			push(returnData, await kaneoApiRequest(context, 'DELETE', `/task/${get('taskId')}`), itemIndex);
			break;
		case 'duplicate': {
			const title = get('newTitle', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', `/task/duplicate/${get('taskId')}`, {
					// Title is optional in the spec; omit when empty to keep the original.
					body: title ? ({ title } as IDataObject) : ({} as IDataObject),
				}),
				itemIndex,
			);
			break;
		}
		case 'move':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/task/move/${get('taskId')}`, {
					body: pickDefined({
						destinationProjectId: get('destinationProjectId'),
						destinationStatus: get('destinationStatus', ''),
					}),
				}),
				itemIndex,
			);
			break;
		case 'bulkUpdate': {
			const ids = splitIds(get('bulkTaskIds'));
			if (ids.length === 0) {
				throw new NodeOperationError(context.getNode(), 'Provide at least one task ID (comma-separated).');
			}
			const bulkOperation = get('bulkOperation') as string;
			const rawValue = get('bulkValue', '') as string;
			// value is unused by delete; null clears assignee/due date.
			const value = bulkOperation === 'delete' ? undefined : rawValue === '' ? null : rawValue;
			push(
				returnData,
				await kaneoApiRequest(context, 'PATCH', '/task/bulk', {
					body: { taskIds: ids, operation: bulkOperation, ...(value !== undefined ? { value } : {}) } as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'setTitle':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/task/title/${get('taskId')}`, {
					body: { title: get('newTitle') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'setStatus':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/task/status/${get('taskId')}`, {
					body: { status: get('newStatus') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'setPriority':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/task/priority/${get('taskId')}`, {
					body: { priority: get('newPriority') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'setDueDate': {
			const dueDate = get('newDueDate', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/task/due-date/${get('taskId')}`, {
					// The spec types dueDate as a plain string (not nullable):
					// omit it when empty. To clear a due date, use Task > Bulk Update (null clears it).
					...(dueDate === '' ? {} : { body: { dueDate } as IDataObject }),
				}),
				itemIndex,
			);
			break;
		}
		case 'setAssignee': {
			const userId = get('newAssigneeId', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/task/assignee/${get('taskId')}`, {
					// Null unassigns per spec.
					body: { userId: userId === '' ? null : userId } as unknown as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'setDescription':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/task/description/${get('taskId')}`, {
					body: { description: get('newDescription') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'export':
			push(returnData, await kaneoApiRequest(context, 'GET', `/task/export/${id('projectId')}`), itemIndex);
			break;
		case 'import': {
			const tasks = parseJsonParam(get('importTasks'), 'Tasks (JSON)', context.getNode());
			if (!Array.isArray(tasks) || tasks.length === 0) {
				throw new NodeOperationError(context.getNode(), 'Tasks (JSON) must be a non-empty array of { title, status, ... }.');
			}
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', `/task/import/${id('projectId')}`, {
					body: { tasks } as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'reorder': {
			const tasks = parseJsonParam(get('reorderTasks'), 'Cards (JSON)', context.getNode());
			if (!Array.isArray(tasks) || tasks.length === 0) {
				throw new NodeOperationError(context.getNode(), 'Cards (JSON) must be a non-empty array of { id, position, status? }.');
			}
			const expected = parseJsonParam(get('expectedTasks', ''), 'Expected Snapshot (JSON)', context.getNode()) as unknown[] | undefined;
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/task/reorder', {
					body: {
						projectId: id('projectId'),
						tasks,
						...(expected !== undefined ? { expectedTasks: expected } : {}),
					} as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Task operation: ${operation}`);
	}
}

async function executeColumn(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'list':
			push(returnData, await kaneoApiRequest(context, 'GET', `/column/${id('projectId')}`), itemIndex);
			break;
		case 'create': {
			const fields = (get('createFields', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', `/column/${id('projectId')}`, {
					body: pickDefined({ name: get('name'), icon: fields.icon, color: fields.color, isFinal: fields.isFinal }),
				}),
				itemIndex,
			);
			break;
		}
		case 'update': {
			const fields = (get('updateFields', {}) ?? {}) as Record<string, unknown>;
			const body = pickDefined({ name: fields.name, icon: fields.icon, color: fields.color, isFinal: fields.isFinal });
			if (Object.keys(body).length === 0) {
				throw new NodeOperationError(context.getNode(), 'Add at least one field to update.');
			}
			push(returnData, await kaneoApiRequest(context, 'PUT', `/column/${get('columnId')}`, { body }), itemIndex);
			break;
		}
		case 'delete':
			push(returnData, await kaneoApiRequest(context, 'DELETE', `/column/${get('columnId')}`), itemIndex);
			break;
		case 'reorder': {
			const columns = parseJsonParam(get('columnsOrder'), 'Columns (JSON)', context.getNode());
			if (!Array.isArray(columns) || columns.length === 0) {
				throw new NodeOperationError(context.getNode(), 'Columns (JSON) must be a non-empty array of { id, position }.');
			}
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/column/reorder/${id('projectId')}`, {
					body: { columns } as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Column operation: ${operation}`);
	}
}

async function executeLabel(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'listWorkspace':
			push(returnData, await kaneoApiRequest(context, 'GET', `/label/workspace/${id('workspaceId')}`), itemIndex);
			break;
		case 'listTask':
			push(returnData, await kaneoApiRequest(context, 'GET', `/label/task/${get('taskId')}`), itemIndex);
			break;
		case 'get':
			push(returnData, await kaneoApiRequest(context, 'GET', `/label/${get('labelId')}`), itemIndex);
			break;
		case 'create': {
			const fields = (get('createFields', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/label', {
					body: pickDefined({
						name: get('name'),
						color: get('color'),
						workspaceId: id('workspaceId'),
						taskId: fields.taskId,
					}),
				}),
				itemIndex,
			);
			break;
		}
		case 'update': {
			// PUT /label/{id} requires both name and color on every call.
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/label/${get('labelId')}`, {
					body: { name: get('updateName'), color: get('updateColor') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'delete':
			push(returnData, await kaneoApiRequest(context, 'DELETE', `/label/${get('labelId')}`), itemIndex);
			break;
		case 'attach':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/label/${get('labelId')}/task`, {
					body: { taskId: get('taskId') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'detach':
			push(returnData, await kaneoApiRequest(context, 'DELETE', `/label/${get('labelId')}/task`), itemIndex);
			break;
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Label operation: ${operation}`);
	}
}

async function executeComment(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;

	switch (operation) {
		case 'list':
			push(returnData, await kaneoApiRequest(context, 'GET', `/comment/${get('taskId')}`), itemIndex);
			break;
		case 'create':
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', `/comment/${get('taskId')}`, {
					body: { content: get('content') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'update':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/comment/${get('commentId')}`, {
					body: { content: get('content') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'delete':
			push(returnData, await kaneoApiRequest(context, 'DELETE', `/comment/${get('commentId')}`), itemIndex);
			break;
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Comment operation: ${operation}`);
	}
}

async function executeActivity(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'getTask': {
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', `/activity/${get('taskId')}`, {
					qs: { limit: get('limit', 50) } as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'getWorkspace':
			push(returnData, await kaneoApiRequest(context, 'GET', `/activity/workspace/${id('workspaceId')}`), itemIndex);
			break;
		case 'createEvent': {
			const eventData = parseJsonParam(get('eventData', ''), 'Event Data (JSON)', context.getNode());
			const message = get('message', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/activity/create', {
					// message is required: null carries "meaning is in eventData" per spec.
					body: {
						taskId: get('taskId'),
						message: message === '' ? null : message,
						type: get('eventType'),
						...(eventData !== undefined ? { eventData } : {}),
					} as unknown as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'createComment':
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/activity/comment', {
					body: { taskId: get('taskId'), comment: get('legacyComment') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'updateComment':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', '/activity/comment', {
					body: { activityId: get('activityId'), comment: get('legacyComment') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'deleteComment':
			push(
				returnData,
				await kaneoApiRequest(context, 'DELETE', '/activity/comment', {
					body: { activityId: get('activityId') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Activity operation: ${operation}`);
	}
}

async function executeTimeEntry(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;

	switch (operation) {
		case 'listByTask':
			push(returnData, await kaneoApiRequest(context, 'GET', `/time-entry/task/${get('taskId')}`), itemIndex);
			break;
		case 'get':
			push(returnData, await kaneoApiRequest(context, 'GET', `/time-entry/${get('timeEntryId')}`), itemIndex);
			break;
		case 'create': {
			const fields = (get('timeFields', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/time-entry', {
					body: pickDefined({ taskId: get('taskId'), startTime: get('startTime'), endTime: fields.endTime, description: fields.description }),
				}),
				itemIndex,
			);
			break;
		}
		case 'update': {
			const fields = (get('timeFields', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/time-entry/${get('timeEntryId')}`, {
					body: pickDefined({ startTime: get('startTime'), endTime: fields.endTime, description: fields.description }),
				}),
				itemIndex,
			);
			break;
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Time Entry operation: ${operation}`);
	}
}

async function executeWorkspace(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'list':
			push(returnData, await kaneoApiRequest(context, 'GET', '/workspace'), itemIndex);
			break;
		case 'get':
			push(returnData, await kaneoApiRequest(context, 'GET', `/workspace/${id('workspaceId')}`), itemIndex);
			break;
		case 'getMembers': {
			const projectFilter = get('projectFilter', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', `/workspace/${id('workspaceId')}/members`, {
					qs: projectFilter ? ({ projectId: projectFilter } as IDataObject) : undefined,
				}),
				itemIndex,
			);
			break;
		}
		case 'getCapabilities':
			push(returnData, await kaneoApiRequest(context, 'GET', `/workspace/${id('workspaceId')}/capabilities`), itemIndex);
			break;
		case 'getMyAccess':
			push(returnData, await kaneoApiRequest(context, 'GET', `/workspace/${id('workspaceId')}/project-access/me`), itemIndex);
			break;
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Workspace operation: ${operation}`);
	}
}

async function executeSearch(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'global': {
			const filters = (get('searchFilters', {}) ?? {}) as Record<string, unknown>;
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', '/search', {
					qs: pickDefined({
						q: get('query'),
						type: (filters.type as string) || 'all',
						workspaceId: id('workspaceId'),
						projectId: filters.projectId,
						limit: filters.limit ?? 20,
						userEmail: filters.userEmail,
					}),
				}),
				itemIndex,
			);
			break;
		}
		case 'assigned': {
			const countOnly = get('countOnly', false) as boolean;
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', '/task/assigned', {
					qs: { workspaceId: id('workspaceId'), ...(countOnly ? { countOnly: 'true' } : {}) } as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		case 'descriptions': {
			const after = get('after', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', `/task/description-matches/${id('projectId')}`, {
					qs: pickDefined({ query: get('query'), after }),
				}),
				itemIndex,
			);
			break;
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Search operation: ${operation}`);
	}
}

async function executeCustomField(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'list':
			push(returnData, await kaneoApiRequest(context, 'GET', `/custom-field/project/${id('projectId')}`), itemIndex);
			break;
		case 'getTaskValues':
			push(returnData, await kaneoApiRequest(context, 'GET', `/custom-field/task/${get('taskId')}`), itemIndex);
			break;
		case 'getProjectValues':
			push(returnData, await kaneoApiRequest(context, 'GET', `/custom-field/project/${id('projectId')}/values`), itemIndex);
			break;
		case 'create': {
			const fields = (get('createFields', {}) ?? {}) as Record<string, unknown>;
			const optionsRaw = fields.options as string | undefined;
			const options = optionsRaw
				? String(optionsRaw).split(',').map((o) => o.trim()).filter(Boolean)
				: undefined;
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/custom-field', {
					body: pickDefined({
						projectId: id('projectId'),
						name: get('name'),
						type: get('fieldType'),
						required: fields.required,
						defaultValue: fields.defaultValue,
						...(options !== undefined ? { options } : {}),
					}),
				}),
				itemIndex,
			);
			break;
		}
		case 'delete':
			push(returnData, await kaneoApiRequest(context, 'DELETE', `/custom-field/${get('fieldId')}`), itemIndex);
			break;
		case 'setValue':
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', '/custom-field/value', {
					body: { taskId: get('taskId'), fieldId: get('fieldId'), value: get('value') } as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'reorder': {
			// Spec path is /custom-field/reorder/{projectId}; body shape mirrors column reorder.
			const order = parseJsonParam(get('fieldsOrder'), 'Fields Order (JSON)', context.getNode());
			push(
				returnData,
				await kaneoApiRequest(context, 'PUT', `/custom-field/reorder/${id('projectId')}`, {
					body: { fields: order } as IDataObject,
				}),
				itemIndex,
			);
			break;
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Custom Field operation: ${operation}`);
	}
}

async function executeTaskRelation(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;

	switch (operation) {
		case 'list':
			push(returnData, await kaneoApiRequest(context, 'GET', `/task-relation/${get('taskId')}`), itemIndex);
			break;
		case 'create':
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/task-relation', {
					body: {
						sourceTaskId: get('sourceTaskId'),
						targetTaskId: get('targetTaskId'),
						relationType: get('relationType'),
					} as IDataObject,
				}),
				itemIndex,
			);
			break;
		case 'delete':
			push(returnData, await kaneoApiRequest(context, 'DELETE', `/task-relation/${get('relationId')}`), itemIndex);
			break;
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Task Relation operation: ${operation}`);
	}
}

async function executeNotification(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	const get = (name: string, fallback?: unknown) =>
		context.getNodeParameter(name, itemIndex, fallback) as unknown;
	const id = (name: string, fallback?: unknown) => extractId(get(name, fallback));

	switch (operation) {
		case 'list': {
			const workspaceId = id('workspaceId', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'GET', '/notification', {
					qs: workspaceId ? ({ workspaceId } as IDataObject) : undefined,
				}),
				itemIndex,
			);
			break;
		}
		case 'create': {
			const fields = (get('createFields', {}) ?? {}) as Record<string, unknown>;
			const eventData = parseJsonParam(fields.eventData ?? '', 'Event Data (JSON)', context.getNode());
			push(
				returnData,
				await kaneoApiRequest(context, 'POST', '/notification', {
					body: pickDefined({
						type: get('type'),
						title: fields.title,
						message: fields.message,
						...(eventData !== undefined ? { eventData } : {}),
						relatedEntityId: fields.relatedEntityId,
						// Only send a resource type when pointing at a resource.
						...((fields.relatedEntityId as string)
							? { relatedEntityType: (fields.relatedEntityType as string) || 'task' }
							: {}),
					}),
				}),
				itemIndex,
			);
			break;
		}
		case 'markRead':
			push(returnData, await kaneoApiRequest(context, 'PATCH', `/notification/${get('notificationId')}/read`), itemIndex);
			break;
		case 'markAllRead': {
			const workspaceId = id('workspaceId', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'PATCH', '/notification/read-all', {
					qs: workspaceId ? ({ workspaceId } as IDataObject) : undefined,
				}),
				itemIndex,
			);
			break;
		}
		case 'clearAll': {
			const workspaceId = id('workspaceId', '') as string;
			push(
				returnData,
				await kaneoApiRequest(context, 'DELETE', '/notification/clear-all', {
					qs: workspaceId ? ({ workspaceId } as IDataObject) : undefined,
				}),
				itemIndex,
			);
			break;
		}
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported Notification operation: ${operation}`);
	}
}

async function executeSystem(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	returnData: INodeExecutionData[],
): Promise<void> {
	switch (operation) {
		case 'getConfig':
			push(returnData, await kaneoPublicRequest(context, '/config'), itemIndex);
			break;
		case 'getStatus':
			push(returnData, await kaneoPublicRequest(context, '/instance/status'), itemIndex);
			break;
		default:
			throw new NodeOperationError(context.getNode(), `Unsupported System operation: ${operation}`);
	}
}

export class Kaneo implements INodeType {
	methods = {
		listSearch: {
			async searchWorkspaces(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				return searchWorkspaces.call(this, filter);
			},
			async searchProjects(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				return searchProjects.call(this, filter);
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Kaneo',
		name: 'kaneo',
		icon: { light: 'file:kaneo.svg', dark: 'file:kaneo.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Work with projects, tasks, columns, labels, comments, and time in Kaneo',
		defaults: { name: 'Kaneo' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'kaneoApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Activity', value: 'activity' },
					{ name: 'Column', value: 'column' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Custom Field', value: 'customField' },
					{ name: 'Label', value: 'label' },
					{ name: 'Notification', value: 'notification' },
					{ name: 'Project', value: 'project' },
					{ name: 'Search', value: 'search' },
					{ name: 'System', value: 'system' },
					{ name: 'Task', value: 'task' },
					{ name: 'Task Relation', value: 'taskRelation' },
					{ name: 'Time Entry', value: 'timeEntry' },
					{ name: 'User', value: 'user' },
					{ name: 'Workspace', value: 'workspace' },
				],
				default: 'task',
			},
			...projectOperations,
			...projectFields,
			...taskOperations,
			...taskFields,
			...columnOperations,
			...columnFields,
			...labelOperations,
			...labelFields,
			...commentOperations,
			...commentFields,
			...activityOperations,
			...activityFields,
			...timeEntryOperations,
			...timeEntryFields,
			...workspaceOperations,
			...workspaceFields,
			...searchOperations,
			...searchFields,
			...customFieldOperations,
			...customFieldFields,
			...taskRelationOperations,
			...taskRelationFields,
			...userOperations,
			...userFields,
			...notificationOperations,
			...notificationFields,
			...systemOperations,
			...systemFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'project') {
					await executeProject(this, i, operation, returnData);
				} else if (resource === 'task') {
					await executeTask(this, i, operation, returnData);
				} else if (resource === 'column') {
					await executeColumn(this, i, operation, returnData);
				} else if (resource === 'label') {
					await executeLabel(this, i, operation, returnData);
				} else if (resource === 'comment') {
					await executeComment(this, i, operation, returnData);
				} else if (resource === 'activity') {
					await executeActivity(this, i, operation, returnData);
				} else if (resource === 'timeEntry') {
					await executeTimeEntry(this, i, operation, returnData);
				} else if (resource === 'workspace') {
					await executeWorkspace(this, i, operation, returnData);
				} else if (resource === 'search') {
					await executeSearch(this, i, operation, returnData);
				} else if (resource === 'customField') {
					await executeCustomField(this, i, operation, returnData);
				} else if (resource === 'taskRelation') {
					await executeTaskRelation(this, i, operation, returnData);
				} else if (resource === 'user') {
					if (operation !== 'getCurrent') {
						throw new NodeOperationError(this.getNode(), `Unsupported User operation: ${operation}`);
					}
					push(returnData, await kaneoApiRequest(this, 'GET', '/user/me'), i);
				} else if (resource === 'notification') {
					await executeNotification(this, i, operation, returnData);
				} else if (resource === 'system') {
					await executeSystem(this, i, operation, returnData);
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error);
			}
		}

		return [returnData];
	}
}
